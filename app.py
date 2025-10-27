from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from flask_mysqldb import MySQL
import MySQLdb.cursors
from werkzeug.security import generate_password_hash, check_password_hash
import os
from datetime import datetime
from functools import wraps
import logging

# ---------------- App setup ----------------
app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET') or os.urandom(24)

app.config['MYSQL_HOST'] = os.environ.get('MYSQL_HOST', 'localhost')
app.config['MYSQL_USER'] = os.environ.get('MYSQL_USER', 'root')
app.config['MYSQL_PASSWORD'] = os.environ.get('MYSQL_PASSWORD', '')
app.config['MYSQL_DB'] = os.environ.get('MYSQL_DB', 'foods')

mysql = MySQL(app)

# basic logger
logging.basicConfig(level=logging.INFO)


# ---------------- Helpers ----------------
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'username' not in session:
            return redirect(url_for('auth'))
        return f(*args, **kwargs)
    return decorated_function


def calculate_cart_total(cart=None):
    if cart is None:
        cart = session.get('cart', [])
    total = sum(item.get('price', 0) * item.get('quantity', 0) for item in cart)
    coupon = session.get('coupon')
    if coupon:
        try:
            total = total * (1 - float(coupon.get('discount', 0)))
        except Exception:
            pass
    return round(total, 2)


def get_cursor(dict_cursor=True):
    if dict_cursor:
        return mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    return mysql.connection.cursor()


# ---------------- Home ----------------
@app.route('/')
def home():
    current_time = datetime.now().astimezone().strftime("%Y-%m-%d %H:%M:%S %Z")
    foods = []
    cursor = get_cursor()
    try:
        cursor.execute(
            "SELECT food_id, food_name, category, price, image_url "
            "FROM food WHERE available = TRUE LIMIT 3"
        )
        foods = cursor.fetchall() or []
        if not foods:
            cursor.execute(
                "SELECT food_id, food_name, category, price, image_url FROM food LIMIT 3"
            )
            foods = cursor.fetchall() or []

        for f in foods:
            try:
                price = float(f.get('price') or 0)
                disc = float(f.get('discount_percent') or 0)
                f['discounted_price'] = round(price * (1 - disc / 100), 2) if disc > 0 else round(price, 2)
            except Exception:
                f['discounted_price'] = float(f.get('price') or 0)
    except Exception as e:
        logging.exception("Failed to load featured foods: %s", e)
        flash('Failed to load featured foods', 'error')
    finally:
        cursor.close()

    return render_template('index.html', current_time=current_time, foods=foods, current_page='home')


# ---------------- Auth (Login/Register) ----------------
@app.route('/auth', methods=['GET', 'POST'])
def auth():
    if request.method == 'POST':
        action = request.form.get('action')  # 'login' or 'register'
        username = (request.form.get('username') or '').strip()
        password = request.form.get('password') or ''
        email = (request.form.get('email') or '').strip()  # only for register

        if action == 'login':
            cursor = get_cursor()
            try:
                cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
                user = cursor.fetchone()
            except Exception as e:
                logging.exception("Login DB error: %s", e)
                flash('Server error during login', 'login_error')
                return render_template('auth.html')
            finally:
                cursor.close()

            if user and check_password_hash(user['password'], password):
                session['username'] = user['username']
                return redirect(url_for('menu'))
            else:
                flash('Invalid username or password', 'login_error')

        elif action == 'register':
            if not username or not password or not email:
                flash('Please fill in all fields', 'register_error')
                return render_template('auth.html')

            cursor = get_cursor()
            try:
                cursor.execute("SELECT username FROM users WHERE username = %s", (username,))
                if cursor.fetchone():
                    flash('Username already exists', 'register_error')
                else:
                    hashed_password = generate_password_hash(password)
                    cursor.execute(
                        "INSERT INTO users (username, password, email) VALUES (%s, %s, %s)",
                        (username, hashed_password, email)
                    )
                    mysql.connection.commit()
                    flash('Registration successful! Please login.', 'register_success')
                    return redirect(url_for('auth'))
            except Exception as e:
                mysql.connection.rollback()
                logging.exception("Registration error: %s", e)
                flash('Registration failed due to server error', 'register_error')
            finally:
                cursor.close()

    return render_template('auth.html')


# ---------------- Logout ----------------
@app.route('/logout')
def logout():
    session.pop('username', None)
    session.pop('coupon', None)
    return redirect(url_for('home'))


# ---------------- Menu ----------------
@app.route('/menu')
@login_required
def menu():
    search = (request.args.get('search') or '').strip()
    category = (request.args.get('category') or '').strip()

    query = "SELECT * FROM food WHERE available = TRUE"
    params = []

    if search:
        query += " AND food_name LIKE %s"
        params.append(f"%{search}%")
    if category:
        query += " AND category = %s"
        params.append(category)

    cursor = get_cursor()
    foods = []
    categories = []
    try:
        cursor.execute(query, params)
        foods = cursor.fetchall() or []

        if not foods:
            cursor.execute("SELECT * FROM food")
            foods = cursor.fetchall() or []

        coupon = session.get('coupon')
        for food in foods:
            try:
                price = float(food.get('price') or 0)
                item_disc = float(food.get('discount_percent') or 0)
                price_after_item = price * (1 - item_disc / 100) if item_disc > 0 else price
                if coupon:
                    price_after = price_after_item * (1 - float(coupon.get('discount', 0)))
                else:
                    price_after = price_after_item
                food['discounted_price'] = round(price_after, 2)
            except Exception:
                food['discounted_price'] = float(food.get('price') or 0)

        cursor.execute("SELECT DISTINCT category FROM food WHERE available = TRUE")
        categories = [row['category'] for row in cursor.fetchall()] or []
    except Exception as e:
        logging.exception("Failed to load menu: %s", e)
        flash('Failed to load menu', 'error')
    finally:
        cursor.close()

    return render_template('menu.html', foods=foods, categories=categories, coupon=session.get('coupon'))


# ---------------- Apply Coupon ----------------
@app.route('/apply_coupon', methods=['POST'])
@login_required
def apply_coupon():
    code = (request.form.get('coupon_code') or '').upper().strip()

    if code == "PNC":
        session['coupon'] = {'code': code, 'discount': 0.2}
        return jsonify({"success": True, "message": "Coupon applied! 20% off will be applied."})
    else:
        session.pop('coupon', None) 
        return jsonify({"success": False, "message": "Invalid coupon code."})


# ---------------- Order Form ----------------
@app.route('/order/<int:food_id>', methods=['GET', 'POST'])
@login_required
def order(food_id):
    cursor = get_cursor()
    try:
        cursor.execute("SELECT * FROM food WHERE food_id = %s", (food_id,))
        food = cursor.fetchone()
        if not food:
            return "Food not found", 404

        coupon = session.get('coupon')
        try:
            price = float(food.get('price') or 0)
            item_disc = float(food.get('discount_percent') or 0)
            price_after_item = price * (1 - item_disc / 100) if item_disc > 0 else price
            if coupon:
                price_after = price_after_item * (1 - float(coupon.get('discount', 0)))
            else:
                price_after = price_after_item
            food['discounted_price'] = round(price_after, 2)
        except Exception:
            food['discounted_price'] = float(food.get('price') or 0)

        if request.method == 'POST':
            name = (request.form.get('customer_name') or '').strip()
            phone = (request.form.get('phone') or '').strip()
            quantity_raw = request.form.get('quantity', '1')
            delivery_option = request.form.get('delivery_option', 'delivery')
            delivery_service = (request.form.get('delivery_service') or '').strip()
            other_service = (request.form.get('other_service') or '').strip()
            address = (request.form.get('address') or '').strip() if delivery_option == 'delivery' else ''
            note = (request.form.get('note') or '').strip()

            # validate quantity
            try:
                quantity = int(quantity_raw)
                if quantity <= 0:
                    raise ValueError()
            except (ValueError, TypeError):
                flash('Invalid quantity', 'error')
                return render_template('order_form.html', food=food, coupon=session.get('coupon'))

            if delivery_service == 'other' and other_service:
                delivery_service = other_service

            unit_price = float(food.get('discounted_price') or food.get('price') or 0)
            total = round(unit_price * quantity, 2)

            try:
                cursor_insert = get_cursor(dict_cursor=False)
                try:
                    cursor_insert.execute("""
                        INSERT INTO orders
                        (customer_name, phone, address, note, food_id, quantity, total_price, delivery_option, delivery_service)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (name, phone, address, note, food_id, quantity, total, delivery_option, delivery_service))
                    mysql.connection.commit()
                finally:
                    cursor_insert.close()
            except Exception as e:
                mysql.connection.rollback()
                logging.exception("Failed to insert order: %s", e)
                flash('Failed to place order', 'error')
                return render_template('order_form.html', food=food, coupon=session.get('coupon'))

            return redirect(url_for('order_success', food_id=food_id))
    finally:
        cursor.close()

    return render_template('order_form.html', food=food, coupon=session.get('coupon'))


# ---------------- Order Success ----------------
@app.route('/order_success/<int:food_id>')
@login_required
def order_success(food_id):
    return render_template('order_success.html', food_id=food_id)


# ---------------- Order List ----------------
@app.route('/order-list')
@login_required
def order_list():
    cursor = get_cursor()
    orders = []
    try:
        cursor.execute("""
            SELECT o.order_id, o.customer_name, o.phone, o.address, o.note, o.delivery_option, o.delivery_service,
                   f.food_id, f.image_url, f.food_name, o.quantity, o.total_price, o.order_date
            FROM orders o
            JOIN food f ON o.food_id = f.food_id
            ORDER BY o.order_date DESC
        """)
        orders = cursor.fetchall() or []
    except Exception as e:
        logging.exception("Failed to fetch orders: %s", e)
        flash('Failed to load orders', 'error')
    finally:
        cursor.close()
    return render_template('order_list.html', orders=orders)


# ---------------- Delete Order ----------------
@app.route('/delete_order/<int:order_id>', methods=['POST'])
@login_required
def delete_order(order_id):
    cursor = get_cursor(dict_cursor=False)
    try:
        cursor.execute("DELETE FROM orders WHERE order_id = %s", (order_id,))
        affected = cursor.rowcount
        mysql.connection.commit()
        flash('Order deleted successfully!' if affected > 0 else 'Order not found!',
              'success' if affected > 0 else 'warning')
    except Exception as e:
        mysql.connection.rollback()
        logging.exception("Delete failed: %s", e)
        flash(f'Delete failed: {str(e)}', 'error')
    finally:
        cursor.close()
    return redirect(url_for('order_list'))


# ---------------- Run App ----------------
if __name__ == '__main__':
    app.run(debug=True)
