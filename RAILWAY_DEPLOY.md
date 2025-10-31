# Deploying to Railway.app - Step-by-Step Guide

## 🚀 Quick Deployment (10 Minutes)

Railway is perfect for your Docker-based application. Follow these steps to get your app live!

---

## Step 1: Sign Up for Railway (2 minutes)

1. Go to **https://railway.app**
2. Click **"Start a New Project"** or **"Login with GitHub"**
3. Authorize Railway to access your GitHub repositories
4. You'll get **$5 free credit** per month (no credit card required initially)

---

## Step 2: Create a New Project (1 minute)

1. Click **"+ New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your repository: **traderdxb/shivas-repository**
4. Select the branch: **claude/fleet-inventory-app-011CUf7XyrTbXP5Xju57nZFC**

Railway will automatically detect your Docker setup!

---

## Step 3: Add PostgreSQL Database (1 minute)

1. In your Railway project, click **"+ New"**
2. Select **"Database"**
3. Choose **"Add PostgreSQL"**
4. Railway automatically creates a database and provides connection details

✅ **Railway automatically sets the DATABASE_URL environment variable!**

---

## Step 4: Deploy Backend Service (2 minutes)

Railway should auto-detect your services. If not:

1. Click **"+ New"**
2. Select **"GitHub Repo"**
3. Choose **backend** directory
4. Railway builds and deploys automatically

**Add Environment Variables:**

Click on the backend service → **Variables** tab → Add:

```bash
JWT_SECRET=fleet-inventory-secret-key-change-this-in-production-min-32-chars
NODE_ENV=production
PORT=5000
MAX_FILE_SIZE=10485760
```

**Important**: The `DATABASE_URL` is automatically set by Railway when you added PostgreSQL.

---

## Step 5: Deploy Frontend Service (2 minutes)

1. Click **"+ New"** in your project
2. Select **"GitHub Repo"**
3. Choose **frontend** directory

**Add Environment Variable:**

Click on the frontend service → **Variables** tab → Add:

```bash
VITE_API_URL=https://YOUR-BACKEND-URL.railway.app
```

⚠️ **You'll get the backend URL after backend deploys (next step)**

---

## Step 6: Configure Services (2 minutes)

### Backend Configuration:

1. Click on **backend service**
2. Go to **Settings**
3. Scroll to **Networking**
4. Click **"Generate Domain"**
5. Copy the generated URL (e.g., `https://fleet-backend-production-xxxx.railway.app`)

### Frontend Configuration:

1. Click on **frontend service**
2. Go to **Variables**
3. Update `VITE_API_URL` with the backend URL you just copied
4. Go to **Settings** → **Networking**
5. Click **"Generate Domain"**
6. Copy the frontend URL (this is your app URL!)

### Trigger Redeploy:

1. Click on **frontend service**
2. Go to **Deployments**
3. Click the **three dots** on the latest deployment
4. Select **"Redeploy"** (to pick up the new VITE_API_URL)

---

## Step 7: Initialize Database (1 minute)

Railway needs to run your database migrations:

1. Click on **backend service**
2. Click on the **latest deployment**
3. You should see build logs
4. The Dockerfile automatically runs: `npx prisma migrate deploy`
5. Wait for the deployment to complete

If migrations don't run automatically:

1. Click on backend service
2. Go to **Settings** → **Service Variables**
3. Add a new deployment trigger or redeploy

---

## Step 8: Access Your Live App! 🎉

1. Copy your **frontend URL** from Step 6
2. Open it in your browser
3. You should see the login page!

**Login with:**
- Email: `admin@fleet.com`
- Password: `admin123`

---

## 🎯 Your Railway Setup Summary

After deployment, you should have:

```
📦 Railway Project: Fleet Inventory
├── 🗄️  PostgreSQL Database (auto-configured)
├── 🔧 Backend Service
│   ├── URL: https://fleet-backend-xxxxx.railway.app
│   ├── Health: https://fleet-backend-xxxxx.railway.app/health
│   └── API: https://fleet-backend-xxxxx.railway.app/api
└── 🎨 Frontend Service
    └── URL: https://fleet-frontend-xxxxx.railway.app
```

---

## 🔧 Alternative Method: Deploy Entire Project at Once

If Railway doesn't auto-detect services:

1. **Deploy the whole repository**
2. Railway will ask which service to deploy
3. Choose **backend** first
4. After backend deploys, create another service for **frontend**
5. Add the database using **"+ New"** → **Database** → **PostgreSQL**

---

## 📝 Environment Variables Checklist

### ✅ Backend Service Variables:

```bash
DATABASE_URL          # Auto-set by Railway ✓
JWT_SECRET            # You add this
NODE_ENV              # Set to "production"
PORT                  # Set to "5000" (or Railway auto-assigns)
MAX_FILE_SIZE         # Set to "10485760"
```

### ✅ Frontend Service Variables:

```bash
VITE_API_URL          # Your backend Railway URL
```

### ✅ PostgreSQL Database:

```bash
# Automatically configured by Railway
# No manual setup needed!
```

---

## 🐛 Troubleshooting

### Backend Won't Start?

**Check logs:**
1. Click backend service
2. Click **Deployments**
3. View build/deploy logs

**Common issues:**
- Missing `JWT_SECRET` environment variable
- Database not connected (check `DATABASE_URL`)
- Port conflict (Railway auto-assigns, don't hardcode)

### Frontend Shows API Errors?

**Fix:**
1. Verify `VITE_API_URL` points to backend URL
2. Make sure backend URL includes `https://`
3. Redeploy frontend after changing variables

### Database Not Initialized?

**Run migrations manually:**
1. Click backend service
2. Click **three dots** → **View Logs**
3. Check for migration errors
4. Redeploy if needed

### 502 Bad Gateway?

- Wait 30-60 seconds for services to fully start
- Check backend is running and healthy
- Verify environment variables are set

---

## 💰 Railway Free Tier Limits

Your free tier includes:

- ✅ **$5 credit per month** (renews monthly)
- ✅ **500 hours execution time** (enough for testing)
- ✅ **100GB outbound bandwidth**
- ✅ **Unlimited inbound bandwidth**
- ✅ **Custom domains** (add your own domain)
- ✅ **Automatic SSL/HTTPS**

**Usage estimates for your app:**
- Backend: ~$3-4/month
- Frontend: ~$0-1/month
- PostgreSQL: Included
- **Total: Fits within free $5 credit!**

---

## 🔐 Post-Deployment Security

After deployment:

1. **Change admin password immediately!**
   ```
   Login → Settings → Change Password
   ```

2. **Update JWT_SECRET** to a strong random string:
   ```bash
   # Generate a secure secret
   openssl rand -base64 32

   # Update in Railway
   Backend Service → Variables → JWT_SECRET
   ```

3. **Review user access:**
   - Create new admin user with your email
   - Deactivate default admin@fleet.com

---

## 📊 Monitoring Your App

### View Logs:
```
Service → Deployments → Click deployment → View Logs
```

### Check Health:
```
https://your-backend-url.railway.app/health
```

### Monitor Usage:
```
Project → Usage tab
```

---

## 🔄 Auto-Deployment

Railway automatically redeploys when you push to GitHub!

```bash
# Make changes locally
git add .
git commit -m "Update feature"
git push

# Railway automatically:
# 1. Detects the push
# 2. Rebuilds Docker images
# 3. Deploys new version
# 4. Zero-downtime deployment
```

---

## 🎯 Next Steps After Deployment

1. ✅ **Test all features**
   - Login
   - Add devices
   - Create assignments
   - Generate reports

2. ✅ **Configure your data**
   - Add device models in Settings
   - Import inventory via Excel
   - Add clients and vehicles

3. ✅ **Invite your team**
   - Create user accounts
   - Assign appropriate roles
   - Share the Railway URL

4. ✅ **Add custom domain** (optional)
   - Railway Settings → Domains
   - Add your domain (e.g., fleet.yourcompany.com)
   - Update DNS records
   - Railway auto-provisions SSL

---

## 🆘 Need Help?

**Railway Support:**
- Discord: https://discord.gg/railway
- Docs: https://docs.railway.app

**Application Issues:**
- Check backend logs in Railway
- Verify environment variables
- Test API health endpoint

**Database Issues:**
- Verify DATABASE_URL is set
- Check PostgreSQL service is running
- View database logs in Railway

---

## 📱 Share Your App

Once deployed, share with your team:

```
🌐 Application URL: https://your-app.railway.app
👤 Default Login: admin@fleet.com / admin123
⚠️  Please change password on first login!
```

---

## 🎉 You're Live!

Your Fleet Inventory Management app is now:
- ✅ Deployed to Railway
- ✅ Running with PostgreSQL
- ✅ Accessible via HTTPS
- ✅ Auto-deploying from GitHub
- ✅ Backed up automatically

**Congratulations! 🚀**

---

## Alternative: If Railway Doesn't Work

If you encounter issues with Railway, try:

1. **Render.com** - Similar to Railway, great free tier
2. **Fly.io** - Excellent for Docker apps
3. **Oracle Cloud** - Most generous free tier (always free)

See the main deployment guide for alternatives!
