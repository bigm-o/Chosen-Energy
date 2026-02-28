# Deployment Guide - Railway + Supabase

## Prerequisites
1. GitHub account
2. Railway account (https://railway.app)
3. Supabase account (https://supabase.com)
4. Domain name (optional, ~$12/year)

## Step 1: Database Setup (Supabase)

### 1.1 Create Supabase Project
1. Go to https://supabase.com
2. Click "New Project"
3. Name: `chosen-energy-db`
4. Database Password: (save this securely)
5. Region: Choose closest to Nigeria (e.g., Frankfurt)

### 1.2 Run Migrations
1. In Supabase dashboard, go to SQL Editor
2. Copy and paste each migration file from `database/migrations/` in order:
   - 001_initial_schema.sql
   - 002_seed_data.sql
   - 003_add_rejection_reason.sql
   - ... (all files in order)
3. Click "Run" for each

### 1.3 Get Connection String
1. Go to Project Settings → Database
2. Copy the "Connection string" (URI format)
3. Replace `[YOUR-PASSWORD]` with your database password
4. Save this for later

## Step 2: Backend Deployment (Railway)

### 2.1 Push to GitHub
```bash
cd "Chosen App/backend"
git init
git add .
git commit -m "Initial backend commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2.2 Deploy to Railway
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your backend repository
5. Railway will auto-detect .NET and deploy

### 2.3 Configure Environment Variables
In Railway dashboard, go to Variables and add:
```
DATABASE_URL=<your-supabase-connection-string>
JWT_SECRET=<generate-a-secure-random-string-min-32-chars>
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://0.0.0.0:$PORT
```

To generate JWT_SECRET:
```bash
openssl rand -base64 32
```

### 2.4 Get Backend URL
1. In Railway, go to Settings → Domains
2. Click "Generate Domain"
3. Copy the URL (e.g., `https://chosen-energy-api.up.railway.app`)

## Step 3: Frontend Deployment (Railway)

### 3.1 Update API URL
Edit `frontend/.env.production`:
```env
VITE_API_URL=https://chosen-energy-api.up.railway.app
```

### 3.2 Push Frontend to GitHub
```bash
cd "Chosen App/frontend"
git init
git add .
git commit -m "Initial frontend commit"
git branch -M main
git remote add origin <your-frontend-github-repo-url>
git push -u origin main
```

### 3.3 Deploy to Railway
1. In Railway, click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your frontend repository
4. Railway will auto-detect Vite and deploy

### 3.4 Configure Build
Railway should auto-detect, but verify:
- Build Command: `npm run build`
- Start Command: `npm run preview`
- Root Directory: `/`

## Step 4: Custom Domain (Optional)

### 4.1 Add Domain to Railway
1. In Railway project → Settings → Domains
2. Click "Custom Domain"
3. Enter your domain (e.g., `app.chosenenergy.com`)
4. Copy the CNAME record

### 4.2 Configure Cloudflare
1. Go to Cloudflare dashboard
2. Add your domain
3. Update nameservers at your domain registrar
4. Add CNAME record:
   - Name: `app` (or `@` for root)
   - Target: `<railway-provided-cname>`
   - Proxy status: Proxied (orange cloud)

### 4.3 Enable SSL
1. In Cloudflare → SSL/TLS
2. Set mode to "Full (strict)"
3. Wait 5-10 minutes for SSL to activate

## Step 5: Performance Optimization

### 5.1 Enable Cloudflare Caching
1. Cloudflare → Caching → Configuration
2. Caching Level: Standard
3. Browser Cache TTL: 4 hours

### 5.2 Enable Cloudflare Minification
1. Cloudflare → Speed → Optimization
2. Enable Auto Minify: HTML, CSS, JavaScript

### 5.3 Configure Railway Auto-Deploy
1. Railway → Settings → Deployments
2. Enable "Auto Deploy" from main branch
3. Every git push will auto-deploy

## Step 6: Monitoring Setup

### 6.1 Uptime Robot
1. Go to https://uptimerobot.com
2. Add Monitor:
   - Type: HTTPS
   - URL: Your frontend URL
   - Interval: 5 minutes
3. Add email alert

### 6.2 Sentry (Error Tracking)
1. Go to https://sentry.io
2. Create project (React + .NET)
3. Add Sentry DSN to environment variables
4. Install Sentry packages (optional, for future)

## Step 7: Backup Strategy

### 7.1 Supabase Backups
- Free tier: Daily backups (7-day retention)
- Pro tier: Daily backups (30-day retention)
- Point-in-time recovery available on Pro

### 7.2 Manual Backup
```bash
# Export database
pg_dump <supabase-connection-string> > backup.sql

# Restore if needed
psql <supabase-connection-string> < backup.sql
```

## Troubleshooting

### Backend won't start
1. Check Railway logs: `railway logs`
2. Verify DATABASE_URL is correct
3. Ensure all migrations ran successfully

### Frontend can't connect to API
1. Check CORS settings in backend
2. Verify VITE_API_URL in frontend
3. Check Railway backend is running

### Database connection errors
1. Verify Supabase project is active
2. Check connection string format
3. Ensure password is correct

## Cost Monitoring

### Railway Dashboard
- View usage: Railway → Project → Usage
- Set spending limit: Settings → Billing

### Supabase Dashboard
- View usage: Supabase → Project → Usage
- Upgrade if approaching limits

## Maintenance

### Weekly
- Check Railway logs for errors
- Review Uptime Robot reports

### Monthly
- Review usage and costs
- Update dependencies
- Check security advisories

### Quarterly
- Test backup restoration
- Performance audit
- Security review

## Support

- Railway Docs: https://docs.railway.app
- Supabase Docs: https://supabase.com/docs
- Cloudflare Docs: https://developers.cloudflare.com
