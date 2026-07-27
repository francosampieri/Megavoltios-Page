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
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vThiL5HG6YFCnpudCNlqd8NRYNRGUtO2fptZ1yV_3JAi0NnC_XZaMfjPLotNjfRiuBwJpmJeO12eEy3/pub?gid=0&single=true&output=csv';

// URL base para imágenes locales (si en la columna Imagen ponen solo el nombre del archivo)
const LOCAL_IMAGES_BASE = './assets/products/';

// WhatsApp config
const WHATSAPP_NUMBER = '5492616813712';


// ═══ CARGA DE DATOS ═════════════════════════════════════════════════════════

async function loadProducts() {
  let categorias = null;

  // Intentar cargar desde la API directa (tiempo real, sin caché de Sheets)
  try {
    categorias = await loadFromAPI();
    console.log(`✓ Catálogo cargado desde API (${countProducts(categorias)} productos)`);
  } catch (err) {
    console.warn('⚠ No se pudo leer desde API:', err.message);
  }

  // Fallback 1: CSV público de Google Sheets
  if (!categorias && SHEET_CSV_URL) {
    try {
      categorias = await loadFromSheet(SHEET_CSV_URL);
      console.log(`✓ Catálogo cargado desde CSV (${countProducts(categorias)} productos)`);
    } catch (err) {
      console.warn('⚠ No se pudo leer CSV:', err.message);
    }
  }

  // Fallback 2: JSON local
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


// ═══ LECTURA DESDE API DIRECTA (tiempo real) ════════════════════════════════

async function loadFromAPI() {
  const response = await fetch('/api/get-products');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json();
  if (!data.products || data.products.length === 0) throw new Error('Sin productos');

  // Agrupar por categoría → subcategoría
  const catMap = new Map();

  data.products.forEach(prod => {
    const catId = slugify(prod.categoria);

    if (!catMap.has(catId)) {
      catMap.set(catId, {
        id: catId,
        nombre: prod.categoria,
        visualProducts: [],
        textProducts: {},
        hasSubcategories: false,
      });
    }

    const cat = catMap.get(catId);

    // Resolver URL de imagen
    let imageUrl = '';
    if (prod.imagen) {
      imageUrl = prod.imagen.startsWith('http')
        ? prod.imagen
        : LOCAL_IMAGES_BASE + prod.imagen;
    }

    if (imageUrl) {
      cat.visualProducts.push({
        nombre: prod.nombre,
        marca: prod.marca,
        descripcion: prod.descripcion,
        imagen: imageUrl,
      });
    } else {
      const sub = prod.subcategoria || '__direct__';
      if (sub !== '__direct__') cat.hasSubcategories = true;
      if (!cat.textProducts[sub]) cat.textProducts[sub] = [];
      cat.textProducts[sub].push(prod.nombre);
    }
  });

  return Array.from(catMap.values());
}


// ═══ LECTURA DESDE GOOGLE SHEETS (CSV) ══════════════════════════════════════

async function loadFromSheet(url) {
  // Cache-busting: agregar timestamp para evitar caché del navegador
  const cacheBuster = `&_t=${Date.now()}`;
  const response = await fetch(url + cacheBuster);
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
  // Wrapper para el indicador de scroll en mobile
  const wrapper = document.createElement('div');
  wrapper.className = 'product-cards-wrapper';

  const grid = document.createElement('div');
  grid.className = 'product-cards-grid';

  products.forEach(prod => {
    const card = document.createElement('div');
    card.className = 'product-card';

    // Imagen cuadrada con wrapper
    const imgWrap = document.createElement('div');
    imgWrap.className = 'product-card__image-wrapper';
    imgWrap.style.position = 'relative';

    const img = document.createElement('img');
    img.className = 'product-card__image';
    img.src = prod.imagen.includes('cloudinary.com') 
      ? prod.imagen + '?v=' + Date.now() 
      : prod.imagen;
    img.alt = prod.nombre;
    img.loading = 'lazy';
    imgWrap.appendChild(img);

    card.appendChild(imgWrap);

    // Separador ámbar
    const divider = document.createElement('div');
    divider.className = 'product-card__divider';
    card.appendChild(divider);

    // Body centrado
    const body = document.createElement('div');
    body.className = 'product-card__body';

    // Marca como texto arriba del nombre
    if (prod.marca) {
      const brand = document.createElement('div');
      brand.className = 'product-card__brand';
      brand.textContent = prod.marca;
      body.appendChild(brand);
    }

    const name = document.createElement('h4');
    name.className = 'product-card__name';
    name.textContent = prod.nombre;
    body.appendChild(name);

    // Botón "Ver más"
    const cta = document.createElement('button');
    cta.className = 'product-card__cta';
    cta.type = 'button';
    cta.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
      Ver más
    `;
    body.appendChild(cta);

    // Click en la card → abrir modal con detalle
    card.addEventListener('click', () => {
      openProductModal(prod);
    });

    card.appendChild(body);
    grid.appendChild(card);
  });

  wrapper.appendChild(grid);

  // Hint de scroll horizontal (solo visible en mobile)
  const hint = document.createElement('div');
  hint.className = 'product-cards-hint';
  hint.innerHTML = `
    Deslizá para ver más
    <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
  `;
  wrapper.appendChild(hint);

  // Detectar scroll para ocultar hint y fade
  grid.addEventListener('scroll', () => {
    // Ocultar hint al primer scroll
    hint.classList.add('hidden');

    // Detectar si llegó al final para ocultar el fade
    const atEnd = grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 5;
    wrapper.classList.toggle('scrolled-end', atEnd);
  }, { passive: true });

  // Verificar si hay overflow (si no, ocultar hint y fade)
  requestAnimationFrame(() => {
    if (grid.scrollWidth <= grid.clientWidth) {
      hint.classList.add('hidden');
      wrapper.classList.add('scrolled-end');
    }
  });

  return wrapper;
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


// ═══ MODAL DE PRODUCTO ══════════════════════════════════════════════════════

function openProductModal(prod) {
  // Cerrar modal existente si hay uno
  const existing = document.querySelector('.product-modal-overlay');
  if (existing) existing.remove();

  // Crear overlay
  const overlay = document.createElement('div');
  overlay.className = 'product-modal-overlay';

  // Crear modal
  const modal = document.createElement('div');
  modal.className = 'product-modal';

  // Imagen
  const img = document.createElement('img');
  img.className = 'product-modal__img';
  img.src = prod.imagen.includes('cloudinary.com')
    ? prod.imagen + '?v=' + Date.now()
    : prod.imagen;
  img.alt = prod.nombre;
  modal.appendChild(img);

  // Body
  const body = document.createElement('div');
  body.className = 'product-modal__body';

  if (prod.marca) {
    const brand = document.createElement('div');
    brand.className = 'product-modal__brand';
    brand.textContent = prod.marca;
    body.appendChild(brand);
  }

  const name = document.createElement('h3');
  name.className = 'product-modal__name';
  name.textContent = prod.nombre;
  body.appendChild(name);

  const divider = document.createElement('div');
  divider.className = 'product-modal__divider';
  body.appendChild(divider);

  if (prod.descripcion) {
    const desc = document.createElement('p');
    desc.className = 'product-modal__desc';
    desc.textContent = prod.descripcion;
    body.appendChild(desc);
  }

  // Botón WhatsApp
  const cta = document.createElement('a');
  cta.className = 'product-modal__cta';
  cta.target = '_blank';
  cta.rel = 'noopener noreferrer';
  const mensaje = `Hola, estoy interesado en el producto: *${prod.nombre}*. ¿Podrían darme más información?`;
  cta.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
  cta.innerHTML = `
    <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.554 4.12 1.522 5.855L.057 23.928a.5.5 0 0 0 .613.613l6.083-1.464A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.795 9.795 0 0 1-5.002-1.371l-.359-.214-3.717.895.911-3.618-.235-.372A9.795 9.795 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>
    Consultar por WhatsApp
  `;
  body.appendChild(cta);

  modal.appendChild(body);

  // Botón cerrar
  const closeBtn = document.createElement('button');
  closeBtn.className = 'product-modal__close';
  closeBtn.innerHTML = '✕';
  closeBtn.setAttribute('aria-label', 'Cerrar');

  overlay.appendChild(closeBtn);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Animar entrada
  requestAnimationFrame(() => {
    overlay.classList.add('active');
  });

  // Bloquear scroll del body
  document.body.style.overflow = 'hidden';

  // Cerrar modal
  function closeModal() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    setTimeout(() => overlay.remove(), 300);
  }

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', esc);
    }
  });
}


// ═══ BÚSQUEDA DE PRODUCTOS ══════════════════════════════════════════════════

function initCatalogSearch() {
  const input = document.getElementById('catalog-search-input');
  const clearBtn = document.getElementById('catalog-search-clear');
  const grid = document.getElementById('catalog-grid');
  if (!input || !grid) return;

  let debounceTimer = null;

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      filterProducts(input.value.trim());
    }, 200);

    // Mostrar/ocultar botón limpiar
    clearBtn.classList.toggle('visible', input.value.length > 0);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.remove('visible');
    filterProducts('');
    input.focus();
  });

  function normalize(str) {
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function filterProducts(query) {
    const categories = grid.querySelectorAll('.catalog-category');
    const normalizedQuery = normalize(query);
    let totalVisible = 0;

    // Remover mensaje de no resultados anterior
    const prevMsg = grid.querySelector('.catalog-no-results');
    if (prevMsg) prevMsg.remove();

    categories.forEach(cat => {
      if (!query) {
        // Sin búsqueda: mostrar todo
        cat.classList.remove('search-hidden');
        cat.querySelectorAll('.catalog-product-list__item, .product-card').forEach(item => {
          item.style.display = '';
          item.classList.remove('search-highlight');
        });
        cat.querySelectorAll('.catalog-subcategory').forEach(sub => {
          sub.style.display = '';
        });
        return;
      }

      let catHasResults = false;

      // Buscar en productos de texto (listas)
      cat.querySelectorAll('.catalog-product-list__item').forEach(item => {
        const name = item.querySelector('.catalog-product-list__name');
        if (!name) return;
        const matches = normalize(name.textContent).includes(normalizedQuery);
        item.style.display = matches ? '' : 'none';
        item.classList.toggle('search-highlight', matches);
        if (matches) catHasResults = true;
      });

      // Buscar en productos visuales (cards)
      cat.querySelectorAll('.product-card').forEach(card => {
        const name = card.querySelector('.product-card__name');
        const desc = card.querySelector('.product-card__desc');
        const brand = card.querySelector('.product-card__brand');
        const text = [name, desc, brand].map(el => el ? normalize(el.textContent) : '').join(' ');
        const matches = text.includes(normalizedQuery);
        card.style.display = matches ? '' : 'none';
        card.classList.toggle('search-highlight', matches);
        if (matches) catHasResults = true;
      });

      // Ocultar subcategorías vacías
      cat.querySelectorAll('.catalog-subcategory').forEach(sub => {
        const visibleItems = sub.querySelectorAll('.catalog-product-list__item:not([style*="display: none"])');
        sub.style.display = visibleItems.length > 0 ? '' : 'none';
      });

      // También buscar en el título de la categoría
      const catTitle = cat.querySelector('.catalog-category__title');
      if (catTitle && normalize(catTitle.textContent).includes(normalizedQuery)) {
        catHasResults = true;
        // Si coincide la categoría, mostrar todos sus productos
        cat.querySelectorAll('.catalog-product-list__item, .product-card, .catalog-subcategory').forEach(item => {
          item.style.display = '';
        });
      }

      cat.classList.toggle('search-hidden', !catHasResults);
      if (catHasResults) totalVisible++;
    });

    // Actualizar nav de categorías (ocultar las que no tienen resultados)
    const nav = document.getElementById('category-nav');
    if (nav) {
      nav.querySelectorAll('.category-nav__item').forEach(btn => {
        const catId = btn.getAttribute('href')?.replace('#cat-', '');
        const catEl = document.getElementById(`cat-${catId}`);
        if (catEl) {
          btn.style.display = catEl.classList.contains('search-hidden') ? 'none' : '';
        }
      });
    }

    // Mensaje si no hay resultados
    if (query && totalVisible === 0) {
      const msg = document.createElement('div');
      msg.className = 'catalog-no-results';
      msg.innerHTML = `
        <div class="catalog-no-results__icon">🔍</div>
        <div class="catalog-no-results__text">No se encontraron productos para "${query}"</div>
        <div class="catalog-no-results__hint">Probá con otro término o consultanos por WhatsApp</div>
      `;
      grid.appendChild(msg);
    }
  }
}


// ═══ INIT ═══════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
  initScrollSpy();
  initCatalogSearch();
});
