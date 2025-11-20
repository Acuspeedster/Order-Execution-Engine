import { config } from '../config';
import { DexRouterService } from './dex-router.service';
import { OrderService } from './order.service';
import { Order, OrderStatus, DexType } from '../types/order.types';
import { randomUUID } from 'crypto';

/**
 * Order Execution Service
 * Handles the execution of market orders with DEX routing
 */
export class OrderExecutionService {
  private dexRouter: DexRouterService;
  private orderService: OrderService;
  private logger: any;

  constructor(
    dexRouter: DexRouterService,
    orderService: OrderService,
    logger: any
  ) {
    this.dexRouter = dexRouter;
    this.orderService = orderService;
    this.logger = logger;
  }

  /**
   * Execute a market order
   * Market orders execute immediately at the current market price
   */
  async executeMarketOrder(order: Order, retryAttempt: number = 0): Promise<void> {
    const orderId = order.id;
    this.logger.info({ orderId, retryAttempt }, 'Starting market order execution');

    try {
      // Step 1: Update status to ROUTING
      await this.orderService.updateOrderStatus(orderId, OrderStatus.ROUTING);
      await this.emitStatusUpdate(orderId, OrderStatus.ROUTING, 'Comparing DEX prices');

      // Step 2: Fetch quotes from both DEXs
      const { raydium, meteora } = await this.dexRouter.getQuotes(
        order.fromToken,
        order.toToken,
        order.amount
      );

      // Validate quotes
      this.dexRouter.validateQuotes(raydium, meteora);

      // Step 3: Select best DEX
      const bestQuote = this.dexRouter.selectBestDex(raydium, meteora);

      // Update order with routing information
      await this.orderService.updateOrderStatus(orderId, OrderStatus.ROUTING, {
        raydiumPrice: raydium.price,
        meteoraPrice: meteora.price,
        selectedDex: bestQuote.dex,
      });

      await this.emitStatusUpdate(orderId, OrderStatus.ROUTING, 'Best DEX selected', {
        selectedDex: bestQuote.dex,
        raydiumPrice: raydium.price,
        meteoraPrice: meteora.price,
      });

      // Step 4: Build transaction
      await this.orderService.updateOrderStatus(orderId, OrderStatus.BUILDING);
      await this.emitStatusUpdate(orderId, OrderStatus.BUILDING, 'Creating transaction');

      const transaction = await this.buildTransaction(order, bestQuote);

      // Step 5: Submit transaction
      await this.orderService.updateOrderStatus(orderId, OrderStatus.SUBMITTED);
      await this.emitStatusUpdate(orderId, OrderStatus.SUBMITTED, 'Transaction sent to network');

      const txHash = await this.submitTransaction(transaction, order, bestQuote);

      // Step 6: Confirm transaction
      await this.orderService.updateOrderStatus(orderId, OrderStatus.CONFIRMED, {
        txHash,
        executionPrice: bestQuote.price,
      });

      await this.emitStatusUpdate(orderId, OrderStatus.CONFIRMED, 'Transaction successful', {
        txHash,
        executionPrice: bestQuote.price,
      });

      this.logger.info(
        { orderId, txHash, dex: bestQuote.dex, price: bestQuote.price },
        'Market order executed successfully'
      );
    } catch (error: any) {
      this.logger.error({ orderId, error: error.message, retryAttempt }, 'Order execution failed');

      // Implement exponential backoff retry logic
      if (retryAttempt < config.queue.maxRetries) {
        const delay = Math.pow(2, retryAttempt) * 1000; // 1s, 2s, 4s
        this.logger.info({ orderId, retryAttempt, delay }, 'Retrying order execution');

        await this.orderService.incrementRetryCount(orderId);
        await this.delay(delay);

        // Retry execution
        return this.executeMarketOrder(order, retryAttempt + 1);
      } else {
        // Max retries reached, mark as failed
        await this.orderService.updateOrderStatus(orderId, OrderStatus.FAILED, {
          failureReason: error.message,
        });

        await this.emitStatusUpdate(orderId, OrderStatus.FAILED, 'Order execution failed', {
          error: error.message,
        });

        this.logger.error(
          { orderId, retries: retryAttempt },
          'Order failed after max retries'
        );
      }
    }
  }

  /**
   * Build transaction for DEX swap
   * In production, this would use actual DEX SDKs
   */
  private async buildTransaction(order: Order, quote: any): Promise<any> {
    // Simulate transaction building delay
    await this.delay(500);

    // Check slippage protection
    const maxSlippage = order.slippageTolerance;
    if (quote.priceImpact > maxSlippage) {
      throw new Error(
        `Price impact ${quote.priceImpact} exceeds max slippage ${maxSlippage}`
      );
    }

    // Mock transaction object
    return {
      dex: quote.dex,
      fromToken: order.fromToken,
      toToken: order.toToken,
      amount: order.amount,
      expectedOutput: quote.outputAmount,
      slippage: maxSlippage,
      timestamp: Date.now(),
    };
  }

  /**
   * Submit transaction to the network
   * In production, this would submit to Solana blockchain
   */
  private async submitTransaction(
    transaction: any,
    order: Order,
    quote: any
  ): Promise<string> {
    // Simulate network submission delay
    await this.delay(config.dex.mockExecutionDelay);

    // Simulate occasional failures (5% chance)
    if (Math.random() < 0.05) {
      throw new Error('Network error: Transaction failed to submit');
    }

    // Generate mock transaction hash
    const txHash = randomUUID().replace(/-/g, '');

    this.logger.info(
      {
        txHash,
        dex: quote.dex,
        amount: order.amount,
        outputAmount: quote.outputAmount,
      },
      'Transaction submitted successfully'
    );

    return txHash;
  }

  /**
   * Emit status update (placeholder for WebSocket broadcasting)
   * This will be connected to WebSocket service
   */
  private async emitStatusUpdate(
    orderId: string,
    status: OrderStatus,
    message: string,
    data?: any
  ): Promise<void> {
    // This method will be implemented by WebSocket service
    // For now, just log
    this.logger.info({ orderId, status, message, data }, 'Status update');
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
