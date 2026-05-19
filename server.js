const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { connectProducer, disconnectProducer } = require('./kafka');
const handlers = require('./handlers');

const PROTO_PATH = path.join(__dirname, '..', '..', 'proto', 'order.proto');
const PORT = process.env.ORDER_SERVICE_PORT || 50051;

// ─── Charger le proto ─────────────────────────────────────────────────────────
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase:     true,
  longs:        String,
  enums:        String,
  defaults:     true,
  oneofs:       true,
});
const { order: orderProto } = grpc.loadPackageDefinition(packageDef);

// ─── Créer le serveur gRPC ────────────────────────────────────────────────────
const server = new grpc.Server();

server.addService(orderProto.OrderService.service, {
  CreateOrder:      handlers.createOrder,
  GetOrder:         handlers.getOrder,
  ListOrders:       handlers.listOrders,
  UpdateOrderStatus: handlers.updateOrderStatus,
});

// ─── Démarrage ────────────────────────────────────────────────────────────────
async function start() {
  await connectProducer();

  server.bindAsync(
    '0.0.0.0:' + PORT,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error('[order-service] Erreur bind:', err);
        process.exit(1);
      }
      console.log('[order-service] gRPC server démarré sur le port ' + port);
    }
  );
}

// ─── Arrêt propre ─────────────────────────────────────────────────────────────
async function shutdown() {
  console.log('[order-service] Arrêt en cours...');
  await disconnectProducer();
  server.tryShutdown(() => process.exit(0));
}

process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);

start();
