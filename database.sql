-- Use SQLite syntax

-- Users table
CREATE TABLE users (
    username TEXT NOT NULL PRIMARY KEY,
    password TEXT NOT NULL,
    email TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0        -- 0 = false, 1 = true
);

-- Admins table (optional, linked to users)
CREATE TABLE admins (
    username TEXT NOT NULL PRIMARY KEY,
    password TEXT NOT NULL,
    email TEXT NOT NULL,
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

-- Food table
CREATE TABLE food (
    food_id INTEGER PRIMARY KEY AUTOINCREMENT,
    food_name TEXT NOT NULL,
    category TEXT,
    price REAL NOT NULL,
    discount_percent REAL DEFAULT 0.0,
    image_url TEXT,
    available INTEGER DEFAULT 1        -- 0 = false, 1 = true
);

INSERT INTO food (food_id, food_name, category, price, description, available, created_at, image_url, discount_percent) VALUES
(1,  'Fried Rice',           'Main Dish',  3.50, 'Delicious fried rice with vegetables',                     1, '2025-10-21 09:12:36', '/static/images/fried_rice.jpg',          0),
(2,  'Beef Lok Lak',         'Main Dish',  4.00, 'Cambodian stir-fried beef with rice and egg',              1, '2025-10-21 09:12:36', '/static/images/beef_lok_lak.jpg',        0),
(3,  'Chicken Curry',        'Main Dish',  3.75, 'Spicy chicken curry with coconut milk',                    1, '2025-10-21 09:12:36', '/static/images/chicken_curry.jpg',       0),
(4,  'Fish Amok',            'Main Dish',  4.50, 'Traditional Cambodian fish dish with curry sauce',         1, '2025-10-21 09:12:36', '/static/images/fish_amok.jpg',           0),
(5,  'Grilled Pork and Rice','Main Dish',  3.00, 'Grilled pork served with rice and pickles',                1, '2025-10-21 09:12:36', '/static/images/grilled_pork_rice.jpg',   0),
(6,  'Noodle Soup',          'Main Dish',  2.75, 'Rice noodle soup with herbs and pork',                     1, '2025-10-21 09:12:36', '/static/images/noodle_soup.jpg',         0),
(7,  'Omelette Rice',        'Main Dish',  2.50, 'Rice topped with fluffy omelette',                         1, '2025-10-21 09:12:36', '/static/images/omelette_rice.jpg',       0),
(8,  'Vegetable Stir Fry',   'Main Dish',  2.80, 'Mixed vegetables stir-fried with soy sauce',               1, '2025-10-21 09:12:36', '/static/images/vegetable_stir_fry.jpg',  0),
(9,  'BBQ Chicken Wings',    'Snack',      3.20, 'Grilled chicken wings with sweet chili sauce',             1, '2025-10-21 09:12:36', '/static/images/bbq_chicken_wings.jpg',   0),
(10, 'Spring Rolls',         'Appetizer',  2.00, 'Crispy rolls filled with vegetables',                      1, '2025-10-21 09:12:36', '/static/images/spring_rolls.jpg',        0),
(11, 'French Fries',         'Snack',      1.80, 'Crispy golden fries with ketchup',                         1, '2025-10-21 09:12:36', '/static/images/french_fries.jpg',        0),
(12, 'Garlic Bread',         'Appetizer',  1.50, 'Toasted bread with garlic butter',                         1, '2025-10-21 09:12:36', '/static/images/garlic_bread.jpg',        0),
(13, 'Caesar Salad',         'Salad',      2.50, 'Fresh lettuce with Caesar dressing',                       1, '2025-10-21 09:12:36', '/static/images/caesar_salad.jpg',        0),
(14, 'Fruit Salad',          'Dessert',    2.20, 'Mix of tropical fruits',                                   1, '2025-10-21 09:12:36', '/static/images/fruit_salad.jpg',         0),
(15, 'Chocolate Cake',       'Dessert',    2.80, 'Rich chocolate layered cake',                              1, '2025-10-21 09:12:36', '/static/images/chocolate_cake.jpg',      0),
(16, 'Ice Cream',            'Dessert',    1.50, 'Vanilla ice cream scoop',                                  1, '2025-10-21 09:12:36', '/static/images/ice_cream.jpg',           0),
(18, 'Mango Sticky Rice',    'Dessert',    2.60, 'Sticky rice with mango and coconut milk',                  1, '2025-10-21 09:12:36', '/static/images/mango_sticky_rice.jpg',   0),
(19, 'Lemon Tea',            'Drink',      1.00, 'Fresh lemon iced tea',                                     1, '2025-10-21 09:12:36', '/static/images/lemon_tea.jpg',           0),
(20, 'Iced Coffee',          'Drink',      1.25, 'Strong Cambodian iced coffee',                             1, '2025-10-21 09:12:36', '/static/images/iced_coffee.jpg',         0),
(21, 'Hot Coffee',           'Drink',      1.00, 'Black coffee served hot',                                  1, '2025-10-21 09:12:36', '/static/images/hot_coffee.jpg',          0),
(22, 'Milk Tea',             'Drink',      1.50, 'Sweet milk tea with tapioca pearls',                       1, '2025-10-21 09:12:36', '/static/images/milk_tea.jpg',            0),
(23, 'Coconut Water',        'Drink',      1.20, 'Fresh coconut juice',                                      1, '2025-10-21 09:12:36', '/static/images/coconut_water.jpg',       0),
(24, 'Orange Juice',         'Drink',      1.50, 'Freshly squeezed orange juice',                            1, '2025-10-21 09:12:36', '/static/images/orange_juice.jpg',        0),
(25, 'Water Bottle',         'Drink',      0.80, 'Mineral drinking water',                                   1, '2025-10-21 09:12:36', '/static/images/water_bottle.jpg',        0),
(26, 'Club Sandwich',        'Main Dish',  3.80, 'Triple-layer sandwich with chicken and egg',               1, '2025-10-21 09:12:36', '/static/images/club_sandwich.jpg',       0);

-- Orders table
CREATE TABLE orders (
    order_id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    note TEXT,
    food_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    total_price REAL NOT NULL,
    delivery_option TEXT DEFAULT 'delivery', -- Could add CHECK constraint
    delivery_service TEXT,
    order_date TEXT NOT NULL,        -- Store datetime as ISO string
    payment_method TEXT,
    payment_date TEXT,
    FOREIGN KEY (food_id) REFERENCES food(food_id) ON DELETE CASCADE
);

-- Feedback table
CREATE TABLE feedback (
    feedback_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    submitted_at TEXT NOT NULL        -- Store datetime as ISO string
);