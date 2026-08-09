import os
import sqlite3
from datetime import datetime
from flask import g

DATABASE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "instance", "blog.db")

SEED_POSTS = [
    (
        "Why I started writing in public",
        """# Why I started writing in public

I have kept notebooks for years. Private ones, full of half-thoughts and aborted sentences. They were useful to me, but they never made me a better writer, because nobody read them.

## The problem with private notes

When you write only for yourself, you tolerate a kind of sloppiness. Ideas stay fuzzy because nobody is going to push back.

- arguments go unfinished
- metaphors go untested
- assumptions go unquestioned

## What changes when someone might read

The moment you imagine a reader, your writing sharpens. You ask: *would this make sense to a stranger?* That question is the whole game.

> Clarity is kindness. Writing clearly is a way of respecting the reader's time.

## A few principles I am trying to follow

### Write small, ship often

A short post published beats a perfect essay in a drawer.

### Be specific

Generalities are easy and worthless. Specifics are hard and valuable.

### Say what you actually think

Politeness is overrated in writing. Honesty, delivered with care, is what people remember.

## What is next

I do not know where this blog goes. That is the point. I am going to write here when I have something to say, and stay quiet when I do not.""",
        "writing, thoughts, personal",
    ),
    (
        "On starting small",
        """There is a particular kind of overwhelm that comes from looking at the whole staircase when you only need to take the first step.

The trick I keep rediscovering: shrink the task until it feels almost embarrassingly small. Not "write a blog" but "write one sentence." Not "learn to code" but "open the editor."

Small things compound. That is the only kind of magic I have ever found to be real.""",
        "thoughts, motivation",
    ),
    (
        "The tools I use to think",
        """# The tools I use to think

People ask what tools I use. The honest answer is: not many, and not often the shiny ones.

## A plain notebook

Paper first, always. There is something about the slowness of handwriting that forces precision.

## A simple text editor

When it is time to turn notes into something, I want the editor to disappear. No formatting toolbars, no distractions.

## This blog

Writing in public is itself a tool. The pressure of a possible reader turns vague hunches into real arguments.

> The best tool is the one that gets out of your way.""",
        "tools, writing",
    ),
]


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
        # Migrate: add views column if missing (idempotent)
        cols = [r[1] for r in db.execute("PRAGMA table_info(posts)").fetchall()]
        if "views" not in cols:
            db.execute("ALTER TABLE posts ADD COLUMN views INTEGER DEFAULT 0")
        db.commit()
        # Seed sample posts only if the table is empty
        count = db.execute("SELECT COUNT(*) FROM posts").fetchone()[0]
        if count == 0:
            for title, content, tags in SEED_POSTS:
                create_post(title, content, tags)
            print("Seeded sample posts.")
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
    # Return sorted by count desc, then name
    return dict(sorted(tags.items(), key=lambda x: (-x[1], x[0])))


def get_posts_by_tag(tag):
    db = get_db()
    return db.execute(
        "SELECT * FROM posts WHERE tags LIKE ? ORDER BY created_at DESC",
        (f"%{tag}%",),
    ).fetchall()


def get_related_posts(post, limit=3):
    """Return posts sharing at least one tag with the given post, excluding it."""
    db = get_db()
    tags = [t.strip() for t in (post["tags"] or "").split(",") if t.strip()]
    if not tags:
        return []
    # Build a tag-share count for every other post, then sort by share desc then date
    others = db.execute(
        "SELECT * FROM posts WHERE id != ? ORDER BY created_at DESC",
        (post["id"],),
    ).fetchall()
    scored = []
    for other in others:
        other_tags = {t.strip() for t in (other["tags"] or "").split(",") if t.strip()}
        overlap = len(set(tags) & other_tags)
        if overlap:
            scored.append((overlap, other))
    scored.sort(key=lambda x: -x[0])
    return [p for _, p in scored[:limit]]


def get_recent_posts(exclude_id=None, limit=5):
    db = get_db()
    if exclude_id:
        return db.execute(
            "SELECT * FROM posts WHERE id != ? ORDER BY created_at DESC LIMIT ?",
            (exclude_id, limit),
        ).fetchall()
    return db.execute(
        "SELECT * FROM posts ORDER BY created_at DESC LIMIT ?", (limit,)
    ).fetchall()


def get_featured_post():
    """The featured post is simply the most recent one."""
    db = get_db()
    return db.execute(
        "SELECT * FROM posts ORDER BY created_at DESC LIMIT 1"
    ).fetchone()


def increment_views(slug):
    """Increment the view counter for a post. Silently ignores missing posts."""
    db = get_db()
    db.execute("UPDATE posts SET views = views + 1 WHERE slug = ?", (slug,))
    db.commit()


def total_views():
    db = get_db()
    row = db.execute("SELECT COALESCE(SUM(views), 0) AS s FROM posts").fetchone()
    return row["s"] if row else 0
