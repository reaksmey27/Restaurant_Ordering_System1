document.addEventListener('DOMContentLoaded', function () {
  try {
    // ------------------- State -------------------
    const STORAGE_KEY = 'cart';
    let cart = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    // DOM refs
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.querySelector('.nav-links');
    const cartBtn = document.getElementById('cartBtn');
    const cartPopup = document.getElementById('cartPopup');
    const closeCartBtn = document.getElementById('closeCartBtn');
    const cartItemsList = document.getElementById('cartItems');
    const cartCountElement = document.getElementById('cartCount');
    const container = document.getElementById('container');
    const promoForm = document.getElementById('promoForm');
    const couponInput = document.getElementById('couponInput');
    const promoMessage = document.getElementById('promoMessage');
    const feedbackForm = document.getElementById('feedbackForm');
    const feedbackPopup = document.getElementById('feedbackPopup');
    const closePopup = document.getElementById('closePopup');
    const removeCouponBtn = document.getElementById('removeCouponBtn');

    // ------------------- Helpers -------------------
    const saveCart = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    const formatCurrency = n => {
      try { return '$' + Number(n).toFixed(2); }
      catch { return '$0.00'; }
    };
    const findItemIndexById = id => cart.findIndex(i => String(i.food_id) === String(id));
    const updateCartCount = () => {
      if (cartCountElement) {
        cartCountElement.textContent = cart.reduce((sum, i) => sum + Number(i.quantity || 0), 0);
      }
    };

    const addToCart = (foodId, foodName, price, imageUrl) => {
      const idx = findItemIndexById(foodId);
      if (idx >= 0) {
        cart[idx].quantity = (Number(cart[idx].quantity) || 0) + 1;
      } else {
        cart.push({
          food_id: String(foodId),
          food_name: String(foodName || 'Item'),
          price: Number(price) || 0,
          quantity: 1,
          image_url: String(imageUrl || '')
        });
      }
      saveCart();
      updateCartCount();
      window.dispatchEvent(new Event('storage'));
      showAlert('Added to cart!', 'success');
    };

    const removeFromCart = id => {
      cart = cart.filter(i => String(i.food_id) !== String(id));
      saveCart();
      updateCartCount();
      window.dispatchEvent(new Event('storage'));
      showAlert('Item removed', 'info');
    };

    const setQuantity = (id, qty) => {
      const idx = findItemIndexById(id);
      if (idx < 0) return;
      cart[idx].quantity = Math.max(0, Math.floor(Number(qty) || 0));
      if (cart[idx].quantity === 0) cart.splice(idx, 1);
      saveCart();
      updateCartCount();
      window.dispatchEvent(new Event('storage'));
    };

    // ------------------- Coupon Helpers -------------------
    const fetchCoupon = async () => {
      try {
        const r = await fetch('/coupon');
        const d = await r.json();
        activeCoupon = d.coupon;
        if (removeCouponBtn) removeCouponBtn.style.display = activeCoupon ? 'inline-block' : 'none';
      } catch { activeCoupon = null; }
    };
    let activeCoupon = null;

    // ------------------- Rendering -------------------
    const clearCartDisplay = () => {
      if (cartItemsList) cartItemsList.innerHTML = '';
    };

    const renderEmptyRow = () => {
      if (!cartItemsList) return;
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', '6');
      td.textContent = 'Your cart is empty';
      td.style.textAlign = 'center';
      td.style.padding = '20px';
      td.style.fontStyle = 'italic';
      td.style.color = '#888';
      tr.appendChild(td);
      cartItemsList.appendChild(tr);
    };

    const renderCartRows = async () => {
      await fetchCoupon();
      clearCartDisplay();
      if (cart.length === 0) { renderEmptyRow(); return; }

      let subtotal = 0;

      cart.forEach(item => {
        const tr = document.createElement('tr');

        // Image
        const imgTd = document.createElement('td');
        const img = document.createElement('img');
        img.src = item.image_url || 'https://via.placeholder.com/60x40?text=Food';
        img.alt = item.food_name;
        img.style.width = '60px';
        img.style.height = '40px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '4px';
        imgTd.appendChild(img);
        tr.appendChild(imgTd);

        // Name
        const nameTd = document.createElement('td');
        nameTd.textContent = item.food_name;
        nameTd.style.maxWidth = '150px';
        nameTd.style.whiteSpace = 'nowrap';
        nameTd.style.overflow = 'hidden';
        nameTd.style.textOverflow = 'ellipsis';
        tr.appendChild(nameTd);

        // Price
        const priceTd = document.createElement('td');
        priceTd.textContent = formatCurrency(item.price);
        tr.appendChild(priceTd);

        // Quantity
        const qtyTd = document.createElement('td');
        const minusBtn = document.createElement('button');
        minusBtn.type = 'button';
        minusBtn.className = 'qty-minus';
        minusBtn.dataset.foodId = item.food_id;
        minusBtn.textContent = '−';
        minusBtn.style.padding = '0 8px';
        minusBtn.style.fontWeight = 'bold';
        const qtySpan = document.createElement('span');
        qtySpan.className = 'qty-value';
        qtySpan.textContent = item.quantity;
        qtySpan.style.margin = '0 8px';
        qtySpan.style.fontWeight = 'bold';
        const plusBtn = document.createElement('button');
        plusBtn.type = 'button';
        plusBtn.className = 'qty-plus';
        plusBtn.dataset.foodId = item.food_id;
        plusBtn.textContent = '+';
        plusBtn.style.padding = '0 8px';
        plusBtn.style.fontWeight = 'bold';
        qtyTd.append(minusBtn, qtySpan, plusBtn);
        tr.appendChild(qtyTd);

        // Subtotal
        const lineTotal = item.price * item.quantity;
        subtotal += lineTotal;
        const subtotalTd = document.createElement('td');
        subtotalTd.textContent = formatCurrency(lineTotal);
        subtotalTd.className = 'cart-subtotal';
        tr.appendChild(subtotalTd);

        // Remove
        const cancelTd = document.createElement('td');
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'cancel-btn';
        cancelBtn.dataset.foodId = item.food_id;
        cancelBtn.textContent = 'Remove';
        cancelBtn.style.color = '#dc3545';
        cancelBtn.style.background = 'none';
        cancelBtn.style.border = 'none';
        cancelBtn.style.cursor = 'pointer';
        cancelTd.appendChild(cancelBtn);
        tr.appendChild(cancelTd);

        cartItemsList.appendChild(tr);
      });

      // ---- Coupon discount row ----
      if (activeCoupon) {
        const discount = subtotal * activeCoupon.discount;
        const discRow = document.createElement('tr');
        const labelTd = document.createElement('td');
        labelTd.setAttribute('colspan', '4');
        labelTd.innerHTML = `<em>Coupon: ${activeCoupon.code} (-${activeCoupon.discount * 100}%)</em>`;
        labelTd.style.textAlign = 'right';
        const amtTd = document.createElement('td');
        amtTd.setAttribute('colspan', '2');
        amtTd.innerHTML = `<strong>-${formatCurrency(discount)}</strong>`;
        discRow.append(labelTd, amtTd);
        cartItemsList.appendChild(discRow);
      }

      // ---- Total row ----
      const total = activeCoupon ? subtotal * (1 - activeCoupon.discount) : subtotal;
      const totalRow = document.createElement('tr');
      const labelTd = document.createElement('td');
      labelTd.setAttribute('colspan', '4');
      labelTd.innerHTML = '<strong>Total</strong>';
      labelTd.style.textAlign = 'right';
      const totalTd = document.createElement('td');
      totalTd.setAttribute('colspan', '2');
      totalTd.innerHTML = `<strong>${formatCurrency(total)}</strong>`;
      totalRow.append(labelTd, totalTd);
      cartItemsList.appendChild(totalRow);
    };

    // ------------------- Menu Toggle -------------------
    if (menuToggle && navLinks) {
      menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('show');
        menuToggle.textContent = navLinks.classList.contains('show') ? '×' : 'Menu';
      });
    }

    // ------------------- Add to Cart from Order Button -------------------
    document.addEventListener('click', evt => {
      const btn = evt.target.closest('.order-btn');
      if (!btn) return;
      evt.preventDefault();

      const foodCard = btn.closest('.food-card');
      if (!foodCard) return;

      const href = btn.href || '';
      const match = href.match(/\/order\/(\d+)/);
      const foodId = match ? match[1] : null;
      if (!foodId) return;

      const nameEl = foodCard.querySelector('h2');
      const foodName = nameEl ? nameEl.textContent.trim() : 'Item';

      let price = 0;
      const priceEl = foodCard.querySelector('.price');
      if (priceEl) {
        const disc = priceEl.querySelector('.discounted-price');
        price = disc ? parseFloat(disc.textContent.replace(/[^0-9.]/g, '')) : 0;
        if (!price) price = parseFloat(priceEl.textContent.replace(/[^0-9.]/g, '')) || 0;
      }

      const imgEl = foodCard.querySelector('img');
      const imageUrl = imgEl ? imgEl.src : '';

      addToCart(foodId, foodName, price, imageUrl);
      renderCartRows();

      setTimeout(() => window.location.href = btn.href, 100);
    });

    // ------------------- Cart Popup -------------------
    if (cartBtn) {
      cartBtn.addEventListener('click', () => {
        renderCartRows();
        updateCartCount();
        if (cartPopup) {
          cartPopup.style.display = 'block';
          // Remove animation class if it exists
          cartPopup.style.animation = 'none';
        }
      });
    }

    if (closeCartBtn) {
      closeCartBtn.addEventListener('click', () => {
        if (cartPopup) {
          cartPopup.style.display = 'none';
          cartPopup.style.animation = ''; // Reset for next open if needed
        }
      });
    }

    if (cartPopup) {
      window.addEventListener('click', e => {
        if (e.target === cartPopup) {
          cartPopup.style.display = 'none';
          cartPopup.style.animation = '';
        }
      });
    }

    // Quantity / Remove buttons
    if (cartItemsList) {
      cartItemsList.addEventListener('click', e => {
        e.stopPropagation();
        const plus = e.target.closest('.qty-plus');
        const minus = e.target.closest('.qty-minus');
        const cancel = e.target.closest('.cancel-btn');

        if (plus) {
          const id = plus.dataset.foodId;
          const idx = findItemIndexById(id);
          if (idx >= 0) setQuantity(id, cart[idx].quantity + 1);
          renderCartRows();
        }
        if (minus) {
          const id = minus.dataset.foodId;
          const idx = findItemIndexById(id);
          if (idx >= 0) setQuantity(id, cart[idx].quantity - 1);
          renderCartRows();
        }
        if (cancel) {
          removeFromCart(cancel.dataset.foodId);
          renderCartRows();
        }
      });
    }

    // ------------------- Multi-tab Sync -------------------
    window.addEventListener('storage', () => {
      cart = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      updateCartCount();
      if (cartPopup && cartPopup.style.display === 'block') renderCartRows();
    });

    // Initial render
    updateCartCount();

    // ------------------- Auth Toggle -------------------
    if (container) {
      const signUp = document.getElementById('signUp');
      const signIn = document.getElementById('signIn');
      if (signUp) signUp.addEventListener('click', () => container.classList.add('right-panel-active'));
      if (signIn) signIn.addEventListener('click', () => container.classList.remove('right-panel-active'));
    }

    // ------------------- Coupon -------------------
    if (promoForm && couponInput && promoMessage) {
      promoForm.addEventListener('submit', async e => {
        e.preventDefault();
        const code = couponInput.value.trim().toUpperCase();
        if (!code) {
          showAlert('Enter a coupon code.', 'error');
          return;
        }

        const payload = new URLSearchParams({ coupon_code: code });
        const res = await fetch('/apply_coupon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: payload
        });
        const data = await res.json();

        if (data.success) {
          showAlert(`Coupon "${code}" applied! 20% off.`, 'success');
        } else {
          showAlert(data.message || 'Invalid coupon.', 'error');
        }
        couponInput.value = '';

        // INSTANT UPDATE: Re-render cart immediately
        if (cartPopup && cartPopup.style.display === 'block') {
          await renderCartRows();
        }
      });
    }

    // Remove coupon button
    if (removeCouponBtn) {
      removeCouponBtn.addEventListener('click', async () => {
        await fetch('/remove_coupon', { method: 'POST' });
        showAlert('Coupon removed.', 'info');
        if (cartPopup && cartPopup.style.display === 'block') {
          await renderCartRows();
        }
      });
    }

    // ------------------- Feedback (Fixed & Safe) -------------------
    if (feedbackForm) {
      feedbackForm.addEventListener('submit', async e => {
        e.preventDefault();
        const formData = new FormData(feedbackForm);
        const name = formData.get('name')?.trim();
        const email = formData.get('email')?.trim();
        const message = formData.get('message')?.trim();

        if (!name || !email || !message) {
          showAlert('Please fill in all fields.', 'error');
          return;
        }

        const submitBtn = feedbackForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = 'Sending...';
        submitBtn.disabled = true;

        try {
          const response = await fetch('/submit_feedback', {
            method: 'POST',
            body: formData
          });

          let result;
          const text = await response.text();
          try { result = JSON.parse(text); }
          catch { throw new Error('Invalid response'); }

          if (response.ok && result.success) {
            feedbackForm.reset();
            showAlert('Thank you for your feedback!', 'success');
            if (feedbackPopup) feedbackPopup.style.display = 'block';
          } else {
            showAlert(result.error || 'Failed to send feedback.', 'error');
          }
        } catch (err) {
          console.error('Feedback error:', err);
          showAlert('Network error. Please try again.', 'error');
        } finally {
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
        }
      });
    }

    if (closePopup && feedbackPopup) {
      closePopup.addEventListener('click', () => {
        feedbackPopup.style.display = 'none';
      });
    }

    if (feedbackPopup) {
      window.addEventListener('click', e => {
        if (e.target === feedbackPopup) feedbackPopup.style.display = 'none';
      });
    }

    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (cartPopup) {
          cartPopup.style.display = 'none';
          cartPopup.style.animation = '';
        }
        if (feedbackPopup) feedbackPopup.style.display = 'none';
      }
    });

    // ------------------- Alert System -------------------
    function showAlert(message, type = 'info') {
      document.querySelectorAll('.custom-alert').forEach(el => el.remove());

      const alert = document.createElement('div');
      alert.className = 'custom-alert';
      alert.textContent = message;
      alert.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        padding: 12px 24px; border-radius: 8px; color: white; font-weight: bold; z-index: 9999;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.2); font-size: 14px;
        animation: fadeIn 0.3s ease;
      `;
      document.body.appendChild(alert);
      setTimeout(() => alert.remove(), 3000);
    }

    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn { 
        from { opacity: 0; transform: translateX(-50%) translateY(-10px); } 
        to { opacity: 1; transform: translateX(-50%) translateY(0); } 
      }
      .custom-alert { animation: fadeIn 0.3s ease; }
    `;
    document.head.appendChild(style);

    // ------------------- Init -------------------
    fetchCoupon();
    updateCartCount();

  } catch (err) {
    console.error('App JS Error:', err);
  }
});