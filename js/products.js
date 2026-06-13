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
 * Scroll spy basado en posición real de elementos.
 * Calcula qué categoría está más cerca del centro de la pantalla
 * en cada evento de scroll. Sin IntersectionObserver = sin parpadeos.
 */
function initScrollSpy() {
  const nav = document.getElementById('category-nav');
  if (!nav) return;

  const stickyOffset = () => {
    const header = document.getElementById('main-header');
    const catNav = document.querySelector('.category-nav-wrapper');
    return (header ? header.offsetHeight : 0) + (catNav ? catNav.offsetHeight : 0);
  };

  let ticking = false;

  function updateActive() {
    const categories = document.querySelectorAll('.catalog-category');
    if (!categories.length) return;

    const offset = stickyOffset();
    const viewportMid = window.innerHeight / 2;

    let closestId = null;
    let closestDist = Infinity;

    categories.forEach(el => {
      const rect = el.getBoundingClientRect();
      // Centro del elemento relativo al viewport, descontando los stickies
      const elMid = rect.top + rect.height / 2 - offset;
      const dist = Math.abs(elMid - viewportMid);
      if (dist < closestDist) {
        closestDist = dist;
        closestId = el.id.replace('cat-', '');
      }
    });

    if (closestId) setActiveNavItem(closestId);
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateActive);
      ticking = true;
    }
  }, { passive: true });

  // Activar al cargar
  updateActive();
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
  initScrollSpy();
});
