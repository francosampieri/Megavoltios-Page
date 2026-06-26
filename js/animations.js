/**
 * animations.js
 * Gestiona todas las animaciones de entrada por scroll del sitio.
 * No modificar para cambios de contenido — usar main.js y products.js.
 */

// ─── UTILIDAD: INTERSECTION OBSERVER ─────────────────────────────────────────

function createObserver(callback, options = {}) {
  return new IntersectionObserver(callback, {
    threshold: options.threshold ?? 0.15,
    rootMargin: options.rootMargin ?? '0px 0px -60px 0px',
  });
}

// ─── 1. ELEMENTOS CON CLASE ANIM-* ───────────────────────────────────────────
// Cualquier elemento con .anim-fade-up, .anim-fade-in, etc.
// entra al viewport → recibe .is-visible

function initScrollAnimations() {
  const targets = document.querySelectorAll(
    '.anim-fade-up, .anim-fade-in, .anim-slide-left, .anim-slide-right'
  );

  if (!targets.length) return;

  const observer = createObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target); // animar solo una vez
      }
    });
  });

  targets.forEach(el => observer.observe(el));
}

// ─── 2. STAGGER — grupos de elementos ────────────────────────────────────────
// El contenedor tiene .anim-stagger
// Cuando el contenedor entra al viewport, sus hijos reciben
// .is-visible con un pequeño delay escalonado

function initStaggerAnimations() {
  const groups = document.querySelectorAll('.anim-stagger');
  if (!groups.length) return;

  const observer = createObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const children = entry.target.children;
        Array.from(children).forEach((child, i) => {
          setTimeout(() => {
            child.classList.add('is-visible');
          }, i * 90);
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  groups.forEach(el => observer.observe(el));
}

// ─── 3. TÍTULOS DE SECCIÓN ────────────────────────────────────────────────────
// .section-title y .section-subtitle arrancan ocultos (CSS)
// y aparecen con fadeUp cuando entran al viewport

function initSectionTitles() {
  const titles = document.querySelectorAll(
    '.section-title, .section-subtitle'
  );

  if (!titles.length) return;

  const observer = createObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animation = 'fadeUp 0.65s cubic-bezier(0.4,0,0.2,1) forwards';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  titles.forEach(el => observer.observe(el));
}

// ─── 4. CATALOG CATEGORIES — aparecen al hacer scroll ────────────────────────
// Las cajas del catálogo se generan dinámicamente desde JS.
// Las observamos después de que products.js las cree.

function initCatalogAnimations() {
  // Esperar a que products.js termine de generar el catálogo
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;

  const mutationObserver = new MutationObserver(() => {
    const categories = grid.querySelectorAll('.catalog-category');
    if (!categories.length) return;

    mutationObserver.disconnect();

    const scrollObserver = createObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          scrollObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });

    categories.forEach((cat, i) => {
      cat.style.opacity = '0';
      cat.style.transform = 'translateY(24px)';
      cat.style.transition = `opacity 0.55s ease ${i * 60}ms, transform 0.55s ease ${i * 60}ms`;
      scrollObserver.observe(cat);
    });
  });

  mutationObserver.observe(grid, { childList: true });
}

// Cuando una catalog-category recibe .is-visible, aplicar el estado visible
document.addEventListener('animationFrame', () => {});

// Polyfill simple para catalog-category: usar clase en lugar de inline style
function applyCatalogVisible() {
  document.addEventListener('scroll', () => {}, { passive: true });
}

// ─── 5. HERO: barra lateral ya animada por CSS ───────────────────────────────
// No necesita JS, está en el keyframe amberBarGrow

// ─── 6. BRAND ITEMS: fade in escalonado ──────────────────────────────────────

function initBrandsAnimation() {
  const grid = document.querySelector('.brands__grid');
  if (!grid) return;

  const observer = createObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const items = entry.target.querySelectorAll('.brands__item');
        items.forEach((item, i) => {
          item.style.opacity = '0';
          item.style.transform = 'translateY(12px)';
          item.style.transition = `opacity 0.5s ease ${i * 70}ms, transform 0.5s ease ${i * 70}ms`;
          setTimeout(() => {
            item.style.opacity = '0.35';
            item.style.transform = 'translateY(0)';
          }, i * 70 + 50);
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  // Reset inicial
  const items = grid.querySelectorAll('.brands__item');
  items.forEach(item => {
    item.style.opacity = '0';
  });

  observer.observe(grid);
}

// ─── 7. CONTACT CARD WHATSAPP: pulso inicial ─────────────────────────────────

function initContactAnimation() {
  const primary = document.querySelector('.contact__item--primary');
  if (!primary) return;

  const observer = createObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Pequeña sacudida de atención al entrar
        primary.style.transition = 'transform 0.3s cubic-bezier(0.4,0,0.2,1)';
        setTimeout(() => { primary.style.transform = 'scale(1.02)'; }, 200);
        setTimeout(() => { primary.style.transform = 'scale(1)'; }, 500);
        observer.unobserve(primary);
      }
    });
  }, { threshold: 0.4 });

  observer.observe(primary);
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Respetar preferencia de usuario
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return;

  initScrollAnimations();
  initStaggerAnimations();
  initSectionTitles();
  initCatalogAnimations();
  initBrandsAnimation();
  initContactAnimation();
});
