const { orderClient, deliveryClient, trackingClient, grpcCall } = require('../grpcClients');

const resolvers = {
  Query: {
    order: async (_, { order_id }) => {
      try {
        return await grpcCall(orderClient, 'GetOrder', { order_id });
      } catch (err) {
        throw new Error(err.message);
      }
    },

    orders: async (_, { status = 0, limit = 20, offset = 0 }) => {
      try {
        return await grpcCall(orderClient, 'ListOrders', { status, limit, offset });
      } catch (err) {
        throw new Error(err.message);
      }
    },

    driver: async (_, { driver_id }) => {
      try {
        return await grpcCall(deliveryClient, 'GetDriver', { driver_id });
      } catch (err) {
        throw new Error(err.message);
      }
    },

    availableDrivers: async () => {
      try {
        return await grpcCall(deliveryClient, 'ListAvailableDrivers', {});
      } catch (err) {
        throw new Error(err.message);
      }
    },

    delivery: async (_, { delivery_id }) => {
      try {
        return await grpcCall(deliveryClient, 'GetDelivery', { delivery_id });
      } catch (err) {
        throw new Error(err.message);
      }
    },

    tracking: async (_, { order_id }) => {
      try {
        return await grpcCall(trackingClient, 'GetTracking', { order_id });
      } catch (err) {
        throw new Error(err.message);
      }
    },

    trackingHistory: async (_, { order_id }) => {
      try {
        return await grpcCall(trackingClient, 'GetHistory', { order_id });
      } catch (err) {
        throw new Error(err.message);
      }
    }
  },

  Mutation: {
    createOrder: async (_, args) => {
      try {
        return await grpcCall(orderClient, 'CreateOrder', args);
      } catch (err) {
        throw new Error(err.message);
      }
    },

    registerDriver: async (_, args) => {
      try {
        return await grpcCall(deliveryClient, 'RegisterDriver', args);
      } catch (err) {
        throw new Error(err.message);
      }
    },

    assignDelivery: async (_, args) => {
      try {
        return await grpcCall(deliveryClient, 'AssignDelivery', args);
      } catch (err) {
        throw new Error(err.message);
      }
    },

    completeDelivery: async (_, args) => {
      try {
        return await grpcCall(deliveryClient, 'CompleteDelivery', args);
      } catch (err) {
        throw new Error(err.message);
      }
    },

    addTrackingEvent: async (_, args) => {
      try {
        return await grpcCall(trackingClient, 'AddEvent', args);
      } catch (err) {
        throw new Error(err.message);
      }
    }
  }
};

module.exports = { resolvers };
