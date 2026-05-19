const db = require('./database');
const kafka = require('./kafka');
const { status: STATUS_CODES } = require('@grpc/grpc-js');

async function CreateOrder(call, callback) {
  try {
    const { customer_name, customer_phone, pickup_address, delivery_address, items } = call.request;

    if (!customer_name || !customer_phone || !pickup_address || !delivery_address) {
      const error = new Error('Missing required fields: customer_name, customer_phone, pickup_address, delivery_address');
      error.code = STATUS_CODES.INVALID_ARGUMENT;
      return callback(error);
    }

    const order = db.createOrder({
      customer_name,
      customer_phone,
      pickup_address,
      delivery_address,
      items: items || []
    });

    // Publish order.created event to Kafka
    await kafka.publishOrderCreated({
      order_id: order.order_id,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      pickup_address: order.pickup_address,
      delivery_address: order.delivery_address,
      status: order.status,
      created_at: order.created_at,
      items: order.items
    });

    callback(null, {
      order_id: order.order_id,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      pickup_address: order.pickup_address,
      delivery_address: order.delivery_address,
      status: order.status,
      created_at: order.created_at,
      items: order.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        price: item.price
      }))
    });
  } catch (err) {
    console.error('Error in CreateOrder:', err);
    const error = new Error(err.message);
    error.code = STATUS_CODES.INTERNAL;
    callback(error);
  }
}

async function GetOrder(call, callback) {
  try {
    const { order_id } = call.request;

    if (!order_id) {
      const error = new Error('Missing required field: order_id');
      error.code = STATUS_CODES.INVALID_ARGUMENT;
      return callback(error);
    }

    const order = db.getOrder(order_id);

    if (!order) {
      const error = new Error(`Order not found: ${order_id}`);
      error.code = STATUS_CODES.NOT_FOUND;
      return callback(error);
    }

    callback(null, {
      order_id: order.order_id,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      pickup_address: order.pickup_address,
      delivery_address: order.delivery_address,
      status: order.status,
      created_at: order.created_at,
      items: order.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        price: item.price
      }))
    });
  } catch (err) {
    console.error('Error in GetOrder:', err);
    const error = new Error(err.message);
    error.code = STATUS_CODES.INTERNAL;
    callback(error);
  }
}

async function ListOrders(call, callback) {
  try {
    const { status, limit, offset } = call.request;

    const result = db.listOrders(status, limit, offset);

    callback(null, {
      orders: result.orders.map(order => ({
        order_id: order.order_id,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        pickup_address: order.pickup_address,
        delivery_address: order.delivery_address,
        status: order.status,
        created_at: order.created_at,
        items: order.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          price: item.price
        }))
      })),
      total: result.total
    });
  } catch (err) {
    console.error('Error in ListOrders:', err);
    const error = new Error(err.message);
    error.code = STATUS_CODES.INTERNAL;
    callback(error);
  }
}

async function UpdateOrderStatus(call, callback) {
  try {
    const { order_id, status } = call.request;

    if (!order_id) {
      const error = new Error('Missing required field: order_id');
      error.code = STATUS_CODES.INVALID_ARGUMENT;
      return callback(error);
    }

    // Check if order exists
    const existingOrder = db.getOrder(order_id);
    if (!existingOrder) {
      const error = new Error(`Order not found: ${order_id}`);
      error.code = STATUS_CODES.NOT_FOUND;
      return callback(error);
    }

    const order = db.updateOrderStatus(order_id, status);

    callback(null, {
      order_id: order.order_id,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      pickup_address: order.pickup_address,
      delivery_address: order.delivery_address,
      status: order.status,
      created_at: order.created_at,
      items: order.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        price: item.price
      }))
    });
  } catch (err) {
    console.error('Error in UpdateOrderStatus:', err);
    const error = new Error(err.message);
    error.code = STATUS_CODES.INTERNAL;
    callback(error);
  }
}

module.exports = {
  CreateOrder,
  GetOrder,
  ListOrders,
  UpdateOrderStatus
};
