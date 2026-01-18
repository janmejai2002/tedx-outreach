# TEDx Outreach: Advanced AI Roadmap (v3.0)

## 1. Vision & Strategy
To transform the TEDx Outreach platform into an **Autonomous AI Recruiting Agent** that identifies, researches, and secures top-tier speakers with minimal manual intervention.

---

## 2. Completed Phases ✅

### Phase 1: Foundation & Workflow
- **Kanban Core**: Drag-and-drop board with 8 outreach stages.
- **Data Model**: SQLModel/FastAPI backend with local SQLite and Cloud PostgreSQL (Neon).
- **Security**: Moved API keys to backend `.env`.

### Phase 2: User Experience & Efficiency
- **Bulk Operations**: Multi-select cards for batch status updates.
- **Focus Mode**: Zen-like scouting interface for 5x faster data entry.
- **Onboarding**: Interactive tour and "Help Center" for team training.
- **Quick Controls**: Instant status changes directly from Kanban cards.

### Phase 3: Gamification & Engagement
- **XP System**: Dynamic reward engine for research and outreach.
- **Leaderboard**: Real-time ranking of top scouts and closers.
- **Streaks & Badges**: Persistence tracking with visual trophies.
- **Bounties**: 2x XP multipliers for "High Value" speaker profiles.

### Phase 4: Infrastructure & Cloud
- **Cloud Database**: Neon (PostgreSQL) integrated and seeded.
- **Backend Hosting**: Render.com with "Keep-Alive" health checks.
- **Frontend Hosting**: Vercel for high-speed delivery.
- **Centralized Logs**: Audit trail tracking all user actions.

---

## 3. Active Phase: Security & Intelligence (⚡ Current)

### Objective: Transform from "App" to "Enterprise Tool".

#### A. Persistent Authentication (🔜 Next)
- [ ] **JWT Auth**: Move from `localStorage` names to verified session tokens.
- [ ] **Admin Console**: Janmejai (Admin) can view global stats and flag bounties.
- [ ] **Team Scopes**: Restrict certain actions based on role (optional).

#### B. Intellectual Property & AI (🔜 Next)
- [x] **Researcher Agent**: Autonomous data enrichment (Backend Ready).
- [ ] **Domain Scraper**: Automatically extract "Blurring Line Angle" from speaker websites.
- [ ] **Ghostwriter 2.0**: Multi-language support and "Tone Tuning" for emails.

#### C. Analytics & Reporting (Planned)
- [ ] **Conversion Funnel**: Visualize drop-off rates from "Email Added" to "Locked".
- [ ] **Export/Backup**: Automated daily CSV exports to Google Drive.

---

## 4. Technical Debt
- [ ] **Error Boundaries**: Better frontend handling for API failures.
- [ ] **Unit Tests**: Critical path testing for the Ghostwriter logic.