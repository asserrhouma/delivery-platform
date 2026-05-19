const db = require('./database');
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
// HELPER: Format TrackingEvent
// ────────────────────────────────────────────────────────────

function formatTrackingEvent(event) {
  if (!event) return null;

  return {
    event_id: event.event_id,
    order_id: event.order_id,
    event_type: event.event_type,
    description: event.description,
    location: event.location,
    timestamp: event.timestamp
  };
}

// ────────────────────────────────────────────────────────────
// HANDLER 1: GetTracking
// ────────────────────────────────────────────────────────────

function GetTracking(call, callback) {
  const { order_id } = call.request;

  if (!order_id) {
    const error = new Error('order_id is required');
    error.code = STATUS_CODES.INVALID_ARGUMENT;
    return callback(error);
  }

  try {
    const lastEvent = db.getLastEventByOrderId(order_id);

    if (!lastEvent) {
      const error = new Error(`No tracking data found for order ${order_id}`);
      error.code = STATUS_CODES.NOT_FOUND;
      return callback(error);
    }

    callback(null, {
      order_id: order_id,
      current_status: lastEvent.event_type,
      last_location: lastEvent.location || '',
      last_updated: lastEvent.timestamp,
      driver_name: lastEvent.description || ''
    });
  } catch (error) {
    const err = new Error(`Failed to get tracking: ${error.message}`);
    err.code = STATUS_CODES.INVALID_ARGUMENT;
    callback(err);
  }
}

// ────────────────────────────────────────────────────────────
// HANDLER 2: GetHistory
// ────────────────────────────────────────────────────────────

function GetHistory(call, callback) {
  const { order_id } = call.request;

  if (!order_id) {
    const error = new Error('order_id is required');
    error.code = STATUS_CODES.INVALID_ARGUMENT;
    return callback(error);
  }

  try {
    const events = db.getEventsByOrderId(order_id);

    if (events.length === 0) {
      const error = new Error(`No tracking history found for order ${order_id}`);
      error.code = STATUS_CODES.NOT_FOUND;
      return callback(error);
    }

    const formattedEvents = events.map(event => formatTrackingEvent(event));

    callback(null, {
      order_id: order_id,
      events: formattedEvents
    });
  } catch (error) {
    const err = new Error(`Failed to get history: ${error.message}`);
    err.code = STATUS_CODES.INVALID_ARGUMENT;
    callback(err);
  }
}

// ────────────────────────────────────────────────────────────
// HANDLER 3: AddEvent
// ────────────────────────────────────────────────────────────

function AddEvent(call, callback) {
  const { order_id, event_type, description, location } = call.request;

  if (!order_id || event_type === undefined) {
    const error = new Error('order_id and event_type are required');
    error.code = STATUS_CODES.INVALID_ARGUMENT;
    return callback(error);
  }

  try {
    const event = db.addEvent({
      order_id,
      event_type,
      description,
      location
    });

    callback(null, formatTrackingEvent(event));
  } catch (error) {
    const err = new Error(`Failed to add event: ${error.message}`);
    err.code = STATUS_CODES.INVALID_ARGUMENT;
    callback(err);
  }
}

// ────────────────────────────────────────────────────────────
// EXPORTS
// ────────────────────────────────────────────────────────────

module.exports = {
  GetTracking,
  GetHistory,
  AddEvent
};
