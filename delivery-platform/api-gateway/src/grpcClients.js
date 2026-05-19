const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const orderServiceUrl = process.env.ORDER_SERVICE_URL || 'localhost:50051';
const deliveryServiceUrl = process.env.DELIVERY_SERVICE_URL || 'localhost:50052';
const trackingServiceUrl = process.env.TRACKING_SERVICE_URL || 'localhost:50053';

const protoLoaderOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
};

// ────────────────────────────────────────────────────────────
// Load Order Service
// ────────────────────────────────────────────────────────────

const orderProtoPath = path.join(__dirname, '../proto/order.proto');
const orderPackageDef = protoLoader.loadSync(orderProtoPath, protoLoaderOptions);
const orderGrpcObject = grpc.loadPackageDefinition(orderPackageDef);
const OrderService = orderGrpcObject.order.OrderService;
const orderClient = new OrderService(orderServiceUrl, grpc.credentials.createInsecure());

// ────────────────────────────────────────────────────────────
// Load Delivery Service
// ────────────────────────────────────────────────────────────

const deliveryProtoPath = path.join(__dirname, '../proto/delivery.proto');
const deliveryPackageDef = protoLoader.loadSync(deliveryProtoPath, protoLoaderOptions);
const deliveryGrpcObject = grpc.loadPackageDefinition(deliveryPackageDef);
const DeliveryService = deliveryGrpcObject.delivery.DeliveryService;
const deliveryClient = new DeliveryService(deliveryServiceUrl, grpc.credentials.createInsecure());

// ────────────────────────────────────────────────────────────
// Load Tracking Service
// ────────────────────────────────────────────────────────────

const trackingProtoPath = path.join(__dirname, '../proto/tracking.proto');
const trackingPackageDef = protoLoader.loadSync(trackingProtoPath, protoLoaderOptions);
const trackingGrpcObject = grpc.loadPackageDefinition(trackingPackageDef);
const TrackingService = trackingGrpcObject.tracking.TrackingService;
const trackingClient = new TrackingService(trackingServiceUrl, grpc.credentials.createInsecure());

// ────────────────────────────────────────────────────────────
// gRPC Call Helper
// ────────────────────────────────────────────────────────────

function grpcCall(client, method, payload) {
  return new Promise((resolve, reject) => {
    client[method](payload, (err, response) => {
      if (err) {
        reject(err);
      } else {
        resolve(response);
      }
    });
  });
}

// ────────────────────────────────────────────────────────────
// Exports
// ────────────────────────────────────────────────────────────

module.exports = {
  orderClient,
  deliveryClient,
  trackingClient,
  grpcCall
};
