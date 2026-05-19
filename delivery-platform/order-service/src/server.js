const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const handlers = require('./handlers');
const kafka = require('./kafka');

const PROTO_PATH = path.join(__dirname, '../proto/order.proto');

// Load the proto file
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const orderProto = grpc.loadPackageDefinition(packageDefinition).order;

// Create gRPC server
const server = new grpc.Server();

// Add service with handlers
server.addService(orderProto.OrderService.service, {
  CreateOrder: handlers.CreateOrder,
  GetOrder: handlers.GetOrder,
  ListOrders: handlers.ListOrders,
  UpdateOrderStatus: handlers.UpdateOrderStatus
});

const PORT = process.env.GRPC_PORT || 50051;

// Start server
async function start() {
  try {
    // Connect Kafka producer
    await kafka.connectProducer();

    server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
      if (err) {
        console.error('[Order Service] Error binding server:', err);
        process.exit(1);
      }

      server.start();
      console.log(`[Order Service] gRPC server started on port ${PORT}`);
    });
  } catch (err) {
    console.error('[Order Service] Startup error:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[Order Service] Shutting down gracefully...');
  await kafka.disconnectAll();
  server.tryShutdown(() => {
    console.log('[Order Service] Server shut down');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('[Order Service] Shutting down gracefully...');
  await kafka.disconnectAll();
  server.tryShutdown(() => {
    console.log('[Order Service] Server shut down');
    process.exit(0);
  });
});

start();
