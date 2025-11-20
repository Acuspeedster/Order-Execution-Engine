# Deployment Guide

## Overview

This guide covers deploying the Order Execution Engine to production hosting platforms.

## Table of Contents

1. [Railway Deployment](#railway-deployment)
2. [Render Deployment](#render-deployment)
3. [Heroku Deployment](#heroku-deployment)
4. [Environment Variables](#environment-variables)
5. [Post-Deployment](#post-deployment)
6. [Monitoring](#monitoring)

## Railway Deployment

Railway offers free hosting with PostgreSQL and Redis add-ons.

### Prerequisites

- Railway account (https://railway.app)
- GitHub repository

### Steps

1. **Install Railway CLI**
```bash
npm install -g @railway/cli
```

2. **Login to Railway**
```bash
railway login
```

3. **Initialize Project**
```bash
railway init
```

4. **Add PostgreSQL**
```bash
railway add postgresql
```

5. **Add Redis**
```bash
railway add redis
```

6. **Set Environment Variables**
```bash
railway variables set NODE_ENV=production
railway variables set MAX_CONCURRENT_ORDERS=10
railway variables set ORDERS_PER_MINUTE=100
railway variables set MAX_RETRIES=3
railway variables set DEX_QUOTE_TIMEOUT=5000
railway variables set MOCK_EXECUTION_DELAY=2500
```

Database and Redis URLs are automatically set by Railway.

7. **Deploy**
```bash
railway up
```

8. **Run Migrations**
```bash
railway run npx prisma migrate deploy
railway run npx prisma generate
```

9. **Get Public URL**
```bash
railway domain
```

### Railway Dashboard Configuration

1. Go to your project dashboard
2. Click on your service
3. Go to "Settings" → "Networking"
4. Generate a public domain
5. Copy the URL (e.g., `https://your-app.railway.app`)

## Render Deployment

Render provides free hosting with integrated database services.

### Prerequisites

- Render account (https://render.com)
- GitHub repository

### Steps

1. **Connect GitHub Repository**
   - Login to Render dashboard
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service**
   ```
   Name: order-execution-engine
   Environment: Node
   Build Command: npm install && npx prisma generate && npm run build
   Start Command: npm start
   ```

3. **Add PostgreSQL Database**
   - Click "New +" → "PostgreSQL"
   - Name: order-engine-db
   - Plan: Free

4. **Add Redis**
   - Click "New +" → "Redis"
   - Name: order-engine-redis
   - Plan: Free

5. **Set Environment Variables**
   
   In your web service settings, add:
   ```
   NODE_ENV=production
   DATABASE_URL=[copy from PostgreSQL instance]
   REDIS_HOST=[copy from Redis instance]
   REDIS_PORT=[copy from Redis instance]
   REDIS_PASSWORD=[copy from Redis instance]
   MAX_CONCURRENT_ORDERS=10
   ORDERS_PER_MINUTE=100
   MAX_RETRIES=3
   DEX_QUOTE_TIMEOUT=5000
   MOCK_EXECUTION_DELAY=2500
   ```

6. **Deploy**
   - Click "Create Web Service"
   - Wait for build to complete
   - Copy your public URL (e.g., `https://your-app.onrender.com`)

### Using render.yaml

Alternatively, use the included `render.yaml` for infrastructure-as-code:

1. Push `render.yaml` to your repository
2. In Render dashboard, click "New +" → "Blueprint"
3. Select your repository
4. Render will automatically create all services

## Heroku Deployment

### Prerequisites

- Heroku account (https://heroku.com)
- Heroku CLI installed

### Steps

1. **Login to Heroku**
```bash
heroku login
```

2. **Create App**
```bash
heroku create order-execution-engine
```

3. **Add PostgreSQL**
```bash
heroku addons:create heroku-postgresql:essential-0
```

4. **Add Redis**
```bash
heroku addons:create heroku-redis:mini
```

5. **Set Environment Variables**
```bash
heroku config:set NODE_ENV=production
heroku config:set MAX_CONCURRENT_ORDERS=10
heroku config:set ORDERS_PER_MINUTE=100
heroku config:set MAX_RETRIES=3
heroku config:set DEX_QUOTE_TIMEOUT=5000
heroku config:set MOCK_EXECUTION_DELAY=2500
```

6. **Create Procfile**
```bash
echo "web: npm start" > Procfile
echo "release: npx prisma migrate deploy && npx prisma generate" >> Procfile
```

7. **Deploy**
```bash
git push heroku main
```

8. **Get URL**
```bash
heroku open
```

## Environment Variables

### Required Variables

```env
# Application
NODE_ENV=production

# Database (provided by hosting platform)
DATABASE_URL=postgresql://user:password@host:5432/database

# Redis (provided by hosting platform)
REDIS_HOST=hostname
REDIS_PORT=6379
REDIS_PASSWORD=password

# Queue Configuration
MAX_CONCURRENT_ORDERS=10
ORDERS_PER_MINUTE=100
MAX_RETRIES=3

# DEX Configuration
DEX_QUOTE_TIMEOUT=5000
MOCK_EXECUTION_DELAY=2500
```

### Optional Variables

```env
# Server (usually set by platform)
PORT=3000
HOST=0.0.0.0
```

## Post-Deployment

### 1. Verify Deployment

Test health endpoint:
```bash
curl https://your-app-url.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": 1234567890,
  "uptime": 123
}
```

### 2. Test Order Submission

```bash
curl -X POST https://your-app-url.com/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{
    "type": "market",
    "fromToken": "SOL",
    "toToken": "USDC",
    "amount": 10,
    "slippageTolerance": 0.01
  }'
```

### 3. Check Queue Stats

```bash
curl https://your-app-url.com/api/queue/stats
```

### 4. Update README

Add your public URL to `README.md`:
```markdown
**Public URL**: https://your-app-url.com
```

## Monitoring

### Application Logs

**Railway:**
```bash
railway logs
```

**Render:**
- View in dashboard under "Logs" tab

**Heroku:**
```bash
heroku logs --tail
```

### Database Monitoring

**Check Connection:**
```bash
# Railway
railway run npx prisma studio

# Heroku
heroku pg:info
```

### Redis Monitoring

**Check Redis:**
```bash
# Railway
railway run redis-cli ping

# Heroku
heroku redis:info
```

### Health Monitoring

Set up health check monitoring with services like:
- UptimeRobot (https://uptimerobot.com)
- Better Uptime (https://betteruptime.com)
- Pingdom (https://pingdom.com)

Configure to check: `https://your-app-url.com/api/health`

## Scaling

### Vertical Scaling

Increase resources in your hosting platform:

**Railway:**
- Upgrade plan in dashboard
- Increase memory/CPU allocation

**Render:**
- Upgrade to paid plan
- Select larger instance type

### Horizontal Scaling

For higher load, consider:

1. **Multiple Workers**
   ```env
   MAX_CONCURRENT_ORDERS=50
   ORDERS_PER_MINUTE=500
   ```

2. **Database Connection Pooling**
   ```
   DATABASE_URL=postgresql://user:password@host:5432/db?connection_limit=20&pool_timeout=10
   ```

3. **Redis Cluster** (if needed)
   - Upgrade to Redis cluster plan
   - Enable Redis Sentinel for high availability

## SSL/HTTPS

All recommended platforms provide automatic SSL:
- Railway: Automatic HTTPS
- Render: Automatic HTTPS
- Heroku: Automatic HTTPS

No additional configuration needed.

## Custom Domain

### Railway

1. Go to project settings
2. Add custom domain
3. Update DNS records as instructed
4. Wait for SSL certificate

### Render

1. Go to service settings
2. Add custom domain
3. Update DNS CNAME record
4. Automatic SSL provisioning

### Heroku

```bash
heroku domains:add yourdomain.com
heroku domains:wait yourdomain.com
```

## Backup and Recovery

### Database Backups

**Railway:**
- Automatic daily backups
- Manual backups in dashboard

**Render:**
- Automatic backups on paid plans
- Restore from dashboard

**Heroku:**
```bash
heroku pg:backups:capture
heroku pg:backups:download
```

### Restore from Backup

**Railway:**
1. Go to PostgreSQL service
2. Click "Backups"
3. Select backup to restore

**Render:**
1. Go to PostgreSQL instance
2. Click "Backups"
3. Select backup and restore

## CI/CD

### Automatic Deployments

**GitHub Integration:**

All platforms support automatic deployments:

1. Connect GitHub repository
2. Select branch (usually `main`)
3. Enable auto-deploy
4. Every push triggers deployment

### Manual Deployments

**Railway:**
```bash
railway up
```

**Render:**
- Push to GitHub
- Or trigger manual deploy in dashboard

**Heroku:**
```bash
git push heroku main
```

## Troubleshooting

### Build Failures

**Check logs:**
```bash
# Railway
railway logs --build

# Heroku
heroku logs --tail
```

**Common issues:**
- Node version mismatch: Add `engines` to `package.json`
- Missing dependencies: Check `package.json`
- Prisma errors: Ensure `prisma generate` runs in build

### Runtime Errors

**Database connection:**
```bash
# Test connection
curl https://your-app-url.com/api/health
```

**Redis connection:**
- Check environment variables
- Verify Redis instance is running

### Performance Issues

**Increase resources:**
- Upgrade hosting plan
- Increase worker count
- Optimize database queries

## Cost Optimization

### Free Tier Limits

**Railway:**
- $5 credit/month
- Shared resources

**Render:**
- Free tier with limitations
- Upgrade for production

**Heroku:**
- Free tier deprecated
- Minimum $7/month

### Tips to Reduce Costs

1. Use free tier for development
2. Upgrade only production
3. Monitor resource usage
4. Clean up old jobs/data
5. Use database connection pooling

## Security Checklist

- [ ] Environment variables set correctly
- [ ] Database credentials secured
- [ ] HTTPS enabled
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] Error messages sanitized
- [ ] Database backups enabled
- [ ] Monitoring set up
- [ ] Health checks configured

## Production Readiness

Before going live:

1. **Load Testing**
   - Test with multiple concurrent orders
   - Verify queue processing
   - Check WebSocket stability

2. **Error Handling**
   - Test failure scenarios
   - Verify retry logic
   - Check error reporting

3. **Monitoring**
   - Set up alerts
   - Configure log aggregation
   - Monitor performance metrics

4. **Documentation**
   - Update README with public URL
   - Document any custom configurations
   - Share API documentation

## Support

For deployment issues:

- **Railway**: https://railway.app/help
- **Render**: https://render.com/docs/support
- **Heroku**: https://help.heroku.com

---

**Need help?** Open an issue on GitHub or contact support.
