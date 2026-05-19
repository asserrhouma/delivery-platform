const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'orders.db');

// Créer le dossier data si nécessaire
const fs = require('fs');
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);

// ─── Initialisation des tables ───────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    order_id         TEXT PRIMARY KEY,
    customer_name    TEXT NOT NULL,
    customer_phone   TEXT NOT NULL,
    pickup_address   TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    status           INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS order_items (
    item_id     TEXT PRIMARY KEY,
    order_id    TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity    INTEGER NOT NULL,
    price       REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
  );
`);

// ─── Requêtes préparées ───────────────────────────────────────────────────────
const stmts = {
  insertOrder: db.prepare(`
    INSERT INTO orders (order_id, customer_name, customer_phone, pickup_address, delivery_address, status, created_at)
    VALUES (@order_id, @customer_name, @customer_phone, @pickup_address, @delivery_address, @status, @created_at)
  `),

  insertItem: db.prepare(`
    INSERT INTO order_items (item_id, order_id, description, quantity, price)
    VALUES (@item_id, @order_id, @description, @quantity, @price)
  `),

  getOrder: db.prepare(`SELECT * FROM orders WHERE order_id = ?`),

  getItems: db.prepare(`SELECT * FROM order_items WHERE order_id = ?`),

  listOrders: db.prepare(`
    SELECT * FROM orders
    WHERE (? = 0 OR status = ?)
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `),

  countOrders: db.prepare(`
    SELECT COUNT(*) as total FROM orders WHERE (? = 0 OR status = ?)
  `),

  updateStatus: db.prepare(`
    UPDATE orders SET status = ? WHERE order_id = ?
  `),
};

// ─── Fonctions d'accès ────────────────────────────────────────────────────────

/**
 * Crée une commande + ses items dans une transaction atomique.
 */
function createOrder(orderData) {
  const { v4: uuidv4 } = require('uuid');

  const order = {
    order_id:         uuidv4(),
    customer_name:    orderData.customer_name,
    customer_phone:   orderData.customer_phone,
    pickup_address:   orderData.pickup_address,
    delivery_address: orderData.delivery_address,
    status:           0, // PENDING
    created_at:       new Date().toISOString(),
  };

  const insertAll = db.transaction(() => {
    stmts.insertOrder.run(order);
    for (const item of (orderData.items || [])) {
      stmts.insertItem.run({
        item_id:     uuidv4(),
        order_id:    order.order_id,
        description: item.description,
        quantity:    item.quantity,
        price:       item.price,
      });
    }
  });

  insertAll();
  return getOrderById(order.order_id);
}

/**
 * Récupère une commande avec ses items.
 */
function getOrderById(orderId) {
  const order = stmts.getOrder.get(orderId);
  if (!order) return null;
  order.items = stmts.getItems.all(orderId);
  return order;
}

/**
 * Liste les commandes avec filtre de statut et pagination.
 */
function listOrders({ status = 0, limit = 20, offset = 0 } = {}) {
  const orders = stmts.listOrders.all(status, status, limit, offset);
  const { total } = stmts.countOrders.get(status, status);

  return {
    orders: orders.map(o => ({ ...o, items: stmts.getItems.all(o.order_id) })),
    total,
  };
}

/**
 * Met à jour le statut d'une commande.
 */
function updateOrderStatus(orderId, status) {
  const result = stmts.updateStatus.run(status, orderId);
  if (result.changes === 0) return null;
  return getOrderById(orderId);
}

module.exports = { createOrder, getOrderById, listOrders, updateOrderStatus };
