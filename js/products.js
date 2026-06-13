/**
 * products.js
 * Lee data/products.json y construye dinámicamente la sección de catálogo.
 *
 * PARA MODIFICAR EL CATÁLOGO:
 * Editá el archivo data/products.json. No toques este archivo.
 */

async function loadProducts() {
  try {
    const response = await fetch('./data/products.json');
    if (!response.ok) throw new Error('No se pudo cargar el catálogo.');
    const data = await response.json();
    buildCategoryNav(data.categorias);
    buildCatalog(data.categorias);
  } catch (error) {
    console.error('Error cargando productos:', error);
    document.getElementById('catalog-grid').innerHTML =
      '<p class="catalog-error">No se pudo cargar el catálogo. Intentá recargar la página.</p>';
  }
}

function buildCategoryNav(categorias) {
  const nav = document.getElementById('category-nav');
  if (!nav) return;

  categorias.forEach(cat => {
    const btn = document.createElement('a');
    btn.href = `#cat-${cat.id}`;
    btn.className = 'category-nav__item';
    btn.textContent = cat.nombre;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(`cat-${cat.id}`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      // Al hacer click manual, marcar inmediatamente sin esperar al scroll spy
      setActiveNavItem(btn.getAttribute('href').replace('#cat-', ''));
    });

    nav.appendChild(btn);
  });
}

function buildCatalog(categorias) {
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;

  categorias.forEach(cat => {
    const section = document.createElement('div');
    section.className = 'catalog-category';
    section.id = `cat-${cat.id}`;

    const heading = document.createElement('h3');
    heading.className = 'catalog-category__title';
    heading.textContent = cat.nombre;
    section.appendChild(heading);

    const subGrid = document.createElement('div');
    subGrid.className = 'catalog-subcategory-grid';

    cat.subcategorias.forEach(sub => {
      const subCol = document.createElement('div');
      subCol.className = 'catalog-subcategory';

      const subTitle = document.createElement('h4');
      subTitle.className = 'catalog-subcategory__title';
      subTitle.textContent = sub.nombre;
      subCol.appendChild(subTitle);

      const list = document.createElement('ul');
      list.className = 'catalog-product-list';

      sub.productos.forEach(producto => {
        const item = document.createElement('li');
        item.className = 'catalog-product-list__item';
        item.textContent = producto;
        list.appendChild(item);
      });

      subCol.appendChild(list);
      subGrid.appendChild(subCol);
    });

    section.appendChild(subGrid);
    grid.appendChild(section);
  });
}

/**
 * Marca como activo el item del nav que corresponde al id dado.
 * Centra el item activo dentro del scroll horizontal del nav.
 */
function setActiveNavItem(id) {
  const nav = document.getElementById('category-nav');
  if (!nav) return;

  nav.querySelectorAll('.category-nav__item').forEach(btn => {
    const isActive = btn.getAttribute('href') === `#cat-${id}`;
    btn.classList.toggle('is-active', isActive);

    // Scroll horizontal del nav para centrar el item activo en mobile
    if (isActive) {
      const navRect = nav.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      const offset = btnRect.left - navRect.left - (navRect.width / 2) + (btnRect.width / 2);
      nav.scrollBy({ left: offset, behavior: 'smooth' });
    }
  });
}

/**
 * Scroll spy con debounce: solo actualiza el nav cuando el scroll
 * se detiene, evitando el parpadeo al saltar varias categorías.
 */
function initScrollSpy() {
  const nav = document.getElementById('category-nav');
  if (!nav) return;

  let scrollTimer = null;
  let pendingId = null;

  const observer = new IntersectionObserver((entries) => {
    // Guardar el último id visible pero no aplicarlo todavía
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        pendingId = entry.target.id.replace('cat-', '');
      }
    });

    // Cancelar el timer anterior y arrancar uno nuevo
    // Solo actualiza el nav cuando el scroll se detiene (100ms de silencio)
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      if (pendingId) {
        setActiveNavItem(pendingId);
        pendingId = null;
      }
    }, 100);

  }, { rootMargin: '-35% 0px -55% 0px' });

  document.querySelectorAll('.catalog-category').forEach(el => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
  initScrollSpy();
});
