const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const handlers = require('./handlers');
const kafka = require('./kafka');

const PORT = process.env.DELIVERY_SERVICE_PORT || 50052;

// ────────────────────────────────────────────────────────────
// Load Proto File
// ────────────────────────────────────────────────────────────

const protoPath = path.join(__dirname, '../proto/delivery.proto');

const packageDef = protoLoader.loadSync(protoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const grpcObject = grpc.loadPackageDefinition(packageDef);
const DeliveryService = grpcObject.delivery.DeliveryService;

// ────────────────────────────────────────────────────────────
// Create gRPC Server
// ────────────────────────────────────────────────────────────

const server = new grpc.Server();

server.addService(DeliveryService.service, {
  RegisterDriver: handlers.registerDriver,
  GetDriver: handlers.getDriver,
  ListAvailableDrivers: handlers.listAvailableDrivers,
  AssignDelivery: handlers.assignDelivery,
  GetDelivery: handlers.getDelivery,
  CompleteDelivery: handlers.completeDelivery
});

// ────────────────────────────────────────────────────────────
// Bind & Start Server
// ────────────────────────────────────────────────────────────

server.bindAsync(
  `0.0.0.0:${PORT}`,
  grpc.ServerCredentials.createInsecure(),
  async (err) => {
    if (err) {
      console.error(`[delivery-service] Failed to bind server: ${err}`);
      process.exit(1);
    }

    console.log(`[delivery-service] gRPC server started on port ${PORT}`);

    // ────────────────────────────────────────────────────────────
    // Start Kafka Producer
    // ────────────────────────────────────────────────────────────

    await kafka.connectProducer();

    // ────────────────────────────────────────────────────────────
    // Start Kafka Consumer with Auto-Assign
    // ────────────────────────────────────────────────────────────

    await kafka.connectConsumer(async (orderMessage) => {
      try {
        const { order_id, pickup_address, delivery_address, customer_name } = orderMessage;

        console.log(`[Auto-assign] Processing order: ${order_id}`);

        // Call assignDelivery handler directly
        const mockCall = {
          request: {
            order_id,
            pickup_address,
            delivery_address,
            customer_name
          }
        };

        handlers.assignDelivery(mockCall, (err, response) => {
          if (err) {
            console.log(`[Auto-assign] Error for order ${order_id}: ${err.message}`);
          } else {
            console.log(
              `[Auto-assign] ✓ Delivery ${response.delivery_id} assigned to driver ${response.driver_id} for order ${order_id}`
            );
          }
        });
      } catch (error) {
        console.error(`[Auto-assign] Failed to process order: ${error.message}`);
      }
    });
  }
);

// ────────────────────────────────────────────────────────────
// Graceful Shutdown
// ────────────────────────────────────────────────────────────

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown() {
  console.log('[delivery-service] Shutting down gracefully...');

  kafka.disconnectAll()
    .then(() => {
      server.tryShutdown(() => {
        console.log('[delivery-service] Server shut down');
        process.exit(0);
      });
    })
    .catch(() => {
      server.tryShutdown(() => {
        console.log('[delivery-service] Server shut down');
        process.exit(0);
      });
    });
}
