# The Beat 515 - Vercel Deployment Guide

## 🚀 Deploy to Vercel (Step-by-Step)

### Option 1: Deploy via Vercel Dashboard (Easiest)

1. **Go to Vercel:**
   - Visit: https://vercel.com
   - Click "Sign Up" or "Login"
   - Choose "Continue with GitHub"

2. **Import Your Repository:**
   - Click "Add New" → "Project"
   - Select your GitHub account
   - Find and select: `tygoodhue01-dev/Radio`
   - Click "Import"

3. **Configure Project:**
   - **Framework Preset:** Other
   - **Root Directory:** `./` (leave as is)
   - **Build Command:** `cd frontend && npm run build`
   - **Output Directory:** `frontend/build`
   - **Install Command:** `cd frontend && npm install`

4. **Add Environment Variables:**
   Click "Environment Variables" and add:
   ```
   Name: REACT_APP_BACKEND_URL
   Value: https://build-hub-401.preview.emergentagent.com
   ```

5. **Deploy:**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your app will be live at: `your-app.vercel.app`

---

### Option 2: Deploy via CLI (Advanced)

**Install Vercel CLI:**
```bash
npm i -g vercel
```

**Login:**
```bash
vercel login
```

**Deploy:**
```bash
cd /app
vercel
```

Follow prompts:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N**
- Project name? **radio** (or your choice)
- Directory? `./` (press Enter)
- Override settings? **Y**
  - Build Command: `cd frontend && npm run build`
  - Output Directory: `frontend/build`
  - Install Command: `cd frontend && npm install`

**Deploy to production:**
```bash
vercel --prod
```

---

## 🌐 Add Your Custom Domain

### Step 1: In Vercel Dashboard

1. Go to your project in Vercel
2. Click "Settings" → "Domains"
3. Click "Add Domain"
4. Enter your domain (e.g., `thebeat515.com`)
5. Click "Add"

Vercel will show you DNS records to configure.

### Step 2: Configure DNS at Your Domain Registrar

**Example for GoDaddy/Namecheap/etc:**

Go to your domain's DNS settings and add:

**For root domain (thebeat515.com):**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: Automatic
```

**For www subdomain:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: Automatic
```

**Note:** Vercel provides exact values - use those!

### Step 3: Verify

- DNS propagation: 5 minutes - 24 hours
- Vercel auto-configures SSL certificate
- Check status in Vercel dashboard
- When green ✓: Your domain is live!

---

## 🔧 Environment Variables

After deployment, update backend URL if needed:

1. Vercel Dashboard → Your Project → Settings → Environment Variables
2. Edit `REACT_APP_BACKEND_URL`
3. Change to your production backend (when ready)
4. Redeploy for changes to take effect

---

## 📱 What You'll Get

**Your app will be live at:**
- Vercel URL: `your-project.vercel.app`
- Custom domain: `thebeat515.com` (after DNS setup)
- SSL: Automatic HTTPS
- CDN: Global fast delivery

**Features:**
- Auto-deploy on every GitHub push
- Preview deployments for branches
- Analytics included
- 100GB bandwidth free
- No credit card required

---

## ✅ Checklist

- [ ] Sign up at vercel.com
- [ ] Import GitHub repository
- [ ] Configure build settings
- [ ] Add environment variable
- [ ] Deploy (first deployment)
- [ ] Add custom domain in Vercel
- [ ] Update DNS records at registrar
- [ ] Wait for DNS propagation
- [ ] Test your custom domain
- [ ] Done! 🎉

---

## 🆘 Troubleshooting

**Build fails?**
- Check build logs in Vercel
- Ensure `frontend/package.json` exists
- Verify `yarn install` works locally

**Domain not working?**
- Wait 24 hours for DNS propagation
- Verify DNS records match Vercel's requirements
- Check domain status in Vercel dashboard

**Backend not connecting?**
- Check `REACT_APP_BACKEND_URL` is set
- Verify backend allows CORS from your domain
- Test backend URL directly

---

## 📞 Need Help?

- Vercel Docs: https://vercel.com/docs
- Expo Docs: https://docs.expo.dev
- Or ask me for specific issues!
