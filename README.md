# TEDxXLRI Outreach Platform

A comprehensive speaker outreach and relationship management dashboard for TEDxXLRI. This platform streamlines the process of scouting, contacting, and managing speakers, sponsors, and creative assets.

## 🚀 Features

- **Speaker Management**: Drag-and-drop Kanban board for speaker lifecycle (Scouted -> Locked).
- **Gamification**: XP tracking, streaks, and leaderboards to motivate the outreach team.
- **Admin Panel**: Role management, system backups, and bulk operations.
- **Creative Requests**: Integration between PR and Design teams.
- **Sponsor Management**: CRM-like tracking for sponsorship leads.
- **AI Integration**: (In Progress) Email drafting and intelligent lead ingestion.

## 🛠️ Tech Stack

- **Frontend**: React, Tailwind CSS, Framer Motion, Lucide Icons
- **Backend**: FastAPI (Python), SQLModel, PostgreSQL/SQLite
- **Infrastructure**: Render.com (Deployment)

## 🏗️ Setup & Installation

### Prerequisites
- Python 3.9+
- Node.js 18+

### 1. Clone the repository
```bash
git clone https://github.com/janmejai2002/tedx-outreach.git
cd tedx_outreach
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

## 🏃 Running Locally

### Start Backend
```bash
cd backend
python -m uvicorn main:app --reload
```
API will be available at `http://localhost:8000`.

### Start Frontend
```bash
cd frontend
npm run dev
```
UI will be available at `http://localhost:5173`.

## 📁 Project Structure

```
tedx_outreach/
├── backend/
│   ├── routers/        # API route handlers (Auth, Speakers, Admin, etc.)
│   ├── database.py     # DB Connection
│   ├── models.py       # SQLModel definitions
│   └── main.py         # Entry point
├── frontend/
│   ├── src/
│   │   ├── components/ # React components (Board, AdminPanel, etc.)
│   │   ├── api.js      # Axios API wrapper
│   │   └── App.jsx     # Main app wrapper
└── docs/               # Component documentation & guides
```

## 🔐 Environment Variables

Create a `.env` file in `backend/` based on `.env.example`:

```ini
DATABASE_URL=sqlite:///./tedx.db
JWT_SECRET=your_secret_key
PERPLEXITY_API_KEY=optional_ai_key
```

## 🤝 Contribution

1. Create a feature branch (`git checkout -b feature/new-feature`)
2. Commit your changes.
3. Push to the branch.
4. Open a Pull Request.

---
**Maintained by TEDxXLRI Tech Team**
