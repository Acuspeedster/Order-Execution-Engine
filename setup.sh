#!/bin/bash

# Order Execution Engine - Setup Script
# This script automates the initial setup process

set -e

echo "🚀 Order Execution Engine - Setup Script"
echo "========================================"
echo ""

# Check Node.js version
echo "📋 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher required. Current: $(node -v)"
    exit 1
fi
echo "✅ Node.js version: $(node -v)"
echo ""

# Check Docker
echo "📋 Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi
echo "✅ Docker is installed"
echo ""

# Check Docker Compose
echo "📋 Checking Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose first."
    exit 1
fi
echo "✅ Docker Compose is installed"
echo ""

# Create .env if not exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi
echo ""

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Start Docker services
echo "🐳 Starting PostgreSQL and Redis..."
docker-compose up -d
echo "✅ Docker services started"
echo ""

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5
echo ""

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate
echo "✅ Prisma client generated"
echo ""

# Run database migrations
echo "🗄️  Running database migrations..."
npx prisma migrate dev --name init
echo "✅ Database migrations completed"
echo ""

# Success message
echo "========================================"
echo "✅ Setup completed successfully!"
echo ""
echo "📝 Next steps:"
echo "  1. Start the development server:"
echo "     npm run dev"
echo ""
echo "  2. Test the API:"
echo "     curl http://localhost:3000/api/health"
echo ""
echo "  3. Import Postman collection:"
echo "     postman_collection.json"
echo ""
echo "  4. Read the documentation:"
echo "     - README.md - Main documentation"
echo "     - QUICKSTART.md - Quick start guide"
echo "     - WEBSOCKET_TESTING.md - WebSocket testing"
echo ""
echo "🎉 Happy coding!"
