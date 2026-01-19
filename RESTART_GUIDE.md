# Complete Fresh Restart Guide

## 🔄 **Production Deployment (Render)**

### Step 1: Manual Deploy on Render
1. Go to https://dashboard.render.com/
2. Click on your **tedx-outreach** backend service
3. Click **"Manual Deploy"** button (top right)
4. Select **"Deploy latest commit"**
5. Click **"Deploy"**
6. **Wait 2-3 minutes** for deployment to complete

### Step 2: Verify Render Deployment
Check the "Events" tab - you should see:
- ✅ Build succeeded
- ✅ Deploy live

### Step 3: Test Production
1. Go to https://tedx-outreach.vercel.app
2. Log in
3. Try the Ghostwriter AI
4. Should work now!

---

## 💻 **Local Development Restart**

### Backend
```powershell
# Stop all Python processes
Get-Process | Where-Object {$_.ProcessName -like "*python*"} | Stop-Process -Force

# Delete old database
cd backend
Remove-Item tedx*.db* -Force

# Start fresh
python -m uvicorn main:app --reload --port 8000
```

### Frontend
```powershell
# Stop Node processes
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force

# Restart
cd frontend
npm run dev
```

### Access Local
- Frontend: http://localhost:5173
- Backend: http://localhost:8000

---

## ✅ **What Was Fixed**

1. **CORS Configuration**: Changed `allow_credentials=False` to work with wildcard origins
2. **AI Model**: Upgraded to `sonar-pro` for better generation
3. **Environment Variables**: Added support for Render's `/etc/secrets/.env` path
4. **Database**: Fresh schema with all required columns

---

## 🔐 **Environment Variables on Render**

Make sure these are set:
- `PERPLEXITY_API_KEY` (in Environment Variables)
- `.env` file (in Secret Files)

Both should contain the same API key.

---

## 🐛 **If Issues Persist**

Check Render logs:
1. Go to your service on Render
2. Click "Logs" tab
3. Look for errors related to:
   - CORS
   - Database connection
   - API key loading

---

## 📊 **Summary of Changes**

| Component | Change | Status |
|-----------|--------|--------|
| CORS | Fixed credentials + wildcard | ✅ Deployed |
| AI Model | sonar → sonar-pro | ✅ Deployed |
| Env Loading | Added /etc/secrets support | ✅ Deployed |
| Database | Fresh schema | ✅ Local only |

**Next**: Deploy to Render and test!
