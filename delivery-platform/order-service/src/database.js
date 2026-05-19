const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'orders.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
const createTablesSQL = `
  CREATE TABLE IF NOT EXISTS orders (
    order_id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    pickup_address TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    status INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS order_items (
    item_id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
`;

db.exec(createTablesSQL);

// Database functions
function createOrder(data) {
  const order_id = uuidv4();
  const created_at = new Date().toISOString();
  const updated_at = created_at;

  const stmt = db.prepare(`
    INSERT INTO orders (order_id, customer_name, customer_phone, pickup_address, delivery_address, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(order_id, data.customer_name, data.customer_phone, data.pickup_address, data.delivery_address, 0, created_at, updated_at);

  // Insert order items
  const itemStmt = db.prepare(`
    INSERT INTO order_items (item_id, order_id, description, quantity, price)
    VALUES (?, ?, ?, ?, ?)
  `);

  if (data.items && Array.isArray(data.items)) {
    for (const item of data.items) {
      itemStmt.run(uuidv4(), order_id, item.description, item.quantity, item.price);
    }
  }

  return getOrder(order_id);
}

function getOrder(order_id) {
  const stmt = db.prepare(`
    SELECT * FROM orders WHERE order_id = ?
  `);
  const order = stmt.get(order_id);

  if (!order) return null;

  const itemsStmt = db.prepare(`
    SELECT description, quantity, price FROM order_items WHERE order_id = ?
  `);
  const items = itemsStmt.all(order_id);

  return {
    order_id: order.order_id,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    pickup_address: order.pickup_address,
    delivery_address: order.delivery_address,
    status: order.status,
    created_at: order.created_at,
    items: items || []
  };
}

function listOrders(status, limit, offset) {
  let query = 'SELECT * FROM orders';
  const params = [];

  if (status !== undefined && status !== 0) {
    query += ' WHERE status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  if (limit) {
    query += ' LIMIT ?';
    params.push(limit);
  }

  if (offset) {
    query += ' OFFSET ?';
    params.push(offset);
  }

  const stmt = db.prepare(query);
  const orders = stmt.all(...params);

  // Fetch items for each order
  const result = orders.map(order => {
    const itemsStmt = db.prepare(`
      SELECT description, quantity, price FROM order_items WHERE order_id = ?
    `);
    const items = itemsStmt.all(order.order_id);

    return {
      order_id: order.order_id,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      pickup_address: order.pickup_address,
      delivery_address: order.delivery_address,
      status: order.status,
      created_at: order.created_at,
      items: items || []
    };
  });

  // Get total count
  let countQuery = 'SELECT COUNT(*) as count FROM orders';
  const countParams = [];

  if (status !== undefined && status !== 0) {
    countQuery += ' WHERE status = ?';
    countParams.push(status);
  }

  const countStmt = db.prepare(countQuery);
  const { count } = countStmt.get(...countParams);

  return { orders: result, total: count };
}

function updateOrderStatus(order_id, status) {
  const updated_at = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE orders SET status = ?, updated_at = ? WHERE order_id = ?
  `);

  stmt.run(status, updated_at, order_id);

  return getOrder(order_id);
}

module.exports = {
  createOrder,
  getOrder,
  listOrders,
  updateOrderStatus
};
