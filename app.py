from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from flask_mysqldb import MySQL
import MySQLdb.cursors
from werkzeug.security import generate_password_hash, check_password_hash
import os
from datetime import datetime
from functools import wraps
import logging

# ---------------- App Setup ----------------
app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET') or os.urandom(24)

app.config['MYSQL_HOST'] = os.environ.get('MYSQL_HOST', 'localhost')
app.config['MYSQL_USER'] = os.environ.get('MYSQL_USER', 'root')
app.config['MYSQL_PASSWORD'] = os.environ.get('MYSQL_PASSWORD', '')
app.config['MYSQL_DB'] = os.environ.get('MYSQL_DB', 'foods')

mysql = MySQL(app)
logging.basicConfig(level=logging.INFO)

# ---------------- Decorators ----------------
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'username' not in session:
            flash('Please log in to continue.', 'error')
            return redirect(url_for('auth'))
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if session.get('login_type') != 'admin':
            flash('Admin access only.', 'error')
            return redirect(url_for('home'))
        return f(*args, **kwargs)
    return login_required(f)

# ---------------- Helpers ----------------
def get_cursor(dict_cursor=True):
    return mysql.connection.cursor(MySQLdb.cursors.DictCursor if dict_cursor else None)

def calculate_food_price(food, coupon=None):
    try:
        price = float(food.get('price', 0))
        disc = float(food.get('discount_percent', 0))
        price = price * (1 - disc / 100) if disc > 0 else price
        if coupon:
            price *= (1 - float(coupon.get('discount', 0)))
        return round(price, 2)
    except:
        return round(float(food.get('price', 0)), 2)

# ---------------- Routes ----------------
@app.route('/')
def home():
    foods = []
    cur = get_cursor()
    try:
        cur.execute("""
            SELECT 
                food_id, food_name, category, price, image_url,
                COALESCE(discount_percent, 0) AS discount_percent
            FROM food 
            WHERE available = 1 
            LIMIT 3
        """)
        foods = cur.fetchall()

        coupon = session.get('coupon')
        for f in foods:
            f['discounted_price'] = calculate_food_price(f, coupon)
    except Exception as e:
        print("Error:", e)
    finally:
        cur.close()
    return render_template('index.html', foods=foods)

# ---------------- Auth ----------------
@app.route('/auth', methods=['GET', 'POST'])
def auth():
    if request.method == 'POST':
        action = request.form.get('action')
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        email = request.form.get('email', '').strip()
        confirm = request.form.get('confirm_password', '')
        login_type = request.form.get('login_type', 'user')

        if action == 'login':
            cur = get_cursor()
            try:
                cur.execute("SELECT * FROM users WHERE username = %s", (username,))
                user = cur.fetchone()
                if user and check_password_hash(user['password'], password):
                    session['username'] = user['username']
                    session['login_type'] = user['login_type']
                    flash(f"{user['login_type'].title()} login successful!", 'success')
                    return redirect(url_for('admin_dashboard') if user['login_type'] == 'admin' else url_for('home'))
                flash('Invalid credentials.', 'error')
            except Exception as e:
                logging.exception("Login error: %s", e)
                flash('Server error.', 'error')
            finally:
                cur.close()

        elif action == 'register':
            if not all([username, password, email, confirm]):
                flash('All fields required.', 'error')
            elif password != confirm:
                flash('Passwords do not match.', 'error')
            elif login_type not in ['user', 'admin']:
                flash('Invalid user type.', 'error')
            else:
                cur = get_cursor(dict_cursor=False)
                try:
                    cur.execute("SELECT 1 FROM users WHERE username = %s", (username,))
                    if cur.fetchone():
                        flash('Username taken.', 'error')
                    else:
                        hashed = generate_password_hash(password)
                        cur.execute(
                            "INSERT INTO users (username, password, email, login_type) VALUES (%s, %s, %s, %s)",
                            (username, hashed, email, login_type)
                        )
                        mysql.connection.commit()
                        flash('Registered! Please login.', 'success')
                        return redirect(url_for('auth'))
                except Exception as e:
                    mysql.connection.rollback()
                    logging.exception("Register error: %s", e)
                    flash('Registration failed.', 'error')
                finally:
                    cur.close()
    return render_template('auth.html')

@app.route('/auth-admin', methods=['GET', 'POST'])
def auth_admin():
    if request.method == 'POST':
        action = request.form.get('action')
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        email = request.form.get('email', '').strip()
        confirm = request.form.get('confirm_password', '')

        if action == 'login':
            cur = get_cursor()
            try:
                cur.execute("SELECT * FROM users WHERE username = %s AND login_type = 'admin'", (username,))
                user = cur.fetchone()
                if user and check_password_hash(user['password'], password):
                    session['username'] = user['username']
                    session['login_type'] = 'admin'
                    flash('Admin login success!', 'success')
                    return redirect(url_for('admin_dashboard'))
                flash('Invalid admin login.', 'error')
            finally:
                cur.close()

        elif action == 'register':
            if not all([username, password, email, confirm]) or password != confirm:
                flash('Fill all fields and match passwords.', 'error')
            else:
                cur = get_cursor(dict_cursor=False)
                try:
                    cur.execute("SELECT 1 FROM users WHERE username = %s", (username,))
                    if cur.fetchone():
                        flash('Admin username exists.', 'error')
                    else:
                        hashed = generate_password_hash(password)
                        cur.execute(
                            "INSERT INTO users (username, password, email, login_type) VALUES (%s, %s, %s, 'admin')",
                            (username, hashed, email)
                        )
                        mysql.connection.commit()
                        flash('Admin registered!', 'success')
                        return redirect(url_for('auth_admin'))
                except Exception as e:
                    mysql.connection.rollback()
                    logging.exception("Admin reg error: %s", e)
                    flash('Failed.', 'error')
                finally:
                    cur.close()
    return render_template('auth-admin.html')

@app.route('/logout')
def logout():
    session.clear()
    flash('Logged out.', 'info')
    return redirect(url_for('home'))

# ---------------- Menu ----------------
@app.route('/menu')
@login_required
def menu():
    search = request.args.get('search', '').strip()
    cat = request.args.get('category', '').strip()
    cur = get_cursor()
    foods = []
    categories = []
    try:
        q = "SELECT * FROM food WHERE available = 1"
        p = []
        if search:
            q += " AND food_name LIKE %s"
            p.append(f"%{search}%")
        if cat:
            q += " AND category = %s"
            p.append(cat)
        cur.execute(q, p)
        foods = cur.fetchall() or []

        coupon = session.get('coupon')
        for f in foods:
            f['discounted_price'] = calculate_food_price(f, coupon)

        cur.execute("SELECT DISTINCT category FROM food WHERE available = 1")
        categories = [r['category'] for r in cur.fetchall()]
    except Exception as e:
        logging.exception("Menu error: %s", e)
        flash('Menu load failed.', 'error')
    finally:
        cur.close()
    return render_template('menu.html', foods=foods, categories=categories, coupon=coupon)

# ---------------- Coupon System (FIXED) ----------------
@app.route('/apply_coupon', methods=['POST'])
@login_required
def apply_coupon():
    code = request.form.get('coupon_code', '').strip().upper()
    if code == "PNC":
        coupon = {'code': code, 'discount': 0.20}  # 20% off
        session['coupon'] = coupon
        return jsonify(success=True, message="20% off applied!", coupon=coupon)
    else:
        session.pop('coupon', None)
        return jsonify(success=False, message="Invalid coupon code.")

@app.route('/coupon', methods=['GET'])
@login_required
def get_coupon():
    coupon = session.get('coupon')
    return jsonify(coupon=coupon)

@app.route('/remove_coupon', methods=['POST'])
@login_required
def remove_coupon():
    removed = session.pop('coupon', None) is not None
    return jsonify(success=removed, message="Coupon removed." if removed else "No coupon was active.")

# ---------------- Order ----------------
@app.route('/order/<int:food_id>', methods=['GET', 'POST'])
@login_required
def order(food_id):
    cur = get_cursor()
    try:
        cur.execute("SELECT * FROM food WHERE food_id = %s", (food_id,))
        food = cur.fetchone()
        if not food:
            flash('Food not found.', 'error')
            return redirect(url_for('menu'))

        coupon = session.get('coupon')
        food['discounted_price'] = calculate_food_price(food, coupon)

        if request.method == 'POST':
            name = request.form.get('customer_name', '').strip()
            phone = request.form.get('phone', '').strip()
            qty = request.form.get('quantity', '1')
            delivery = request.form.get('delivery_option', 'delivery')
            service = request.form.get('delivery_service', '').strip()
            other = request.form.get('other_service', '').strip()
            address = request.form.get('address', '').strip() if delivery == 'delivery' else ''
            note = request.form.get('note', '').strip()

            try:
                qty = int(qty)
                if qty <= 0: raise ValueError
            except:
                flash('Invalid quantity.', 'error')
                return render_template('order_form.html', food=food, coupon=coupon)

            if service == 'other' and other:
                service = other

            total = round(food['discounted_price'] * qty, 2)

            ins = get_cursor(dict_cursor=False)
            try:
                ins.execute("""
                    INSERT INTO orders 
                    (customer_name, phone, address, note, food_id, quantity, total_price,
                     delivery_option, delivery_service, order_date)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                """, (name, phone, address, note, food_id, qty, total, delivery, service))
                mysql.connection.commit()
                order_id = ins.lastrowid
            finally:
                ins.close()

            return redirect(url_for('order_success', order_id=order_id))
    finally:
        cur.close()

    return render_template('order_form.html', food=food, coupon=coupon)

@app.route('/order_success/<int:order_id>')
@login_required
def order_success(order_id):
    cur = get_cursor()
    try:
        cur.execute("""
            SELECT o.*, f.food_name, f.image_url 
            FROM orders o JOIN food f ON o.food_id = f.food_id 
            WHERE o.order_id = %s
        """, (order_id,))
        order = cur.fetchone()
        if not order:
            flash('Order not found.', 'error')
            return redirect(url_for('order_list'))
    finally:
        cur.close()
    return render_template('order_success.html', order=order)

# ---------------- Receipt & Payment ----------------
@app.route('/order/<int:order_id>/receipt')
@login_required
def view_receipt(order_id):
    cur = get_cursor()
    try:
        cur.execute("""
            SELECT o.*, f.food_name, f.image_url FROM orders o
            JOIN food f ON o.food_id = f.food_id WHERE o.order_id = %s
        """, (order_id,))
        order = cur.fetchone()
        if not order:
            flash('Order not found.', 'error')
            return redirect(url_for('order_list'))
    finally:
        cur.close()
    return render_template('receipt.html', order=order)

@app.route('/order/<int:order_id>/pay', methods=['GET', 'POST'])
@login_required
def pay_order_page(order_id):
    cur = get_cursor()
    try:
        cur.execute("""
            SELECT o.*, f.food_name, f.image_url FROM orders o
            JOIN food f ON o.food_id = f.food_id WHERE o.order_id = %s
        """, (order_id,))
        order = cur.fetchone()
        if not order:
            flash('Order not found.', 'error')
            return redirect(url_for('order_list'))

        if request.method == 'POST':
            method = request.form.get('payment_method', 'Cash')
            up = get_cursor(dict_cursor=False)
            try:
                up.execute("UPDATE orders SET payment_method=%s, payment_date=NOW() WHERE order_id=%s",
                           (method, order_id))
                mysql.connection.commit()
                flash(f'Paid with {method}!', 'success')
                return redirect(url_for('payment_success', order_id=order_id))
            finally:
                up.close()
    finally:
        cur.close()
    return render_template('pay_order.html', order=order)

@app.route('/payment_success/<int:order_id>')
@login_required
def payment_success(order_id):
    cur = get_cursor()
    try:
        cur.execute("""
            SELECT o.*, f.food_name, f.image_url FROM orders o
            JOIN food f ON o.food_id = f.food_id WHERE o.order_id = %s
        """, (order_id,))
        order = cur.fetchone()
        if not order:
            flash('Order not found.', 'error')
            return redirect(url_for('order_list'))
    finally:
        cur.close()
    return render_template('payment_success.html', order=order)

# ---------------- Feedback ----------------
@app.route('/submit_feedback', methods=['POST'])
@login_required
def submit_feedback():
    try:
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip()
        message = request.form.get('message', '').strip()

        if not all([name, email, message]):
            return jsonify(success=False, error="All fields required"), 400

        cur = get_cursor()
        cur.execute(
            "INSERT INTO feedback (name, email, message) VALUES (%s, %s, %s)",
            (name, email, message)
        )
        mysql.connection.commit()
        cur.close()
        return jsonify(success=True)

    except Exception as e:
        print("Feedback DB Error:", str(e))
        return jsonify(success=False, error="Database error"), 500

# ---------------- User Order List ----------------
@app.route('/order-list')
@login_required
def order_list():
    cur = get_cursor()
    orders = []
    try:
        cur.execute("""
            SELECT o.*, f.food_name, f.image_url 
            FROM orders o JOIN food f ON o.food_id = f.food_id
            ORDER BY o.order_date DESC
        """)
        orders = cur.fetchall()
    except Exception as e:
        logging.exception("Order list error: %s", e)
        flash('Failed to load orders.', 'error')
    finally:
        cur.close()
    return render_template('order_list.html', orders=orders)

@app.route('/delete_order/<int:order_id>', methods=['POST'])
@login_required
def delete_order(order_id):
    cur = get_cursor(dict_cursor=False)
    try:
        cur.execute("DELETE FROM orders WHERE order_id = %s", (order_id,))
        if cur.rowcount:
            mysql.connection.commit()
            flash('Order deleted.', 'success')
        else:
            flash('Order not found.', 'warning')
    except Exception as e:
        mysql.connection.rollback()
        logging.exception("Delete error: %s", e)
        flash('Delete failed.', 'error')
    finally:
        cur.close()
    return redirect(url_for('order_list'))

# ---------------- Admin Dashboard ----------------
@app.route('/dashboard')
@admin_required
def admin_dashboard():
    cur = get_cursor()
    try:
        cur.execute("SELECT COUNT(*) AS total FROM orders"); total_orders = cur.fetchone()['total']
        cur.execute("SELECT COALESCE(SUM(total_price),0) AS revenue FROM orders"); total_revenue = cur.fetchone()['revenue']
        cur.execute("SELECT COUNT(*) AS pending FROM orders WHERE delivery_option = 'Pending'"); pending_orders = cur.fetchone()['pending']
        cur.execute("SELECT order_id, customer_name, total_price, order_date, delivery_option FROM orders ORDER BY order_date DESC LIMIT 5")
        recent = cur.fetchall()
    except Exception as e:
        logging.exception("Dashboard error: %s", e)
        total_orders = total_revenue = pending_orders = 0
        recent = []
    finally:
        cur.close()
    return render_template('dashboard.html',
                           total_orders=total_orders,
                           total_revenue=total_revenue,
                           pending_orders=pending_orders,
                           recent_orders=recent)

# ---------------- Manage Menu ----------------
@app.route('/manage-menu', methods=['GET', 'POST'])
@admin_required
def manage_menu():
    cursor = get_cursor()
    foods = []

    if request.method == 'POST':
        action = request.form.get('action')
        food_id = request.form.get('food_id')
        name = request.form.get('food_name')
        category = request.form.get('category')
        price = request.form.get('price')
        discount = request.form.get('discount_percent', '0')
        image_url = request.form.get('image_url')
        available = 1 if request.form.get('available') else 0

        try:
            if action == 'add':
                cursor.execute("""
                    INSERT INTO food (food_name, category, price, discount_percent, image_url, available)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (name, category, price, discount, image_url or None, available))
                flash('Item added!', 'success')

            elif action == 'edit' and food_id:
                cursor.execute("""
                    UPDATE food SET food_name=%s, category=%s, price=%s, 
                    discount_percent=%s, image_url=%s, available=%s WHERE food_id=%s
                """, (name, category, price, discount, image_url or None, available, food_id))
                flash('Item updated!', 'success')

            elif action == 'delete' and food_id:
                cursor.execute("DELETE FROM food WHERE food_id=%s", (food_id,))
                flash('Item deleted!', 'warning')

            mysql.connection.commit()
        except Exception as e:
            mysql.connection.rollback()
            logging.exception("Menu CRUD error: %s", e)
            flash('Operation failed.', 'error')

    try:
        cursor.execute("SELECT * FROM food ORDER BY food_id")
        foods = cursor.fetchall()
    except Exception as e:
        logging.exception("Load menu error: %s", e)
        flash('Failed to load menu.', 'error')
    finally:
        cursor.close()

    return render_template('manage_menu.html', foods=foods)

# ---------------- Manage Orders (Admin) ----------------
@app.route('/manage-orders', methods=['GET', 'POST'])
@admin_required
def manage_orders():
    cursor = get_cursor()

    if request.method == 'POST':
        order_id = request.form.get('order_id')
        status = request.form.get('status')
        action = request.form.get('action')

        try:
            if action == 'delete' and order_id:
                cursor.execute("DELETE FROM orders WHERE order_id = %s", (order_id,))
                flash('Order deleted.', 'warning')

            elif status and order_id:
                cursor.execute("UPDATE orders SET delivery_option = %s WHERE order_id = %s", (status, order_id))
                flash(f'Status updated to {status}.', 'success')

            mysql.connection.commit()
        except Exception as e:
            mysql.connection.rollback()
            logging.exception("Manage orders error: %s", e)
            flash('Operation failed.', 'error')
        finally:
            cursor.close()
            return redirect(url_for('manage_orders'))

    try:
        cursor.execute("""
            SELECT o.*, f.food_name, f.image_url 
            FROM orders o JOIN food f ON o.food_id = f.food_id 
            ORDER BY o.order_date DESC
        """)
        orders = cursor.fetchall()
    except Exception as e:
        logging.exception("Load orders error: %s", e)
        flash('Failed to load orders.', 'error')
        orders = []
    finally:
        cursor.close()

    return render_template('manage_orders.html', orders=orders)

# ---------------- Run ----------------
if __name__ == '__main__':
    app.run(debug=True)