import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  database: {
    url: process.env.DATABASE_URL || '',
  },
  queue: {
    maxConcurrentOrders: parseInt(process.env.MAX_CONCURRENT_ORDERS || '10', 10),
    ordersPerMinute: parseInt(process.env.ORDERS_PER_MINUTE || '100', 10),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
  },
  dex: {
    quoteTimeout: parseInt(process.env.DEX_QUOTE_TIMEOUT || '5000', 10),
    mockExecutionDelay: parseInt(process.env.MOCK_EXECUTION_DELAY || '2500', 10),
  },
};
