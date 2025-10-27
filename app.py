from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from flask_mysqldb import MySQL
import MySQLdb.cursors
from werkzeug.security import generate_password_hash, check_password_hash
import os
from datetime import datetime
from functools import wraps
import logging

app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET') or os.urandom(24)


app.config['MYSQL_HOST'] = os.environ.get('MYSQL_HOST', 'localhost')
app.config['MYSQL_USER'] = os.environ.get('MYSQL_USER', 'root')
app.config['MYSQL_PASSWORD'] = os.environ.get('MYSQL_PASSWORD', '')
app.config['MYSQL_DB'] = os.environ.get('MYSQL_DB', 'foods')

mysql = MySQL(app)


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
                # optional: session.permanent = True (set app.permanent_session_lifetime if you want)
                return redirect(url_for('menu'))
            else:
                flash('Invalid username or password', 'login_error')

        elif action == 'register':
            # basic validation
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

        # get categories
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
    # simple demo coupon matching
    if code == "PNC":
        session['coupon'] = {'code': code, 'discount': 0.2}  # 20% off
        return jsonify({"success": True, "message": "Coupon applied! 20% off will be applied."})
    else:
        session.pop('coupon', None)  # remove coupon if invalid
        return jsonify({"success": False, "message": "Invalid coupon code."})
    

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