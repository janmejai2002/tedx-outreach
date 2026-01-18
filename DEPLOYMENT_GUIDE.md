# How to Host TEDx Outreach for Free

## 1. Database (PostgreSQL) - Neon.tech
Since this app uses a database, we need a persistent place to store data.
1. Go to **[Neon.tech](https://neon.tech)** and Sign Up (Free Tier).
2. Create a new Project (e.g., `tedx-outreach`).
3. Copy the **Connection String** (it starts with `postgres://...`).
   * *Keep this secret!*

## 2. Backend (FastAPI) - Render.com
1. Push your code to **GitHub**.
   * Make sure `backend/` and `frontend/` are in the repo.
2. Go to **[Render.com](https://render.com)** and Sign Up.
3. Click **New +** -> **Web Service**.
4. Connect your GitHub repo.
5. Settings:
   * **Root Directory**: `backend`
   * **Runtime**: `Python 3`
   * **Build Command**: `pip install -r requirements.txt`
   * **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. **Environment Variables** (Add these):
   * `DATABASE_URL`: Paste the Neon connection string here.
   * `PERPLEXITY_API_KEY`: Paste your Perplexity key here.
   * `PYTHON_VERSION`: `3.9.0` (Optional, Render defaults to latest usually)
7. Click **Create Web Service**. Wait for it to deploy.
8. Copy the **Service URL** (e.g., `https://tedx-backend.onrender.com`).

## 3. Frontend (React) - Vercel
1. Go to **[Vercel.com](https://vercel.com)** and Sign Up.
2. Click **Add New** -> **Project**.
3. Import the same GitHub repo.
4. Settings:
   * **Root Directory**: `frontend`
   * **Framework Preset**: `Vite`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
5. **Environment Variables**:
   * You need to tell the frontend where the backend lives.
   * Go to your code: `frontend/src/api.js`.
   * **Wait!** Before deploying, we need to make the API URL configurable. 
   
   *(I have updated `api.js` to look for `import.meta.env.VITE_API_URL`. You need to set this in Vercel)*
   
   * In Vercel Env Vars:
     * `VITE_API_URL`: Paste your Render Backend URL (e.g., `https://tedx-backend.onrender.com`). *No trailing slash.*
6. Click **Deploy**.

## 4. Final Polish
* Your app is now live!
* **Note**: Render's free tier "sleeps" after 15 mins of inactivity. The first request might take 30-50 seconds to wake up. This is normal for free hosting.
* **Why Neon?**: It doesn't sleep in the same way and pairs perfectly with Vercel/Render.
