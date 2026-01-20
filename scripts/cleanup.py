import os
import shutil

FILES_TO_REMOVE = [
    "backend/admin_endpoints.py",
    "backend/assignment_endpoints_code.py",
    "backend/tedx.db",
    "backend/vercel.json",
    "backend/migrate_db.py",  # Old migration script, likely superseded
    "backend/migrate_remote.py" # Old migration script
]

DIRS_TO_CREATE = [
    "docs",
    "scripts",
    "tests",
    "backend/migrations"
]

FILES_TO_MOVE = {
    "process_markdown.py": "scripts/process_markdown.py",
    "test_login.py": "scripts/test_login.py"
}

def cleanup():
    print("🧹 Starting Project Cleanup...")
    
    # 1. Create Directories
    for d in DIRS_TO_CREATE:
        if not os.path.exists(d):
            os.makedirs(d)
            print(f"✅ Created directory: {d}")
    
    # 2. Remove Unused Files
    for file_path in FILES_TO_REMOVE:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                print(f"🗑️  Removed: {file_path}")
            except Exception as e:
                print(f"❌ Failed to remove {file_path}: {e}")
        else:
            print(f"ℹ️  File not found (already gone): {file_path}")

    # 3. Move Files (if they exist in root)
    for src, dest in FILES_TO_MOVE.items():
        if os.path.exists(src):
            try:
                shutil.move(src, dest)
                print(f"📦 Moved: {src} -> {dest}")
            except Exception as e:
                print(f"❌ Failed to move {src}: {e}")

    print("\n✨ Cleanup Complete!")

if __name__ == "__main__":
    cleanup()
