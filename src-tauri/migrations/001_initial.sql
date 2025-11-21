-- Tabela: products
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK(type IN ('water','gas','coal','other')) NOT NULL,
    price_refill REAL NOT NULL,
    price_full REAL NOT NULL,
    stock_full INTEGER DEFAULT 0,
    stock_empty INTEGER DEFAULT 0
);

-- Tabela: customers
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    notes TEXT
);

-- Tabela: orders
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    total REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customer_id) REFERENCES customers(id)
);

-- Tabela: order_items
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER NOT NULL,
    returned_bottle BOOLEAN NOT NULL,
    unit_price REAL NOT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id)
);

-- Tabela: stock_movements
CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    movement_type TEXT CHECK(movement_type IN ('IN','OUT','ADJUST')) NOT NULL,
    quantity INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(product_id) REFERENCES products(id)
);

-- Inserir alguns produtos de exemplo
INSERT INTO products (name, description, type, price_refill, price_full, stock_full, stock_empty) VALUES
('Gás P13', 'Botijão de Gás 13kg', 'gas', 45.00, 80.00, 50, 10),
('Gás P45', 'Botijão de Gás 45kg', 'gas', 120.00, 200.00, 30, 5),
('Água 20L', 'Garrafão de Água 20 litros', 'water', 8.00, 15.00, 100, 20),
('Água 10L', 'Garrafão de Água 10 litros', 'water', 5.00, 10.00, 80, 15),
('Carvão 5kg', 'Saco de Carvão 5kg', 'coal', 12.00, 18.00, 60, 0),
('Carvão 10kg', 'Saco de Carvão 10kg', 'coal', 22.00, 32.00, 40, 0);
