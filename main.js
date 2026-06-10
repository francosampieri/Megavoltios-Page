/**
 * main.js
 * Interacciones generales de la página.
 * No modificar para cambiar el catálogo — usar data/products.json.
 */

// ─── CONFIGURACIÓN ────────────────────────────────────────────────────────────
// MODIFICAR estos valores con los datos reales del negocio

const CONFIG = {
  whatsapp: {
    numero: '5492616813712',       // ← CAMBIAR: número con código de país, sin + ni espacios
    mensajeGeneral: 'Hola, me comunico desde su sitio web. Quisiera hacer una consulta.',
  }
};

// ─── WHATSAPP ─────────────────────────────────────────────────────────────────

function buildWhatsAppURL(mensaje) {
  return `https://wa.me/${CONFIG.whatsapp.numero}?text=${encodeURIComponent(mensaje)}`;
}

function initWhatsApp() {
  // Asigna la URL a todos los botones de WhatsApp en la página
  document.querySelectorAll('[data-whatsapp]').forEach(btn => {
    btn.href = buildWhatsAppURL(CONFIG.whatsapp.mensajeGeneral);
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
  });
}

// ─── MENÚ MOBILE ──────────────────────────────────────────────────────────────

function initMobileMenu() {
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-menu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', isOpen);
  });

  // Cierra el menú al clickear un link
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', false);
    });
  });
}

// ─── NAVBAR: FONDO AL HACER SCROLL ───────────────────────────────────────────

function initNavbarScroll() {
  const header = document.getElementById('main-header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    header.classList.toggle('is-scrolled', window.scrollY > 50);
  }, { passive: true });
}

// ─── FAQ: ACORDEÓN ────────────────────────────────────────────────────────────

function initFAQ() {
  document.querySelectorAll('.faq__item').forEach(item => {
    const btn = item.querySelector('.faq__question');
    const answer = item.querySelector('.faq__answer');
    if (!btn || !answer) return;

    btn.addEventListener('click', () => {
      const isOpen = item.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', isOpen);
    });
  });
}

// ─── SMOOTH SCROLL para links del nav principal ───────────────────────────────

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initWhatsApp();
  initMobileMenu();
  initNavbarScroll();
  initFAQ();
  initSmoothScroll();
});
