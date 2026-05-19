const typeDefs = `
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
    status: String
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
    status: String
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
    status: String
    assigned_at: String!
    completed_at: String
  }

  type TrackingEvent {
    event_id: String!
    order_id: String!
    event_type: String
    description: String
    location: String
    timestamp: String!
  }

  type TrackingState {
    order_id: String!
    current_status: String
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
    orders(status: String, limit: Int, offset: Int): OrderList!
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
      event_type: String
      description: String
      location: String
    ): TrackingEvent!
  }
`;

module.exports = { typeDefs };
