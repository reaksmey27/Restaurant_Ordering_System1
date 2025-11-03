# 🍽️ Restaurant Ordering System

A web-based restaurant ordering system that allows customers to browse menus, place online orders, and manage their cart easily. The system also includes an admin dashboard for managing menu items, tracking orders, and viewing sales summaries.

---

## 🚀 Features

### 👤 User Features

- View and browse the restaurant menu by category (e.g., food, drinks, desserts)
- Add items to the shopping cart
- Update or remove items from the cart
- Place orders with customer information
- View order confirmation or receipt page

### 🧑‍💼 Admin Features

- Add, edit, or delete menu items
- View and manage customer orders
- Track order status (pending, preparing, completed)
- Access simple sales analytics (optional)

---

## 🛠️ Tech Stack

| Layer               | Technologies             |
| ------------------- | ------------------------ |
| **Frontend**        | HTML, CSS, JavaScript    |
| **Backend**         | Python (Flask Framework) |
| **Database**        | SQLite / MySQL           |
| **Template Engine** | Jinja2                   |
| **Version Control** | Git & GitHub             |

---

## 📁 Project Structure

```
Restaurant_Ordering_System/
│
├── static/                     # CSS, JS, and images
│   ├── css/                    # Stylesheets
│   ├── js/                     # JavaScript files
│   └── images/                 # Images, icons, logos
│
├── templates/                  # HTML templates
│   ├── index.html              # Home / Landing page
│   ├── auth.html               # User login/register page
│   ├── auth-admin.html         # Admin login page
│   ├── menu.html               # Menu page with items
│   ├── dashboard.html          # Admin dashboard
│   ├── order_form.html         # Order form page
│   ├── order_list.html         # Admin view: list of orders
│   ├── manage_order.html       # Admin page: manage orders
│   ├── manage_menu.html        # Admin page: manage menu items
│   ├── pay_order.html          # Checkout / Payment page
│   ├── payment_success.html    # Payment success page
│   └── receipt.html            # Receipt page
│
├── app.py                      # Main Flask application
├── database.db                 # SQLite database
├── README.md                   # Project documentation
└── requirements.txt            # Python dependencies (optional)
```

---

## ⚙️ Installation & Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/reaksmey27/Restaurant_Ordering_System1

   ```

2. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   pip install Flask
   pip install Flask-MySQLdb
   pip install mysqlclient
   ```

3. **Run the application**

   ```bash
   python app.py
   ```

4. **Access the system**

   Open your browser and go to

   ```bash
   http://127.0.0.1:5000/
   ```

## 📸 Screenshots (Optional)

# User Role

### 1. Home

![Home Page](/static/images/screenshots/home_page.png)

- Navigation to Menu, Cart, Login/Register, and Admin Dashboard
- Highlights featured items and promotions
- Quick access buttons like “View Menu” or “Order Now”
- Responsive and user-friendly design

### 2. Auth

![Auth Page](/static/images/screenshots/auth_page.png)

- User login and registration page
- Input fields for username, email, and password
- “Login” and “Register” buttons for easy access
- Clean and simple layout for quick authentication
- Responsive design for desktop and mobile

### 3. Menu

![Menu Page](/static/images/screenshots/menu_page.png)

- Displays all food and drink items by category
- Shows item name, price, discount, and image
- “Add to Cart” buttons for each item
- User-friendly layout for easy browsing
- Responsive design for desktop and mobile

### 4. Order List

![Order List Page](/static/images/screenshots/orderlist_page.png)

- Displays all customer orders in a table
- Shows order ID, customer name, items, quantity, total, and status
- Clear layout for quick monitoring
- Responsive design for desktop and mobile

# Admin Role

### 1. Auth Admin

![Auth Admin Page](/static/images/screenshots/authadmin_page.png)

- Admin login page with username and password fields
- “Login” button to access the admin dashboard
- Simple and secure layout
- Responsive design for desktop and mobile

### 2. Dashboard


![Dashboard Page](/static/images/screenshots/dashboard_page.png)

- Admin dashboard showing an overview of orders and menu items
- Quick access to manage orders and menu
- Displays order status, totals, and summaries
- Clean and organized layout for easy navigation
- Responsive design for desktop and mobile

### 3. Manage Order

![Manage Order Page](/static/images/screenshots/manageorder_page.png)

- Admin page to view and manage all customer orders
- Update order status (pending, preparing, completed)
- Edit or cancel orders if necessary
- Clear table layout for easy monitoring
- Responsive design for desktop and mobile

### 4. Manage Menu

![Manage menu Page](/static/images/screenshots/managemenu_page.png)

- Admin page to add, edit, or delete menu items
- Displays all food and drink items with details (name, price, category, availability)
- Quick actions for updating item information
- Organized table layout for easy management
- Responsive design for desktop and mobile

## 🧰 Developer Guidelines

- Follow consistent code formatting
- Comment all important functions
- Use descriptive commit messages
- Keep HTML, CSS, and JS modular and clean

## 👨‍💻 Author

Reaksmey San

📧 reaksmey.san@student.passerellesnumeriques.org

🌐 GitHub Profile

![Contributors](https://contrib.rocks/image?repo=reaksmey27/readme)

## 📌 Releases

- v1.0 – First Stable Release 🎉
- v3.0 – Final Version ✅
