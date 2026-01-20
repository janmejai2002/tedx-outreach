# API Reference

Base URL: `http://localhost:8000` (Local) or `https://[your-app].onrender.com` (Prod)

## Authentication

### `POST /login`
Login with Roll Number.
- **Body**: `{ "roll_number": "B25001" }`
- **Response**: `{ "access_token": "...", "isAdmin": true, ... }`

## Speakers

### `GET /speakers`
List all speakers.
- **Query Params**: `limit`, `offset`, `search`, `status`, `assigned_to`
- **Response**: `[ { "id": 1, "name": "...", "status": "SCOUTED", ... } ]`

### `POST /speakers`
Create a new speaker.
- **Body**: `Speaker` object
- **Response**: Created `Speaker` object

### `PATCH /speakers/{id}`
Update a speaker.
- **Body**: Partial `Speaker` object (e.g., `{ "status": "CONTACT_INITIATED" }`)
- **Note**: Moving past `SCOUTED` requires `email` or `phone` to be present.

## Gamification

### `GET /leaderboard`
(Coming Soon) - Currently derived on frontend.

### `PATCH /users/me/gamification`
Sync local streaks/XP.
- **Body**: `{ "streak": 5, "last_login_date": "..." }`

## Admin

### `GET /admin/users`
List authorized users.

### `POST /admin/users`
Authorize a new user.
- **Body**: `{ "roll_number": "...", "name": "...", "is_admin": false }`
