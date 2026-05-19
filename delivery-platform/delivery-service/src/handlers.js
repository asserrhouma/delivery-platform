const db = require('./database');
const kafka = require('./kafka');
const grpc = require('@grpc/grpc-js');

// ────────────────────────────────────────────────────────────
// STATUS CODES (gRPC)
// ────────────────────────────────────────────────────────────

const STATUS_CODES = {
  OK: grpc.status.OK,
  NOT_FOUND: grpc.status.NOT_FOUND,
  INVALID_ARGUMENT: grpc.status.INVALID_ARGUMENT
};

// ────────────────────────────────────────────────────────────
// HELPER: Format Driver Response
// ────────────────────────────────────────────────────────────

function formatDriverResponse(driver) {
  if (!driver) return null;

  return {
    driver_id: driver.driver_id,
    name: driver.name,
    phone: driver.phone,
    vehicle_type: driver.vehicle_type,
    status: driver.status
  };
}

// ────────────────────────────────────────────────────────────
// HELPER: Format Delivery Response (with driver_name join)
// ────────────────────────────────────────────────────────────

function formatDeliveryResponse(delivery) {
  if (!delivery) return null;

  const driver = db.getDriverById(delivery.driver_id);
  const driver_name = driver ? driver.name : 'Unknown';

  return {
    delivery_id: delivery.delivery_id,
    order_id: delivery.order_id,
    driver_id: delivery.driver_id,
    driver_name: driver_name,
    pickup_address: delivery.pickup_address,
    delivery_address: delivery.delivery_address,
    status: delivery.status,
    assigned_at: delivery.assigned_at,
    completed_at: delivery.completed_at || ''
  };
}

// ────────────────────────────────────────────────────────────
// HANDLER 1: registerDriver
// ────────────────────────────────────────────────────────────

function registerDriver(call, callback) {
  const { name, phone, vehicle_type } = call.request;

  // Validation
  if (!name || !phone || !vehicle_type) {
    const error = new Error('Missing required fields: name, phone, vehicle_type');
    error.code = STATUS_CODES.INVALID_ARGUMENT;
    return callback(error);
  }

  try {
    const driver = db.registerDriver({ name, phone, vehicle_type });
    callback(null, formatDriverResponse(driver));
  } catch (error) {
    const err = new Error(`Failed to register driver: ${error.message}`);
    err.code = STATUS_CODES.INVALID_ARGUMENT;
    callback(err);
  }
}

// ────────────────────────────────────────────────────────────
// HANDLER 2: getDriver
// ────────────────────────────────────────────────────────────

function getDriver(call, callback) {
  const { driver_id } = call.request;

  try {
    const driver = db.getDriverById(driver_id);

    if (!driver) {
      const error = new Error(`Driver not found: ${driver_id}`);
      error.code = STATUS_CODES.NOT_FOUND;
      return callback(error);
    }

    callback(null, formatDriverResponse(driver));
  } catch (error) {
    const err = new Error(`Failed to get driver: ${error.message}`);
    err.code = STATUS_CODES.INVALID_ARGUMENT;
    callback(err);
  }
}

// ────────────────────────────────────────────────────────────
// HANDLER 3: listAvailableDrivers
// ────────────────────────────────────────────────────────────

function listAvailableDrivers(call, callback) {
  try {
    const drivers = db.listAvailableDrivers();
    const formattedDrivers = drivers.map(driver => formatDriverResponse(driver));

    callback(null, {
      drivers: formattedDrivers
    });
  } catch (error) {
    const err = new Error(`Failed to list drivers: ${error.message}`);
    err.code = STATUS_CODES.INVALID_ARGUMENT;
    callback(err);
  }
}

// ────────────────────────────────────────────────────────────
// HANDLER 4: assignDelivery
// ────────────────────────────────────────────────────────────

function assignDelivery(call, callback) {
  const { order_id, pickup_address, delivery_address, customer_name } = call.request;

  try {
    // Get first available driver
    const availableDrivers = db.listAvailableDrivers();

    if (availableDrivers.length === 0) {
      const error = new Error('No available driver');
      error.code = STATUS_CODES.INVALID_ARGUMENT;
      return callback(error);
    }

    const driver = availableDrivers[0];

    // Create delivery record
    const delivery = db.createDelivery({
      order_id,
      driver_id: driver.driver_id,
      pickup_address,
      delivery_address
    });

    // Set driver status to BUSY (1)
    db.setDriverStatus(driver.driver_id, 1);

    // Publish Kafka event
    kafka.publishDeliveryAssigned({
      order_id,
      delivery_id: delivery.delivery_id,
      driver_id: driver.driver_id,
      driver_name: driver.name,
      pickup_address,
      delivery_address,
      assigned_at: delivery.assigned_at
    }).catch(err => console.warn(`[assignDelivery] Kafka error: ${err.message}`));

    callback(null, formatDeliveryResponse(delivery));
  } catch (error) {
    const err = new Error(`Failed to assign delivery: ${error.message}`);
    err.code = STATUS_CODES.INVALID_ARGUMENT;
    callback(err);
  }
}

// ────────────────────────────────────────────────────────────
// HANDLER 5: getDelivery
// ────────────────────────────────────────────────────────────

function getDelivery(call, callback) {
  const { delivery_id } = call.request;

  try {
    const delivery = db.getDeliveryById(delivery_id);

    if (!delivery) {
      const error = new Error(`Delivery not found: ${delivery_id}`);
      error.code = STATUS_CODES.NOT_FOUND;
      return callback(error);
    }

    callback(null, formatDeliveryResponse(delivery));
  } catch (error) {
    const err = new Error(`Failed to get delivery: ${error.message}`);
    err.code = STATUS_CODES.INVALID_ARGUMENT;
    callback(err);
  }
}

// ────────────────────────────────────────────────────────────
// HANDLER 6: completeDelivery
// ────────────────────────────────────────────────────────────

function completeDelivery(call, callback) {
  const { delivery_id, success, note } = call.request;

  try {
    // Get delivery to access driver_id
    const delivery = db.getDeliveryById(delivery_id);

    if (!delivery) {
      const error = new Error(`Delivery not found: ${delivery_id}`);
      error.code = STATUS_CODES.NOT_FOUND;
      return callback(error);
    }

    // Set delivery status: COMPLETED (3) if success, FAILED (4) if not
    const status = success ? 3 : 4;
    const completedAt = new Date().toISOString();

    const updatedDelivery = db.updateDeliveryStatus(delivery_id, status, completedAt);

    // Set driver back to AVAILABLE (0)
    db.setDriverStatus(delivery.driver_id, 0);

    callback(null, formatDeliveryResponse(updatedDelivery));
  } catch (error) {
    const err = new Error(`Failed to complete delivery: ${error.message}`);
    err.code = STATUS_CODES.INVALID_ARGUMENT;
    callback(err);
  }
}

function listDeliveries(call, callback) {
  try {
    const { limit = 20, offset = 0 } = call.request;

    const { deliveries, total } = db.listDeliveries(limit, offset);

    callback(null, {
      deliveries: deliveries.map(d => formatDeliveryResponse(d)),
      total
    });
  } catch (error) {
    const err = new Error(`Failed to list deliveries: ${error.message}`);
    err.code = STATUS_CODES.INVALID_ARGUMENT;
    callback(err);
  }
}

// ────────────────────────────────────────────────────────────
// EXPORTS
// ────────────────────────────────────────────────────────────

module.exports = {
  registerDriver,
  getDriver,
  listAvailableDrivers,
  assignDelivery,
  getDelivery,
  completeDelivery,
  listDeliveries
};
