const { Kafka, logLevel } = require('kafkajs');
const db = require('./database');

const kafkaBroker = process.env.KAFKA_BROKER || 'localhost:9092';

const kafka = new Kafka({
  clientId: 'tracking-service',
  brokers: [kafkaBroker],
  logLevel: logLevel.WARN,
  connectionTimeout: 3000,
  requestTimeout: 3000
});

let consumer = null;

// ────────────────────────────────────────────────────────────
// CONSUMER
// ────────────────────────────────────────────────────────────

async function connectConsumer() {
  try {
    consumer = kafka.consumer({ groupId: 'tracking-service-group' });
    await consumer.connect();

    // Subscribe to delivery.assigned for DRIVER_ASSIGNED events
    await consumer.subscribe({ topic: 'delivery.assigned', fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const parsedMessage = JSON.parse(message.value.toString());
          console.log(`[Kafka Consumer] Event from ${topic}:`, parsedMessage);

          // Auto-create tracking event for delivery.assigned
          if (parsedMessage.event === 'delivery.assigned') {
            db.addEvent({
              order_id: parsedMessage.order_id,
              event_type: 1, // DRIVER_ASSIGNED
              description: `Driver ${parsedMessage.driver_name} assigned`,
              location: parsedMessage.pickup_address
            });
            console.log(`[Tracking] Event recorded for order ${parsedMessage.order_id}`);
          }
        } catch (error) {
          console.warn(`[Kafka Consumer] Error processing message: ${error.message}`);
        }
      }
    });

    console.log('[Kafka Consumer] Connecté et abonné à delivery.assigned');
  } catch (error) {
    console.warn(`[Kafka] Consumer non disponible, mode dégradé: ${error.message}`);
    consumer = null;
  }
}

// ────────────────────────────────────────────────────────────
// DISCONNECT
// ────────────────────────────────────────────────────────────

async function disconnectAll() {
  try {
    if (consumer) {
      await consumer.disconnect();
      console.log('[Kafka Consumer] Déconnecté');
    }
  } catch (error) {
    console.warn(`[Kafka Consumer] Error disconnecting: ${error.message}`);
  }
}

// ────────────────────────────────────────────────────────────
// EXPORTS
// ────────────────────────────────────────────────────────────

module.exports = {
  connectConsumer,
  disconnectAll
};
