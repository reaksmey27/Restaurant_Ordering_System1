// cartPopup.js
import { removeFromCart, displayCartItems, updateCartDisplay } from './cartState.js';

const cartBtn = document.getElementById('cartBtn');
const cartPopup = document.getElementById('cartPopup');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartItemsList = document.getElementById('cartItems');

if (cartBtn && cartPopup) {
  cartBtn.addEventListener('click', function () {
    displayCartItems();
    cartPopup.style.display = 'block';
  });
}

if (closeCartBtn && cartPopup) {
  closeCartBtn.addEventListener('click', function () { cartPopup.style.display = 'none'; });
}

window.addEventListener('click', function (evt) {
  if (!cartPopup) return;
  if (evt.target === cartPopup) cartPopup.style.display = 'none';
});

if (cartItemsList) {
  cartItemsList.addEventListener('click', function (evt) {
    const btn = evt.target.closest && evt.target.closest('.cancel-btn');
    if (!btn) return;
    const id = btn.getAttribute('data-food-id');
    if (!id) return;
    removeFromCart(id);
    displayCartItems();
    updateCartDisplay();
  });
}
