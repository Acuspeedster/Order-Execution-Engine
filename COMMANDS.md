# Command Reference

Quick reference for all common commands used in the Order Execution Engine project.

## Setup Commands

### Initial Setup

```bash
# Clone repository (if needed)
git clone <repository-url>
cd Eterna

# Run automated setup (Linux/Mac)
chmod +x setup.sh
./setup.sh

# Run automated setup (Windows)
.\setup.ps1

# Manual setup
npm install
docker-compose up -d
npx prisma generate
npx prisma migrate dev --name init
```

## Development Commands

### Start Development Server

```bash
# Start in development mode with hot reload
npm run dev

# Start in production mode
npm run build
npm start
```

### Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Check service status
docker-compose ps

# Restart services
docker-compose restart

# Remove all data (clean slate)
docker-compose down -v
```

### Database Commands

```bash
# Generate Prisma client
npx prisma generate

# Create a new migration
npx prisma migrate dev --name <migration-name>

# Apply migrations in production
npx prisma migrate deploy

# View database in Prisma Studio
npx prisma studio

# Reset database (warning: deletes all data)
npx prisma migrate reset

# Check migration status
npx prisma migrate status
```

## Testing Commands

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- dex-router.service.test.ts

# Clear Jest cache
npm test -- --clearCache

# Run tests with verbose output
npm test -- --verbose
```

## API Testing Commands

### Using curl

```bash
# Health check
curl http://localhost:3000/api/health

# Submit order
curl -X POST http://localhost:3000/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{
    "type": "market",
    "fromToken": "SOL",
    "toToken": "USDC",
    "amount": 10,
    "slippageTolerance": 0.01
  }'

# Get order by ID
curl http://localhost:3000/api/orders/<order-id>

# Get orders by status
curl http://localhost:3000/api/orders/status/confirmed

# Get queue statistics
curl http://localhost:3000/api/queue/stats
```

### Using PowerShell (Windows)

```powershell
# Health check
Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method GET

# Submit order
$body = @{
    type = "market"
    fromToken = "SOL"
    toToken = "USDC"
    amount = 10
    slippageTolerance = 0.01
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/orders/execute" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body

# Get queue stats
Invoke-RestMethod -Uri "http://localhost:3000/api/queue/stats" -Method GET
```

## WebSocket Testing

### Using wscat

```bash
# Install wscat globally
npm install -g wscat

# Connect to WebSocket
wscat -c "ws://localhost:3000/api/orders/execute"

# Then send order JSON:
{
  "type": "market",
  "fromToken": "SOL",
  "toToken": "USDC",
  "amount": 10,
  "slippageTolerance": 0.01
}
```

### Using Node.js

```bash
# Create and run test script
node test-websocket.js

# Content of test-websocket.js in WEBSOCKET_TESTING.md
```

## Git Commands

```bash
# Initialize repository
git init
git add .
git commit -m "Initial commit: Order Execution Engine"

# Add remote and push
git remote add origin <repository-url>
git push -u origin main

# Create feature branch
git checkout -b feature/your-feature
git add .
git commit -m "Add your feature"
git push origin feature/your-feature

# View commit history
git log --oneline

# Check status
git status
```

## Deployment Commands

### Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add PostgreSQL
railway add postgresql

# Add Redis
railway add redis

# Set environment variables
railway variables set NODE_ENV=production

# Deploy
railway up

# View logs
railway logs

# Open in browser
railway open
```

### Render

```bash
# Deploy via Git push
git push origin main

# Render auto-deploys from connected repository
```

### Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create order-execution-engine

# Add PostgreSQL
heroku addons:create heroku-postgresql:essential-0

# Add Redis
heroku addons:create heroku-redis:mini

# Set environment variables
heroku config:set NODE_ENV=production

# Deploy
git push heroku main

# View logs
heroku logs --tail

# Open in browser
heroku open
```

## Monitoring Commands

```bash
# View application logs (Docker)
docker-compose logs -f api

# View PostgreSQL logs
docker-compose logs -f postgres

# View Redis logs
docker-compose logs -f redis

# Check PostgreSQL connection
docker exec -it order-engine-postgres psql -U postgres -d order_engine

# Check Redis connection
docker exec -it order-engine-redis redis-cli ping

# Monitor Redis keys
docker exec -it order-engine-redis redis-cli KEYS "*"

# View queue jobs in Redis
docker exec -it order-engine-redis redis-cli LLEN "bull:order-execution:wait"
```

## Troubleshooting Commands

```bash
# Check ports in use (Linux/Mac)
lsof -i :3000
lsof -i :5432
lsof -i :6379

# Check ports in use (Windows)
netstat -ano | findstr :3000
netstat -ano | findstr :5432
netstat -ano | findstr :6379

# Kill process by port (Linux/Mac)
lsof -ti:3000 | xargs kill -9

# Kill process by port (Windows)
taskkill /PID <PID> /F

# Check Docker disk usage
docker system df

# Clean up Docker
docker system prune -a

# Reset everything
docker-compose down -v
rm -rf node_modules
rm -rf dist
npm install
```

## Build Commands

```bash
# Build TypeScript
npm run build

# Clean build
rm -rf dist
npm run build

# Type check only (no emit)
npx tsc --noEmit
```

## Environment Commands

```bash
# Copy environment template
cp .env.example .env

# View current environment
cat .env

# Edit environment (Linux/Mac)
nano .env

# Edit environment (Windows)
notepad .env
```

## Performance Testing

```bash
# Install Apache Bench (Linux)
sudo apt-get install apache2-utils

# Load test health endpoint
ab -n 1000 -c 10 http://localhost:3000/api/health

# Install Artillery for advanced testing
npm install -g artillery

# Run load test
artillery quick --count 10 --num 50 http://localhost:3000/api/health
```

## Quick Verification

```bash
# Complete health check script
echo "Checking health..."
curl http://localhost:3000/api/health

echo "\nChecking Docker services..."
docker-compose ps

echo "\nChecking database..."
docker exec order-engine-postgres pg_isready

echo "\nChecking Redis..."
docker exec order-engine-redis redis-cli ping

echo "\nAll systems operational!"
```

## Backup Commands

```bash
# Backup PostgreSQL database
docker exec order-engine-postgres pg_dump -U postgres order_engine > backup.sql

# Restore PostgreSQL database
docker exec -i order-engine-postgres psql -U postgres order_engine < backup.sql

# Backup Redis data
docker exec order-engine-redis redis-cli SAVE

# Export Redis data
docker exec order-engine-redis redis-cli --rdb dump.rdb
```

## Cleanup Commands

```bash
# Remove node_modules
rm -rf node_modules

# Remove build artifacts
rm -rf dist

# Remove Prisma generated files
rm -rf node_modules/.prisma
rm -rf src/generated

# Full cleanup
rm -rf node_modules dist .prisma
docker-compose down -v
npm install
```

## Useful Aliases (Add to .bashrc or .zshrc)

```bash
# Add to ~/.bashrc or ~/.zshrc
alias dev="npm run dev"
alias test="npm test"
alias build="npm run build"
alias dc="docker-compose"
alias dcu="docker-compose up -d"
alias dcd="docker-compose down"
alias dcl="docker-compose logs -f"
alias prisma="npx prisma"
```

## Windows-Specific Commands

```powershell
# PowerShell aliases (add to profile)
Set-Alias -Name dev -Value "npm run dev"
Set-Alias -Name test -Value "npm test"

# View PowerShell profile location
$PROFILE

# Edit PowerShell profile
notepad $PROFILE
```

## Production Checklist Commands

```bash
# 1. Run tests
npm test

# 2. Check for security vulnerabilities
npm audit

# 3. Build for production
npm run build

# 4. Check TypeScript compilation
npx tsc --noEmit

# 5. Verify environment variables
cat .env

# 6. Test production build locally
NODE_ENV=production npm start

# 7. Run database migrations
npx prisma migrate deploy

# 8. Health check
curl http://localhost:3000/api/health
```

## Quick Start (Complete Setup)

```bash
# One-liner setup (Linux/Mac)
git clone <repo> && cd Eterna && npm install && docker-compose up -d && sleep 5 && npx prisma generate && npx prisma migrate dev --name init && npm run dev

# One-liner setup (Windows PowerShell)
git clone <repo>; cd Eterna; npm install; docker-compose up -d; Start-Sleep 5; npx prisma generate; npx prisma migrate dev --name init; npm run dev
```

---

**Quick Access:**
- 📖 Full documentation: `README.md`
- 🚀 Quick start guide: `QUICKSTART.md`
- 🏗️ Architecture details: `ARCHITECTURE.md`
- 🚢 Deployment guide: `DEPLOYMENT.md`
- 🔌 WebSocket testing: `WEBSOCKET_TESTING.md`
