# The Beat 515 - Railway Backend Deployment Guide

## 🚀 Deploy to Railway (Step-by-Step)

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Click "Login" → "Login with GitHub"
3. Authorize Railway

### Step 2: Create New Project
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Find and select: `tygoodhue01-dev/Radio`
4. Click **"Deploy Now"**

### Step 3: Configure Root Directory
1. After deployment starts, click on the service
2. Go to **"Settings"** tab
3. Under **"Root Directory"**, set: `backend`
4. Click **"Save"**

### Step 4: Add Environment Variables
Go to **"Variables"** tab and add these:

```
MONGO_URL=mongodb+srv://tylerjgoodhue:GrayConan1%24@cluster0.5idrjgs.mongodb.net/thebeat515?retryWrites=true&w=majority&appName=Cluster0
DB_NAME=thebeat515
JWT_SECRET=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
ADMIN_EMAIL=admin@thebeat515.com
ADMIN_PASSWORD=Beat515Admin!
FRONTEND_URL=https://your-vercel-app.vercel.app
```

**Important:** Replace `your-vercel-app.vercel.app` with your actual Vercel URL after deploying frontend.

### Step 5: Deploy
1. Railway will auto-deploy after adding variables
2. Wait 2-3 minutes for build
3. Once deployed, you'll see a URL like: `your-app.up.railway.app`

### Step 6: Generate Domain
1. Go to **"Settings"** tab
2. Under **"Networking"**, click **"Generate Domain"**
3. Copy the generated URL (e.g., `thebeat515-backend.up.railway.app`)

---

## 🔗 Connect Frontend to Backend

After Railway deployment, update your Vercel frontend:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Update `REACT_APP_BACKEND_URL` to your Railway URL:
   ```
   https://your-app.up.railway.app
   ```
3. Redeploy frontend on Vercel

---

## ✅ Verify Deployment

Test your backend is running:
```
https://your-railway-url.up.railway.app/api/now-playing
```

You should see JSON data with the currently playing song.

---

## 📋 Quick Checklist

- [ ] Create Railway account
- [ ] Connect GitHub repository
- [ ] Set root directory to `backend`
- [ ] Add all environment variables
- [ ] Generate public domain
- [ ] Copy Railway URL
- [ ] Update Vercel `REACT_APP_BACKEND_URL`
- [ ] Redeploy Vercel frontend
- [ ] Test the connection
- [ ] Done! 🎉

---

## 🆘 Troubleshooting

**Build fails?**
- Check that root directory is set to `backend`
- Verify `requirements.txt` exists
- Check build logs for missing dependencies

**Can't connect to MongoDB?**
- Verify `MONGO_URL` is correct in Railway variables
- Make sure MongoDB Atlas IP whitelist includes `0.0.0.0/0`

**API returns errors?**
- Check Railway logs for error messages
- Verify all environment variables are set

---

## 💰 Railway Pricing

- **Free tier**: $5 credit/month (enough for small apps)
- **Hobby**: $5/month (more resources)
- No credit card required to start!
