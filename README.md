# My Thoughts ✦

A refined, single-page personal blog built with **Flask**, **Markdown**, and **SQLite**.
Content-first typography meets a genuinely alive interface — custom cursor, aurora
spotlight, ambient particles, and a suite of reading & engagement features.

> Inspired by the design philosophies of Bill Gates (warmth, content-first),
> Sam Altman (restraint, minimalism), and Mark Zuckerberg (speed, simplicity).

---

## ✨ Features

### Reading experience
- **Single-page combined layout** — hero, about, and all posts in one continuous scroll
- **Auto table of contents** — sticky sidebar with scrollspy (appears on posts with headings)
- **Reading time estimates** on every post and card
- **Reading progress bar** — gradient, glowing, tracks scroll
- **Focus mode** — dims everything except the article
- **Font-size control** (A- / A+) — persists per reader
- **Ambient focus sound** — WebAudio-generated brown noise, no audio files
- **Reading list / bookmarks** — save posts for later (localStorage)
- **Posts-read progress** — "2/6 posts read" gamification ring

### Engagement
- **Comments** — Giscus (GitHub-backed, Markdown, reactions) with built-in fallback
- **Reactions** — ❤️ Love / 👍 Helpful / 💡 Insightful on each post
- **Newsletter** — real subscriber capture (SQLite backend)
- **"People reading now"** — live ambient counter
- **Social-proof toasts** — "Alex from Chennai just subscribed"
- **Text-selection quote share** — select any text → share to X with the quote

### Alive interface
- **Custom dual-layer cursor** — precise dot + trailing glow ring (mix-blend-mode)
- **Aurora spotlight** — warm + teal glows follow the cursor
- **Ambient particles** — dust motes drifting upward
- **3D tilt cards** — real perspective parallax on hover
- **Magnetic buttons** — elements lean toward the cursor
- **Typewriter hero** — tagline types itself on load
- **Live presence widget** — author's local time + rotating status

### Power-user
- **Command palette** (Ctrl/Cmd+K) — fuzzy-search posts, tags, actions
- **Keyboard shortcuts** — `j/k` navigate, `/` search, `t` theme, `?` help, `f` focus
- **3-way theme switcher** — Light / Auto (time of day) / Dark

### Sharing & growth
- **Dynamic OG preview images** — branded 1200×630 card per post (auto-generated)
- **Share buttons** — X, LinkedIn, WhatsApp, copy-link, native share sheet
- **RSS feed** at `/feed.xml` (auto-discoverable)
- **PWA install** — add to home screen
- **Branded favicon** + web manifest

### Content
- **Markdown** with syntax highlighting, tables, fenced code
- **Tags** — weighted cloud page at `/tags`, per-tag pages
- **Search** — full-text across titles, content, tags
- **Related posts** — tag-overlap based
- **Admin panel** — create/edit/delete posts, moderate comments

---

## 🚀 Quick start

```bash
git clone https://github.com/Harishwaran18/my-thoughts.git
cd my-thoughts
pip install -r requirements.txt
python run.py
```

Then open **http://localhost:5000**.

The SQLite database (`instance/blog.db`) is auto-created and seeded with
sample posts on first run.

### Admin access

- URL: `http://localhost:5000/login`
- Username: `admin`
- Password: `changeme`

> ⚠️ **Change these in `app/routes.py` before going public.**

---

## ⚙️ Configuration

All settings live at the top of **`app/routes.py`**. See `.env.example` for a
full reference. The important ones:

| Setting | Default | What it does |
|---------|---------|--------------|
| `SITE_AUTHOR` | `Harishwaran` | Your name (hero, footer, bio, OG images) |
| `SITE_TAGLINE` | _..._ | Hero subtitle + meta description |
| `SITE_URL` | _host URL_ | Absolute URLs for OG/RSS (set to your domain) |
| `ADMIN_USERNAME` | `admin` | Admin login |
| `ADMIN_PASSWORD` | `changeme` | Admin login (**change this!**) |
| `GISCUS_ENABLED` | `True` | Use GitHub-backed comments (see below) |

---

## 💬 Enabling comments (Giscus)

Comments work out of the box via a built-in SQLite system (no setup needed).
To use **GitHub-backed Giscus comments** instead:

1. Enable Discussions on your repo: **Settings → General → Discussions ✓**
2. Install the giscus app: **https://github.com/apps/giscus**
3. Get your IDs from **https://giscus.io** (repo ID + category ID)
4. Set them in `app/routes.py`:
   ```python
   GISCUS_ENABLED = True
   GISCUS_REPO_ID = "your-repo-id"
   GISCUS_CATEGORY_ID = "your-category-id"
   ```

Set `GISCUS_ENABLED = False` to fall back to the built-in comments.

---

## 📁 Project structure

```
my-thoughts/
├── run.py                     # Entry point — `python run.py`
├── requirements.txt           # Python dependencies
├── .env.example               # Configuration reference
├── LICENSE                    # MIT
│
└── app/
    ├── __init__.py            # Package marker
    ├── routes.py              # All Flask routes + config + helpers
    ├── db.py                  # SQLite database layer (posts, comments, subscribers)
    ├── og.py                  # Dynamic Open Graph image generation (Pillow)
    │
    ├── static/
    │   ├── css/
    │   │   ├── style.css      # Complete theme (~2200 lines)
    │   │   └── pygments.css   # Code syntax highlighting
    │   ├── js/
    │   │   ├── theme.js       # 3-way theme switcher (light/auto/dark)
    │   │   ├── main.js        # Reading progress, scroll reveal, share, code copy
    │   │   ├── alive.js       # Custom cursor, aurora, particles, tilt, presence
    │   │   ├── interactions.js# Command palette, keyboard shortcuts, newsletter, bookmarks
    │   │   └── features.js    # Read-progress ring, quote share, time-remaining, social proof
    │   └── fonts/             # Newsreader + Inter (bundled for OG images)
    │
    └── templates/
        ├── base.html          # Layout: header, footer, meta, overlays
        ├── index.html         # Single-page combined view (hero + about + all posts)
        ├── post.html          # Standalone post: TOC, share, reactions, comments
        ├── about.html         # About page
        ├── tags.html          # Tag cloud page
        ├── tag.html           # Per-tag listing
        ├── search.html        # Search results
        ├── login.html         # Admin login
        ├── 404.html           # Not found
        └── admin/
            ├── list.html      # Post management dashboard
            └── edit.html      # Create/edit post (Markdown editor)
```

---

## ⌨️ Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Ctrl`/`Cmd` + `K` | Command palette |
| `/` | Focus search |
| `t` | Cycle theme (light → dark → auto) |
| `f` | Toggle focus mode |
| `j` / `k` | Next / previous post |
| `g` then `h` | Go home |
| `g` then `a` | Go to about |
| `?` | Show shortcuts help |

---

## 🛠️ Tech stack

- **Flask 3** — web framework
- **SQLite** — database (no external DB needed)
- **Python-Markdown** — rendering + extensions (toc, codehilite, tables, fenced_code)
- **Pygments** — syntax highlighting
- **Pillow** — dynamic OG image generation
- **Vanilla JS** — no build step, no frameworks, ~1500 lines total
- **Google Fonts** — Newsreader (serif) + Inter (sans) + JetBrains Mono

---

## 📜 Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/` | GET | Single-page combined blog |
| `/post/<slug>` | GET | Standalone post |
| `/post/<slug>/comment` | POST | Add a comment (built-in system) |
| `/tag/<tag>` | GET | Posts by tag |
| `/tags` | GET | Tag cloud page |
| `/search` | GET | Search posts |
| `/about` | GET | About page |
| `/feed.xml` | GET | RSS feed |
| `/og/<slug>.png` | GET | Dynamic OG image per post |
| `/og/default.png` | GET | Default OG image |
| `/favicon.ico` | GET | Branded favicon |
| `/manifest.json` | GET | PWA manifest |
| `/subscribe` | POST | Newsletter subscription |
| `/api/reading-now` | GET | Live reader count (JSON) |
| `/login` | GET/POST | Admin login |
| `/admin` | GET | Admin dashboard (login required) |
| `/admin/new` | GET/POST | New post (login required) |
| `/admin/edit/<id>` | GET/POST | Edit post (login required) |
| `/admin/delete/<id>` | POST | Delete post (login required) |
| `/admin/comment/<id>/delete` | POST | Delete comment (login required) |

---

## 📄 License

MIT — see [LICENSE](LICENSE). Free to use, modify, and share.

---

_Built with Flask, Markdown, and SQLite — simple tools, kept intentionally small._

