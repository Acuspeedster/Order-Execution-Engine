import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { Order, OrderStatus, CreateOrderInput } from '../types/order.types';

export class OrderService {
  private prisma: PrismaClient;
  private redis: Redis;
  private logger: any;

  constructor(prisma: PrismaClient, redis: Redis, logger: any) {
    this.prisma = prisma;
    this.redis = redis;
    this.logger = logger;
  }

  /**
   * Create a new order
   */
  async createOrder(input: CreateOrderInput): Promise<Order> {
    const order = await this.prisma.order.create({
      data: {
        type: input.type.toUpperCase() as any,
        status: OrderStatus.PENDING.toUpperCase() as any,
        fromToken: input.fromToken,
        toToken: input.toToken,
        amount: input.amount,
        slippageTolerance: input.slippageTolerance,
      },
    });

    // Cache order in Redis for quick access
    await this.cacheOrder(order as any);

    this.logger.info({ orderId: order.id }, 'Order created successfully');

    return order as any;
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    data?: {
      selectedDex?: string;
      raydiumPrice?: number;
      meteoraPrice?: number;
      executionPrice?: number;
      txHash?: string;
      failureReason?: string;
    }
  ): Promise<Order> {
    const updateData: any = {
      status: status.toUpperCase(),
      updatedAt: new Date(),
    };

    if (status === OrderStatus.CONFIRMED || status === OrderStatus.FAILED) {
      updateData.completedAt = new Date();
    }

    if (data) {
      if (data.selectedDex) updateData.selectedDex = data.selectedDex.toUpperCase();
      if (data.raydiumPrice) updateData.raydiumPrice = data.raydiumPrice;
      if (data.meteoraPrice) updateData.meteoraPrice = data.meteoraPrice;
      if (data.executionPrice) updateData.executionPrice = data.executionPrice;
      if (data.txHash) updateData.txHash = data.txHash;
      if (data.failureReason) updateData.failureReason = data.failureReason;
    }

    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    // Update cache
    await this.cacheOrder(order as any);

    return order as any;
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<Order | null> {
    // Try cache first
    const cached = await this.redis.get(`order:${orderId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fallback to database
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (order) {
      await this.cacheOrder(order as any);
    }

    return order as any;
  }

  /**
   * Increment retry count
   */
  async incrementRetryCount(orderId: string): Promise<number> {
    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        retryCount: {
          increment: 1,
        },
      },
    });

    return order.retryCount;
  }

  /**
   * Get orders by status
   */
  async getOrdersByStatus(status: OrderStatus): Promise<Order[]> {
    const orders = await this.prisma.order.findMany({
      where: {
        status: status.toUpperCase() as any,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return orders as any;
  }

  /**
   * Cache order in Redis
   */
  private async cacheOrder(order: Order): Promise<void> {
    await this.redis.set(
      `order:${order.id}`,
      JSON.stringify(order),
      'EX',
      3600 // 1 hour expiry
    );
  }

  /**
   * Remove order from cache
   */
  async removeCachedOrder(orderId: string): Promise<void> {
    await this.redis.del(`order:${orderId}`);
  }
}
