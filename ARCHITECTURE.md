# Architecture Documentation

## System Overview

The Order Execution Engine is a high-performance, event-driven system designed to execute DEX orders with intelligent routing, concurrent processing, and real-time status updates.

## Core Components

### 1. API Layer (Fastify)

**Purpose**: Handle HTTP requests and WebSocket connections

**Responsibilities**:
- Order validation and ingestion
- WebSocket connection management
- Health checks and monitoring endpoints
- CORS and security middleware

**Key Files**:
- `src/index.ts` - Application bootstrap
- `src/routes/order.routes.ts` - API endpoints

### 2. Queue System (BullMQ + Redis)

**Purpose**: Manage order execution queue with concurrency control

**Features**:
- Concurrent processing (10 orders simultaneously)
- Rate limiting (100 orders/minute)
- Job prioritization (market > limit > sniper)
- Automatic retry with exponential backoff
- Job state persistence

**Key Files**:
- `src/services/order-queue.service.ts`

**Queue States**:
```
waiting → active → completed
                 ↘ failed → retry → active
```

### 3. Order Execution Engine

**Purpose**: Orchestrate order execution workflow

**Workflow**:
```
1. Receive Order
   ↓
2. Route to DEXs (parallel quote fetching)
   ↓
3. Select Best Price
   ↓
4. Build Transaction
   ↓
5. Submit to Network
   ↓
6. Confirm Execution
```

**Key Files**:
- `src/services/order-execution.service.ts`
- `src/services/order.service.ts`

### 4. DEX Router

**Purpose**: Fetch and compare quotes from multiple DEXs

**Features**:
- Parallel quote fetching (Raydium + Meteora)
- Price comparison and selection
- Mock implementation with realistic delays (2-3s)
- Price validation (warns on >10% difference)

**Key Files**:
- `src/services/dex-router.service.ts`

**Routing Logic**:
```javascript
const { raydium, meteora } = await getQuotes(from, to, amount);
const best = raydium.outputAmount > meteora.outputAmount 
  ? raydium 
  : meteora;
```

### 5. WebSocket Service

**Purpose**: Real-time status broadcasting to clients

**Features**:
- Connection registry per order
- Broadcast status updates
- Automatic cleanup after order completion
- Error handling and reconnection

**Key Files**:
- `src/services/websocket.service.ts`

**Status Flow**:
```
pending → routing → building → submitted → confirmed
                                         ↘ failed
```

### 6. Data Layer

**Purpose**: Persist order history and cache active orders

**Technologies**:
- **PostgreSQL**: Long-term order history
- **Redis**: Active order cache, queue storage
- **Prisma**: ORM for type-safe database access

**Schema**:
```prisma
model Order {
  id              String      @id @default(uuid())
  type            OrderType   // MARKET, LIMIT, SNIPER
  status          OrderStatus // PENDING, ROUTING, etc.
  fromToken       String
  toToken         String
  amount          Float
  selectedDex     DexType?
  raydiumPrice    Float?
  meteoraPrice    Float?
  executionPrice  Float?
  txHash          String?
  slippageTolerance Float
  retryCount      Int
  failureReason   String?
  createdAt       DateTime
  updatedAt       DateTime
  completedAt     DateTime?
}
```

## Data Flow Diagram

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /api/orders/execute
       ▼
┌─────────────────────────────────┐
│     Fastify Server              │
│  ┌─────────────────────────┐   │
│  │  Order Validation (Zod) │   │
│  └────────┬────────────────┘   │
│           ▼                      │
│  ┌─────────────────────────┐   │
│  │  Create Order (Prisma)  │   │
│  └────────┬────────────────┘   │
│           ▼                      │
│  ┌─────────────────────────┐   │
│  │  WebSocket Registration │   │
│  └────────┬────────────────┘   │
└───────────┼─────────────────────┘
            │
            ▼
   ┌─────────────────┐
   │  BullMQ Queue   │◄──┐
   │   (Redis)       │   │ Retry
   └────────┬────────┘   │
            │            │
            ▼            │
   ┌─────────────────────────┐
   │  Order Execution        │
   │  Service                │
   │                         │
   │  ┌─────────────────┐   │
   │  │ Update: ROUTING │───┼──┐
   │  └─────────────────┘   │  │
   │           ↓             │  │
   │  ┌─────────────────┐   │  │
   │  │ DEX Router      │   │  │
   │  │  ┌──────────┐   │   │  │
   │  │  │ Raydium  │   │   │  │
   │  │  └──────────┘   │   │  │
   │  │  ┌──────────┐   │   │  │
   │  │  │ Meteora  │   │   │  │
   │  │  └──────────┘   │   │  │
   │  └─────────────────┘   │  │
   │           ↓             │  │
   │  ┌─────────────────┐   │  │
   │  │Update: BUILDING │───┼──┤
   │  └─────────────────┘   │  │
   │           ↓             │  │
   │  ┌─────────────────┐   │  │
   │  │Build Transaction│   │  │
   │  └─────────────────┘   │  │
   │           ↓             │  │
   │  ┌─────────────────┐   │  │
   │  │Update: SUBMITTED│───┼──┤
   │  └─────────────────┘   │  │
   │           ↓             │  │
   │  ┌─────────────────┐   │  │
   │  │Submit to Network│   │  │
   │  └─────────────────┘   │  │
   │           ↓             │  │
   │  ┌─────────────────┐   │  │
   │  │Update: CONFIRMED│───┼──┤
   │  │   (with txHash) │   │  │
   │  └─────────────────┘   │  │
   └─────────────────────────┘  │
                                │
                                ▼
                    ┌──────────────────┐
                    │  WebSocket       │
                    │  Service         │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Client          │
                    │  (Real-time      │
                    │   Updates)       │
                    └──────────────────┘
```

## Sequence Diagram

```
Client          API         Queue       Executor      DEXRouter    WebSocket
  │              │            │            │             │            │
  ├──POST────────>│            │            │             │            │
  │              │            │            │             │            │
  │              ├─create─────>│            │             │            │
  │              │<──order─────┤            │             │            │
  │              │            │            │             │            │
  │<─upgrade─WS──┤            │            │             │            │
  │              │            │            │             │            │
  │<───pending───┼────────────┼────────────┼─────────────┼────────────┤
  │              │            │            │             │            │
  │              │            ├──process───>│             │            │
  │              │            │            │             │            │
  │<───routing───┼────────────┼────────────┼─────────────┼────────────┤
  │              │            │            │             │            │
  │              │            │            ├──getQuotes──>│            │
  │              │            │            │<──quotes────┤            │
  │              │            │            │             │            │
  │<───routing───┼────────────┼────────────┼─────────────┼────────────┤
  │(best DEX)    │            │            │             │            │
  │              │            │            │             │            │
  │<───building──┼────────────┼────────────┼─────────────┼────────────┤
  │              │            │            │             │            │
  │<──submitted──┼────────────┼────────────┼─────────────┼────────────┤
  │              │            │            │             │            │
  │<──confirmed──┼────────────┼────────────┼─────────────┼────────────┤
  │(txHash)      │            │            │             │            │
  │              │            │            │             │            │
  │──close WS────>│            │            │             │            │
```

## Error Handling Strategy

### 1. Input Validation
- Zod schema validation on all inputs
- Type-safe request/response handling
- Clear error messages for invalid data

### 2. Network Errors
- Retry logic with exponential backoff
- Max 3 retry attempts
- Delay: 1s, 2s, 4s

### 3. DEX Routing Errors
- Parallel quote fetching (failure isolation)
- Fallback to available DEX if one fails
- Price validation warnings

### 4. Transaction Errors
- Slippage protection check before submission
- Transaction simulation (in mock mode)
- Detailed failure reason logging

### 5. WebSocket Errors
- Graceful connection cleanup
- Error message broadcasting
- Automatic reconnection support

## Performance Optimizations

### 1. Caching Strategy
```
Redis Cache:
- Active orders (1 hour TTL)
- Quick order status lookup
- Reduces database load

PostgreSQL:
- Long-term history
- Analytics and reporting
```

### 2. Concurrent Processing
```
BullMQ Configuration:
- 10 concurrent workers
- Rate limit: 100 orders/minute
- Job prioritization
```

### 3. Database Optimization
```
Indexes:
- order.status (for filtering)
- order.createdAt (for sorting)
- order.id (primary key)
```

### 4. WebSocket Optimization
```
Connection Management:
- Registry per order (Map<orderId, Set<Socket>>)
- Automatic cleanup after completion
- Broadcast only to relevant connections
```

## Scalability Considerations

### Horizontal Scaling

**Current Architecture**: Single instance

**Future Scaling**:
```
Load Balancer
     │
     ├─── API Instance 1 ───┐
     ├─── API Instance 2 ───┼─── Shared Redis
     └─── API Instance 3 ───┘
                             │
                        Shared PostgreSQL
```

**Requirements for Scale**:
1. Sticky sessions for WebSocket connections
2. Redis pub/sub for WebSocket broadcasting
3. Database connection pooling
4. Separate worker instances for queue processing

### Vertical Scaling

**Current Limits**:
- 10 concurrent orders
- 100 orders/minute

**Scaling Options**:
```
Environment Variables:
MAX_CONCURRENT_ORDERS=50    # More workers
ORDERS_PER_MINUTE=500       # Higher rate limit
```

## Monitoring and Observability

### Metrics to Track

1. **Queue Metrics**
   - Waiting jobs count
   - Active jobs count
   - Completed jobs count
   - Failed jobs count
   - Average processing time

2. **Order Metrics**
   - Orders per minute
   - Success rate
   - Failure rate
   - Average execution time
   - Retry rate

3. **DEX Metrics**
   - Average quote fetch time
   - Price difference between DEXs
   - Selected DEX distribution
   - Quote failures

4. **WebSocket Metrics**
   - Active connections
   - Messages sent
   - Connection errors
   - Average message latency

### Logging Strategy

```
Levels:
- ERROR: Failed operations, exceptions
- WARN: Retries, price anomalies
- INFO: Order lifecycle events, DEX selections
- DEBUG: Detailed execution flow
```

### Health Checks

```
GET /api/health
- Server uptime
- Database connectivity
- Redis connectivity
- Queue status
```

## Security Considerations

### 1. Input Validation
- All inputs validated with Zod
- Type checking at runtime
- Sanitization of user inputs

### 2. Rate Limiting
- BullMQ rate limiter (100/minute)
- Prevents queue overflow
- Fair resource allocation

### 3. Error Messages
- No sensitive data in error responses
- Generic error messages for clients
- Detailed logs for debugging

### 4. WebSocket Security
- Connection timeout handling
- Error isolation per connection
- Automatic cleanup

### 5. Database Security
- Parameterized queries (Prisma)
- Connection pooling
- Least privilege access

## Testing Strategy

### Unit Tests
- Service layer logic
- DEX routing algorithms
- Order validation
- WebSocket message handling

### Integration Tests
- API endpoint flows
- Database operations
- Queue processing
- WebSocket lifecycle

### Load Tests (Future)
- Concurrent order submission
- Queue saturation
- WebSocket connection limits
- Database performance under load

## Future Enhancements

### 1. Limit Orders
```
Architecture Addition:
┌──────────────────┐
│ Price Monitor    │──→ Polls DEX prices
│ Service          │    every N seconds
└────────┬─────────┘
         │
         ▼ (price reached)
┌──────────────────┐
│ Execution Engine │──→ Existing flow
└──────────────────┘
```

### 2. Sniper Orders
```
Architecture Addition:
┌──────────────────┐
│ Token Launch     │──→ Monitors new pool
│ Detector         │    creation events
└────────┬─────────┘
         │
         ▼ (token launches)
┌──────────────────┐
│ Execution Engine │──→ Existing flow
└──────────────────┘
```

### 3. Real Blockchain Integration
- Replace mock with actual Solana SDK
- Implement transaction signing
- Add wallet management
- Handle network fees

### 4. Advanced Routing
- Multi-hop routing
- Split orders across DEXs
- Dynamic pool selection
- Gas optimization

### 5. Analytics Dashboard
- Real-time order monitoring
- DEX performance comparison
- Historical analytics
- Performance metrics

## Conclusion

This architecture provides a solid foundation for a production-grade order execution engine with:

✅ Scalable queue-based processing
✅ Real-time client updates via WebSocket
✅ Intelligent DEX routing
✅ Robust error handling and retry logic
✅ Comprehensive testing coverage
✅ Clear separation of concerns
✅ Easy extensibility for new order types
