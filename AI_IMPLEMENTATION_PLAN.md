# TEDx Outreach: Advanced AI Roadmap (v2.0)

## 1. Vision & Strategy
To transform the TEDx Outreach platform into an **Autonomous AI Recruiting Agent** that identifies, researches, and secures top-tier speakers with minimal manual intervention.

---

## 2. Phase 1: Foundation (Completed ✅)
- **Workflow**: Kanban board with drag-and-drop mechanics.
- **Authentication**: Secured access via XLRI Roll Numbers.
- **AI Core**: Ghostwriter (Perplexity) generates personalized HTML email drafts.
- **UI/UX**: Premium dark-mode dashboard with real-time updates.

## 3. Phase 2: Engagement & Gamification (Active ⚡)
**Objective**: Boost team productivity through interactive and rewarding mechanics.

- **XP & Badge System**: Points for key actions; 5 badge levels. (✅ Done)
- **Confetti Rewards**: Visual celebration for "LOCKED" status. (✅ Done)
- **Daily Quests**: Short-term goals (e.g., "Scout 3 speakers"). (✅ Done)
- **Achievements**: Unlock permanent trophies for milestones. (🔜 Next)
- **Streaks**: Bonus XP for consecutive days of activity. (🔜 Next)

## 4. Phase 3: UX Polish & Workflow Efficiency (NEW 🛠️)
**Objective**: Reduce clicks and improve cognitive ease.

- **Quick Actions on Cards**: Change status directly from the board without opening modals. (✅ Done)
- **Enhanced DND Feedback**: Drop zones, column highlighting, and smooth drag overlays. (✅ Done)
- **Bulk Operations**: Multi-select cards to assign SPOCs or update statuses. (✅ Done)
- **Priority Sorting**: Auto-sort columns by Tier 1 -> Tier 3. (✅ Done)


### Immediate Execution:
1. [ ] **Quick Status Dropdown**: Add hover-triggered status selector to `SpeakerCard`.
2.- [x] **Enhance Drag-and-Drop**
  - [x] Add `onDragEnd` logic to update backend status
  - [x] Add column highlighting (`isOver` state)
  - [x] Add "Quick Status Change" dropdown to Speaker Cards
- [x] **Add Gamification Elements**
  - [x] **XP System**: Award XP for actions (Scout: +10, Email: +20, Lock: +100)
  - [x] **Leaderboard**: Show top 3 users in header
  - [x] **Achievements/Quests**: Side panel or overlay for "Daily Quests"
  - [x] **Activity Feed**: Visible log of recent actions

### Technical Debt:
- [ ] **Persistent Auth**: Move from `localStorage` to JWT-based session management.
- [x] **Mobile Optimization**: Refine Kanban layout for tablet/mobile use.
- [x] **Activity Log**: Persistent DB table to track "Who moved what and when". (✅ Done)
### Phase 4: Engagement & Onboarding (New Request)
1. - [x] **Interactive Onboarding/Guide**
   - [x] **"How-To" Modal**: A central help hub accessible via a '?' button.
     - [x] **Tools Guide**: Instructions for Lusha, Mr. E, and LinkedIn.
     - [x] **Workflow Guide**: Explaining what each column means.
   - [x] **Tour**: A step-by-step walkthrough for first-time users (using a custom overlay).

2. - [x] **"Focus Mode" (Scouting Interface)**
   - [x] **Zen View**: A dedicated page for rapid data entry.
     - [x] Left side: Streamlined "Add Speaker" form.
     - [x] Right side: "Just Added" card preview (to verify details immediately).
   - [x] **Keyboard Shortcuts**: Ctrl+Enter to save and start next.

3. **Gamification V2** (Completed ✅)
   - [x] **Streaks**: Track consecutive active days.
   - [x] **Badges**: Visual awards for milestones (e.g., "First 100 Scouts", "Closer").
   - [x] **Bounties**: Admin-flagged "High Value" speakers give 2x XP.

### Technical & Security:
- [x] **Secure API Keys**: Move Perplexity API key to backend `.env`.