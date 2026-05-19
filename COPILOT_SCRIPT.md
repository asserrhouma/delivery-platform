# 🤖 VS Code Copilot Script — delivery-service
# Paste each block into Copilot Chat (Ctrl+Shift+I) one at a time.
# Wait for each file to be created before moving to the next.

# ─────────────────────────────────────────────────────────────────
# STEP 1 — Create the folder structure
# ─────────────────────────────────────────────────────────────────
# Run this in your terminal first:

mkdir -p delivery-platform/delivery-service/src
mkdir -p delivery-platform/delivery-service/data
cd delivery-platform/delivery-service


# ─────────────────────────────────────────────────────────────────
# STEP 2 — package.json
# Paste in Copilot Chat:
# ─────────────────────────────────────────────────────────────────

"""
Create a file called package.json for a Node.js microservice called "delivery-service".
It needs these dependencies: @grpc/grpc-js, @grpc/proto-loader, better-sqlite3, kafkajs, uuid.
devDependencies: nodemon.
Scripts: start runs "node src/server.js", dev runs "nodemon src/server.js".
"""


# ─────────────────────────────────────────────────────────────────
# STEP 3 — src/database.js
# Paste in Copilot Chat:
# ─────────────────────────────────────────────────────────────────

"""
Create src/database.js for the delivery-service using better-sqlite3.
DB path: ../data/drivers.db (auto-create the data folder if it doesn't exist).

Create two tables:

drivers:
  driver_id TEXT PRIMARY KEY
  name TEXT NOT NULL
  phone TEXT NOT NULL
  vehicle_type TEXT NOT NULL  -- "moto", "voiture", "vélo"
  status INTEGER NOT NULL DEFAULT 0  -- 0=AVAILABLE 1=BUSY 2=OFFLINE

deliveries:
  delivery_id TEXT PRIMARY KEY
  order_id TEXT NOT NULL
  driver_id TEXT NOT NULL
  pickup_address TEXT NOT NULL
  delivery_address TEXT NOT NULL
  status INTEGER NOT NULL DEFAULT 0
  assigned_at TEXT NOT NULL
  completed_at TEXT

Export these functions:
- registerDriver(data) → inserts driver, returns driver object
- getDriverById(id) → returns driver or null
- listAvailableDrivers() → returns all drivers where status=0
- setDriverStatus(driverId, status) → updates driver status
- createDelivery(data) → inserts delivery, returns delivery object
- getDeliveryById(id) → returns delivery or null
- getDeliveryByOrderId(orderId) → returns delivery or null
- updateDeliveryStatus(deliveryId, status, completedAt) → updates delivery

Use prepared statements and uuid v4 for IDs.
"""


# ─────────────────────────────────────────────────────────────────
# STEP 4 — src/kafka.js
# Paste in Copilot Chat:
# ─────────────────────────────────────────────────────────────────

"""
Create src/kafka.js for the delivery-service using kafkajs.
Kafka broker: process.env.KAFKA_BROKER || 'localhost:9092'
clientId: 'delivery-service'

This file needs BOTH a producer and a consumer.

PRODUCER:
- Connect function: connectProducer()
- Publish function: publishDeliveryAssigned(data)
  → sends to topic 'delivery.assigned'
  → message value is JSON with fields: event, order_id, delivery_id, driver_id, driver_name, pickup_address, delivery_address, assigned_at
  → key is order_id

CONSUMER:
- Group ID: 'delivery-service-group'
- Subscribe to topic: 'order.created'
- connectConsumer(onOrderCreated) → starts consumer, calls onOrderCreated(parsedMessage) for each message
  where parsedMessage is the JSON-parsed Kafka message value

Both producer and consumer should fail silently (try/catch, log warning) so the service works without Kafka.
Export: connectProducer, publishDeliveryAssigned, connectConsumer, disconnectAll
"""


# ─────────────────────────────────────────────────────────────────
# STEP 5 — src/handlers.js
# Paste in Copilot Chat:
# ─────────────────────────────────────────────────────────────────

"""
Create src/handlers.js for the delivery-service.
Import database.js and kafka.js.

Implement these 6 gRPC handlers (callback style, not async/await for gRPC):

1. registerDriver(call, callback)
   - Reads: name, phone, vehicle_type from call.request
   - Validates: all fields required, return code 9 if missing
   - Calls db.registerDriver(), returns DriverResponse

2. getDriver(call, callback)
   - Reads: driver_id
   - Returns DriverResponse or code 5 (NOT_FOUND) if null

3. listAvailableDrivers(call, callback)
   - No input (Empty message)
   - Returns ListDriversResponse with all AVAILABLE drivers

4. assignDelivery(call, callback)
   - Reads: order_id, pickup_address, delivery_address, customer_name
   - Gets first available driver from db.listAvailableDrivers()
   - If no driver available: return code 9 with message 'No available driver'
   - Creates delivery record via db.createDelivery()
   - Sets driver status to BUSY via db.setDriverStatus()
   - Publishes delivery.assigned event via kafka.publishDeliveryAssigned()
   - Returns DeliveryResponse

5. getDelivery(call, callback)
   - Reads: delivery_id
   - Returns DeliveryResponse or code 5 if not found

6. completeDelivery(call, callback)
   - Reads: delivery_id, success, note
   - Updates delivery status: success=true → COMPLETED(3), false → FAILED(4)
   - Sets driver back to AVAILABLE
   - Returns updated DeliveryResponse

Format function for DeliveryResponse:
  delivery_id, order_id, driver_id, driver_name (join from drivers table), pickup_address, delivery_address, status, assigned_at, completed_at

Export all 6 handlers.
"""


# ─────────────────────────────────────────────────────────────────
# STEP 6 — src/server.js
# Paste in Copilot Chat:
# ─────────────────────────────────────────────────────────────────

"""
Create src/server.js for the delivery-service.

- Load proto file from: path.join(__dirname, '../../proto/delivery.proto')
- protoLoader options: keepCase:true, longs:String, enums:String, defaults:true, oneofs:true
- Create gRPC server, add DeliveryService with all 6 handlers from handlers.js
- Bind on 0.0.0.0:PORT where PORT = process.env.DELIVERY_SERVICE_PORT || 50052
- On startup: connectProducer(), then connectConsumer with a callback that:
    1. Gets the order data from the Kafka message
    2. Calls assignDelivery logic directly (auto-assign)
    3. Logs the result
- Handle SIGINT and SIGTERM for graceful shutdown: disconnectAll(), server.tryShutdown()
- Log '[delivery-service] gRPC server started on port X' when ready
"""


# ─────────────────────────────────────────────────────────────────
# STEP 7 — Install dependencies
# Run in terminal:
# ─────────────────────────────────────────────────────────────────

# npm install


# ─────────────────────────────────────────────────────────────────
# STEP 8 — Test it (without Kafka, just gRPC)
# Run in terminal:
# ─────────────────────────────────────────────────────────────────

# node src/server.js
# Expected output:
# [Kafka] Producer non disponible, mode dégradé: ...  (normal, no Kafka running)
# [delivery-service] gRPC server started on port 50052


# ─────────────────────────────────────────────────────────────────
# DONE ✅
# After delivery-service works, move to tracking-service (port 50053, RxDB)
# Then api-gateway (port 3000, Express + Apollo GraphQL)
# ─────────────────────────────────────────────────────────────────
