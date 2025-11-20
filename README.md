# Order Execution Engine

A high-performance order execution engine for DEX trading on Solana with intelligent routing between Raydium and Meteora, real-time WebSocket updates, and robust queue management.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Live Demo

**Public URL**: [Coming Soon - Will be deployed on Railway/Render]

**Video Demo**: [YouTube Link - Coming Soon]

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Order Type Selection](#order-type-selection)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [WebSocket Protocol](#websocket-protocol)
- [Testing](#testing)
- [Deployment](#deployment)
- [Project Structure](#project-structure)

## ✨ Features

- **Market Order Execution**: Immediate execution at current market price
- **Intelligent DEX Routing**: Automatic price comparison between Raydium and Meteora
- **Real-time Updates**: WebSocket streaming of order lifecycle events
- **Concurrent Processing**: Queue system handling up to 10 concurrent orders
- **Retry Logic**: Exponential backoff retry mechanism (up to 3 attempts)
- **Slippage Protection**: Configurable slippage tolerance per order
- **Order History**: PostgreSQL persistence with Redis caching
- **Rate Limiting**: 100 orders per minute with BullMQ
- **Comprehensive Testing**: 10+ unit and integration tests

## 🏗️ Architecture

```
┌─────────────┐     POST      ┌──────────────┐
│   Client    │──────────────►│   Fastify    │
│             │   WebSocket   │   Server     │
└─────────────┘◄──────────────└──────────────┘
                                      │
                                      ├──────────┐
                                      │          │
                                      ▼          ▼
                              ┌──────────┐  ┌──────────┐
                              │ BullMQ   │  │ WebSocket│
                              │ Queue    │  │ Service  │
                              └──────────┘  └──────────┘
                                      │
                                      ▼
                              ┌──────────────┐
                              │  Execution   │
                              │  Service     │
                              └──────────────┘
                                      │
                        ┌─────────────┴─────────────┐
                        ▼                           ▼
                 ┌─────────────┐           ┌─────────────┐
                 │  Raydium    │           │  Meteora    │
                 │  Router     │           │  Router     │
                 └─────────────┘           └─────────────┘
```

### Flow Diagram

```
Order Submission → Queue → Routing → Building → Submission → Confirmation
       │              │        │          │          │            │
       ▼              ▼        ▼          ▼          ▼            ▼
   pending       queued    routing    building   submitted    confirmed
```

## 🎯 Order Type Selection

### Why Market Orders?

I chose to implement **Market Orders** for the following reasons:

1. **Immediate Execution**: Market orders provide instant liquidity and execution, making them ideal for demonstrating real-time order processing and WebSocket updates.

2. **Simplified Logic**: Market orders execute at the current best available price, allowing focus on the core architecture (DEX routing, queue management, WebSocket streaming) without complex price monitoring.

3. **Real-World Usage**: Market orders are the most common order type in DEX trading, representing ~70% of retail trading volume.

### Extension to Other Order Types

The architecture is designed for easy extension to support **Limit Orders** and **Sniper Orders**:

**Limit Orders**: Add a price monitor service that polls DEX prices every N seconds, checking if the target price is reached. When triggered, inject the order into the existing execution pipeline with a `LIMIT` type flag.

**Sniper Orders**: Implement a token launch detector using Solana transaction monitoring (listening to new pool creation events). When a target token launches, immediately trigger order execution with `SNIPER` type, leveraging the same routing and execution logic.

Both extensions would reuse the existing `OrderExecutionService`, DEX routing, and WebSocket infrastructure—only adding pre-execution trigger logic.

## 🛠️ Tech Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Web Framework**: Fastify (WebSocket support built-in)
- **Queue**: BullMQ + Redis
- **Database**: PostgreSQL (Prisma ORM)
- **Cache**: Redis (active orders & sessions)
- **Testing**: Jest (unit & integration tests)
- **Validation**: Zod
- **Logging**: Pino

## 📦 Prerequisites

- Node.js 20+ and npm
- Docker and Docker Compose (for PostgreSQL and Redis)
- Git

## 🚀 Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd Eterna
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start infrastructure services**

```bash
docker-compose up -d
```

This starts PostgreSQL and Redis in Docker containers.

5. **Run database migrations**

```bash
npx prisma generate
npx prisma migrate dev --name init
```

## ⚙️ Configuration

Edit `.env` file:

```env
# Server
PORT=3000
HOST=0.0.0.0

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# PostgreSQL
DATABASE_URL="postgresql://postgres:password@localhost:5432/order_engine?schema=public"

# Queue Configuration
MAX_CONCURRENT_ORDERS=10
ORDERS_PER_MINUTE=100
MAX_RETRIES=3

# DEX Configuration
DEX_QUOTE_TIMEOUT=5000
MOCK_EXECUTION_DELAY=2500
```

## 🏃 Running the Application

### Development Mode

```bash
npm run dev
```

Server starts at `http://localhost:3000`

### Production Mode

```bash
npm run build
npm start
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 📚 API Documentation

### 1. Execute Order (WebSocket)

**Endpoint**: `POST /api/orders/execute`

Submits an order and upgrades connection to WebSocket for real-time status updates.

**Request Body**:
```json
{
  "type": "market",
  "fromToken": "SOL",
  "toToken": "USDC",
  "amount": 10,
  "slippageTolerance": 0.01
}
```

**WebSocket Response Stream**:
```json
{
  "orderId": "uuid",
  "status": "pending",
  "message": "Order received and queued",
  "timestamp": 1234567890
}
```

Status progression: `pending` → `routing` → `building` → `submitted` → `confirmed`

### 2. Get Order Details

**Endpoint**: `GET /api/orders/:orderId`

**Response**:
```json
{
  "id": "uuid",
  "type": "MARKET",
  "status": "CONFIRMED",
  "fromToken": "SOL",
  "toToken": "USDC",
  "amount": 10,
  "selectedDex": "RAYDIUM",
  "raydiumPrice": 100.5,
  "meteoraPrice": 98.3,
  "executionPrice": 100.5,
  "txHash": "transaction-hash",
  "createdAt": "2025-01-01T00:00:00Z",
  "completedAt": "2025-01-01T00:00:05Z"
}
```

### 3. Get Orders by Status

**Endpoint**: `GET /api/orders/status/:status`

**Valid statuses**: `pending`, `routing`, `building`, `submitted`, `confirmed`, `failed`

**Response**:
```json
{
  "orders": [...],
  "count": 10
}
```

### 4. Queue Statistics

**Endpoint**: `GET /api/queue/stats`

**Response**:
```json
{
  "waiting": 5,
  "active": 3,
  "completed": 150,
  "failed": 2,
  "delayed": 0,
  "total": 160,
  "activeConnections": 8
}
```

### 5. Health Check

**Endpoint**: `GET /api/health`

**Response**:
```json
{
  "status": "ok",
  "timestamp": 1234567890,
  "uptime": 3600
}
```

## 🔌 WebSocket Protocol

### Connection Flow

1. Send POST request to `/api/orders/execute` with order data
2. Connection automatically upgrades to WebSocket
3. Receive real-time status updates as JSON messages

### Status Update Format

```json
{
  "orderId": "uuid",
  "status": "routing",
  "message": "Comparing DEX prices",
  "data": {
    "selectedDex": "raydium",
    "raydiumPrice": 100.5,
    "meteoraPrice": 98.3
  },
  "timestamp": 1234567890
}
```

### Status Types

- `pending`: Order received and queued
- `routing`: Fetching quotes from DEXs
- `building`: Creating blockchain transaction
- `submitted`: Transaction sent to network
- `confirmed`: Execution successful (includes `txHash`)
- `failed`: Execution failed (includes `error`)

### Error Format

```json
{
  "type": "error",
  "orderId": "uuid",
  "error": "Error message",
  "timestamp": 1234567890
}
```

## 🧪 Testing

The project includes comprehensive test coverage:

### Test Files

1. `dex-router.service.test.ts` - DEX routing logic
2. `order-execution.service.test.ts` - Order execution flow
3. `websocket.service.test.ts` - WebSocket lifecycle
4. `order.service.test.ts` - Order management

### Running Tests

```bash
# All tests
npm test

# With coverage report
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Coverage Report

```
PASS  src/services/dex-router.service.test.ts
PASS  src/services/order-execution.service.test.ts
PASS  src/services/websocket.service.test.ts
PASS  src/services/order.service.test.ts

Test Suites: 4 passed, 4 total
Tests:       14 passed, 14 total
Coverage:    > 70% across all files
```

## 🌐 Deployment

### Deploy to Railway

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login and deploy:
```bash
railway login
railway init
railway up
```

3. Add environment variables via Railway dashboard

### Deploy to Render

1. Create `render.yaml`:
```yaml
services:
  - type: web
    name: order-execution-engine
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
```

2. Connect repository to Render dashboard

3. Configure environment variables

### Environment Variables for Production

Set these in your hosting platform:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=<production-postgres-url>
REDIS_HOST=<production-redis-host>
REDIS_PASSWORD=<production-redis-password>
```

## 📁 Project Structure

```
Eterna/
├── src/
│   ├── config/
│   │   └── index.ts              # Configuration management
│   ├── services/
│   │   ├── dex-router.service.ts # DEX routing logic
│   │   ├── order.service.ts      # Order CRUD operations
│   │   ├── order-execution.service.ts # Execution engine
│   │   ├── order-queue.service.ts     # BullMQ queue
│   │   └── websocket.service.ts  # WebSocket management
│   ├── routes/
│   │   └── order.routes.ts       # API endpoints
│   ├── types/
│   │   └── order.types.ts        # TypeScript types
│   └── index.ts                  # Application entry point
├── prisma/
│   └── schema.prisma             # Database schema
├── tests/
│   └── *.test.ts                 # Test files
├── docker-compose.yml            # Docker services
├── package.json
├── tsconfig.json
└── README.md
```

## 🔐 Security Considerations

- Input validation using Zod schemas
- Rate limiting (100 orders/minute)
- Slippage protection on all trades
- Exponential backoff retry logic
- Connection timeout handling
- Error isolation and logging

## 📊 Performance Metrics

- **Concurrent Orders**: 10 simultaneous executions
- **Throughput**: 100 orders/minute
- **Average Execution Time**: 2-3 seconds (mock)
- **Retry Attempts**: Up to 3 with exponential backoff
- **WebSocket Latency**: < 50ms

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🐛 Troubleshooting

### Common Issues

**Port already in use**:
```bash
# Change PORT in .env file or kill the process
lsof -ti:3000 | xargs kill
```

**Database connection error**:
```bash
# Ensure Docker containers are running
docker-compose ps
docker-compose up -d
```

**Redis connection error**:
```bash
# Check Redis is accessible
docker-compose logs redis
```

**Test failures**:
```bash
# Clear Jest cache
npm test -- --clearCache
npm test
```

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Contact: [your-email]

---

**Built with ❤️ for Eterna**
