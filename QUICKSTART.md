# Quick Start Guide

## Step-by-Step Setup

### 1. Install Dependencies

First, ensure you have Node.js 20+ installed. Then run:

```bash
npm install
```

If you encounter network issues, try:
```bash
npm install --registry https://registry.npmjs.org
# or
npm install --legacy-peer-deps
```

### 2. Start Infrastructure

Start PostgreSQL and Redis using Docker:

```bash
docker-compose up -d
```

Verify services are running:
```bash
docker-compose ps
```

### 3. Set Up Database

Generate Prisma client and run migrations:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

View database in Prisma Studio (optional):
```bash
npx prisma studio
```

### 4. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

The default values should work for local development.

### 5. Run the Application

Start in development mode:

```bash
npm run dev
```

The server will start at `http://localhost:3000`

### 6. Test the API

#### Health Check
```bash
curl http://localhost:3000/api/health
```

#### Submit an Order (REST)
```bash
curl -X POST http://localhost:3000/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{
    "type": "market",
    "fromToken": "SOL",
    "toToken": "USDC",
    "amount": 10,
    "slippageTolerance": 0.01
  }'
```

Note: For WebSocket testing, use the methods described in `WEBSOCKET_TESTING.md`

### 7. Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### 8. Test with Postman

Import the collection:
1. Open Postman
2. Click Import
3. Select `postman_collection.json`
4. Set the `baseUrl` variable to `http://localhost:3000`

## Troubleshooting

### Port Already in Use

If port 3000 is already in use:

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

Or change the PORT in `.env`

### Database Connection Error

```bash
# Check if PostgreSQL is running
docker-compose ps

# View logs
docker-compose logs postgres

# Restart services
docker-compose restart
```

### Redis Connection Error

```bash
# Check if Redis is running
docker-compose ps

# Test connection
docker exec -it order-engine-redis redis-cli ping

# Restart Redis
docker-compose restart redis
```

### Prisma Issues

```bash
# Reset database
npx prisma migrate reset

# Generate client again
npx prisma generate
```

### Test Failures

```bash
# Clear Jest cache
npm test -- --clearCache

# Run tests with verbose output
npm test -- --verbose
```

## Verification Checklist

- [ ] Docker containers running (`docker-compose ps`)
- [ ] Database migrations applied (`npx prisma migrate status`)
- [ ] Server responds to health check (`curl http://localhost:3000/api/health`)
- [ ] Can submit orders via POST
- [ ] WebSocket connection works
- [ ] All tests passing (`npm test`)
- [ ] Queue statistics visible (`curl http://localhost:3000/api/queue/stats`)

## Next Steps

1. **Test WebSocket**: Follow `WEBSOCKET_TESTING.md` for WebSocket testing
2. **Import Postman Collection**: Use `postman_collection.json` for API testing
3. **Submit Multiple Orders**: Test concurrent processing
4. **Monitor Logs**: Watch console for DEX routing decisions
5. **Check Database**: Use Prisma Studio to view order history

## Production Deployment

See `README.md` for detailed deployment instructions to:
- Railway
- Render
- Other hosting platforms

## Video Demo

Record a video showing:
1. Starting the application
2. Submitting 3-5 orders simultaneously
3. WebSocket status updates in real-time
4. DEX routing decisions in console logs
5. Queue processing multiple orders
6. Final order status in database

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review logs: `docker-compose logs`
3. Verify environment variables in `.env`
4. Ensure all prerequisites are installed
