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