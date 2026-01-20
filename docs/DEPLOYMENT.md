# Deployment Guide

## ☁️ Deployment on Render.com

This project is configured for easy deployment on Render.

### Backend Deployment
1. **Create Web Service**: Connect your GitHub repo.
2. **Root Directory**: `backend`
3. **Build Command**: `pip install -r requirements.txt`
4. **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 10000`
5. **Environment Variables**:
   - `PYTHON_VERSION`: `3.9.0`
   - `DATABASE_URL`: (Internal Connection String provided by Render PostgreSQL)
   - `JWT_SECRET`: (Generate a secure random string)
   - `PERPLEXITY_API_KEY`: (Optional)

### Frontend Deployment
1. **Create Static Site**: Connect GitHub repo.
2. **Root Directory**: `frontend`
3. **Build Command**: `npm install && npm run build`
4. **Publish Directory**: `dist`
5. **Environment Variables**:
   - `VITE_API_URL`: `https://your-backend-service-name.onrender.com`

---

## 🐋 Docker Deployment (Optional)

A `Dockerfile` can be added for containerized deployment.

**Backend Dockerfile:**
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Frontend Dockerfile:**
```dockerfile
# Build Stage
FROM node:18 as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Serve Stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```
