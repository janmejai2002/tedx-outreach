import requests
from fastapi.testclient import TestClient
import sys
import os

# Set up path to import main
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from main import app

print("Listing all registered routes:")
for route in app.routes:
    methods = ", ".join(route.methods) if hasattr(route, 'methods') else "N/A"
    print(f"[{methods}] {route.path}")
