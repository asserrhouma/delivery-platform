
# 🤖 COPILOT TASKS — Remaining Work (api-gateway + docker + readme)
# Paste each TASK block one at a time into VS Code Copilot Chat
# Wait for each file to be fully generated before moving to the next task
# ─────────────────────────────────────────────────────────────────────────────

# CURRENT PROJECT STRUCTURE (for context):
# delivery-platform/
# ├── proto/
# │   ├── order.proto      ✅
# │   ├── delivery.proto   ✅
# │   └── tracking.proto   ✅
# ├── order-service/       ✅ (port 50051, SQLite3)
# ├── delivery-service/    ✅ (port 50052, SQLite3)
# ├── tracking-service/    ✅ (port 50053, RxDB)
# └── api-gateway/         ← BUILD THIS NOW


# ══════════════════════════════════════════════════════════════════════════════
# TASK 1 — api-gateway/package.json
# ══════════════════════════════════════════════════════════════════════════════
"""
Create a file api-gateway/package.json for a Node.js API Gateway service.

name: "api-gateway"
scripts: start runs "node src/server.js", dev runs "nodemon src/server.js"

Dependencies needed:
- express (REST server)
- @apollo/server (GraphQL server)
- @as-integrations/express (Apollo + Express integration)
- graphql (peer dep for Apollo)
- @grpc/grpc-js (gRPC client)
- @grpc/proto-loader (load .proto files)
- body-parser (parse JSON bodies)
- cors (enable CORS)
- uuid (generate request IDs)

devDependencies:
- nodemon
"""


# ══════════════════════════════════════════════════════════════════════════════
# TASK 2 — api-gateway/src/grpcClients.js
# ══════════════════════════════════════════════════════════════════════════════
"""
Create api-gateway/src/grpcClients.js

This file loads all 3 proto files and creates gRPC stub clients.

Proto files are located at: path.join(__dirname, '../../proto/')
- order.proto    → package 'order',    service OrderService
- delivery.proto → package 'delivery', service DeliveryService
- tracking.proto → package 'tracking', service TrackingService

protoLoader options for all: { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true }

Service URLs from env vars:
- ORDER_SERVICE_URL    default 'localhost:50051'
- DELIVERY_SERVICE_URL default 'localhost:50052'
- TRACKING_SERVICE_URL default 'localhost:50053'

All clients use grpc.credentials.createInsecure()

Export: { orderClient, deliveryClient, trackingClient }

Also export a helper function:
  grpcCall(client, method, payload) → returns a Promise
  that calls client[method](payload, callback) and resolves/rejects based on err/response
"""


# ══════════════════════════════════════════════════════════════════════════════
# TASK 3 — api-gateway/src/rest/routes.js
# ══════════════════════════════════════════════════════════════════════════════
"""
Create api-gateway/src/rest/routes.js

This is an Express Router with all REST endpoints.
Import { orderClient, deliveryClient, trackingClient, grpcCall } from '../grpcClients.js'

Implement these endpoints:

--- ORDERS ---
POST /api/orders
  body: { customer_name, customer_phone, pickup_address, delivery_address, items: [{description, quantity, price}] }
  calls: orderClient.CreateOrder(body)
  returns 201 + order object

GET /api/orders
  query: ?status=0&limit=20&offset=0
  calls: orderClient.ListOrders({ status: Number, limit: Number, offset: Number })
  returns 200 + { orders, total }

GET /api/orders/:id
  calls: orderClient.GetOrder({ order_id: req.params.id })
  returns 200 + order or 404

PATCH /api/orders/:id/status
  body: { status: Number }
  calls: orderClient.UpdateOrderStatus({ order_id, status })
  returns 200 + updated order

--- DRIVERS ---
POST /api/drivers
  body: { name, phone, vehicle_type }
  calls: deliveryClient.RegisterDriver(body)
  returns 201 + driver object

GET /api/drivers/available
  calls: deliveryClient.ListAvailableDrivers({})
  returns 200 + { drivers }

GET /api/drivers/:id
  calls: deliveryClient.GetDriver({ driver_id: req.params.id })
  returns 200 + driver or 404

--- DELIVERIES ---
POST /api/deliveries
  body: { order_id, pickup_address, delivery_address, customer_name }
  calls: deliveryClient.AssignDelivery(body)
  returns 201 + delivery object

GET /api/deliveries/:id
  calls: deliveryClient.GetDelivery({ delivery_id: req.params.id })
  returns 200 + delivery or 404

PATCH /api/deliveries/:id/complete
  body: { success: Boolean, note: String }
  calls: deliveryClient.CompleteDelivery({ delivery_id, success, note })
  returns 200 + updated delivery

--- TRACKING ---
GET /api/tracking/:orderId
  calls: trackingClient.GetTracking({ order_id })
  returns 200 + tracking state or 404

GET /api/tracking/:orderId/history
  calls: trackingClient.GetHistory({ order_id })
  returns 200 + { order_id, events }

POST /api/tracking/event
  body: { order_id, event_type, description, location }
  calls: trackingClient.AddEvent(body)
  returns 201 + event object

Error handling for all routes:
  gRPC code 5 (NOT_FOUND) → HTTP 404
  gRPC code 9 (FAILED_PRECONDITION) → HTTP 400
  Other errors → HTTP 500
  Always return JSON: { error: message }

Export the router.
"""


# ══════════════════════════════════════════════════════════════════════════════
# TASK 4 — api-gateway/src/graphql/schema.js
# ══════════════════════════════════════════════════════════════════════════════
"""
Create api-gateway/src/graphql/schema.js

Export a GraphQL type definitions string (gql template or plain string).

Include these types:

type OrderItem {
  description: String!
  quantity: Int!
  price: Float!
}

type Order {
  order_id: String!
  customer_name: String!
  customer_phone: String
  pickup_address: String!
  delivery_address: String!
  status: Int!
  created_at: String!
  items: [OrderItem!]!
}

type OrderList {
  orders: [Order!]!
  total: Int!
}

type Driver {
  driver_id: String!
  name: String!
  phone: String!
  vehicle_type: String!
  status: Int!
}

type DriverList {
  drivers: [Driver!]!
}

type Delivery {
  delivery_id: String!
  order_id: String!
  driver_id: String!
  driver_name: String
  pickup_address: String!
  delivery_address: String!
  status: Int!
  assigned_at: String!
  completed_at: String
}

type TrackingEvent {
  event_id: String!
  order_id: String!
  event_type: Int!
  description: String
  location: String
  timestamp: String!
}

type TrackingState {
  order_id: String!
  current_status: Int!
  last_location: String
  last_updated: String!
  driver_name: String
}

type TrackingHistory {
  order_id: String!
  events: [TrackingEvent!]!
}

input OrderItemInput {
  description: String!
  quantity: Int!
  price: Float!
}

type Query {
  order(order_id: String!): Order
  orders(status: Int, limit: Int, offset: Int): OrderList!
  driver(driver_id: String!): Driver
  availableDrivers: DriverList!
  delivery(delivery_id: String!): Delivery
  tracking(order_id: String!): TrackingState
  trackingHistory(order_id: String!): TrackingHistory!
}

type Mutation {
  createOrder(
    customer_name: String!
    customer_phone: String!
    pickup_address: String!
    delivery_address: String!
    items: [OrderItemInput!]!
  ): Order!

  registerDriver(
    name: String!
    phone: String!
    vehicle_type: String!
  ): Driver!

  assignDelivery(
    order_id: String!
    pickup_address: String!
    delivery_address: String!
    customer_name: String!
  ): Delivery!

  completeDelivery(
    delivery_id: String!
    success: Boolean!
    note: String
  ): Delivery!

  addTrackingEvent(
    order_id: String!
    event_type: Int!
    description: String
    location: String
  ): TrackingEvent!
}

Export as: module.exports = { typeDefs }
"""


# ══════════════════════════════════════════════════════════════════════════════
# TASK 5 — api-gateway/src/graphql/resolvers.js
# ══════════════════════════════════════════════════════════════════════════════
"""
Create api-gateway/src/graphql/resolvers.js

Import { orderClient, deliveryClient, trackingClient, grpcCall } from '../grpcClients.js'

Implement resolvers for every Query and Mutation defined in schema.js.

Queries:
- order(_, { order_id }) → grpcCall(orderClient, 'GetOrder', { order_id })
- orders(_, { status=0, limit=20, offset=0 }) → grpcCall(orderClient, 'ListOrders', { status, limit, offset })
- driver(_, { driver_id }) → grpcCall(deliveryClient, 'GetDriver', { driver_id })
- availableDrivers() → grpcCall(deliveryClient, 'ListAvailableDrivers', {})
- delivery(_, { delivery_id }) → grpcCall(deliveryClient, 'GetDelivery', { delivery_id })
- tracking(_, { order_id }) → grpcCall(trackingClient, 'GetTracking', { order_id })
- trackingHistory(_, { order_id }) → grpcCall(trackingClient, 'GetHistory', { order_id })

Mutations:
- createOrder(_, args) → grpcCall(orderClient, 'CreateOrder', args)
- registerDriver(_, args) → grpcCall(deliveryClient, 'RegisterDriver', args)
- assignDelivery(_, args) → grpcCall(deliveryClient, 'AssignDelivery', args)
- completeDelivery(_, args) → grpcCall(deliveryClient, 'CompleteDelivery', args)
- addTrackingEvent(_, args) → grpcCall(trackingClient, 'AddEvent', args)

For all resolvers: wrap in try/catch, throw new Error(err.message) on failure.

Export as: module.exports = { resolvers }
"""


# ══════════════════════════════════════════════════════════════════════════════
# TASK 6 — api-gateway/src/server.js
# ══════════════════════════════════════════════════════════════════════════════
"""
Create api-gateway/src/server.js

This is the main entry point for the API Gateway.

Steps:
1. Import express, cors, body-parser
2. Import ApolloServer from @apollo/server
3. Import expressMiddleware from @as-integrations/express
4. Import { typeDefs } from ./graphql/schema.js
5. Import { resolvers } from ./graphql/resolvers.js
6. Import restRouter from ./rest/routes.js

Setup:
- Create Express app
- app.use(cors())
- app.use(bodyParser.json())
- Mount REST router: app.use('/', restRouter)
- Create ApolloServer with typeDefs and resolvers
- Call await server.start()
- Mount Apollo: app.use('/graphql', expressMiddleware(server, { context: async () => ({}) }))

PORT from process.env.PORT || 3000

Start listening:
  app.listen(PORT, () => {
    console.log('[api-gateway] REST API ready at http://localhost:PORT')
    console.log('[api-gateway] GraphQL ready at http://localhost:PORT/graphql')
  })

Export app for testing.
"""


# ══════════════════════════════════════════════════════════════════════════════
# TASK 7 — api-gateway/.env.example
# ══════════════════════════════════════════════════════════════════════════════
"""
Create api-gateway/.env.example with this content:

PORT=3000
ORDER_SERVICE_URL=localhost:50051
DELIVERY_SERVICE_URL=localhost:50052
TRACKING_SERVICE_URL=localhost:50053
"""


# ══════════════════════════════════════════════════════════════════════════════
# TASK 8 — docker-compose.yml (in project ROOT: delivery-platform/)
# ══════════════════════════════════════════════════════════════════════════════
"""
Create docker-compose.yml in the delivery-platform root folder.

It should run only Kafka infrastructure (NOT the Node.js services, those run manually).

services:

  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    container_name: zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    container_name: kafka
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"

Add a volumes section for kafka data persistence.
"""


# ══════════════════════════════════════════════════════════════════════════════
# TASK 9 — README.md (in project ROOT: delivery-platform/)
# ══════════════════════════════════════════════════════════════════════════════
"""
Create README.md for the delivery-platform project.

Include these sections:

# 🚚 Real-Time Delivery Platform — Microservices

## Description
Brief description of the project: a Node.js microservices platform for real-time delivery management.
University project for SoA & Microservices course.

## Architecture
Text diagram showing:
Client → API Gateway (REST/GraphQL) → [order-service gRPC] → SQLite3
                                    → [delivery-service gRPC] → SQLite3
                                    → [tracking-service gRPC] → RxDB
Kafka topics: order.created, delivery.assigned

## Tech Stack
- Node.js (all services)
- gRPC + Protobuf (inter-service communication)
- Apache Kafka (async events)
- SQLite3 (order-service, delivery-service)
- RxDB in-memory (tracking-service)
- Express + Apollo GraphQL (api-gateway)
- Docker Compose (Kafka infrastructure)

## Prerequisites
- Node.js >= 18
- Docker + Docker Compose

## Installation
Steps to install each service (npm install in each folder)

## Running the Project

### Step 1 — Start Kafka
docker-compose up -d

### Step 2 — Start each service (separate terminals)
cd order-service && node src/server.js        # port 50051
cd delivery-service && node src/server.js     # port 50052
cd tracking-service && node src/server.js     # port 50053
cd api-gateway && node src/server.js          # port 3000

## REST API Endpoints
List all endpoints from routes.js with method, path, and description

## GraphQL
Endpoint: POST http://localhost:3000/graphql
Example queries and mutations (at least 3 examples with variables)

## Kafka Topics
Table with: Topic name | Producer | Consumer | Event description
- order.created | order-service | delivery-service | New order placed
- delivery.assigned | delivery-service | tracking-service | Driver assigned to order

## Database Schemas
Show tables for order-service (orders, order_items) and delivery-service (drivers, deliveries)
Show RxDB schema for tracking-service (tracking_events)

## gRPC Services
List all 3 services with their RPC methods

## Project Structure
Show the folder tree
"""


# ══════════════════════════════════════════════════════════════════════════════
# TASK 10 — Test everything is working
# Run in terminal AFTER all services are started
# ══════════════════════════════════════════════════════════════════════════════

# Terminal 1 - Start Kafka:
# docker-compose up -d

# Terminal 2:
# cd order-service && npm install && node src/server.js

# Terminal 3:
# cd delivery-service && npm install && node src/server.js

# Terminal 4:
# cd tracking-service && npm install && node src/server.js

# Terminal 5:
# cd api-gateway && npm install && node src/server.js

# Then test with curl:

# 1. Register a driver
# curl -X POST http://localhost:3000/api/drivers \
#   -H "Content-Type: application/json" \
#   -d '{"name":"Ahmed Ben Ali","phone":"12345678","vehicle_type":"moto"}'

# 2. Create an order
# curl -X POST http://localhost:3000/api/orders \
#   -H "Content-Type: application/json" \
#   -d '{"customer_name":"Asser Rhouma","customer_phone":"98765432","pickup_address":"Rue de la Liberté, Tunis","delivery_address":"Avenue Habib Bourguiba, Sousse","items":[{"description":"Laptop","quantity":1,"price":2500}]}'

# 3. Check tracking
# curl http://localhost:3000/api/tracking/{order_id from step 2}

# 4. GraphQL test — open http://localhost:3000/graphql in browser (Apollo Sandbox)
