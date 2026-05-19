# 🚚 Real-Time Delivery Platform — Microservices

A Node.js microservices architecture for real-time delivery management with gRPC, GraphQL, REST APIs, and Kafka event streaming.

## Description

This is a university project demonstrating **Service-Oriented Architecture (SOA)** and **Microservices** patterns. The platform manages orders, driver assignments, and real-time tracking for a delivery service.

**Key Features:**
- 📦 Order management (create, list, track)
- 🚗 Driver registration and availability management
- 📍 Real-time delivery tracking with event history
- 🔄 Event-driven communication via Apache Kafka
- 📡 gRPC inter-service communication
- 🌐 REST API and GraphQL endpoints
- 🗄️ SQLite3 and RxDB databases
- 🐳 Docker Compose for infrastructure

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT APPLICATIONS                          │
│                   (REST / GraphQL)                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   API GATEWAY        │
              │   (Port 3000)        │
              │  REST + GraphQL      │
              └──────────────────────┘
                    │         │         │
        ┌───────────┼─────────┼─────────┤
        │           │         │         │
        ▼           ▼         ▼         ▼
  ┌──────────┐ ┌──────────────┐ ┌──────────────┐
  │ ORDER    │ │  DELIVERY    │ │  TRACKING    │
  │ SERVICE  │ │  SERVICE     │ │  SERVICE     │
  │(Port 50  │ │ (Port 50052) │ │ (Port 50053) │
  │ 051)     │ │   gRPC       │ │   gRPC       │
  │ gRPC     │ │              │ │              │
  └──────────┘ └──────────────┘ └──────────────┘
      │             │                  ▲
      │ SQLite3     │ SQLite3          │
      ▼             ▼                  │
   orders.db   drivers.db         [Kafka Consumer]
   order_items deliveries.db           │
                                       │ (delivery.assigned)
                        ┌──────────────┴───┐
                        │   KAFKA BROKER   │
                        │  (Port 9092)     │
                        └──────────────────┘
                             ▲ (Zookeeper)
                             │ (Port 2181)
```

**Communication Patterns:**
- **Synchronous:** REST/GraphQL → gRPC → Microservices
- **Asynchronous:** Kafka Topics (`order.created`, `delivery.assigned`)

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Runtime** | Node.js v18+ | JavaScript runtime |
| **IPC** | gRPC + Protobuf | Inter-service communication |
| **Events** | Apache Kafka | Async messaging |
| **Databases** | SQLite3, RxDB | Data persistence |
| **API (REST)** | Express.js | RESTful endpoints |
| **API (GraphQL)** | Apollo Server | GraphQL endpoint |
| **Infrastructure** | Docker Compose | Container orchestration |
| **Package Manager** | npm | Dependency management |

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Docker** + **Docker Compose** (for Kafka)
- **Protobuf Compiler** (protoc >= 3.0, optional for code generation)

## Installation

### 1. Clone/Download the Project

```bash
cd delivery-platform
```

### 2. Install Dependencies for Each Service

```bash
# Order Service
cd order-service && npm install && cd ..

# Delivery Service
cd delivery-service && npm install && cd ..

# Tracking Service
cd tracking-service && npm install && cd ..

# API Gateway
cd api-gateway && npm install && cd ..
```

## Running the Project

### Step 1 — Start Kafka Infrastructure

```bash
docker-compose up -d
```

**Verify Kafka is running:**
```bash
docker ps  # Should show zookeeper and kafka containers
```

### Step 2 — Start Each Service (in Separate Terminals)

**Terminal 1 — Order Service (port 50051):**
```bash
cd order-service
node src/server.js
# Expected: [order-service] gRPC server started on port 50051
```

**Terminal 2 — Delivery Service (port 50052):**
```bash
cd delivery-service
node src/server.js
# Expected: [delivery-service] gRPC server started on port 50052
#           [Kafka Producer] Connecté avec succès
#           [Kafka Consumer] Connecté et abonné à order.created
```

**Terminal 3 — Tracking Service (port 50053):**
```bash
cd tracking-service
node src/server.js
# Expected: [tracking-service] gRPC server started on port 50053
#           [Kafka Consumer] Connecté et abonné à delivery.assigned
```

**Terminal 4 — API Gateway (port 3000):**
```bash
cd api-gateway
node src/server.js
# Expected: [api-gateway] REST API ready at http://localhost:3000
#           [api-gateway] GraphQL ready at http://localhost:3000/graphql
```

### Step 3 — Verify Everything is Running

```bash
curl http://localhost:3000/api/drivers/available
```

Expected output: `{"drivers":[]}`

## REST API Endpoints

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/orders` | Create new order |
| `GET` | `/api/orders` | List orders (with pagination/filtering) |
| `GET` | `/api/orders/:id` | Get single order |
| `PATCH` | `/api/orders/:id/status` | Update order status |

### Drivers

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/drivers` | Register new driver |
| `GET` | `/api/drivers/available` | List available drivers |
| `GET` | `/api/drivers/:id` | Get driver details |

### Deliveries

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/deliveries` | Assign delivery to driver |
| `GET` | `/api/deliveries/:id` | Get delivery details |
| `PATCH` | `/api/deliveries/:id/complete` | Mark delivery as completed/failed |

### Tracking

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tracking/:orderId` | Get current tracking status |
| `GET` | `/api/tracking/:orderId/history` | Get full event history |
| `POST` | `/api/tracking/event` | Create manual tracking event |

## GraphQL

**Endpoint:** `POST http://localhost:3000/graphql`

### Example Query — Get Order Details

```graphql
query GetOrder($id: String!) {
  order(order_id: $id) {
    order_id
    customer_name
    status
    created_at
    items {
      description
      quantity
      price
    }
  }
}
```

**Variables:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Example Mutation — Create Order

```graphql
mutation CreateOrder {
  createOrder(
    customer_name: "Asser Rhouma"
    customer_phone: "98765432"
    pickup_address: "Rue de la Liberté, Tunis"
    delivery_address: "Avenue Habib Bourguiba, Sousse"
    items: [
      { description: "Laptop", quantity: 1, price: 2500 }
      { description: "Mouse", quantity: 2, price: 50 }
    ]
  ) {
    order_id
    status
    created_at
  }
}
```

### Example Query — Real-Time Tracking

```graphql
query TrackOrder($id: String!) {
  tracking(order_id: $id) {
    order_id
    current_status
    last_location
    last_updated
    driver_name
  }
}
```

## Kafka Topics

| Topic | Producer | Consumer | Event |
|-------|----------|----------|-------|
| `order.created` | Order Service | Delivery Service | New order placed → auto-assign delivery |
| `delivery.assigned` | Delivery Service | Tracking Service | Driver assigned → create tracking event |

## Database Schemas

### Order Service (SQLite3)

**Table: `orders`**
```sql
CREATE TABLE orders (
  order_id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  pickup_address TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  status INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT
);
```

**Table: `order_items`**
```sql
CREATE TABLE order_items (
  item_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(order_id)
);
```

### Delivery Service (SQLite3)

**Table: `drivers`**
```sql
CREATE TABLE drivers (
  driver_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,  -- "moto", "voiture", "vélo"
  status INTEGER NOT NULL DEFAULT 0  -- 0=AVAILABLE, 1=BUSY, 2=OFFLINE
);
```

**Table: `deliveries`**
```sql
CREATE TABLE deliveries (
  delivery_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  driver_id TEXT NOT NULL,
  pickup_address TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  status INTEGER NOT NULL DEFAULT 0,
  assigned_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (driver_id) REFERENCES drivers(driver_id)
);
```

### Tracking Service (SQLite3)

**Table: `tracking_events`**
```sql
CREATE TABLE tracking_events (
  event_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  event_type INTEGER NOT NULL,
  description TEXT,
  location TEXT,
  timestamp TEXT NOT NULL
);
```

## gRPC Services

### Order Service (Port 50051)

```protobuf
service OrderService {
  rpc CreateOrder(Order) returns (OrderResponse);
  rpc GetOrder(GetOrderRequest) returns (OrderResponse);
  rpc ListOrders(ListOrdersRequest) returns (OrderListResponse);
  rpc UpdateOrderStatus(UpdateOrderStatusRequest) returns (OrderResponse);
}
```

### Delivery Service (Port 50052)

```protobuf
service DeliveryService {
  rpc RegisterDriver(Driver) returns (DriverResponse);
  rpc GetDriver(GetDriverRequest) returns (DriverResponse);
  rpc ListAvailableDrivers(Empty) returns (ListDriversResponse);
  rpc AssignDelivery(Order) returns (DeliveryResponse);
  rpc GetDelivery(GetDeliveryRequest) returns (DeliveryResponse);
  rpc CompleteDelivery(CompleteDeliveryRequest) returns (DeliveryResponse);
}
```

### Tracking Service (Port 50053)

```protobuf
service TrackingService {
  rpc GetTracking(GetTrackingRequest) returns (TrackingResponse);
  rpc GetHistory(GetHistoryRequest) returns (TrackingHistoryResponse);
  rpc AddEvent(AddEventRequest) returns (TrackingEvent);
}
```

## Project Structure

```
delivery-platform/
├── proto/
│   ├── order.proto              # Order service definitions
│   ├── delivery.proto           # Delivery service definitions
│   └── tracking.proto           # Tracking service definitions
│
├── order-service/
│   ├── package.json
│   ├── src/
│   │   ├── server.js
│   │   ├── database.js
│   │   ├── handlers.js
│   │   └── kafka.js
│   └── data/
│       └── orders.db
│
├── delivery-service/
│   ├── package.json
│   ├── src/
│   │   ├── server.js
│   │   ├── database.js
│   │   ├── handlers.js
│   │   └── kafka.js
│   └── data/
│       └── drivers.db
│
├── tracking-service/
│   ├── package.json
│   ├── src/
│   │   ├── server.js
│   │   ├── database.js
│   │   ├── handlers.js
│   │   └── kafka.js
│   └── data/
│       └── tracking.db
│
├── api-gateway/
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── server.js
│       ├── grpcClients.js
│       ├── rest/
│       │   └── routes.js
│       └── graphql/
│           ├── schema.js
│           └── resolvers.js
│
├── docker-compose.yml
└── README.md
```

## Testing Workflow

### 1. Register a Driver

```bash
curl -X POST http://localhost:3000/api/drivers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ahmed Ben Ali",
    "phone": "12345678",
    "vehicle_type": "moto"
  }'
```

**Response:**
```json
{
  "driver_id": "abc123...",
  "name": "Ahmed Ben Ali",
  "phone": "12345678",
  "vehicle_type": "moto",
  "status": 0
}
```

### 2. Create an Order

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Asser Rhouma",
    "customer_phone": "98765432",
    "pickup_address": "Rue de la Liberté, Tunis",
    "delivery_address": "Avenue Habib Bourguiba, Sousse",
    "items": [
      {
        "description": "Laptop",
        "quantity": 1,
        "price": 2500
      }
    ]
  }'
```

**Response:**
```json
{
  "order_id": "def456...",
  "customer_name": "Asser Rhouma",
  "status": 0,
  "created_at": "2026-05-19T10:30:00Z",
  "items": [...]
}
```

### 3. Check Tracking Status

Wait a moment for Kafka events to process, then:

```bash
curl http://localhost:3000/api/tracking/def456...
```

**Response (after delivery auto-assignment):**
```json
{
  "order_id": "def456...",
  "current_status": 1,
  "last_location": "Rue de la Liberté, Tunis",
  "last_updated": "2026-05-19T10:30:05Z",
  "driver_name": "Ahmed Ben Ali"
}
```

### 4. GraphQL Testing

Open browser → `http://localhost:3000/graphql`

Use Apollo Sandbox to test queries/mutations interactively.

## Troubleshooting

### Kafka not connecting?

```bash
# Check if containers are running
docker ps

# Check logs
docker logs kafka
docker logs zookeeper

# Restart
docker-compose down
docker-compose up -d
```

### gRPC connection refused?

```bash
# Verify service is running
curl -i http://localhost:50051  # Should fail gracefully

# Check service logs for binding errors
# Restart the service
```

### Database locked?

```bash
# Delete corrupted database and restart
rm order-service/data/orders.db
node src/server.js
```

## Future Enhancements

- [ ] Authentication (JWT)
- [ ] Rate limiting
- [ ] Logging (Winston/Bunyan)
- [ ] Service discovery (Consul/Eureka)
- [ ] API versioning
- [ ] Load balancing
- [ ] Kubernetes deployment
- [ ] Unit/Integration tests
- [ ] API documentation (Swagger)
- [ ] Monitoring (Prometheus/Grafana)

## License

MIT

## Authors

- **Asser Rhouma** — University of Tunis El Manar
- Microservices & SOA Course Project
