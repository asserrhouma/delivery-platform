const express = require('express');
const { orderClient, deliveryClient, trackingClient, grpcCall } = require('../grpcClients');

const router = express.Router();

// ────────────────────────────────────────────────────────────
// Helper: Handle gRPC errors
// ────────────────────────────────────────────────────────────

function handleGrpcError(err, res) {
  if (err.code === 5) {
    // NOT_FOUND
    return res.status(404).json({ error: err.message });
  } else if (err.code === 9) {
    // FAILED_PRECONDITION
    return res.status(400).json({ error: err.message });
  } else {
    return res.status(500).json({ error: err.message });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ORDERS
// ════════════════════════════════════════════════════════════════════════════

router.post('/api/orders', async (req, res) => {
  try {
    const result = await grpcCall(orderClient, 'CreateOrder', req.body);
    res.status(201).json(result);
  } catch (err) {
    handleGrpcError(err, res);
  }
});

router.get('/api/orders', async (req, res) => {
  try {
    const { status = 0, limit = 20, offset = 0 } = req.query;
    const result = await grpcCall(orderClient, 'ListOrders', {
      status: parseInt(status),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    res.status(200).json(result);
  } catch (err) {
    handleGrpcError(err, res);
  }
});

router.get('/api/orders/:id', async (req, res) => {
  try {
    const result = await grpcCall(orderClient, 'GetOrder', { order_id: req.params.id });
    res.status(200).json(result);
  } catch (err) {
    handleGrpcError(err, res);
  }
});

router.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const result = await grpcCall(orderClient, 'UpdateOrderStatus', {
      order_id: req.params.id,
      status
    });
    res.status(200).json(result);
  } catch (err) {
    handleGrpcError(err, res);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// DRIVERS
// ════════════════════════════════════════════════════════════════════════════

router.post('/api/drivers', async (req, res) => {
  try {
    const result = await grpcCall(deliveryClient, 'RegisterDriver', req.body);
    res.status(201).json(result);
  } catch (err) {
    handleGrpcError(err, res);
  }
});

router.get('/api/drivers/available', async (req, res) => {
  try {
    const result = await grpcCall(deliveryClient, 'ListAvailableDrivers', {});
    res.status(200).json(result);
  } catch (err) {
    handleGrpcError(err, res);
  }
});

router.get('/api/drivers/:id', async (req, res) => {
  try {
    const result = await grpcCall(deliveryClient, 'GetDriver', { driver_id: req.params.id });
    res.status(200).json(result);
  } catch (err) {
    handleGrpcError(err, res);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// DELIVERIES
// ════════════════════════════════════════════════════════════════════════════

router.post('/api/deliveries', async (req, res) => {
  try {
    const result = await grpcCall(deliveryClient, 'AssignDelivery', req.body);
    res.status(201).json(result);
  } catch (err) {
    handleGrpcError(err, res);
  }
});

router.get('/api/deliveries', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const result = await grpcCall(deliveryClient, 'ListDeliveries', {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    res.status(200).json(result);
  } catch (err) {
    handleGrpcError(err, res);
  }
});

router.get('/api/deliveries/:id', async (req, res) => {
  try {
    const result = await grpcCall(deliveryClient, 'GetDelivery', { delivery_id: req.params.id });
    res.status(200).json(result);
  } catch (err) {
    handleGrpcError(err, res);
  }
});

router.patch('/api/deliveries/:id/complete', async (req, res) => {
  try {
    const { success, note } = req.body;
    const result = await grpcCall(deliveryClient, 'CompleteDelivery', {
      delivery_id: req.params.id,
      success,
      note
    });
    res.status(200).json(result);
  } catch (err) {
    handleGrpcError(err, res);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TRACKING
// ════════════════════════════════════════════════════════════════════════════

router.get('/api/tracking/:orderId', async (req, res) => {
  try {
    const result = await grpcCall(trackingClient, 'GetTracking', { order_id: req.params.orderId });
    res.status(200).json(result);
  } catch (err) {
    handleGrpcError(err, res);
  }
});

router.get('/api/tracking/:orderId/history', async (req, res) => {
  try {
    const result = await grpcCall(trackingClient, 'GetHistory', { order_id: req.params.orderId });
    res.status(200).json(result);
  } catch (err) {
    handleGrpcError(err, res);
  }
});

router.post('/api/tracking/event', async (req, res) => {
  try {
    const result = await grpcCall(trackingClient, 'AddEvent', req.body);
    res.status(201).json(result);
  } catch (err) {
    handleGrpcError(err, res);
  }
});

module.exports = router;
