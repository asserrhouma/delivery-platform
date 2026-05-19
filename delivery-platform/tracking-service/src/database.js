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
const dbPath = path.join(dataDir, 'tracking.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS tracking_events (
    event_id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    event_type INTEGER NOT NULL,
    description TEXT,
    location TEXT,
    timestamp TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_order_id ON tracking_events(order_id);
`);

// ────────────────────────────────────────────────────────────
// TRACKING FUNCTIONS
// ────────────────────────────────────────────────────────────

function addEvent(data) {
  const { order_id, event_type, description, location } = data;
  const event_id = uuidv4();
  const timestamp = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO tracking_events (event_id, order_id, event_type, description, location, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(event_id, order_id, event_type, description || '', location || '', timestamp);

  return getEventById(event_id);
}

function getEventById(event_id) {
  const stmt = db.prepare('SELECT * FROM tracking_events WHERE event_id = ?');
  return stmt.get(event_id) || null;
}

function getLastEventByOrderId(order_id) {
  const stmt = db.prepare(`
    SELECT * FROM tracking_events
    WHERE order_id = ?
    ORDER BY timestamp DESC
    LIMIT 1
  `);
  return stmt.get(order_id) || null;
}

function getEventsByOrderId(order_id) {
  const stmt = db.prepare(`
    SELECT * FROM tracking_events
    WHERE order_id = ?
    ORDER BY timestamp ASC
  `);
  return stmt.all(order_id);
}

// ────────────────────────────────────────────────────────────
// EXPORTS
// ────────────────────────────────────────────────────────────

module.exports = {
  addEvent,
  getEventById,
  getLastEventByOrderId,
  getEventsByOrderId,
  db
};
