/* ============================================================
   Inyecta Navbar y Footer en todas las páginas
   y gestiona el badge del carrito en el nav
============================================================ */

const PAGES = [
  { href: 'index.html',    label: 'Inicio' },
  { href: 'carta.html',    label: 'Carta' },
  { href: 'pedido.html',   label: 'Pedir Ahora' },
  { href: 'nosotros.html', label: 'Nosotros' },
  { href: 'contacto.html', label: 'Contacto' },
];

function getCurrentPage() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  return path === '' ? 'index.html' : path;
}

function buildNavLinks() {
  const current = getCurrentPage();
  return PAGES.map(p => `
    <li>
      <a href="${p.href}" class="${current === p.href ? 'active' : ''}">
        ${p.label}
        ${p.href === 'pedido.html' ? `<span class="nav-cart-badge" id="navCartBadge" style="display:none">0</span>` : ''}
      </a>
    </li>
  `).join('');
}

function injectNavbar() {
  const nav = document.createElement('nav');
  nav.className = 'navbar';
  nav.id = 'navbar';
  nav.innerHTML = `
    <div class="nav-inner">
      <a href="index.html" class="logo" aria-label="Passages Kebab inicio">
        <span class="logo-passages">PASSAGES</span>
        <span class="logo-kebab">KEBAB</span>
      </a>
      <ul class="nav-links" id="navLinks">
        ${buildNavLinks()}
      </ul>
      <button class="burger" id="burger" aria-label="Menú">&#9776;</button>
    </div>
  `;
  document.body.prepend(nav);

  // Scroll effect
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  });

  // Mobile toggle
  const burger = document.getElementById('burger');
  if (burger) {
    burger.addEventListener('click', () => {
      document.getElementById('navLinks').classList.toggle('open');
    });
  }

  // Close mobile nav on link click
  nav.querySelectorAll('.nav-links a').forEach(a => {
    a.addEventListener('click', () => {
      const nl = document.getElementById('navLinks');
      if (nl) nl.classList.remove('open');
    });
  });
}

function injectFooter() {
  const footer = document.createElement('footer');
  footer.className = 'footer';
  footer.innerHTML = `
    <div class="footer-inner">
      <div class="footer-logo">
        <span class="logo-passages">PASSAGES</span>
        <span class="logo-kebab">KEBAB</span>
      </div>
      <p class="footer-copy">© 2025 Passages Kebab · Todos los derechos reservados</p>
      <div class="footer-social">
        <a href="#" aria-label="Instagram">📸</a>
        <a href="#" aria-label="Facebook">📘</a>
        <a href="#" aria-label="WhatsApp">💬</a>
      </div>
    </div>
  `;
  document.body.appendChild(footer);
}

function updateNavCartBadge() {
  const badge = document.getElementById('navCartBadge');
  if (!badge) return;
  const cart = JSON.parse(localStorage.getItem('pk_cart') || '[]');
  const count = cart.reduce((s, c) => s + c.qty, 0);
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

// Auto-inject on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  injectNavbar();
  injectFooter();
  updateNavCartBadge();
});

// Update badge when cart changes (cross-tab via storage event)
window.addEventListener('storage', updateNavCartBadge);
window.addEventListener('cartUpdated', updateNavCartBadge);
