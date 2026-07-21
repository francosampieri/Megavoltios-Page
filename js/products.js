/**
 * products.js v2 — Catálogo híbrido (texto + cards con foto)
 * 
 * LECTURA: Lee productos desde Google Sheets (CSV público).
 *          Si falla, usa data/products.json como fallback.
 * 
 * FORMATO HÍBRIDO:
 *   - Producto CON imagen → se muestra como card visual (foto + descripción + badge marca)
 *   - Producto SIN imagen → se muestra como texto (formato original con botón "Consultar" en hover)
 * 
 * GOOGLE SHEETS: Columnas esperadas:
 *   A: Categoría | B: Subcategoría | C: Nombre | D: Marca | E: Descripción | F: Imagen
 */

// ═══ CONFIGURACIÓN ═══════════════════════════════════════════════════════════
// MODIFICAR: Pegar acá la URL del CSV público de Google Sheets
// Cómo obtenerla: Google Sheets → Archivo → Compartir → Publicar en la web → CSV → Copiar link
const SHEET_CSV_URL = ''; // ← Pegar URL aquí. Ejemplo: 'https://docs.google.com/spreadsheets/d/XXXXX/export?format=csv&gid=0'

// URL base para imágenes locales (si en la columna Imagen ponen solo el nombre del archivo)
const LOCAL_IMAGES_BASE = './assets/products/';

// WhatsApp config
const WHATSAPP_NUMBER = '5492616813712';


// ═══ CARGA DE DATOS ═════════════════════════════════════════════════════════

async function loadProducts() {
  let categorias = null;

  // Intentar cargar desde Google Sheets
  if (SHEET_CSV_URL) {
    try {
      categorias = await loadFromSheet(SHEET_CSV_URL);
      console.log(`✓ Catálogo cargado desde Google Sheets (${countProducts(categorias)} productos)`);
    } catch (err) {
      console.warn('⚠ No se pudo leer Google Sheets, usando JSON local:', err.message);
    }
  }

  // Fallback: cargar desde JSON local
  if (!categorias) {
    try {
      categorias = await loadFromJSON('./data/products.json');
      console.log(`✓ Catálogo cargado desde JSON local (${countProducts(categorias)} productos)`);
    } catch (err) {
      console.error('✗ Error cargando catálogo:', err);
      document.getElementById('catalog-grid').innerHTML =
        '<p class="catalog-error">No se pudo cargar el catálogo. Intentá recargar la página.</p>';
      return;
    }
  }

  buildCategoryNav(categorias);
  buildCatalog(categorias);
}


// ═══ LECTURA DESDE GOOGLE SHEETS (CSV) ══════════════════════════════════════

async function loadFromSheet(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  
  const csvText = await response.text();
  const rows = parseCSV(csvText);
  
  if (rows.length < 2) throw new Error('Sheet vacía');

  // Primera fila = headers, resto = datos
  const headers = rows[0].map(h => h.trim().toLowerCase());
  const dataRows = rows.slice(1).filter(row => row.length > 0 && row[0]?.trim());

  // Mapear índices de columnas
  const col = {
    categoria:    headers.indexOf('categoría') !== -1 ? headers.indexOf('categoría') : headers.indexOf('categoria'),
    subcategoria: headers.indexOf('subcategoría') !== -1 ? headers.indexOf('subcategoría') : headers.indexOf('subcategoria'),
    nombre:       headers.indexOf('nombre'),
    marca:        headers.indexOf('marca'),
    descripcion:  headers.indexOf('descripción') !== -1 ? headers.indexOf('descripción') : headers.indexOf('descripcion'),
    imagen:       headers.indexOf('imagen'),
  };

  // Agrupar por categoría → subcategoría
  const catMap = new Map();

  dataRows.forEach(row => {
    const catName  = (row[col.categoria] || '').trim();
    const subName  = col.subcategoria >= 0 ? (row[col.subcategoria] || '').trim() : '';
    const nombre   = col.nombre >= 0 ? (row[col.nombre] || '').trim() : '';
    const marca    = col.marca >= 0 ? (row[col.marca] || '').trim() : '';
    const desc     = col.descripcion >= 0 ? (row[col.descripcion] || '').trim() : '';
    const imagen   = col.imagen >= 0 ? (row[col.imagen] || '').trim() : '';

    if (!catName || !nombre) return; // Skip filas vacías

    const catId = slugify(catName);

    if (!catMap.has(catId)) {
      catMap.set(catId, {
        id: catId,
        nombre: catName,
        visualProducts: [],  // Productos con imagen → cards
        textProducts: {},    // Productos sin imagen → agrupados por subcategoría
        hasSubcategories: false,
      });
    }

    const cat = catMap.get(catId);

    // Resolver URL de imagen
    let imageUrl = '';
    if (imagen) {
      if (imagen.startsWith('http')) {
        imageUrl = imagen;
      } else {
        imageUrl = LOCAL_IMAGES_BASE + imagen;
      }
    }

    if (imageUrl) {
      // Producto con imagen → formato card
      cat.visualProducts.push({ nombre, marca, descripcion: desc, imagen: imageUrl });
    } else {
      // Producto sin imagen → formato texto
      const sub = subName || '__direct__';
      if (sub !== '__direct__') cat.hasSubcategories = true;
      if (!cat.textProducts[sub]) cat.textProducts[sub] = [];
      cat.textProducts[sub].push(nombre);
    }
  });

  return Array.from(catMap.values());
}


// ═══ LECTURA DESDE JSON LOCAL (FALLBACK) ════════════════════════════════════

async function loadFromJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();

  // Adaptar formato del JSON original al formato interno
  return data.categorias.map(cat => ({
    id: cat.id,
    nombre: cat.nombre,
    visualProducts: [], // El JSON no tiene productos con imagen
    textProducts: cat.subcategorias
      ? Object.fromEntries(cat.subcategorias.map(s => [s.nombre, s.productos]))
      : { '__direct__': cat.productos || [] },
    hasSubcategories: !!(cat.subcategorias && cat.subcategorias.length > 0),
  }));
}


// ═══ CSV PARSER ═════════════════════════════════════════════════════════════

function parseCSV(text) {
  const rows = [];
  let current = [];
  let field = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++; // Skip next quote
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        current.push(field);
        field = '';
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        current.push(field);
        rows.push(current);
        current = [];
        field = '';
        if (ch === '\r') i++; // Skip \n
      } else {
        field += ch;
      }
    }
  }

  // Last field/row
  if (field || current.length > 0) {
    current.push(field);
    rows.push(current);
  }

  return rows;
}


// ═══ RENDERIZADO ════════════════════════════════════════════════════════════

function buildCategoryNav(categorias) {
  const nav = document.getElementById('category-nav');
  if (!nav) return;
  nav.innerHTML = ''; // Limpiar

  categorias.forEach(cat => {
    const btn = document.createElement('a');
    btn.href = `#cat-${cat.id}`;
    btn.className = 'category-nav__item';
    btn.textContent = cat.nombre;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(`cat-${cat.id}`);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveNavItem(cat.id);
    });

    nav.appendChild(btn);
  });
}

function buildCatalog(categorias) {
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;
  grid.innerHTML = ''; // Limpiar

  categorias.forEach(cat => {
    const hasVisual = cat.visualProducts.length > 0;
    const hasText = Object.values(cat.textProducts).some(arr => arr.length > 0);
    const isMixed = hasVisual && hasText;

    const section = document.createElement('div');
    section.className = `catalog-category${isMixed ? ' catalog-category--mixed' : ''}`;
    section.id = `cat-${cat.id}`;

    // Título
    const heading = document.createElement('h3');
    heading.className = 'catalog-category__title';
    heading.textContent = cat.nombre;
    section.appendChild(heading);

    // ── SECCIÓN 1: Productos con imagen (cards visuales) ──
    if (hasVisual) {
      if (isMixed) {
        const div = document.createElement('div');
        div.className = 'mixed-section';
        div.appendChild(buildProductCards(cat.visualProducts));
        section.appendChild(div);

        const divider = document.createElement('div');
        divider.className = 'mixed-divider';
        divider.innerHTML = '<span>Más productos</span>';
        section.appendChild(divider);
      } else {
        section.appendChild(buildProductCards(cat.visualProducts));
      }
    }

    // ── SECCIÓN 2: Productos sin imagen (texto, formato original) ──
    if (hasText) {
      const textContainer = document.createElement('div');
      textContainer.className = isMixed ? 'mixed-section' : '';

      if (cat.hasSubcategories) {
        // Con subcategorías → grid de columnas
        const subGrid = document.createElement('div');
        subGrid.className = 'catalog-subcategory-grid';

        Object.entries(cat.textProducts).forEach(([subName, productos]) => {
          if (subName === '__direct__') return;
          const subCol = document.createElement('div');
          subCol.className = 'catalog-subcategory';

          const subTitle = document.createElement('h4');
          subTitle.className = 'catalog-subcategory__title';
          subTitle.textContent = subName;
          subCol.appendChild(subTitle);
          subCol.appendChild(buildProductList(productos));
          subGrid.appendChild(subCol);
        });

        textContainer.appendChild(subGrid);
      } else {
        // Sin subcategorías → lista directa
        const directProducts = cat.textProducts['__direct__'] || [];
        const directWrap = document.createElement('div');
        directWrap.className = 'catalog-subcategory-grid catalog-subcategory-grid--direct';
        directWrap.appendChild(buildProductList(directProducts));
        textContainer.appendChild(directWrap);
      }

      section.appendChild(textContainer);
    }

    grid.appendChild(section);
  });
}


/**
 * Construye la grilla de cards visuales (productos con imagen)
 */
function buildProductCards(products) {
  const grid = document.createElement('div');
  grid.className = 'product-cards-grid';

  products.forEach(prod => {
    const card = document.createElement('div');
    card.className = 'product-card';

    // Imagen
    const imgWrap = document.createElement('div');
    imgWrap.className = 'product-card__image-wrapper';

    const img = document.createElement('img');
    img.className = 'product-card__image';
    img.src = prod.imagen;
    img.alt = prod.nombre;
    img.loading = 'lazy';
    imgWrap.appendChild(img);

    // Badge de marca
    if (prod.marca) {
      const badge = document.createElement('span');
      badge.className = 'product-card__badge';
      badge.textContent = prod.marca;
      imgWrap.appendChild(badge);
    }

    card.appendChild(imgWrap);

    // Body
    const body = document.createElement('div');
    body.className = 'product-card__body';

    const name = document.createElement('h4');
    name.className = 'product-card__name';
    name.textContent = prod.nombre;
    body.appendChild(name);

    if (prod.descripcion) {
      const desc = document.createElement('p');
      desc.className = 'product-card__desc';
      desc.textContent = prod.descripcion;
      body.appendChild(desc);
    }

    // Botón WhatsApp
    const cta = document.createElement('a');
    cta.className = 'product-card__cta';
    cta.target = '_blank';
    cta.rel = 'noopener noreferrer';
    cta.setAttribute('aria-label', `Consultar por WhatsApp: ${prod.nombre}`);

    const mensaje = `Hola, estoy interesado en el producto: *${prod.nombre}*. ¿Podrían darme más información?`;
    cta.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
    cta.innerHTML = `
      <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
      Consultar
    `;
    body.appendChild(cta);

    card.appendChild(body);
    grid.appendChild(card);
  });

  return grid;
}


/**
 * Construye una lista de productos en formato texto (original)
 */
function buildProductList(productos) {
  const list = document.createElement('ul');
  list.className = 'catalog-product-list';

  productos.forEach(producto => {
    const item = document.createElement('li');
    item.className = 'catalog-product-list__item';

    const nombre = document.createElement('span');
    nombre.className = 'catalog-product-list__name';
    nombre.textContent = producto;

    const btn = document.createElement('a');
    btn.className = 'catalog-product-list__consult';
    btn.textContent = 'Consultar';
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.setAttribute('aria-label', `Consultar por WhatsApp: ${producto}`);

    const mensaje = `Hola, estoy interesado en el producto: *${producto}*. ¿Podrían darme más información?`;
    btn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;

    item.appendChild(nombre);
    item.appendChild(btn);
    list.appendChild(item);
  });

  return list;
}


// ═══ UTILIDADES ═════════════════════════════════════════════════════════════

function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function countProducts(categorias) {
  return categorias.reduce((total, cat) => {
    const textCount = Object.values(cat.textProducts).reduce((sum, arr) => sum + arr.length, 0);
    return total + cat.visualProducts.length + textCount;
  }, 0);
}


// ═══ SCROLL SPY & NAV ═══════════════════════════════════════════════════════
// (Se mantiene igual que la versión original)

function setActiveNavItem(id) {
  const nav = document.getElementById('category-nav');
  if (!nav) return;

  nav.querySelectorAll('.category-nav__item').forEach(btn => {
    const isActive = btn.getAttribute('href') === `#cat-${id}`;
    btn.classList.toggle('is-active', isActive);

    if (isActive) {
      const navRect = nav.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      const offset = btnRect.left - navRect.left - (navRect.width / 2) + (btnRect.width / 2);
      nav.scrollBy({ left: offset, behavior: 'smooth' });
    }
  });
}

function initScrollSpy() {
  const nav = document.getElementById('category-nav');
  if (!nav) return;

  let scrollTimer = null;

  function getNearestCategory() {
    const categories = document.querySelectorAll('.catalog-category');
    if (!categories.length) return null;

    const header = document.getElementById('main-header');
    const catNavWrapper = document.querySelector('.category-nav-wrapper');
    const offset = (header?.offsetHeight || 0) + (catNavWrapper?.offsetHeight || 0);
    const viewportMid = window.innerHeight / 2;

    let closestId = null;
    let closestDist = Infinity;

    categories.forEach(el => {
      const rect = el.getBoundingClientRect();
      const elMid = rect.top + rect.height / 2 - offset;
      const dist = Math.abs(elMid - viewportMid);
      if (dist < closestDist) {
        closestDist = dist;
        closestId = el.id.replace('cat-', '');
      }
    });

    return closestId;
  }

  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const id = getNearestCategory();
      if (id) setActiveNavItem(id);
    }, 150);
  }, { passive: true });

  setTimeout(() => {
    const id = getNearestCategory();
    if (id) setActiveNavItem(id);
  }, 200);
}


// ═══ INIT ═══════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
  initScrollSpy();
});
