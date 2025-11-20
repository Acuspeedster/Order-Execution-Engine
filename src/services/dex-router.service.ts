import { DexType, DexQuote } from '../types/order.types';
import { config } from '../config';

/**
 * Mock DEX Router Service
 * Simulates price fetching from Raydium and Meteora with realistic delays and price variations
 */
export class DexRouterService {
  private logger: any;

  constructor(logger: any) {
    this.logger = logger;
  }

  /**
   * Fetch quotes from both Raydium and Meteora DEXs
   */
  async getQuotes(
    fromToken: string,
    toToken: string,
    amount: number
  ): Promise<{ raydium: DexQuote; meteora: DexQuote }> {
    this.logger.info(
      { fromToken, toToken, amount },
      'Fetching quotes from DEXs'
    );

    // Fetch quotes in parallel from both DEXs
    const [raydiumQuote, meteoraQuote] = await Promise.all([
      this.fetchRaydiumQuote(fromToken, toToken, amount),
      this.fetchMeteoraQuote(fromToken, toToken, amount),
    ]);

    this.logger.info(
      {
        raydium: raydiumQuote.price,
        meteora: meteoraQuote.price,
        difference: Math.abs(raydiumQuote.price - meteoraQuote.price),
      },
      'Received quotes from both DEXs'
    );

    return { raydium: raydiumQuote, meteora: meteoraQuote };
  }

  /**
   * Select the best DEX based on price comparison
   */
  selectBestDex(raydiumQuote: DexQuote, meteoraQuote: DexQuote): DexQuote {
    // Select DEX with better output amount (more tokens received)
    const selectedQuote =
      raydiumQuote.outputAmount > meteoraQuote.outputAmount
        ? raydiumQuote
        : meteoraQuote;

    this.logger.info(
      {
        selected: selectedQuote.dex,
        price: selectedQuote.price,
        outputAmount: selectedQuote.outputAmount,
        raydiumOutput: raydiumQuote.outputAmount,
        meteoraOutput: meteoraQuote.outputAmount,
      },
      'Selected best DEX for execution'
    );

    return selectedQuote;
  }

  /**
   * Mock Raydium quote fetcher
   * Simulates API call with realistic delay (2-3 seconds)
   */
  private async fetchRaydiumQuote(
    fromToken: string,
    toToken: string,
    amount: number
  ): Promise<DexQuote> {
    // Simulate network latency (2-3 seconds)
    await this.delay(2000 + Math.random() * 1000);

    // Generate mock price with some randomness
    const basePrice = this.generateBasePrice(fromToken, toToken);
    const priceVariation = 1 + (Math.random() - 0.5) * 0.05; // ±2.5% variation
    const price = basePrice * priceVariation;

    const outputAmount = amount * price;
    const priceImpact = Math.random() * 0.02; // 0-2% price impact

    return {
      dex: DexType.RAYDIUM,
      price,
      outputAmount,
      priceImpact,
      timestamp: Date.now(),
    };
  }

  /**
   * Mock Meteora quote fetcher
   * Simulates API call with realistic delay (2-3 seconds)
   */
  private async fetchMeteoraQuote(
    fromToken: string,
    toToken: string,
    amount: number
  ): Promise<DexQuote> {
    // Simulate network latency (2-3 seconds)
    await this.delay(2000 + Math.random() * 1000);

    // Generate mock price with some randomness (slightly different from Raydium)
    const basePrice = this.generateBasePrice(fromToken, toToken);
    const priceVariation = 1 + (Math.random() - 0.5) * 0.05; // ±2.5% variation
    const price = basePrice * priceVariation;

    const outputAmount = amount * price;
    const priceImpact = Math.random() * 0.02; // 0-2% price impact

    return {
      dex: DexType.METEORA,
      price,
      outputAmount,
      priceImpact,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate a base price for the trading pair
   * In production, this would come from actual DEX pools
   */
  private generateBasePrice(fromToken: string, toToken: string): number {
    // Simple hash function to generate consistent but varied prices
    const hash = (fromToken + toToken).split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);

    // Generate price between 0.1 and 10
    return 0.1 + (hash % 100) / 10;
  }

  /**
   * Helper function to simulate async delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validate that prices are within acceptable range
   */
  validateQuotes(raydiumQuote: DexQuote, meteoraQuote: DexQuote): boolean {
    const priceDifference = Math.abs(raydiumQuote.price - meteoraQuote.price);
    const avgPrice = (raydiumQuote.price + meteoraQuote.price) / 2;
    const percentageDiff = (priceDifference / avgPrice) * 100;

    // Log warning if price difference is too high (>10%)
    if (percentageDiff > 10) {
      this.logger.warn(
        {
          raydiumPrice: raydiumQuote.price,
          meteoraPrice: meteoraQuote.price,
          percentageDiff,
        },
        'Large price difference detected between DEXs'
      );
    }

    return true;
  }
}
