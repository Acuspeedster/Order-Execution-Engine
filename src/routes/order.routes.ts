import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CreateOrderSchema, CreateOrderInput, OrderStatus } from '../types/order.types';
import { OrderService } from '../services/order.service';
import { OrderQueueService } from '../services/order-queue.service';
import { WebSocketService } from '../services/websocket.service';

export async function orderRoutes(
  fastify: FastifyInstance,
  options: {
    orderService: OrderService;
    queueService: OrderQueueService;
    wsService: WebSocketService;
  }
) {
  const { orderService, queueService, wsService } = options;

  /**
   * GET /api/orders/execute (WebSocket)
   * Connect via WebSocket and send order data to execute
   */
  fastify.get(
    '/api/orders/execute',
    { websocket: true },
    async (connection, req: FastifyRequest) => {
      const socket = connection;

      // Listen for incoming order data
      socket.on('message', async (message: Buffer) => {
        try {
          // Parse and validate order data
          const data = JSON.parse(message.toString());
          const validatedInput = CreateOrderSchema.parse(data);

          fastify.log.info({ input: validatedInput }, 'Received order execution request');

          // Create order
          const order = await orderService.createOrder(validatedInput);

          // Register WebSocket connection for this order
          wsService.registerConnection(order.id, { socket: connection });

          // Send initial response with order ID
          socket.send(
            JSON.stringify({
              orderId: order.id,
              status: OrderStatus.PENDING,
              message: 'Order received and queued',
              timestamp: Date.now(),
            })
          );

          // Add order to execution queue
          await queueService.addOrder(order);

          fastify.log.info({ orderId: order.id }, 'Order submitted successfully');
        } catch (error: any) {
          fastify.log.error({ error: error.message }, 'Failed to process order');

          socket.send(
            JSON.stringify({
              type: 'error',
              error: error.message,
              timestamp: Date.now(),
            })
          );

          socket.close();
        }
      });

      // Handle connection errors
      socket.on('error', (error: Error) => {
        fastify.log.error({ error: error.message }, 'WebSocket error');
      });
    }
  );

  /**
   * GET /api/orders/:orderId
   * Get order details
   */
  fastify.get<{ Params: { orderId: string } }>(
    '/api/orders/:orderId',
    async (request, reply) => {
      const { orderId } = request.params;

      const order = await orderService.getOrder(orderId);

      if (!order) {
        return reply.code(404).send({ error: 'Order not found' });
      }

      return order;
    }
  );

  /**
   * GET /api/orders/status/:status
   * Get orders by status
   */
  fastify.get<{ Params: { status: string } }>(
    '/api/orders/status/:status',
    async (request, reply) => {
      const { status } = request.params;

      if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
        return reply.code(400).send({ error: 'Invalid status' });
      }

      const orders = await orderService.getOrdersByStatus(status as OrderStatus);

      return { orders, count: orders.length };
    }
  );

  /**
   * GET /api/queue/stats
   * Get queue statistics
   */
  fastify.get('/api/queue/stats', async (request, reply) => {
    const stats = await queueService.getQueueStats();
    const activeConnections = wsService.getActiveConnections();

    return {
      ...stats,
      activeConnections,
    };
  });

  /**
   * GET /api/health
   * Health check endpoint
   */
  fastify.get('/api/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: Date.now(),
      uptime: process.uptime(),
    };
  });
}
