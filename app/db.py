import os
import sqlite3
from datetime import datetime
from flask import g

DATABASE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "instance", "blog.db")


def get_db():
    db = getattr(g, "_database", None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db


def close_db(exception=None):
    db = getattr(g, "_database", None)
    if db is not None:
        db.close()


def init_db(app):
    with app.app_context():
        os.makedirs(os.path.dirname(DATABASE), exist_ok=True)
        db = get_db()
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                slug TEXT NOT NULL UNIQUE,
                content TEXT NOT NULL,
                tags TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL
            );
            """
        )
        db.commit()


def slugify(text):
    import re

    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_-]+", "-", slug)
    slug = slug.strip("-")
    return slug or "untitled"


def create_post(title, content, tags=""):
    db = get_db()
    slug = slugify(title)
    base = slug
    i = 2
    while db.execute("SELECT id FROM posts WHERE slug = ?", (slug,)).fetchone():
        slug = f"{base}-{i}"
        i += 1
    cur = db.execute(
        "INSERT INTO posts (title, slug, content, tags) VALUES (?, ?, ?, ?)",
        (title, slug, content, tags),
    )
    db.commit()
    return cur.lastrowid


def update_post(post_id, title, content, tags):
    db = get_db()
    db.execute(
        "UPDATE posts SET title=?, content=?, tags=?, updated_at=? WHERE id=?",
        (title, content, tags, datetime.utcnow().isoformat(sep=" "), post_id),
    )
    db.commit()


def delete_post(post_id):
    db = get_db()
    db.execute("DELETE FROM posts WHERE id = ?", (post_id,))
    db.commit()


def get_post(slug):
    db = get_db()
    return db.execute("SELECT * FROM posts WHERE slug = ?", (slug,)).fetchone()


def get_post_by_id(post_id):
    db = get_db()
    return db.execute("SELECT * FROM posts WHERE id = ?", (post_id,)).fetchone()


def get_all_posts():
    db = get_db()
    return db.execute("SELECT * FROM posts ORDER BY created_at DESC").fetchall()


def search_posts(query):
    db = get_db()
    like = f"%{query}%"
    return db.execute(
        "SELECT * FROM posts WHERE title LIKE ? OR content LIKE ? OR tags LIKE ? "
        "ORDER BY created_at DESC",
        (like, like, like),
    ).fetchall()


def get_all_tags():
    db = get_db()
    rows = db.execute("SELECT tags FROM posts").fetchall()
    tags = {}
    for row in rows:
        for tag in (row["tags"] or "").split(","):
            tag = tag.strip()
            if tag:
                tags[tag] = tags.get(tag, 0) + 1
    return tags


def get_posts_by_tag(tag):
    db = get_db()
    return db.execute(
        "SELECT * FROM posts WHERE tags LIKE ? ORDER BY created_at DESC",
        (f"%{tag}%",),
    ).fetchall()
