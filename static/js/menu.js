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


// couponHandler.js
const promoForm = document.getElementById('promoForm');
const couponInput = document.getElementById('couponInput');
const promoMessage = document.getElementById('promoMessage');

if (promoForm && couponInput && promoMessage) {
  promoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = couponInput.value.trim();
    if (!code) {
      promoMessage.textContent = '❌ Please enter a coupon code.';
      return;
    }
    try {
      const response = await fetch('/apply_coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ coupon_code: code })
      });
      const data = await response.json();
      if (data.success) {
        promoMessage.textContent = `✅ Coupon "${code}" applied! 20% off will be applied.`;

        document.querySelectorAll('.food-card').forEach(card => {
          const priceEl = card.querySelector('.price');
          if (!priceEl) return;

          let original = priceEl.dataset && priceEl.dataset.original
            ? parseFloat(priceEl.dataset.original)
            : parseFloat((priceEl.textContent || '').replace(/[^0-9.\-]/g, '')) || null;

          if (original != null && !Number.isNaN(original)) {
            const discountedPrice = (original * 0.8).toFixed(2);
            priceEl.innerHTML = `
              <span class="original-price" style="text-decoration: line-through;">$${Number(original).toFixed(2)}</span>
              <span class="discounted-price">$${discountedPrice}</span>
            `;
            priceEl.dataset.original = Number(original).toFixed(2);
          }
        });
      } else {
        promoMessage.textContent = `❌ ${data.message || 'Invalid coupon code.'}`;
      }
    } catch (err) {
      promoMessage.textContent = '❌ Error applying coupon. Try again.';
      console.error('Coupon error', err);
    }
  });
}

