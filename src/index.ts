import Fastify from 'fastify';
import FastifyWebSocket from '@fastify/websocket';
import FastifyCors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { config } from './config';
import { DexRouterService } from './services/dex-router.service';
import { OrderService } from './services/order.service';
import { OrderExecutionService } from './services/order-execution.service';
import { OrderQueueService } from './services/order-queue.service';
import { WebSocketService } from './services/websocket.service';
import { orderRoutes } from './routes/order.routes';
import { OrderStatusUpdate } from './types/order.types';

async function main() {
  // Initialize Fastify with logger
  const fastify = Fastify({
    logger: {
      level: config.server.env === 'production' ? 'info' : 'debug',
      transport:
        config.server.env === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
  });

  // Register plugins
  await fastify.register(FastifyCors, {
    origin: true,
  });

  await fastify.register(FastifyWebSocket);

  // Initialize database and Redis
  const prisma = new PrismaClient({
    log: config.server.env === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  const redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null, // Required for BullMQ
  });

  // Test connections
  try {
    await prisma.$connect();
    fastify.log.info('Connected to PostgreSQL');

    await redis.ping();
    fastify.log.info('Connected to Redis');
  } catch (error: any) {
    fastify.log.error({ error: error.message }, 'Failed to connect to databases');
    process.exit(1);
  }

  // Initialize services
  const dexRouter = new DexRouterService(fastify.log);
  const orderService = new OrderService(prisma, redis, fastify.log);
  const wsService = new WebSocketService(fastify.log);

  // Create execution service with WebSocket integration
  const executionService = new OrderExecutionService(
    dexRouter,
    orderService,
    fastify.log
  );

  // Override emitStatusUpdate to use WebSocket service
  (executionService as any).emitStatusUpdate = async (
    orderId: string,
    status: any,
    message: string,
    data?: any
  ) => {
    const update: OrderStatusUpdate = {
      orderId,
      status,
      message,
      data,
      timestamp: Date.now(),
    };

    wsService.broadcastStatusUpdate(update);
  };

  const queueService = new OrderQueueService(
    redis,
    executionService,
    orderService,
    fastify.log
  );

  // Register routes
  await fastify.register(orderRoutes, {
    orderService,
    queueService,
    wsService,
  });

  // Graceful shutdown
  const signals = ['SIGINT', 'SIGTERM'];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      fastify.log.info(`Received ${signal}, shutting down gracefully...`);

      try {
        await queueService.close();
        await prisma.$disconnect();
        await redis.quit();
        await fastify.close();

        fastify.log.info('Shutdown complete');
        process.exit(0);
      } catch (error: any) {
        fastify.log.error({ error: error.message }, 'Error during shutdown');
        process.exit(1);
      }
    });
  });

  // Start server
  try {
    await fastify.listen({
      port: config.server.port,
      host: config.server.host,
    });

    fastify.log.info(
      `Server listening on ${config.server.host}:${config.server.port}`
    );
  } catch (error: any) {
    fastify.log.error({ error: error.message }, 'Failed to start server');
    process.exit(1);
  }
}

// Run the application
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
