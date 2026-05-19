const db = require('./database');
const { publishOrderCreated } = require('./kafka');

function formatOrder(order) {
  return {
    order_id:         order.order_id,
    customer_name:    order.customer_name,
    customer_phone:   order.customer_phone,
    pickup_address:   order.pickup_address,
    delivery_address: order.delivery_address,
    status:           order.status,
    created_at:       order.created_at,
    items: (order.items || []).map(i => ({
      description: i.description,
      quantity:    i.quantity,
      price:       i.price,
    })),
  };
}

async function createOrder(call, callback) {
  try {
    const { customer_name, customer_phone, pickup_address, delivery_address, items } = call.request;
    if (!customer_name || !pickup_address || !delivery_address) {
      return callback({ code: 9, message: 'customer_name, pickup_address et delivery_address sont obligatoires' });
    }
    const order = db.createOrder({ customer_name, customer_phone, pickup_address, delivery_address, items });
    publishOrderCreated(order).catch(err => console.error('[Kafka] Erreur publish:', err.message));
    console.log('[gRPC] CreateOrder -> order_id=' + order.order_id);
    callback(null, formatOrder(order));
  } catch (err) {
    callback({ code: 13, message: 'Erreur interne: ' + err.message });
  }
}

async function getOrder(call, callback) {
  try {
    const order = db.getOrderById(call.request.order_id);
    if (!order) return callback({ code: 5, message: 'Commande introuvable' });
    callback(null, formatOrder(order));
  } catch (err) {
    callback({ code: 13, message: 'Erreur interne: ' + err.message });
  }
}

async function listOrders(call, callback) {
  try {
    const { status = 0, limit = 20, offset = 0 } = call.request;
    const result = db.listOrders({ status, limit, offset });
    callback(null, { orders: result.orders.map(formatOrder), total: result.total });
  } catch (err) {
    callback({ code: 13, message: 'Erreur interne: ' + err.message });
  }
}

async function updateOrderStatus(call, callback) {
  try {
    const { order_id, status } = call.request;
    const order = db.updateOrderStatus(order_id, status);
    if (!order) return callback({ code: 5, message: 'Commande introuvable' });
    console.log('[gRPC] UpdateOrderStatus -> order_id=' + order_id + ' status=' + status);
    callback(null, formatOrder(order));
  } catch (err) {
    callback({ code: 13, message: 'Erreur interne: ' + err.message });
  }
}

module.exports = { createOrder, getOrder, listOrders, updateOrderStatus };
