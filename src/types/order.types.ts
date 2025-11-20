import { z } from 'zod';

export enum OrderStatus {
  PENDING = 'pending',
  ROUTING = 'routing',
  BUILDING = 'building',
  SUBMITTED = 'submitted',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  SNIPER = 'sniper',
}

export enum DexType {
  RAYDIUM = 'raydium',
  METEORA = 'meteora',
}

export const CreateOrderSchema = z.object({
  type: z.nativeEnum(OrderType),
  fromToken: z.string().min(1, 'From token is required'),
  toToken: z.string().min(1, 'To token is required'),
  amount: z.number().positive('Amount must be positive'),
  slippageTolerance: z.number().min(0).max(1).optional().default(0.01),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

export interface Order {
  id: string;
  type: OrderType;
  status: OrderStatus;
  fromToken: string;
  toToken: string;
  amount: number;
  selectedDex?: DexType;
  raydiumPrice?: number;
  meteoraPrice?: number;
  executionPrice?: number;
  txHash?: string;
  slippageTolerance: number;
  retryCount: number;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface DexQuote {
  dex: DexType;
  price: number;
  outputAmount: number;
  priceImpact: number;
  timestamp: number;
}

export interface OrderStatusUpdate {
  orderId: string;
  status: OrderStatus;
  message: string;
  data?: {
    selectedDex?: DexType;
    raydiumPrice?: number;
    meteoraPrice?: number;
    executionPrice?: number;
    txHash?: string;
    error?: string;
  };
  timestamp: number;
}
