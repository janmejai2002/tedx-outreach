# Render Keep-Alive Setup Guide

## 🎯 Problem
Render's free tier spins down after 15 minutes of inactivity, causing 50-second delays on the first request.

## ✅ Solutions Already Implemented

### 1. **GitHub Actions Keep-Alive** (24/7 Uptime)
**Location**: `.github/workflows/keep_alive.yml`

**What it does**: Automatically pings your backend every 14 minutes, preventing it from sleeping.

**Status**: ⚠️ **NEEDS TO BE ENABLED**

#### How to Enable:
1. Go to your GitHub repository: https://github.com/janmejai2002/tedx-outreach
2. Click **"Actions"** tab
3. If you see a message about workflows being disabled:
   - Click **"I understand my workflows, go ahead and enable them"**
4. Find the workflow **"Keep Backend Awake"**
5. Click on it
6. Click **"Enable workflow"** if needed
7. Click **"Run workflow"** → **"Run workflow"** to test it

**Result**: Your backend will stay awake 24/7! 🚀

---

### 2. **Frontend Keep-Alive Pinger** (When App is Open)
**Location**: `frontend/src/App.jsx`

**What it does**: Pings the backend every 10 minutes while someone has the app open.

**Status**: ✅ **ALREADY ACTIVE**

This works automatically when users access the app.

---

## 🔧 Alternative: Upgrade Render Plan

If you want guaranteed uptime without workarounds:

1. Go to https://dashboard.render.com/
2. Select your backend service
3. Click **"Upgrade"**
4. Choose **"Starter"** plan ($7/month)
   - ✅ No spin-down
   - ✅ Faster performance
   - ✅ More resources

---

## 📊 Current Setup Summary

| Method | Frequency | Coverage | Cost | Status |
|--------|-----------|----------|------|--------|
| GitHub Actions | Every 14 min | 24/7 | Free | ⚠️ Needs enabling |
| Frontend Pinger | Every 10 min | When app open | Free | ✅ Active |
| Render Upgrade | N/A | 24/7 | $7/mo | Optional |

---

## ✅ Recommended Action

**Enable GitHub Actions** (takes 2 minutes):
1. Visit: https://github.com/janmejai2002/tedx-outreach/actions
2. Enable workflows
3. Run "Keep Backend Awake" manually once to test
4. Done! Your backend will never sleep again 🎉

---

## 🧪 How to Verify It's Working

After enabling GitHub Actions:

1. Wait 15 minutes
2. Go to https://tedx-outreach.vercel.app
3. Should load **instantly** (no 50-second delay)
4. Check GitHub Actions tab - should show successful runs every 14 minutes

---

## 🐛 Troubleshooting

**If backend still spins down:**
- Check GitHub Actions tab for failed runs
- Verify the workflow is enabled
- Check Render logs for errors
- Ensure the healthz endpoint is working: https://tedx-outreach.onrender.com/healthz

**If you see 502 errors:**
- Backend might be restarting
- Wait 30 seconds and try again
- Check Render dashboard for deployment status
