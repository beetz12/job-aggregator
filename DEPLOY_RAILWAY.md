# Railway Deployment Guide

Deploy your Job Aggregator to Railway in under 10 minutes.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Push your code to GitHub
3. **Supabase Database**: Already configured (you have `DATABASE_URL`)

## Architecture on Railway

```
┌─────────────────────────────────────────────────────────────┐
│                      Railway Project                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐        ┌─────────────────┐             │
│  │  Backend (API)  │◄──────►│   Frontend      │             │
│  │  Motia + Python │        │   Next.js       │             │
│  │  Port: $PORT    │        │   Port: $PORT   │             │
│  └────────┬────────┘        └────────┬────────┘             │
│           │                          │                       │
│           │ DATABASE_URL             │ NEXT_PUBLIC_API_URL   │
│           ▼                          │                       │
│  ┌─────────────────┐                 │                       │
│  │    Supabase     │◄────────────────┘                       │
│  │   PostgreSQL    │                                         │
│  └─────────────────┘                                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Step-by-Step Deployment

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Add Railway deployment configuration"
git push origin main
```

### Step 2: Create Railway Project

1. Go to [railway.app/new](https://railway.app/new)
2. Click **"Deploy from GitHub repo"**
3. Select your `job-aggregator` repository
4. Railway will detect it's a monorepo

### Step 3: Deploy Backend Service

1. In the Railway dashboard, click **"+ New Service"**
2. Select **"GitHub Repo"** → your `job-aggregator` repo
3. Configure the service:

**Settings:**
| Setting | Value |
|---------|-------|
| Root Directory | `/` (leave empty - uses root) |
| Builder | Dockerfile |

**Variables (add these):**
```
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
ANTHROPIC_API_KEY=sk-ant-... (optional, for AI features)
```

4. Click **Deploy**

Railway will:
- Build using the `Dockerfile` at root
- Use `railway.json` configuration automatically
- Expose the service with a public URL

### Step 4: Deploy Frontend Service

1. Click **"+ New Service"** again
2. Select **"GitHub Repo"** → same `job-aggregator` repo
3. Configure:

**Settings:**
| Setting | Value |
|---------|-------|
| Root Directory | `frontend` |
| Builder | Nixpacks (auto-detected) |

**Variables:**
```
NEXT_PUBLIC_API_URL=https://[your-backend-service].railway.app
```

> ⚠️ **Important**: Get your backend URL from the backend service's "Settings" → "Networking" → "Public Domain".
> It looks like: `https://job-aggregator-backend-production.up.railway.app`

4. Click **Deploy**

### Step 5: Configure Networking

1. **Backend Service**: Go to Settings → Networking → Generate Domain
2. Copy the domain (e.g., `job-aggregator-api.railway.app`)
3. **Frontend Service**: Update `NEXT_PUBLIC_API_URL` with the backend domain

### Step 6: Verify Deployment

1. Open your backend URL: `https://[backend].railway.app/health`
   - Should return: `{"status":"healthy","timestamp":"...","version":"1.0.0"}`

2. Open your frontend URL: `https://[frontend].railway.app`
   - Should show the Job Aggregator dashboard

3. Test job fetching: Click "Refresh" on any source

## Environment Variables Reference

### Backend Service

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ Yes | Supabase PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | ❌ No | For AI summarization & cover letters |
| `REDDIT_CLIENT_ID` | ❌ No | Reddit API (if using Reddit source) |
| `REDDIT_CLIENT_SECRET` | ❌ No | Reddit API secret |
| `PORT` | Auto | Railway sets this automatically |

### Frontend Service

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ Yes | Backend service URL |
| `PORT` | Auto | Railway sets this automatically |

## Troubleshooting

### Backend won't start

1. Check logs in Railway dashboard
2. Verify `DATABASE_URL` is correct
3. Ensure Supabase allows connections from Railway IPs

### Frontend can't connect to backend

1. Verify `NEXT_PUBLIC_API_URL` is set correctly
2. Check CORS is enabled (already configured in `motia.config.ts`)
3. Ensure backend has a public domain

### Python steps not working

The Dockerfile includes:
```dockerfile
RUN pip install --no-cache-dir -r requirements.txt
RUN npx motia@latest install
```

If Python steps fail, check Railway build logs for pip errors.

### Database connection issues

Supabase requires SSL. The code already handles this:
```typescript
ssl: { rejectUnauthorized: false }
```

If issues persist, try the connection pooler URL from Supabase.

## Cost Estimate

Railway's free tier includes:
- $5 of usage/month
- 500 hours of execution

For a hackathon demo:
- Backend: ~$2-3/month (always running)
- Frontend: ~$2-3/month (always running)

**Tip**: Use Railway's "Usage" tab to monitor costs.

## Quick Deploy Commands

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Deploy manually (after connecting to GitHub)
railway up
```

## Service URLs

After deployment, your services will be available at:

- **Backend API**: `https://[project]-backend.railway.app`
- **Frontend**: `https://[project]-frontend.railway.app`
- **Health Check**: `https://[project]-backend.railway.app/health`
- **Jobs API**: `https://[project]-backend.railway.app/jobs`

## Updating Deployments

Railway automatically deploys when you push to GitHub:

```bash
git add .
git commit -m "Update feature"
git push origin main
# Railway automatically rebuilds and deploys
```

---

**Need help?** Check [Railway Docs](https://docs.railway.com) or the project issues.
