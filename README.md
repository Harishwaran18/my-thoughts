# my-thoughts

A simple, clean personal blog to share my thoughts. Built with Flask, Markdown, and SQLite.

## Features

- Write posts in Markdown (with syntax highlighting)
- Organize posts with tags
- Search posts by title, content, or tags
- Dark / light mode toggle
- Clean, modern, responsive design
- Admin panel to create, edit, and delete posts
- SQLite database (no external setup needed)

## Quick Start

```bash
pip install -r requirements.txt
python run.py
```

Then open http://localhost:5000 in your browser.

### Admin Login

- URL: http://localhost:5000/login
- Username: `admin`
- Password: `changeme`

> Change these credentials in `app/routes.py` before sharing the blog publicly.

## Project Structure

```
.
├── run.py                  # Entry point
├── requirements.txt        # Python dependencies
├── instance/blog.db        # SQLite database (auto-created)
└── app/
    ├── __init__.py
    ├── db.py               # Database helpers & models
    ├── routes.py           # Flask routes
    ├── static/css/         # Stylesheets
    ├── static/js/          # Theme toggle
    └── templates/          # HTML templates
```
