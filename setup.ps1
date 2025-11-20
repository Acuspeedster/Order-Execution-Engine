# Order Execution Engine - Setup Script (Windows)
# This script automates the initial setup process

Write-Host "🚀 Order Execution Engine - Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js version
Write-Host "📋 Checking Node.js version..." -ForegroundColor Yellow
try {
    $nodeVersion = node -v
    $versionNumber = [int]($nodeVersion -replace 'v(\d+).*', '$1')
    if ($versionNumber -lt 18) {
        Write-Host "❌ Node.js version 18 or higher required. Current: $nodeVersion" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}
Write-Host ""

# Check Docker
Write-Host "📋 Checking Docker..." -ForegroundColor Yellow
try {
    docker --version | Out-Null
    Write-Host "✅ Docker is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker not found. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}
Write-Host ""

# Check Docker Compose
Write-Host "📋 Checking Docker Compose..." -ForegroundColor Yellow
try {
    docker-compose --version | Out-Null
    Write-Host "✅ Docker Compose is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose not found. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}
Write-Host ""

# Create .env if not exists
if (-not (Test-Path .env)) {
    Write-Host "📝 Creating .env file..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "✅ .env file created" -ForegroundColor Green
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}
Write-Host ""

# Install dependencies
Write-Host "📦 Installing npm dependencies..." -ForegroundColor Yellow
npm install
Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Start Docker services
Write-Host "🐳 Starting PostgreSQL and Redis..." -ForegroundColor Yellow
docker-compose up -d
Write-Host "✅ Docker services started" -ForegroundColor Green
Write-Host ""

# Wait for services to be ready
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Write-Host ""

# Generate Prisma client
Write-Host "🔧 Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate
Write-Host "✅ Prisma client generated" -ForegroundColor Green
Write-Host ""

# Run database migrations
Write-Host "🗄️  Running database migrations..." -ForegroundColor Yellow
npx prisma migrate dev --name init
Write-Host "✅ Database migrations completed" -ForegroundColor Green
Write-Host ""

# Success message
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "  1. Start the development server:"
Write-Host "     npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "  2. Test the API:"
Write-Host "     curl http://localhost:3000/api/health" -ForegroundColor White
Write-Host ""
Write-Host "  3. Import Postman collection:"
Write-Host "     postman_collection.json" -ForegroundColor White
Write-Host ""
Write-Host "  4. Read the documentation:"
Write-Host "     - README.md - Main documentation" -ForegroundColor White
Write-Host "     - QUICKSTART.md - Quick start guide" -ForegroundColor White
Write-Host "     - WEBSOCKET_TESTING.md - WebSocket testing" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Happy coding!" -ForegroundColor Cyan
