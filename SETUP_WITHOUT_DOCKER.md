# Alternative Setup Guide (Without Docker)

If you don't have Docker Desktop running or prefer not to use Docker, you can set up PostgreSQL and Redis locally.

## Option 1: Start Docker Desktop (Recommended)

1. **Open Docker Desktop Application**
   - Search for "Docker Desktop" in Windows Start Menu
   - Launch the application
   - Wait for Docker to start (icon in system tray should be green)

2. **Verify Docker is Running**
   ```powershell
   docker --version
   docker ps
   ```

3. **Then run docker-compose**
   ```powershell
   docker-compose up -d
   ```

## Option 2: Use Cloud Services (Free Tier)

### Railway.app (Easiest)

1. **Sign up at https://railway.app**
2. **Create New Project**
3. **Add PostgreSQL**
   - Click "New" → "Database" → "PostgreSQL"
   - Copy the `DATABASE_URL` from the database settings
4. **Add Redis**
   - Click "New" → "Database" → "Redis"
   - Copy the connection details

5. **Update your .env file**
   ```env
   DATABASE_URL="<paste-postgresql-url-from-railway>"
   REDIS_HOST="<paste-redis-host-from-railway>"
   REDIS_PORT="<paste-redis-port-from-railway>"
   REDIS_PASSWORD="<paste-redis-password-from-railway>"
   ```

### Supabase (PostgreSQL Only)

1. **Sign up at https://supabase.com**
2. **Create a new project**
3. **Get database URL**
   - Go to Project Settings → Database
   - Copy the "Connection String" (URI mode)
4. **For Redis**, use Upstash (see below)

### Upstash (Redis Only)

1. **Sign up at https://upstash.com**
2. **Create Redis Database**
   - Select free tier
   - Choose region closest to you
3. **Get connection details**
   - Copy Host, Port, and Password

## Option 3: Install PostgreSQL and Redis Locally on Windows

### Install PostgreSQL

1. **Download PostgreSQL**
   - Visit https://www.postgresql.org/download/windows/
   - Download the installer (version 15 or higher)

2. **Install PostgreSQL**
   - Run the installer
   - Set password: `password` (or remember your custom password)
   - Port: `5432` (default)
   - Remember the installation path

3. **Verify Installation**
   ```powershell
   psql --version
   ```

4. **Create Database**
   ```powershell
   # Open psql
   psql -U postgres
   
   # Create database
   CREATE DATABASE order_engine;
   
   # Exit
   \q
   ```

5. **Update .env**
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/order_engine?schema=public"
   ```

### Install Redis on Windows

#### Option A: Redis on Windows (Using WSL - Recommended)

1. **Enable WSL (Windows Subsystem for Linux)**
   ```powershell
   wsl --install
   ```
   Restart your computer after installation.

2. **Install Redis in WSL**
   ```bash
   sudo apt update
   sudo apt install redis-server
   sudo service redis-server start
   ```

3. **Verify Redis**
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

4. **Keep Redis running in WSL** (in background)

#### Option B: Use Memurai (Redis Alternative for Windows)

1. **Download Memurai**
   - Visit https://www.memurai.com/
   - Download the free developer edition

2. **Install Memurai**
   - Run the installer
   - It will run as a Windows service

3. **Verify Installation**
   ```powershell
   # Install redis-cli for Windows
   # Or use Memurai CLI
   memurai-cli ping
   ```

4. **Update .env**
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=
   ```

## Option 4: Use Mock Services (For Testing Only)

If you just want to test the code without setting up infrastructure, I can help you create mock services that don't require PostgreSQL or Redis.

### Create Mock Database Service

This would replace the actual database with in-memory storage for testing purposes.

## Quick Setup Guide for Each Option

### Using Railway (Fastest)

```powershell
# 1. Sign up at railway.app
# 2. Create project and add PostgreSQL + Redis
# 3. Copy credentials to .env
# 4. Run migrations
npx prisma generate
npx prisma migrate deploy

# 5. Start app
npm run dev
```

### Using Local PostgreSQL + Redis via WSL

```powershell
# 1. Install WSL and Redis (see above)
# 2. Install PostgreSQL for Windows
# 3. Start Redis in WSL
wsl sudo service redis-server start

# 4. Run migrations
npx prisma generate
npx prisma migrate dev --name init

# 5. Start app
npm run dev
```

### Using Docker Desktop (Once Started)

```powershell
# 1. Start Docker Desktop application
# 2. Wait for it to be ready
# 3. Run compose
docker-compose up -d

# 4. Run migrations
npx prisma generate
npx prisma migrate dev --name init

# 5. Start app
npm run dev
```

## Troubleshooting

### Docker Desktop Not Starting

**Common issues:**
- Hyper-V not enabled
- Virtualization not enabled in BIOS
- Insufficient system resources

**Solutions:**
1. Enable Hyper-V:
   ```powershell
   Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All
   ```
2. Restart computer
3. Try Docker Desktop again

### Can't Install Anything

**Use online services:**
- Railway.app (PostgreSQL + Redis)
- Supabase (PostgreSQL)
- Upstash (Redis)

All have generous free tiers and require no local installation.

## Recommended Approach

**For Development:**
1. Try to start Docker Desktop (easiest)
2. If Docker doesn't work, use Railway.app (free, no installation)

**For Production:**
- Deploy to Railway or Render (they provide databases automatically)

## Next Steps After Setup

Once you have PostgreSQL and Redis running (via any method):

```powershell
# 1. Install dependencies (if not done)
npm install

# 2. Generate Prisma client
npx prisma generate

# 3. Run migrations
npx prisma migrate dev --name init

# 4. Start development server
npm run dev

# 5. Test the API
curl http://localhost:3000/api/health
```

## Need Help?

If you're still having issues, let me know which option you'd like to pursue:
1. Docker Desktop (need help starting it)
2. Railway.app (need help with cloud setup)
3. Local PostgreSQL + Redis (need installation help)
4. Mock services (just for testing code)
