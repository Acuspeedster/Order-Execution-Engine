import { OrderExecutionService } from '../services/order-execution.service';
import { DexRouterService } from '../services/dex-router.service';
import { OrderService } from '../services/order.service';
import { OrderStatus, OrderType, DexType } from '../types/order.types';

describe('OrderExecutionService', () => {
  let executionService: OrderExecutionService;
  let mockDexRouter: jest.Mocked<DexRouterService>;
  let mockOrderService: jest.Mocked<OrderService>;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    mockDexRouter = {
      getQuotes: jest.fn(),
      selectBestDex: jest.fn(),
      validateQuotes: jest.fn(),
    } as any;

    mockOrderService = {
      createOrder: jest.fn(),
      updateOrderStatus: jest.fn(),
      getOrder: jest.fn(),
      incrementRetryCount: jest.fn(),
      getOrdersByStatus: jest.fn(),
      removeCachedOrder: jest.fn(),
    } as any;

    executionService = new OrderExecutionService(
      mockDexRouter,
      mockOrderService,
      mockLogger
    );

    // Mock emitStatusUpdate
    (executionService as any).emitStatusUpdate = jest.fn();
  });

  describe('executeMarketOrder', () => {
    const mockOrder = {
      id: 'test-order-123',
      type: OrderType.MARKET,
      status: OrderStatus.PENDING,
      fromToken: 'SOL',
      toToken: 'USDC',
      amount: 10,
      slippageTolerance: 0.01,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should execute market order successfully', async () => {
      const mockRaydiumQuote = {
        dex: DexType.RAYDIUM,
        price: 100,
        outputAmount: 1000,
        priceImpact: 0.005,
        timestamp: Date.now(),
      };

      const mockMeteoraQuote = {
        dex: DexType.METEORA,
        price: 98,
        outputAmount: 980,
        priceImpact: 0.007,
        timestamp: Date.now(),
      };

      mockDexRouter.getQuotes.mockResolvedValue({
        raydium: mockRaydiumQuote,
        meteora: mockMeteoraQuote,
      });

      mockDexRouter.selectBestDex.mockReturnValue(mockRaydiumQuote);
      mockDexRouter.validateQuotes.mockReturnValue(true);

      await executionService.executeMarketOrder(mockOrder);

      expect(mockDexRouter.getQuotes).toHaveBeenCalledWith('SOL', 'USDC', 10);
      expect(mockDexRouter.selectBestDex).toHaveBeenCalled();
      expect(mockOrderService.updateOrderStatus).toHaveBeenCalledWith(
        'test-order-123',
        OrderStatus.ROUTING
      );
      expect(mockOrderService.updateOrderStatus).toHaveBeenCalledWith(
        'test-order-123',
        OrderStatus.CONFIRMED,
        expect.objectContaining({
          txHash: expect.any(String),
          executionPrice: 100,
        })
      );
    });

    it('should retry on failure with exponential backoff', async () => {
      mockDexRouter.getQuotes.mockRejectedValueOnce(new Error('Network error'));
      mockDexRouter.getQuotes.mockResolvedValueOnce({
        raydium: {
          dex: DexType.RAYDIUM,
          price: 100,
          outputAmount: 1000,
          priceImpact: 0.005,
          timestamp: Date.now(),
        },
        meteora: {
          dex: DexType.METEORA,
          price: 98,
          outputAmount: 980,
          priceImpact: 0.007,
          timestamp: Date.now(),
        },
      });

      mockDexRouter.selectBestDex.mockReturnValue({
        dex: DexType.RAYDIUM,
        price: 100,
        outputAmount: 1000,
        priceImpact: 0.005,
        timestamp: Date.now(),
      });

      mockDexRouter.validateQuotes.mockReturnValue(true);

      await executionService.executeMarketOrder(mockOrder);

      expect(mockOrderService.incrementRetryCount).toHaveBeenCalled();
      expect(mockDexRouter.getQuotes).toHaveBeenCalledTimes(2);
    }, 10000); // Increased timeout for retry test

    it('should fail after max retries', async () => {
      mockDexRouter.getQuotes.mockRejectedValue(new Error('Persistent network error'));

      await executionService.executeMarketOrder(mockOrder, 0);

      // Should attempt max retries (3)
      expect(mockOrderService.updateOrderStatus).toHaveBeenCalledWith(
        'test-order-123',
        OrderStatus.FAILED,
        expect.objectContaining({
          failureReason: expect.any(String),
        })
      );
    }, 15000); // Increased timeout for max retries test

    it('should reject orders exceeding slippage tolerance', async () => {
      const highImpactQuote = {
        dex: DexType.RAYDIUM,
        price: 100,
        outputAmount: 1000,
        priceImpact: 0.05, // 5% impact > 1% tolerance
        timestamp: Date.now(),
      };

      mockDexRouter.getQuotes.mockResolvedValue({
        raydium: highImpactQuote,
        meteora: highImpactQuote,
      });

      mockDexRouter.selectBestDex.mockReturnValue(highImpactQuote);
      mockDexRouter.validateQuotes.mockReturnValue(true);

      await executionService.executeMarketOrder(mockOrder);

      expect(mockOrderService.updateOrderStatus).toHaveBeenCalledWith(
        'test-order-123',
        OrderStatus.FAILED,
        expect.objectContaining({
          failureReason: expect.stringContaining('slippage'),
        })
      );
    }, 15000); // Increased timeout for slippage test
  });
});
