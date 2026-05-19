const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const handlers = require('./handlers');
const kafka = require('./kafka');

const PORT = process.env.TRACKING_SERVICE_PORT || 50053;

// ────────────────────────────────────────────────────────────
// Load Proto File
// ────────────────────────────────────────────────────────────

const protoPath = path.join(__dirname, '../proto/tracking.proto');

const packageDef = protoLoader.loadSync(protoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const grpcObject = grpc.loadPackageDefinition(packageDef);
const TrackingService = grpcObject.tracking.TrackingService;

// ────────────────────────────────────────────────────────────
// Create gRPC Server
// ────────────────────────────────────────────────────────────

const server = new grpc.Server();

server.addService(TrackingService.service, {
  GetTracking: handlers.GetTracking,
  GetHistory: handlers.GetHistory,
  AddEvent: handlers.AddEvent
});

// ────────────────────────────────────────────────────────────
// Bind & Start Server
// ────────────────────────────────────────────────────────────

server.bindAsync(
  `0.0.0.0:${PORT}`,
  grpc.ServerCredentials.createInsecure(),
  async (err) => {
    if (err) {
      console.error(`[tracking-service] Failed to bind server: ${err}`);
      process.exit(1);
    }

    console.log(`[tracking-service] gRPC server started on port ${PORT}`);

    // ────────────────────────────────────────────────────────────
    // Start Kafka Consumer
    // ────────────────────────────────────────────────────────────

    await kafka.connectConsumer();
  }
);

// ────────────────────────────────────────────────────────────
// Graceful Shutdown
// ────────────────────────────────────────────────────────────

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown() {
  console.log('[tracking-service] Shutting down gracefully...');

  kafka.disconnectAll()
    .then(() => {
      server.tryShutdown(() => {
        console.log('[tracking-service] Server shut down');
        process.exit(0);
      });
    })
    .catch(() => {
      server.tryShutdown(() => {
        console.log('[tracking-service] Server shut down');
        process.exit(0);
      });
    });
}
