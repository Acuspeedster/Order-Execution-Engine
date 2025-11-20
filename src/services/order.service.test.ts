import { OrderService } from '../services/order.service';
import { OrderStatus, OrderType, CreateOrderInput } from '../types/order.types';

describe('OrderService', () => {
  let orderService: OrderService;
  let mockPrisma: any;
  let mockRedis: any;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    mockPrisma = {
      order: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };

    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    orderService = new OrderService(mockPrisma, mockRedis, mockLogger);
  });

  describe('createOrder', () => {
    it('should create a new order', async () => {
      const input: CreateOrderInput = {
        type: OrderType.MARKET,
        fromToken: 'SOL',
        toToken: 'USDC',
        amount: 10,
        slippageTolerance: 0.01,
      };

      const mockCreatedOrder = {
        id: 'test-order-123',
        type: 'MARKET',
        status: 'PENDING',
        fromToken: 'SOL',
        toToken: 'USDC',
        amount: 10,
        slippageTolerance: 0.01,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.order.create.mockResolvedValue(mockCreatedOrder);

      const result = await orderService.createOrder(input);

      expect(mockPrisma.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'MARKET',
          status: 'PENDING',
          fromToken: 'SOL',
          toToken: 'USDC',
          amount: 10,
        }),
      });

      expect(result.id).toBe('test-order-123');
      expect(mockRedis.set).toHaveBeenCalled();
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status', async () => {
      const orderId = 'test-order-123';
      const mockUpdatedOrder = {
        id: orderId,
        status: 'ROUTING',
        updatedAt: new Date(),
      };

      mockPrisma.order.update.mockResolvedValue(mockUpdatedOrder);

      const result = await orderService.updateOrderStatus(
        orderId,
        OrderStatus.ROUTING
      );

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: expect.objectContaining({
          status: 'ROUTING',
        }),
      });
    });

    it('should set completedAt for confirmed orders', async () => {
      const orderId = 'test-order-123';
      const mockUpdatedOrder = {
        id: orderId,
        status: 'CONFIRMED',
        completedAt: new Date(),
      };

      mockPrisma.order.update.mockResolvedValue(mockUpdatedOrder);

      await orderService.updateOrderStatus(orderId, OrderStatus.CONFIRMED, {
        txHash: 'mock-tx-hash',
        executionPrice: 100,
      });

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: expect.objectContaining({
          status: 'CONFIRMED',
          completedAt: expect.any(Date),
          txHash: 'mock-tx-hash',
          executionPrice: 100,
        }),
      });
    });
  });

  describe('getOrder', () => {
    it('should return cached order if available', async () => {
      const orderId = 'test-order-123';
      const cachedOrder = {
        id: orderId,
        status: OrderStatus.ROUTING,
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedOrder));

      const result = await orderService.getOrder(orderId);

      expect(mockRedis.get).toHaveBeenCalledWith(`order:${orderId}`);
      expect(result).toEqual(cachedOrder);
      expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from database if not cached', async () => {
      const orderId = 'test-order-123';
      const dbOrder = {
        id: orderId,
        status: 'ROUTING',
      };

      mockRedis.get.mockResolvedValue(null);
      mockPrisma.order.findUnique.mockResolvedValue(dbOrder);

      const result = await orderService.getOrder(orderId);

      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: orderId },
      });
      expect(result).toEqual(dbOrder);
      expect(mockRedis.set).toHaveBeenCalled();
    });
  });

  describe('incrementRetryCount', () => {
    it('should increment retry count', async () => {
      const orderId = 'test-order-123';
      const mockUpdatedOrder = {
        id: orderId,
        retryCount: 2,
      };

      mockPrisma.order.update.mockResolvedValue(mockUpdatedOrder);

      const result = await orderService.incrementRetryCount(orderId);

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: {
          retryCount: {
            increment: 1,
          },
        },
      });

      expect(result).toBe(2);
    });
  });

  describe('getOrdersByStatus', () => {
    it('should return orders filtered by status', async () => {
      const mockOrders = [
        { id: 'order-1', status: 'PENDING' },
        { id: 'order-2', status: 'PENDING' },
      ];

      mockPrisma.order.findMany.mockResolvedValue(mockOrders);

      const result = await orderService.getOrdersByStatus(OrderStatus.PENDING);

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toHaveLength(2);
    });
  });
});
