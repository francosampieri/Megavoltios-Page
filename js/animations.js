/**
 * animations.js
 * Animaciones de entrada por scroll.
 */

const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

function observe(el, onVisible, options = {}) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        onVisible(entry.target);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: options.threshold ?? 0.12, rootMargin: options.rootMargin ?? '0px 0px -50px 0px' });
  io.observe(el);
}

function fadeUp(el, delay = 0) {
  el.style.opacity = '0';
  el.style.transform = 'translateY(24px)';
  el.style.transition = `opacity 0.55s ${EASE} ${delay}ms, transform 0.55s ${EASE} ${delay}ms`;
  observe(el, (t) => {
    t.style.opacity = '1';
    t.style.transform = 'translateY(0)';
  });
}

function slideIn(el, direction = 'left', delay = 0) {
  const x = direction === 'left' ? '-32px' : '32px';
  el.style.opacity = '0';
  el.style.transform = `translateX(${x})`;
  el.style.transition = `opacity 0.6s ${EASE} ${delay}ms, transform 0.6s ${EASE} ${delay}ms`;
  observe(el, (t) => {
    t.style.opacity = '1';
    t.style.transform = 'translateX(0)';
  });
}

function stagger(parent, delayStep = 80) {
  const children = Array.from(parent.children);
  children.forEach((child, i) => {
    child.style.opacity = '0';
    child.style.transform = 'translateY(20px)';
    child.style.transition = `opacity 0.5s ${EASE} ${i * delayStep}ms, transform 0.5s ${EASE} ${i * delayStep}ms`;
  });
  observe(parent, () => {
    children.forEach(child => {
      child.style.opacity = '';
      child.style.transform = 'translateY(0)';
    });
  }, { threshold: 0.08 });
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
// Subtítulo y botones más rápidos (ya animados por CSS, solo ajustamos velocidad)

function initHero() {
  // Velocidad de subtítulo y acciones — reescribir las reglas inline
  const subtitle = document.querySelector('.hero__subtitle');
  const actions  = document.querySelector('.hero__actions');
  if (subtitle) subtitle.style.animationDuration = '0.45s';
  if (actions)  actions.style.animationDuration  = '0.45s';
}

// ─── TÍTULOS DE SECCIÓN ───────────────────────────────────────────────────────
// NO se ocultan hasta que el observer esté listo — evita sección vacía

function initSectionTitles() {
  document.querySelectorAll('.section-title, .section-subtitle').forEach(el => {
    fadeUp(el, 0);
  });
}

// ─── MARCAS ───────────────────────────────────────────────────────────────────
// Stagger rápido: 40ms entre logos, todos visibles antes de seguir scrolleando

function initBrands() {
  const grid = document.querySelector('.brands__grid');
  if (!grid) return;
  stagger(grid, 40);
}

// ─── POR QUÉ ELEGIRNOS ────────────────────────────────────────────────────────

function initWhyUs() {
  const grid = document.querySelector('.why-us__grid');
  if (!grid) return;
  stagger(grid, 90);
}

// ─── UBICACIÓN ────────────────────────────────────────────────────────────────

function initLocation() {
  const info = document.querySelector('.location__info');
  const map  = document.querySelector('.location__map');
  if (info) slideIn(info, 'left');
  if (map)  slideIn(map, 'right', 80);
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

function initFAQAnimation() {
  const list = document.querySelector('.faq__list');
  if (!list) return;
  stagger(list, 70);
}

// ─── CONTACTO ─────────────────────────────────────────────────────────────────

function initContactAnimation() {
  const primary   = document.querySelector('.contact__item--primary');
  const secondary = document.querySelector('.contact__secondary');
  if (primary)   slideIn(primary, 'left');
  if (secondary) slideIn(secondary, 'right', 80);

  // Sacudida de atención al entrar — más pronunciada
  if (primary) {
    observe(primary, (el) => {
      setTimeout(() => {
        el.style.transition = 'transform 0.15s ease';
        el.style.transform  = 'scale(1.04) translateY(-3px)';
        setTimeout(() => {
          el.style.transform = 'scale(0.98)';
          setTimeout(() => {
            el.style.transform  = 'scale(1)';
            el.style.transition = '';
          }, 150);
        }, 150);
      }, 400);
    }, { threshold: 0.5 });
  }
}

// ─── CATÁLOGO ─────────────────────────────────────────────────────────────────
// Las categorías se generan dinámicamente. Usamos MutationObserver
// para detectar cuando están listas, y luego las animamos individualmente.

function initCatalogAnimations() {
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;

  function animateCategories() {
    const cats = grid.querySelectorAll('.catalog-category');
    if (!cats.length) return;

    cats.forEach((cat, i) => {
      fadeUp(cat, i * 50);
    });
  }

  // Si el catálogo ya tiene contenido (carga rápida)
  if (grid.children.length > 0) {
    animateCategories();
    return;
  }

  // Esperar a que products.js inserte las categorías
  const mo = new MutationObserver(() => {
    if (grid.children.length > 0) {
      mo.disconnect();
      // Pequeño delay para que el DOM esté estable
      setTimeout(animateCategories, 50);
    }
  });
  mo.observe(grid, { childList: true });
}

// ─── WHATSAPP FLOAT: pulso más visible ───────────────────────────────────────

function initWhatsAppPulse() {
  const btn = document.querySelector('.whatsapp-float');
  if (!btn) return;

  // Pulso que escala el botón visiblemente cada 4 segundos
  setInterval(() => {
    btn.style.transition = 'transform 0.25s ease, box-shadow 0.25s ease';
    btn.style.transform  = 'scale(1.22)';
    btn.style.boxShadow  = '0 0 0 8px rgba(245,166,35,0.25)';
    setTimeout(() => {
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = '';
    }, 300);
  }, 4000);
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  initHero();
  initSectionTitles();
  initBrands();
  initWhyUs();
  initLocation();
  initFAQAnimation();
  initContactAnimation();
  initCatalogAnimations();
  initWhatsAppPulse();
});
