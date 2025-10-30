document.addEventListener('DOMContentLoaded', function () {
  try {
    // ------------------- Cart state -------------------
    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    // DOM references
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
      const id = String(foodId);
      const existing = cart.find(i => String(i.food_id) === id);
      if (existing) {
        existing.quantity = (existing.quantity || 0) + 1;
      } else {
        cart.push({
          food_id: id,
          food_name: foodName,
          price: Number(price) || 0,
          quantity: 1,
          image_url: imageUrl || ''
        });
      }
      saveCart();
    }

    function removeFromCart(foodId) {
      const id = String(foodId);
      cart = cart.filter(i => String(i.food_id) !== id);
      saveCart();
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

    function escapeHtml(str) {
      if (str == null) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    // ------------------- Order button handling -------------------
    document.addEventListener('click', function (evt) {
      const btn = evt.target.closest('.order-btn');
      if (!btn) return;
      evt.preventDefault();

      const foodCard = btn.closest('.food-card');
      if (!foodCard) return;

      let foodId = btn.dataset.foodId || foodCard.dataset.foodId || null;
      if (!foodId) {
        const link = btn.closest('a');
        const href = link ? link.getAttribute('href') : null;
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
        if (discEl) {
          price = parseFloat(discEl.textContent.replace(/[^0-9.\-]/g, '')) || 0;
        } else if (priceEl.dataset.original) {
          price = parseFloat(priceEl.dataset.original) || 0;
        } else {
          price = parseFloat(priceEl.textContent.replace(/[^0-9.\-]/g, '')) || 0;
        }
      }

      const imageEl = foodCard.querySelector('img');
      const imageUrl = imageEl ? imageEl.src : '';

      if (foodId) addToCart(foodId, foodName, price, imageUrl);
      updateCartDisplay();
      displayCartItems();

      const parentAnchor = btn.closest('a');
      if (parentAnchor && parentAnchor.href) {
        setTimeout(() => {
          window.location.href = parentAnchor.href;
        }, 50);
      }
    });

    // ------------------- Cart popup -------------------
    if (cartBtn && cartPopup) {
      cartBtn.addEventListener('click', function () {
        displayCartItems();
        cartPopup.style.display = 'block';
      });
    }

    if (closeCartBtn && cartPopup) {
      closeCartBtn.addEventListener('click', function () {
        cartPopup.style.display = 'none';
      });
    }

    window.addEventListener('click', function (evt) {
      if (cartPopup && evt.target === cartPopup) {
        cartPopup.style.display = 'none';
      }
    });

    if (cartItemsList) {
      cartItemsList.addEventListener('click', function (evt) {
        const btn = evt.target.closest('.cancel-btn');
        if (!btn) return;
        const id = btn.dataset.foodId;
        if (!id) return;
        removeFromCart(id);
        displayCartItems();
        updateCartDisplay();
      });
    }

    updateCartDisplay();

    // ------------------- Auth toggle -------------------
    if (container) {
      const signUpButton = document.getElementById('signUp');
      const signInButton = document.getElementById('signIn');

      if (signUpButton) {
        signUpButton.addEventListener('click', () => container.classList.add('right-panel-active'));
      }
      if (signInButton) {
        signInButton.addEventListener('click', () => container.classList.remove('right-panel-active'));
      }

      if (document.querySelector('.register_error, .register_success')) {
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
            document.querySelectorAll('.food-card .price').forEach(priceEl => {
              let original = parseFloat(priceEl.dataset.original || priceEl.textContent.replace(/[^0-9.\-]/g, '')) || 0;
              const discounted = (original * 0.8).toFixed(2);
              priceEl.innerHTML = `
                <span class="original-price" style="text-decoration: line-through;">$${original.toFixed(2)}</span>
                <span class="discounted-price">$${discounted}</span>
              `;
              priceEl.dataset.original = original.toFixed(2);
            });
          } else {
            promoMessage.textContent = `❌ ${data.message || 'Invalid coupon code.'}`;
          }
        } catch (err) {
          promoMessage.textContent = '❌ Error applying coupon. Try again.';
          console.error('Coupon error:', err);
        }
      });
    }

    // ------------------- Feedback form + popup (store in DB) -------------------
    const feedbackForm = document.getElementById('feedbackForm');
    const feedbackPopup = document.getElementById('feedbackPopup');
    const closePopup = document.getElementById('closePopup');

    if (feedbackForm) {
      feedbackForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const formData = new FormData(feedbackForm);
        const data = Object.fromEntries(formData.entries());

        if (!data.name || !data.email || !data.message) {
          alert('❌ Please fill out all fields.');
          return;
        }

        try {
          const response = await fetch('/submit_feedback', {
            method: 'POST',
            body: formData
          });

          const result = await response.json();

          if (result.success) {
            feedbackPopup.style.display = 'block';
            feedbackForm.reset();
          } else {
            alert('❌ Error: ' + (result.error || 'Could not send feedback.'));
          }
        } catch (error) {
          console.error('Feedback error:', error);
          alert('❌ Failed to submit feedback. Try again later.');
        }
      });
    }

    if (closePopup) {
      closePopup.addEventListener('click', function () {
        feedbackPopup.style.display = 'none';
      });
    }

    window.addEventListener('click', function (e) {
      if (e.target === feedbackPopup) {
        feedbackPopup.style.display = 'none';
      }
    });

  } catch (err) {
    console.error('Script error:', err);
  }
});
