document.addEventListener('DOMContentLoaded', function () {
  try {
    // ------------------- Cart state -------------------
    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    // DOM refs (guarded)
    const cartBtn = document.getElementById('cartBtn');
    const cartPopup = document.getElementById('cartPopup');
    const closeCartBtn = document.getElementById('closeCartBtn');
    const cartItemsList = document.getElementById('cartItems');
    const cartCountElement = document.getElementById('cartCount');
    const container = document.getElementById('container');

    // ------------------- Helpers -------------------
    function saveCart() {
      localStorage.setItem('cart', JSON.stringify(cart));
    }

    function updateCartDisplay() {
      if (!cartCountElement) return;
      const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
      cartCountElement.textContent = totalItems;
    }

    function addToCart(foodId, foodName, price, imageUrl) {
      // normalize id to string for consistent comparisons
      const id = String(foodId);
      const existing = cart.find(i => String(i.food_id) === id);
      if (existing) existing.quantity = (existing.quantity || 0) + 1;
      else cart.push({ food_id: id, food_name: foodName, price: Number(price) || 0, quantity: 1, image_url: imageUrl || '' });
      saveCart();
    }

    function removeFromCart(foodId) {
      const id = String(foodId);
      const idx = cart.findIndex(i => String(i.food_id) === id);
      if (idx !== -1) {
        cart.splice(idx, 1);
        saveCart();
      }
    }

    function displayCartItems() {
      if (!cartItemsList) return;
      cartItemsList.innerHTML = '';
      if (cart.length === 0) {
        cartItemsList.innerHTML = '<tr><td colspan="6">Your cart is empty</td></tr>';
        return;
      }

      cart.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td><img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.food_name)}" style="width:60px;height:40px;object-fit:cover;"></td>
          <td>${escapeHtml(item.food_name)}</td>
          <td>$${Number(item.price || 0).toFixed(2)}</td>
          <td>${Number(item.quantity || 0)}</td>
          <td>$${(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}</td>
          <td><button class="cancel-btn" data-food-id="${escapeHtml(item.food_id)}">Cancel</button></td>
        `;
        cartItemsList.appendChild(row);
      });
    }

    // Simple escape for inserted HTML (prevents accidental injection)
    function escapeHtml(str) {
      if (str == null) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    // ------------------- Order button handling (delegation) -------------------
    // Use delegation so dynamically-rendered cards still work.
    document.addEventListener('click', function (evt) {
      const btn = evt.target.closest && evt.target.closest('.order-btn');
      if (!btn) return;

      evt.preventDefault();

      // Prefer data attributes on the button or its food-card ancestor
      const foodCard = btn.closest('.food-card');
      if (!foodCard) return;

      // Try data-food-id attribute on button then on ancestor, fallback to parsing href from anchor
      let foodId = btn.dataset.foodId || (foodCard.dataset && foodCard.dataset.foodId) || null;

      if (!foodId) {
        // check for ancestor anchor with /order/<id>
        const link = btn.closest('a');
        const href = link ? link.getAttribute('href') : null;
        if (href) {
          const m = href.match(/\/order\/(\d+)/);
          if (m) foodId = m[1];
        }
      }

      const nameEl = foodCard.querySelector('h2') || foodCard.querySelector('.food-name');
      const foodName = nameEl ? nameEl.textContent.trim() : 'Item';

      // price element: prefer .discounted-price then use data-original, then fallback to text content
      let price = 0;
      const priceEl = foodCard.querySelector('.price');
      if (priceEl) {
        const discEl = priceEl.querySelector('.discounted-price');
        if (discEl) price = parseFloat(discEl.textContent.replace(/[^0-9.\-]/g, '')) || 0;
        else if (priceEl.dataset && priceEl.dataset.original) price = parseFloat(priceEl.dataset.original) || 0;
        else price = parseFloat(priceEl.textContent.replace(/[^0-9.\-]/g, '')) || 0;
      }

      const imageEl = foodCard.querySelector('img');
      const imageUrl = imageEl ? imageEl.getAttribute('src') : '';

      if (foodId) addToCart(foodId, foodName, price, imageUrl);
      updateCartDisplay();
      displayCartItems();

      // if there is an anchor parent, navigate after a tiny delay to ensure localStorage is saved
      const parentAnchor = btn.closest('a');
      if (parentAnchor && parentAnchor.href) {
        // small timeout ensures localStorage write completes (usually synchronous, but keep UX smooth)
        setTimeout(() => { window.location.href = parentAnchor.href; }, 50);
      }
    });

    // ------------------- Cart popup handlers -------------------
    if (cartBtn && cartPopup) {
      cartBtn.addEventListener('click', function () {
        displayCartItems();
        cartPopup.style.display = 'block';
      });
    }

    if (closeCartBtn && cartPopup) {
      closeCartBtn.addEventListener('click', function () { cartPopup.style.display = 'none'; });
    }

    // close when clicking outside popup content (overlay)
    window.addEventListener('click', function (evt) {
      if (!cartPopup) return;
      if (evt.target === cartPopup) cartPopup.style.display = 'none';
    });

    // handle cancel buttons inside cart using delegation
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

    // Initial display update
    updateCartDisplay();

    // ------------------- Auth panel toggle -------------------
    if (container) {
      const signUpButton = document.getElementById('signUp');
      const signInButton = document.getElementById('signIn');

      if (signUpButton) {
        signUpButton.addEventListener('click', () => container.classList.add('right-panel-active'));
      }
      if (signInButton) {
        signInButton.addEventListener('click', () => container.classList.remove('right-panel-active'));
      }

      // Auto-switch based on flash classes present in DOM
      if (document.querySelector('.register_error') || document.querySelector('.register_success')) {
        container.classList.add('right-panel-active');
      }
      if (document.querySelector('.login_error')) {
        container.classList.remove('right-panel-active');
      }
    }

    // ------------------- Coupon handler -------------------
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

            // Update prices on menu: use dataset-original if present, otherwise attempt to parse.
            document.querySelectorAll('.food-card').forEach(card => {
              const priceEl = card.querySelector('.price');
              if (!priceEl) return;

              let original = null;
              if (priceEl.dataset && priceEl.dataset.original) {
                original = parseFloat(priceEl.dataset.original);
              } else {
                // try to find numeric value from displayed content (strip non-numeric)
                const txt = priceEl.textContent || '';
                original = parseFloat(txt.replace(/[^0-9.\-]/g, '')) || null;
              }

              if (original != null && !Number.isNaN(original)) {
                const discountedPrice = (original * 0.8).toFixed(2);
                priceEl.innerHTML = `
                  <span class="original-price" style="text-decoration: line-through;">$${Number(original).toFixed(2)}</span>
                  <span class="discounted-price">$${discountedPrice}</span>
                `;
                // ensure dataset.original remains consistent for future toggles
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

  } catch (err) {
    // top-level safety
    console.error('Cart script error:', err);
  }
});
