const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const dbPath = path.join(dataDir, 'drivers.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS drivers (
    driver_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    status INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS deliveries (
    delivery_id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    driver_id TEXT NOT NULL,
    pickup_address TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    status INTEGER NOT NULL DEFAULT 0,
    assigned_at TEXT NOT NULL,
    completed_at TEXT,
    FOREIGN KEY (driver_id) REFERENCES drivers(driver_id)
  );
`);

// ────────────────────────────────────────────────────────────
// DRIVER FUNCTIONS
// ────────────────────────────────────────────────────────────

function registerDriver(data) {
  const { name, phone, vehicle_type } = data;
  const driver_id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO drivers (driver_id, name, phone, vehicle_type, status)
    VALUES (?, ?, ?, ?, 0)
  `);

  stmt.run(driver_id, name, phone, vehicle_type);

  return getDriverById(driver_id);
}

function getDriverById(id) {
  const stmt = db.prepare('SELECT * FROM drivers WHERE driver_id = ?');
  return stmt.get(id) || null;
}

function listAvailableDrivers() {
  const stmt = db.prepare('SELECT * FROM drivers WHERE status = 0');
  return stmt.all();
}

function setDriverStatus(driverId, status) {
  const stmt = db.prepare('UPDATE drivers SET status = ? WHERE driver_id = ?');
  stmt.run(status, driverId);
  return getDriverById(driverId);
}

// ────────────────────────────────────────────────────────────
// DELIVERY FUNCTIONS
// ────────────────────────────────────────────────────────────

function createDelivery(data) {
  const { order_id, driver_id, pickup_address, delivery_address } = data;
  const delivery_id = uuidv4();
  const assigned_at = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO deliveries (delivery_id, order_id, driver_id, pickup_address, delivery_address, status, assigned_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `);

  stmt.run(delivery_id, order_id, driver_id, pickup_address, delivery_address, assigned_at);

  return getDeliveryById(delivery_id);
}

function getDeliveryById(id) {
  const stmt = db.prepare('SELECT * FROM deliveries WHERE delivery_id = ?');
  return stmt.get(id) || null;
}

function getDeliveryByOrderId(orderId) {
  const stmt = db.prepare('SELECT * FROM deliveries WHERE order_id = ?');
  return stmt.get(orderId) || null;
}

function updateDeliveryStatus(deliveryId, status, completedAt = null) {
  const stmt = db.prepare(`
    UPDATE deliveries
    SET status = ?, completed_at = ?
    WHERE delivery_id = ?
  `);

  stmt.run(status, completedAt, deliveryId);

  return getDeliveryById(deliveryId);
}

function listDeliveries(limit = 20, offset = 0) {
  const stmt = db.prepare(`
    SELECT * FROM deliveries
    ORDER BY assigned_at DESC
    LIMIT ? OFFSET ?
  `);

  const deliveries = stmt.all(limit, offset);

  const countStmt = db.prepare('SELECT COUNT(*) as count FROM deliveries');
  const { count } = countStmt.get();

  return { deliveries, total: count };
}

// ────────────────────────────────────────────────────────────
// EXPORTS
// ────────────────────────────────────────────────────────────

module.exports = {
  registerDriver,
  getDriverById,
  listAvailableDrivers,
  setDriverStatus,
  createDelivery,
  getDeliveryById,
  getDeliveryByOrderId,
  updateDeliveryStatus,
  listDeliveries,
  db
};
