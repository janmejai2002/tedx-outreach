# TEDxXLRI Outreach Platform 🚀

A high-performance, AI-powered outreach terminal designed for **TEDxXLRI 2026: Blurring Lines**. This platform streamlines speaker scouting, sponsor relations, and creative asset management with integrated gamification and dark-mode aesthetics.

## ✨ Key Features

- **Kanban Board**: Multi-stage workflow for speaker outreach (Scouted → Researched → Email Added → etc.).
- **Ghostwriter AI**: Generates world-class, personalized email invitations using Perplexity AI (Sonar).
- **AI Ingestion**: Bulk parse raw speaker notes into structured data automatically.
- **Sponsor Hub**: Manage partnership tiers and generate Strategic Partnership Kits.
- **Gamification**: Experience points (XP), streaks, and daily quests to drive team engagement.
- **Admin Terminal**: Full control over users, database backups, and sprint deadlines.

## 🛠️ Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend**: FastAPI (Python), SQLModel (SQLAlchemy + Pydantic), SQLite/PostgreSQL.
- **AI**: Perplexity AI API (Sonar Model).
- **Icons**: Lucide React.
- **Animations**: Framer Motion & Canvas Confetti.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Python (3.9+)
- Perplexity AI API Key

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/janmejai2002/tedx-outreach.git
   cd tedx-outreach
   ```

2. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Backend Setup**:
   ```bash
   cd ../backend
   pip install -r requirements.txt
   # Create a .env file with PERPLEXITY_API_KEY
   python main.py
   ```

## 📁 Project Structure

```text
├── backend/            # FastAPI Server & Database
│   ├── main.py         # Main API Endpoints
│   ├── models.py       # SQLModel Definitions
│   └── database.py     # Engine & Session Logic
├── frontend/           # Vite + React Application
│   ├── src/
│   │   ├── components/ # UI Modules
│   │   ├── api.js      # Axios Client
│   │   └── App.jsx     # Main Logic & Routing
├── scripts/            # Utility & Migration Scripts
└── docs/               # Advanced Guides & Documentation
```

## 🔐 Security

- **JWT Authentication**: Secure login using roll numbers/first names.
- **Environment Management**: sensitive keys stored in `.env` (ensure this is not tracked in git).

## 📄 License

Internal tool for TEDxXLRI. All rights reserved.
