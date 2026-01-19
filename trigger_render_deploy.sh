#!/bin/bash

# Render Manual Redeploy Trigger
# This script triggers a manual deployment on Render

echo "🚀 Triggering Render Deployment..."
echo ""
echo "Steps to manually redeploy on Render:"
echo "1. Go to https://dashboard.render.com/"
echo "2. Click on your 'tedx-outreach' backend service"
echo "3. Click the 'Manual Deploy' button in the top right"
echo "4. Select 'Deploy latest commit' from the dropdown"
echo "5. Click 'Deploy'"
echo ""
echo "⏳ Deployment typically takes 2-3 minutes"
echo "✅ Once complete, test the Ghostwriter AI on production"
echo ""
echo "Current backend status check:"
curl -I https://tedx-outreach.onrender.com/healthz

echo ""
echo "If you see a 200 OK response above, the backend is running."
echo "After manual deploy, wait 3 minutes and try the Ghostwriter again."
