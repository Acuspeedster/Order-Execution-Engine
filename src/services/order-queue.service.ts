import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config';
import { OrderExecutionService } from './order-execution.service';
import { OrderService } from './order.service';
import { Order } from '../types/order.types';

export class OrderQueueService {
  private queue: Queue;
  private worker: Worker;
  private queueEvents: QueueEvents;
  private redis: Redis;
  private executionService: OrderExecutionService;
  private orderService: OrderService;
  private logger: any;

  constructor(
    redis: Redis,
    executionService: OrderExecutionService,
    orderService: OrderService,
    logger: any
  ) {
    this.redis = redis;
    this.executionService = executionService;
    this.orderService = orderService;
    this.logger = logger;

    // Initialize BullMQ queue
    this.queue = new Queue('order-execution', {
      connection: redis,
      defaultJobOptions: {
        attempts: config.queue.maxRetries,
        backoff: {
          type: 'exponential',
          delay: 1000, // Start with 1 second
        },
        removeOnComplete: {
          count: 1000, // Keep last 1000 completed jobs
        },
        removeOnFail: {
          count: 5000, // Keep last 5000 failed jobs
        },
      },
    });

    // Initialize worker with concurrency
    this.worker = new Worker(
      'order-execution',
      async (job) => {
        return this.processOrder(job.data);
      },
      {
        connection: redis,
        concurrency: config.queue.maxConcurrentOrders,
        limiter: {
          max: config.queue.ordersPerMinute,
          duration: 60000, // Per minute
        },
      }
    );

    // Initialize queue events for monitoring
    this.queueEvents = new QueueEvents('order-execution', {
      connection: redis,
    });

    this.setupEventListeners();
  }

  /**
   * Add order to execution queue
   */
  async addOrder(order: Order): Promise<void> {
    await this.queue.add(
      'execute-order',
      { order },
      {
        jobId: order.id, // Use order ID as job ID for idempotency
        priority: this.getOrderPriority(order),
      }
    );

    this.logger.info({ orderId: order.id }, 'Order added to execution queue');
  }

  /**
   * Process order execution
   */
  private async processOrder(data: { order: Order }): Promise<void> {
    const { order } = data;
    this.logger.info({ orderId: order.id }, 'Processing order from queue');

    try {
      await this.executionService.executeMarketOrder(order);
    } catch (error: any) {
      this.logger.error(
        { orderId: order.id, error: error.message },
        'Order processing failed'
      );
      throw error; // Re-throw to trigger BullMQ retry mechanism
    }
  }

  /**
   * Get order priority (market orders have highest priority)
   */
  private getOrderPriority(order: Order): number {
    // Convert database enum to string for comparison
    const orderType = order.type.toString();
    
    switch (orderType) {
      case 'MARKET':
        return 1; // Highest priority
      case 'LIMIT':
        return 2;
      case 'SNIPER':
        return 3;
      default:
        return 5;
    }
  }

  /**
   * Setup event listeners for queue monitoring
   */
  private setupEventListeners(): void {
    this.worker.on('completed', (job) => {
      this.logger.info({ jobId: job.id }, 'Job completed successfully');
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        { jobId: job?.id, error: err.message },
        'Job failed'
      );
    });

    this.worker.on('stalled', (jobId) => {
      this.logger.warn({ jobId }, 'Job stalled');
    });

    this.queueEvents.on('waiting', ({ jobId }) => {
      this.logger.debug({ jobId }, 'Job waiting');
    });

    this.queueEvents.on('active', ({ jobId }) => {
      this.logger.debug({ jobId }, 'Job active');
    });
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<any> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Get job status
   */
  async getJobStatus(orderId: string): Promise<any> {
    const job = await this.queue.getJob(orderId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      state: await job.getState(),
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
    };
  }

  /**
   * Pause queue processing
   */
  async pauseQueue(): Promise<void> {
    await this.queue.pause();
    this.logger.info('Queue paused');
  }

  /**
   * Resume queue processing
   */
  async resumeQueue(): Promise<void> {
    await this.queue.resume();
    this.logger.info('Queue resumed');
  }

  /**
   * Clean up old jobs
   */
  async cleanup(): Promise<void> {
    await this.queue.clean(24 * 3600 * 1000, 1000); // Clean jobs older than 24 hours
    this.logger.info('Queue cleaned up');
  }

  /**
   * Close queue and worker
   */
  async close(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
    await this.queueEvents.close();
    this.logger.info('Queue service closed');
  }
}
