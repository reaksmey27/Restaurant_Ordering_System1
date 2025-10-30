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

    // ------------------- Helpers -------------------
    const saveCart = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    const formatCurrency = n => {
      try { return '$' + Number(n).toFixed(2); } 
      catch { return '$0.00'; }
    };
    const findItemIndexById = id => cart.findIndex(i => String(i.food_id) === String(id));
    const updateCartCount = () => {
      if (cartCountElement) cartCountElement.textContent = cart.reduce((sum, i) => sum + Number(i.quantity || 0), 0);
    };

    const addToCart = (foodId, foodName, price, imageUrl) => {
      const idx = findItemIndexById(foodId);
      if (idx >= 0) cart[idx].quantity = (Number(cart[idx].quantity) || 0) + 1;
      else cart.push({ food_id: String(foodId), food_name: String(foodName || 'Item'), price: Number(price) || 0, quantity: 1, image_url: String(imageUrl || '') });
      saveCart();
      window.dispatchEvent(new Event('storage'));
    };

    const removeFromCart = id => { cart = cart.filter(i => String(i.food_id) !== String(id)); saveCart(); window.dispatchEvent(new Event('storage')); };
    const setQuantity = (id, qty) => {
      const idx = findItemIndexById(id);
      if (idx < 0) return;
      cart[idx].quantity = Math.max(0, Math.floor(Number(qty) || 0));
      if (cart[idx].quantity === 0) cart.splice(idx, 1);
      saveCart();
      window.dispatchEvent(new Event('storage'));
    };

    const clearCartDisplay = () => { if (cartItemsList) cartItemsList.innerHTML = ''; };
    const renderEmptyRow = () => {
      if (!cartItemsList) return;
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', '6');
      td.textContent = 'Your cart is empty';
      tr.appendChild(td);
      cartItemsList.appendChild(tr);
    };

    const renderCartRows = () => {
      if (!cartItemsList) return;
      clearCartDisplay();
      if (cart.length === 0) { renderEmptyRow(); return; }

      cart.forEach(item => {
        const tr = document.createElement('tr');

        // Image
        const imgTd = document.createElement('td');
        const img = document.createElement('img');
        img.src = item.image_url || '';
        img.alt = item.food_name || '';
        img.style.width = '60px';
        img.style.height = '40px';
        img.style.objectFit = 'cover';
        imgTd.appendChild(img);
        tr.appendChild(imgTd);

        // Name
        const nameTd = document.createElement('td');
        nameTd.textContent = item.food_name || '';
        tr.appendChild(nameTd);

        // Price
        const priceTd = document.createElement('td');
        priceTd.textContent = formatCurrency(item.price || 0);
        tr.appendChild(priceTd);

        // Quantity controls
        const qtyTd = document.createElement('td');
        const minusBtn = document.createElement('button');
        minusBtn.type = 'button';
        minusBtn.className = 'qty-minus';
        minusBtn.dataset.foodId = item.food_id;
        minusBtn.textContent = '-';
        const qtySpan = document.createElement('span');
        qtySpan.className = 'qty-value';
        qtySpan.textContent = String(item.quantity || 0);
        qtySpan.style.margin = '0 8px';
        const plusBtn = document.createElement('button');
        plusBtn.type = 'button';
        plusBtn.className = 'qty-plus';
        plusBtn.dataset.foodId = item.food_id;
        plusBtn.textContent = '+';
        qtyTd.append(minusBtn, qtySpan, plusBtn);
        tr.appendChild(qtyTd);

        // Subtotal
        const subtotalTd = document.createElement('td');
        subtotalTd.textContent = formatCurrency(Number(item.price || 0) * Number(item.quantity || 0));
        subtotalTd.className = 'cart-subtotal';
        tr.appendChild(subtotalTd);

        // Cancel
        const cancelTd = document.createElement('td');
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'cancel-btn';
        cancelBtn.dataset.foodId = item.food_id;
        cancelBtn.textContent = 'Cancel';
        cancelTd.appendChild(cancelBtn);
        tr.appendChild(cancelTd);

        cartItemsList.appendChild(tr);
      });

      // Total row
      const totalRow = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', '4');
      td.textContent = 'Total';
      totalRow.appendChild(td);
      const totalValTd = document.createElement('td');
      totalValTd.setAttribute('colspan', '2');
      totalValTd.textContent = formatCurrency(cart.reduce((s, it) => s + (Number(it.price || 0) * Number(it.quantity || 0)), 0));
      totalRow.appendChild(totalValTd);
      cartItemsList.appendChild(totalRow);
    };

    // ------------------- Menu toggle -------------------
    if (menuToggle && navLinks) {
      menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('show');
        menuToggle.textContent = navLinks.classList.contains('show') ? '✖' : '☰';
      });
    }

    // ------------------- Order button -------------------
    document.addEventListener('click', evt => {
      const btn = evt.target.closest('.order-btn');
      if (!btn) return;
      evt.preventDefault();

      const foodCard = btn.closest('.food-card');
      if (!foodCard) return;

      let foodId = btn.dataset.foodId || foodCard.dataset.foodId || null;
      if (!foodId) {
        const link = btn.closest('a');
        const href = link ? link.href : null;
        if (href) {
          const match = href.match(/\/order\/(\d+)/);
          if (match) foodId = match[1];
        }
      }

      const nameEl = foodCard.querySelector('h2, .food-name');
      const foodName = nameEl ? nameEl.textContent.trim() : 'Item';

      let price = 0;
      const priceEl = foodCard.querySelector('.price');
      if (priceEl) {
        const discEl = priceEl.querySelector('.discounted-price');
        if (discEl) price = parseFloat(discEl.textContent.replace(/[^0-9.\-]/g, '')) || 0;
        else if (priceEl.dataset.original) price = parseFloat(priceEl.dataset.original) || 0;
        else price = parseFloat(priceEl.textContent.replace(/[^0-9.\-]/g, '')) || 0;
      }

      const imageEl = foodCard.querySelector('img');
      const imageUrl = imageEl ? imageEl.src : '';

      if (foodId) {
        addToCart(foodId, foodName, price, imageUrl);
        updateCartCount();
        renderCartRows();
      }

      const parentAnchor = btn.closest('a');
      if (parentAnchor && parentAnchor.href) {
        setTimeout(() => window.location.href = parentAnchor.href, 50);
      }
    });

    // ------------------- Cart popup -------------------
    if (cartBtn && cartPopup) cartBtn.addEventListener('click', () => { renderCartRows(); updateCartCount(); cartPopup.style.display = 'block'; });
    if (closeCartBtn && cartPopup) closeCartBtn.addEventListener('click', () => cartPopup.style.display = 'none');
    window.addEventListener('click', evt => { if (cartPopup && evt.target === cartPopup) cartPopup.style.display = 'none'; });
    window.addEventListener('keydown', e => { if (e.key === 'Escape') { if (cartPopup) cartPopup.style.display = 'none'; if (feedbackPopup) feedbackPopup.style.display = 'none'; } });

    if (cartItemsList) {
      cartItemsList.addEventListener('click', evt => {
        const cancel = evt.target.closest('.cancel-btn'); if (cancel) { removeFromCart(cancel.dataset.foodId); renderCartRows(); updateCartCount(); return; }
        const plus = evt.target.closest('.qty-plus'); if (plus) { const idx = findItemIndexById(plus.dataset.foodId); if (idx >= 0) { setQuantity(plus.dataset.foodId, (Number(cart[idx].quantity) || 0) + 1); renderCartRows(); updateCartCount(); } return; }
        const minus = evt.target.closest('.qty-minus'); if (minus) { const idx = findItemIndexById(minus.dataset.foodId); if (idx >= 0) { setQuantity(minus.dataset.foodId, (Number(cart[idx].quantity) || 0) - 1); renderCartRows(); updateCartCount(); } }
      });
    }

    // ------------------- Multi-tab sync -------------------
    window.addEventListener('storage', () => { cart = JSON.parse(localStorage.getItem(STORAGE_KEY)) || cart; updateCartCount(); if (cartPopup && cartPopup.style.display === 'block') renderCartRows(); });
    updateCartCount();

    // ------------------- Auth toggle -------------------
    if (container) {
      const signUpButton = document.getElementById('signUp');
      const signInButton = document.getElementById('signIn');
      if (signUpButton) signUpButton.addEventListener('click', () => container.classList.add('right-panel-active'));
      if (signInButton) signInButton.addEventListener('click', () => container.classList.remove('right-panel-active'));
      if (document.querySelector('.register_error, .register_success')) container.classList.add('right-panel-active');
      if (document.querySelector('.login_error')) container.classList.remove('right-panel-active');
    }

    // ------------------- Coupon -------------------
    if (promoForm && couponInput && promoMessage) {
      promoForm.addEventListener('submit', async e => {
        e.preventDefault();
        const code = couponInput.value.trim();
        if (!code) { promoMessage.textContent = '❌ Please enter a coupon code.'; return; }
        try {
          const response = await fetch('/apply_coupon', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ coupon_code: code }) });
          const data = await response.json();
          if (data.success) {
            promoMessage.textContent = `✅ Coupon "${code}" applied! 20% off.`;
            document.querySelectorAll('.food-card .price').forEach(priceEl => {
              let original = parseFloat(priceEl.dataset.original || priceEl.textContent.replace(/[^0-9.\-]/g, '')) || 0;
              const discounted = (original * 0.8).toFixed(2);
              priceEl.innerHTML = `<span class="original-price" style="text-decoration: line-through;">$${original.toFixed(2)}</span><span class="discounted-price">$${discounted}</span>`;
              priceEl.dataset.original = original.toFixed(2);
            });
          } else promoMessage.textContent = `❌ ${data.message || 'Invalid coupon code.'}`;
        } catch (err) { promoMessage.textContent = '❌ Error applying coupon. Try again.'; console.error(err); }
      });
    }

    // ------------------- Feedback -------------------
    if (feedbackForm) {
      feedbackForm.addEventListener('submit', async e => {
        e.preventDefault();
        const formData = new FormData(feedbackForm);
        const data = Object.fromEntries(formData.entries());
        if (!data.name || !data.email || !data.message) { alert('❌ Please fill out all fields.'); return; }
        try {
          const response = await fetch('/submit_feedback', { method: 'POST', body: formData });
          const result = await response.json();
          if (result.success) { if (feedbackPopup) feedbackPopup.style.display = 'block'; feedbackForm.reset(); }
          else alert('❌ Error: ' + (result.error || 'Could not send feedback.'));
        } catch (err) { console.error(err); alert('❌ Failed to submit feedback. Try again later.'); }
      });
    }
    if (closePopup) closePopup.addEventListener('click', () => { if (feedbackPopup) feedbackPopup.style.display = 'none'; });
    window.addEventListener('click', e => { if (feedbackPopup && e.target === feedbackPopup) feedbackPopup.style.display = 'none'; });

  } catch (err) {
    console.error('Script error:', err);
  }
});
