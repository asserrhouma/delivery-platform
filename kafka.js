const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'order-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  retry: { initialRetryTime: 300, retries: 5 },
});

const producer = kafka.producer();
let connected = false;

async function connectProducer() {
  try {
    await producer.connect();
    connected = true;
    console.log('[Kafka] Producer connecté');
  } catch (err) {
    console.warn('[Kafka] Producer non disponible, mode dégradé:', err.message);
  }
}

async function publishOrderCreated(order) {
  if (!connected) {
    console.warn('[Kafka] Skipped order.created (pas de connexion)');
    return;
  }
  const message = {
    event:            'order.created',
    order_id:         order.order_id,
    customer_name:    order.customer_name,
    customer_phone:   order.customer_phone,
    pickup_address:   order.pickup_address,
    delivery_address: order.delivery_address,
    items:            order.items,
    created_at:       order.created_at,
  };
  await producer.send({
    topic:    'order.created',
    messages: [{ key: order.order_id, value: JSON.stringify(message) }],
  });
  console.log('[Kafka] Publié order.created pour order_id=' + order.order_id);
}

async function disconnectProducer() {
  if (connected) await producer.disconnect();
}

module.exports = { connectProducer, publishOrderCreated, disconnectProducer };
