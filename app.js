/* ============================================================
   Chat IA con n8n – pedido.html
============================================================ */

// Webhook de n8n configurado para Passages Kebab
const N8N_WEBHOOK_URL = 'https://joanmazo.app.n8n.cloud/webhook/a8177f50-b3c7-412d-b2f3-b15f5eb5ef2f/chat';

// Identificador de sesión persistente para memoria conversacional en n8n
let sessionId = localStorage.getItem('pk_chat_session_id');
if (!sessionId) {
  sessionId = 'pk_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
  localStorage.setItem('pk_chat_session_id', sessionId);
}

let chatHist = [];

const chatMessages = document.getElementById('chatMessages');
const chatForm     = document.getElementById('chatForm');
const chatInput    = document.getElementById('chatInput');
const sendOrderBtn = document.getElementById('sendOrderBtn');

// ── Render cart panel ─────────────────────────────────────────
function renderCartPanel() {
  const cart         = Cart.get();
  const cartItemsEl  = document.getElementById('cartItems');
  const cartFooterEl = document.getElementById('cartFooter');
  const cartTotalEl  = document.getElementById('cartTotal');

  if (!cartItemsEl) return;

  if (cart.length === 0) {
    cartItemsEl.innerHTML = '<p class="cart-empty">Tu carrito está vacío.<br><a href="carta.html" class="link-red">→ Ver la carta</a></p>';
    if (cartFooterEl) cartFooterEl.style.display = 'none';
    return;
  }

  cartItemsEl.innerHTML = cart.map(c => `
    <div class="cart-item">
      <span class="cart-item-qty">${c.qty}×</span>
      <span class="cart-item-name">${c.name}</span>
      <span class="cart-item-price">${(c.price * c.qty).toFixed(2)} €</span>
      <button class="cart-item-del" data-id="${c.id}" title="Eliminar">✕</button>
    </div>
  `).join('');

  if (cartTotalEl) cartTotalEl.textContent = Cart.total().toFixed(2) + ' €';
  if (cartFooterEl) cartFooterEl.style.display = 'block';

  cartItemsEl.querySelectorAll('.cart-item-del').forEach(btn => {
    btn.addEventListener('click', () => {
      Cart.remove(parseInt(btn.dataset.id));
      renderCartPanel();
    });
  });
}

// ── Send cart to chat ─────────────────────────────────────────
if (sendOrderBtn) {
  sendOrderBtn.addEventListener('click', () => {
    const cart = Cart.get();
    if (cart.length === 0) return;
    const lines = cart.map(c => `• ${c.qty}× ${c.name} (${(c.price * c.qty).toFixed(2)}€)`).join('\n');
    const text  = `Quiero hacer el siguiente pedido:\n${lines}\n\nTotal: ${Cart.total().toFixed(2)}€`;
    sendMessage(text);
    if (chatInput) chatInput.focus();
  });
}

// ── Chat ─────────────────────────────────────────────────────
if (chatForm) {
  chatForm.addEventListener('submit', e => {
    e.preventDefault();
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';
    sendMessage(text);
  });
}

function sendMessage(text) {
  appendMsg('user', text);
  chatHist.push({ role: 'user', content: text });
  showTyping();
  callN8N(text);
}

function appendMsg(role, text) {
  if (!chatMessages) return;
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.innerHTML = `<div class="msg-bubble">${escapeHtml(text).replace(/\n/g,'<br>')}</div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTyping() {
  if (!chatMessages) return;
  const div = document.createElement('div');
  div.className = 'msg bot msg-typing';
  div.id = 'typingIndicator';
  div.innerHTML = `<div class="msg-bubble"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTyping() {
  const t = document.getElementById('typingIndicator');
  if (t) t.remove();
}

async function callN8N(userText) {
  try {
    const cart = Cart.get();
    const cartSummaryText = cart.length
      ? cart.map(c => `${c.qty}x ${c.name} (${(c.price * c.qty).toFixed(2)}€)`).join(', ')
      : 'Vacío';

    const payload = {
      sessionId:  sessionId,
      chatInput:  userText,
      message:    userText,
      action:     'sendMessage',
      cart:       cart,
      cartSummary: cartSummaryText,
      cartTotal:  Cart.total().toFixed(2),
      history:    chatHist.slice(-10),
      timestamp:  new Date().toISOString(),
      source:     'passages-kebab-web'
    };

    const res = await fetch(N8N_WEBHOOK_URL, {
      method:  'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Servidor n8n respondió con error HTTP ${res.status}: ${errBody || res.statusText}`);
    }
    
    // n8n puede responder con JSON o texto plano
    let rawText = await res.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = rawText;
    }

    hideTyping();

    // Soporte flexible para cualquier formato de respuesta de n8n
    let reply = '';
    if (typeof data === 'string') {
      reply = data;
    } else if (Array.isArray(data) && data.length > 0) {
      const first = data[0];
      reply = first.output || first.text || first.reply || first.message || (typeof first === 'string' ? first : JSON.stringify(first));
    } else if (typeof data === 'object' && data !== null) {
      reply = data.output || data.reply || data.text || data.message || data.response || (data.data && (data.data.output || data.data.text));
    }

    if (!reply) {
      reply = '¡Mensaje recibido con éxito! Tu pedido está siendo procesado.';
    }

    chatHist.push({ role: 'assistant', content: reply });
    appendMsg('bot', reply);
  } catch (err) {
    console.error('Error comunicando con n8n:', err);
    hideTyping();
    const errorMsg = `⚠️ No se pudo obtener respuesta de la IA en n8n (${err.message || 'Error de conexión'}). Revisa que el workflow en n8n esté en estado "Active".`;
    chatHist.push({ role: 'assistant', content: errorMsg });
    appendMsg('bot', errorMsg);
  }
}

function getFallbackReply(text) {
  text = text.toLowerCase();
  if (text.includes('hola') || text.includes('buenas'))
    return '¡Hola! 👋 ¿Qué te pongo hoy? Si aún no has visto la carta, puedes verla en la sección Carta.';
  if (text.includes('precio') || text.includes('cuánto') || text.includes('cuanto'))
    return 'Nuestros kebabs desde 6,50€. ¡Echa un vistazo a la carta! 🌯';
  if (text.includes('hora') || text.includes('horario'))
    return '⏰ Abrimos todos los días de 12:00 a 24:00 h.';
  if (text.includes('domicilio') || text.includes('envío') || text.includes('envio') || text.includes('reparto'))
    return '🛵 Hacemos reparto en un radio de 5 km. Mínimo 10€ · Gratis desde 12€ · Entrega aprox. 30 min.';
  if (text.includes('ingrediente') || text.includes('alergi'))
    return '⚠️ Consúltanos por cualquier alergia. Trabajamos con gluten, lácteos, sésamo y frutos secos. Tenemos opción vegana.';
  if (text.includes('pedido') || text.includes('quiero') || text.includes('pedir'))
    return '¡Genial! 🎉 Usa el botón "Enviar pedido al asistente" cuando tengas todo en el carrito. Te confirmaremos enseguida.';
  if (text.includes('gracias'))
    return '¡A ti! 😊 ¡Buen provecho!';
  return '¡Entendido! 😊 Estoy aquí para ayudarte con tu pedido. ¿Algo más que necesites?';
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderCartPanel();
  window.addEventListener('cartUpdated', renderCartPanel);
});
