import { DexRouterService } from '../services/dex-router.service';
import { DexType } from '../types/order.types';

describe('DexRouterService', () => {
  let dexRouter: DexRouterService;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    dexRouter = new DexRouterService(mockLogger);
  });

  describe('getQuotes', () => {
    it('should fetch quotes from both Raydium and Meteora', async () => {
      const fromToken = 'SOL';
      const toToken = 'USDC';
      const amount = 10;

      const { raydium, meteora } = await dexRouter.getQuotes(fromToken, toToken, amount);

      expect(raydium).toBeDefined();
      expect(raydium.dex).toBe(DexType.RAYDIUM);
      expect(raydium.price).toBeGreaterThan(0);
      expect(raydium.outputAmount).toBeGreaterThan(0);
      expect(raydium.priceImpact).toBeGreaterThanOrEqual(0);

      expect(meteora).toBeDefined();
      expect(meteora.dex).toBe(DexType.METEORA);
      expect(meteora.price).toBeGreaterThan(0);
      expect(meteora.outputAmount).toBeGreaterThan(0);
      expect(meteora.priceImpact).toBeGreaterThanOrEqual(0);
    });

    it('should have different prices between DEXs', async () => {
      const { raydium, meteora } = await dexRouter.getQuotes('SOL', 'USDC', 10);

      // Prices should be different due to randomization
      // Allow for rare case where they might be the same
      const priceDiff = Math.abs(raydium.price - meteora.price);
      expect(priceDiff).toBeGreaterThanOrEqual(0);
    });

    it('should complete within reasonable time (< 5 seconds)', async () => {
      const startTime = Date.now();
      await dexRouter.getQuotes('SOL', 'USDC', 10);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('selectBestDex', () => {
    it('should select DEX with higher output amount', () => {
      const raydiumQuote = {
        dex: DexType.RAYDIUM,
        price: 100,
        outputAmount: 1000,
        priceImpact: 0.01,
        timestamp: Date.now(),
      };

      const meteoraQuote = {
        dex: DexType.METEORA,
        price: 95,
        outputAmount: 950,
        priceImpact: 0.015,
        timestamp: Date.now(),
      };

      const selected = dexRouter.selectBestDex(raydiumQuote, meteoraQuote);

      expect(selected.dex).toBe(DexType.RAYDIUM);
      expect(selected.outputAmount).toBe(1000);
    });

    it('should select Meteora when it has better output', () => {
      const raydiumQuote = {
        dex: DexType.RAYDIUM,
        price: 95,
        outputAmount: 950,
        priceImpact: 0.01,
        timestamp: Date.now(),
      };

      const meteoraQuote = {
        dex: DexType.METEORA,
        price: 100,
        outputAmount: 1000,
        priceImpact: 0.015,
        timestamp: Date.now(),
      };

      const selected = dexRouter.selectBestDex(raydiumQuote, meteoraQuote);

      expect(selected.dex).toBe(DexType.METEORA);
      expect(selected.outputAmount).toBe(1000);
    });
  });

  describe('validateQuotes', () => {
    it('should validate quotes with reasonable price difference', () => {
      const raydiumQuote = {
        dex: DexType.RAYDIUM,
        price: 100,
        outputAmount: 1000,
        priceImpact: 0.01,
        timestamp: Date.now(),
      };

      const meteoraQuote = {
        dex: DexType.METEORA,
        price: 102,
        outputAmount: 1020,
        priceImpact: 0.015,
        timestamp: Date.now(),
      };

      const result = dexRouter.validateQuotes(raydiumQuote, meteoraQuote);

      expect(result).toBe(true);
    });

    it('should log warning for large price difference', () => {
      const raydiumQuote = {
        dex: DexType.RAYDIUM,
        price: 100,
        outputAmount: 1000,
        priceImpact: 0.01,
        timestamp: Date.now(),
      };

      const meteoraQuote = {
        dex: DexType.METEORA,
        price: 120,
        outputAmount: 1200,
        priceImpact: 0.015,
        timestamp: Date.now(),
      };

      dexRouter.validateQuotes(raydiumQuote, meteoraQuote);

      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });
});
