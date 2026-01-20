# Admin Guide & Troubleshooting

## 🔑 Authentication
The platform uses JWT-based authentication.
- **Roll Number**: Used as the primary User ID (e.g., `B21001`).
- **Admin Access**: Users with `is_admin=True` can access the Admin Panel.
- **Initial Setup**: The first time the backend runs, it checks for authorized users. If none exist, it seeds the DB with the users defined in `backend/migrate_users.py` (or `migrations/migrate_users.py`).

## 🛠️ Admin Panel Actions
Admins can perform the following actions via the UI:
1. **Manage Users**: 
   - Add new authorized users by Roll Number.
   - Promote/Demote users to Admin.
   - Remove users.
2. **Bulk Operations**:
   - **Purge Invalid Data**: Removes entries with `NaN` names or corrupted strings.
   - **Backup/Restore**: Download a full JSON dump of the database and restore it if needed.
3. **Logs**: View the `Audit Log` for all sensitive actions (Assignments, Deletions, Status Changes).

## ⚠️ Troubleshooting

### "Validation Error" / 422 Unprocessable Entity
- Check if `backend/models.py` matches the request payload.
- Ensure `email` fields are valid email formats.
- Ensure `roll_number` is provided for login.

### "Database Locked" (SQLite)
- If using SQLite, high concurrency writes might lock the file.
- **Fix**: Restart the backend service. We recommend migrating to PostgreSQL for production.

### "CORS Error"
- Ensure the frontend URL is listed in `backend/main.py` -> `origins` list.
- Check if your browser is blocking mixed content (HTTP vs HTTPS).

### "API Connection Failed"
- Verify the backend is running (`python -m uvicorn main:app`).
- Check `VITE_API_URL` in `frontend/.env` (or `.env.local`).

## 🔄 Database Migrations
We use a custom `auto_migrate` function in `backend/main.py`.
- **Adding Columns**: Simply adding a field to `models.py` and `auto_migrate()` will attempt to add the column on server restart.
- **Renaming Columns**: ⚠️ Not supported automatically. You must manually execute SQL or use Alembic (future upgrade).

## 📦 Backups
Regularly download the JSON backup from the Admin Panel -> "Backup System".
Store these securely.
