const { Kafka, logLevel } = require('kafkajs');

const kafkaBroker = process.env.KAFKA_BROKER || 'localhost:9092';

const kafka = new Kafka({
  clientId: 'delivery-service',
  brokers: [kafkaBroker],
  logLevel: logLevel.WARN,
  connectionTimeout: 3000,
  requestTimeout: 3000
});

let producer = null;
let consumer = null;

// ────────────────────────────────────────────────────────────
// PRODUCER
// ────────────────────────────────────────────────────────────

async function connectProducer() {
  try {
    producer = kafka.producer();
    await producer.connect();
    console.log('[Kafka Producer] Connecté avec succès');
  } catch (error) {
    console.warn(`[Kafka] Producer non disponible, mode dégradé: ${error.message}`);
    producer = null;
  }
}

async function publishDeliveryAssigned(data) {
  if (!producer) {
    console.warn('[Kafka] Producer indisponible, événement delivery.assigned non publié');
    return;
  }

  try {
    const message = {
      event: 'delivery.assigned',
      order_id: data.order_id,
      delivery_id: data.delivery_id,
      driver_id: data.driver_id,
      driver_name: data.driver_name,
      pickup_address: data.pickup_address,
      delivery_address: data.delivery_address,
      assigned_at: data.assigned_at
    };

    await producer.send({
      topic: 'delivery.assigned',
      messages: [
        {
          key: data.order_id,
          value: JSON.stringify(message)
        }
      ]
    });

    console.log(`[Kafka] Événement delivery.assigned publié pour order_id: ${data.order_id}`);
  } catch (error) {
    console.warn(`[Kafka] Erreur lors de la publication: ${error.message}`);
  }
}

// ────────────────────────────────────────────────────────────
// CONSUMER
// ────────────────────────────────────────────────────────────

async function connectConsumer(onOrderCreated) {
  try {
    consumer = kafka.consumer({ groupId: 'delivery-service-group' });
    await consumer.connect();
    await consumer.subscribe({ topic: 'order.created' });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const parsedMessage = JSON.parse(message.value.toString());
          console.log(`[Kafka Consumer] Message reçu de ${topic}:`, parsedMessage);
          await onOrderCreated(parsedMessage);
        } catch (error) {
          console.warn(`[Kafka Consumer] Erreur lors du traitement du message: ${error.message}`);
        }
      }
    });

    console.log('[Kafka Consumer] Connecté et abonné à order.created');
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
    if (producer) {
      await producer.disconnect();
      console.log('[Kafka Producer] Déconnecté');
    }
  } catch (error) {
    console.warn(`[Kafka Producer] Erreur lors de la déconnexion: ${error.message}`);
  }

  try {
    if (consumer) {
      await consumer.disconnect();
      console.log('[Kafka Consumer] Déconnecté');
    }
  } catch (error) {
    console.warn(`[Kafka Consumer] Erreur lors de la déconnexion: ${error.message}`);
  }
}

// ────────────────────────────────────────────────────────────
// EXPORTS
// ────────────────────────────────────────────────────────────

module.exports = {
  connectProducer,
  publishDeliveryAssigned,
  connectConsumer,
  disconnectAll
};
