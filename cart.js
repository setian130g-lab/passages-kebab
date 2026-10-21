/* ============================================================
   Carrito persistente con localStorage
   Usado en carta.html y pedido.html
============================================================ */

const CART_KEY = 'pk_cart';

const Cart = {
  get() {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  },
  save(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    if (typeof updateNavCartBadge === 'function') {
      updateNavCartBadge();
    }
  },
  add(item) {
    const cart = Cart.get();
    const existing = cart.find(c => c.id === item.id);
    if (existing) existing.qty++;
    else cart.push({ id: item.id, name: item.name, price: item.price, qty: 1 });
    Cart.save(cart);
    return cart;
  },
  remove(id) {
    const cart = Cart.get().filter(c => c.id !== id);
    Cart.save(cart);
    return cart;
  },
  clear() {
    Cart.save([]);
  },
  total() {
    return Cart.get().reduce((s, c) => s + c.price * c.qty, 0);
  },
  count() {
    return Cart.get().reduce((s, c) => s + c.qty, 0);
  }
};
