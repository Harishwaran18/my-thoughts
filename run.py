"""Entry point for the My Thoughts blog.

Run with:  python run.py
Then open: http://localhost:5000

The database (instance/blog.db) is auto-created and seeded with sample
posts on first run. See README.md for full setup and configuration.
"""
from app.routes import app, ADMIN_USERNAME, ADMIN_PASSWORD


if __name__ == "__main__":
    print(f"\n  My Thoughts is running -> http://localhost:5000")
    print(f"  Admin login: {ADMIN_USERNAME} / {ADMIN_PASSWORD}\n")
    app.run(host="0.0.0.0", port=5000, debug=True)
