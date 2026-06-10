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

/**
 * Construye la barra de navegación sticky con las categorías.
 * Cada botón hace scroll suave hasta la caja correspondiente.
 */
function buildCategoryNav(categorias) {
  const nav = document.getElementById('category-nav');
  if (!nav) return;

  categorias.forEach(cat => {
    const btn = document.createElement('a');
    btn.href = `#cat-${cat.id}`;
    btn.className = 'category-nav__item';
    btn.textContent = cat.nombre;

    // Scroll suave sin romper la URL
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(`cat-${cat.id}`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      // Marcar activo
      nav.querySelectorAll('.category-nav__item').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
    });

    nav.appendChild(btn);
  });
}

/**
 * Construye las cajas de cada categoría con sus subcategorías en columnas.
 */
function buildCatalog(categorias) {
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;

  categorias.forEach(cat => {
    const section = document.createElement('div');
    section.className = 'catalog-category';
    section.id = `cat-${cat.id}`;

    // Nombre de la categoría
    const heading = document.createElement('h3');
    heading.className = 'catalog-category__title';
    heading.textContent = cat.nombre;
    section.appendChild(heading);

    // Contenedor de subcategorías en columnas
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

// Highlight del nav según scroll
function initScrollSpy() {
  const nav = document.getElementById('category-nav');
  if (!nav) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id.replace('cat-', '');
        nav.querySelectorAll('.category-nav__item').forEach(btn => {
          btn.classList.toggle('is-active', btn.getAttribute('href') === `#cat-${id}`);
        });
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  document.querySelectorAll('.catalog-category').forEach(el => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
  initScrollSpy();
});
