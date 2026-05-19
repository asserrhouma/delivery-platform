const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'order-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  connectionTimeout: 3000,
  requestTimeout: 3000
});

const producer = kafka.producer();

async function connectProducer() {
  try {
    await producer.connect();
    console.log('[Kafka Producer] Connected to Kafka');
  } catch (err) {
    console.log('[Kafka Producer] Could not connect:', err.message);
  }
}

async function publishOrderCreated(orderData) {
  try {
    await producer.send({
      topic: 'order.created',
      messages: [
        {
          key: orderData.order_id,
          value: JSON.stringify(orderData),
          headers: {
            'content-type': 'application/json'
          }
        }
      ]
    });
    console.log(`[Kafka] Published order.created event for order: ${orderData.order_id}`);
  } catch (err) {
    console.log(`[Kafka] Error publishing order.created: ${err.message}`);
  }
}

async function disconnectAll() {
  try {
    await producer.disconnect();
    console.log('[Kafka] Disconnected');
  } catch (err) {
    console.log('[Kafka] Error disconnecting:', err.message);
  }
}

module.exports = {
  connectProducer,
  publishOrderCreated,
  disconnectAll
};
