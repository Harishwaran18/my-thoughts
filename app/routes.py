import datetime
import io
import re
import secrets
from functools import wraps
from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    session,
    flash,
    abort,
    Response,
    jsonify,
)
import markdown
from PIL import Image, ImageDraw
from pygments.formatters import HtmlFormatter

from . import db
from . import og

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)
app.config["DATABASE"] = db.DATABASE

# Default admin credentials (change these!)
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "changeme"

# Author / site identity — edit to personalize
SITE_AUTHOR = "Harishwaran"
SITE_TAGLINE = "Thoughts on technology, learning, and the craft of building."
# Used for absolute canonical URLs in OG/Twitter meta tags.
# Falls back to the request host at runtime.
SITE_URL = "https://work-1-hbbrkzsvlizlzrim.prod-runtime.all-hands.dev"

# Giscus comments config. To enable GitHub-backed comments:
#   1. Go to your repo Settings > General > check "Discussions"
#   2. Visit https://giscus.io, enter Harishwaran18/my-thoughts
#   3. Copy the data-repo-id and data-category-id below
# Until then, the built-in comments system (SQLite) works automatically.
GISCUS_REPO = "Harishwaran18/my-thoughts"
GISCUS_REPO_ID = "R_kgDOTy-6PQ"      # already discovered — your repo's node ID
GISCUS_CATEGORY = "Announcements"
GISCUS_CATEGORY_ID = ""              # set this after enabling Discussions

db.init_db(app)
app.teardown_appcontext(db.close_db)

md = markdown.Markdown(
    extensions=["fenced_code", "codehilite", "tables", "toc", "nl2br", "sane_lists"]
)


def render_markdown(text):
    return md.reset().convert(text)


def extract_toc(text):
    """Return an HTML list of headings for the table of contents, or '' if none."""
    md.reset().convert(text)
    toc_html = md.toc or ""
    # The toc extension wraps in a <div class="toc">; we want just the list
    m = re.search(r"<ul>.*?</ul>", toc_html, re.S)
    return m.group(0) if m else ""


def format_date(date_str):
    if not date_str:
        return ""
    try:
        dt = date_str.split(".")[0]
        dt = datetime.datetime.fromisoformat(dt.replace("T", " "))
        return dt.strftime("%B %d, %Y")
    except Exception:
        return date_str[:10] if date_str else ""


def reading_time(text):
    """Estimate reading time in minutes from raw markdown text (~200 wpm)."""
    plain = re.sub(r"[#*`>\-\[\]()!]", " ", text)
    words = len(plain.split())
    minutes = max(1, round(words / 200))
    return minutes


def excerpt(text, length=180):
    """Clean excerpt from markdown content."""
    # Strip markdown markup, render, then strip tags
    rendered = md.reset().convert(text)
    plain = re.sub(r"<[^>]+>", "", rendered)
    plain = re.sub(r"\s+", " ", plain).strip()
    if len(plain) <= length:
        return plain
    return plain[:length].rsplit(" ", 1)[0] + "\u2026"


def site_base_url():
    """Best absolute base URL for the site (config or request host)."""
    if SITE_URL:
        return SITE_URL.rstrip("/")
    return request.host_url.rstrip("/")


@app.context_processor
def inject_globals():
    return {
        "all_tags": db.get_all_tags(),
        "format_date": format_date,
        "reading_time": reading_time,
        "excerpt": excerpt,
        "site_author": SITE_AUTHOR,
        "site_tagline": SITE_TAGLINE,
        "site_url": site_base_url(),
        "now_year": datetime.datetime.utcnow().year,
        "subscriber_count": db.subscriber_count(),
        "giscus_repo": GISCUS_REPO,
        "giscus_repo_id": GISCUS_REPO_ID,
        "giscus_category": GISCUS_CATEGORY,
        "giscus_category_id": GISCUS_CATEGORY_ID,
    }


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("logged_in"):
            flash("Please log in to access the admin panel.", "warning")
            return redirect(url_for("login"))
        return f(*args, **kwargs)

    return decorated


@app.template_filter("markdown")
def markdown_filter(text):
    return render_markdown(text)


@app.route("/")
def index():
    posts = db.get_all_posts()
    # Pre-render each post's markdown for inline full display on the combined page
    rendered_posts = []
    total_words = 0
    total_reads = 0
    for p in posts:
        rt = reading_time(p["content"])
        # crude word count from raw markdown
        words = len(re.sub(r"[#*`>\-\[\]()!]", " ", p["content"]).split())
        total_words += words
        total_reads += rt
        rendered_posts.append({
            "id": p["id"],
            "title": p["title"],
            "slug": p["slug"],
            "tags": p["tags"],
            "created_at": p["created_at"],
            "content": p["content"],
            "html": render_markdown(p["content"]),
            "read_time": rt,
            "excerpt": excerpt(p["content"], 140),
            "comment_count": db.comment_count(p["id"]),
        })
    # Build command palette index (posts + tags + actions)
    cmd_index = []
    for p in rendered_posts:
        cmd_index.append({"type": "post", "label": p["title"], "url": f"/post/{p['slug']}", "hint": "Post"})
    for tag, _ in db.get_all_tags().items():
        cmd_index.append({"type": "tag", "label": f"#{tag}", "url": f"/tag/{tag}", "hint": "Tag"})
    cmd_index.extend([
        {"type": "action", "label": "Go home", "url": "/", "hint": "Page"},
        {"type": "action", "label": "About", "url": "/about", "hint": "Page"},
        {"type": "action", "label": "Search posts", "url": "/search", "hint": "Page"},
        {"type": "action", "label": "Toggle dark mode", "url": "#theme", "hint": "Action"},
    ])
    return render_template(
        "index.html",
        posts=rendered_posts,
        total_words=total_words,
        total_reads=total_reads,
        tag_count=len(db.get_all_tags()),
        cmd_index=cmd_index,
        title="My Thoughts",
        description=SITE_TAGLINE,
    )


@app.route("/post/<slug>")
def post(slug):
    post = db.get_post(slug)
    if post is None:
        abort(404)
    related = db.get_related_posts(post, limit=3)
    toc = extract_toc(post["content"])
    comments = db.get_comments(post["id"])
    return render_template(
        "post.html",
        post=post,
        related=related,
        toc=toc,
        comments=comments,
        comment_count=len(comments),
        title=post["title"],
        description=excerpt(post["content"], 160),
        og_image_url=f"{site_base_url()}/og/{slug}.png",
    )


@app.route("/post/<slug>/comment", methods=["POST"])
def add_comment_route(slug):
    """Add a comment to a post."""
    post = db.get_post(slug)
    if post is None:
        return jsonify({"ok": False, "msg": "Post not found."}), 404
    author = (request.form.get("author") or "").strip()[:60] or "Anonymous"
    body = (request.form.get("body") or "").strip()
    if not body or len(body) > 2000:
        return jsonify({"ok": False, "msg": "Please write a comment (max 2000 chars)."}), 400
    # basic HTML-escape
    import html as _html
    author = _html.escape(author)
    body = _html.escape(body).replace("\n", "<br>")
    c = db.add_comment(post["id"], author, body)
    return jsonify({
        "ok": True,
        "comment": {
            "id": c["id"], "author": c["author"], "body": c["body"],
            "created_at": format_date(c["created_at"]),
        },
        "count": db.comment_count(post["id"]),
    })


@app.route("/admin/comment/<int:comment_id>/delete", methods=["POST"])
@login_required
def admin_delete_comment(comment_id):
    db.delete_comment(comment_id)
    flash("Comment deleted.", "success")
    return redirect(request.referrer or url_for("admin"))


@app.route("/og/<slug>.png")
def og_image(slug):
    """Dynamically generated Open Graph preview image for a post."""
    post = db.get_post(slug)
    if post is None:
        abort(404)
    png = og.generate_og_image(
        title=post["title"],
        author=SITE_AUTHOR,
        date_str=og.format_date_short(post["created_at"]),
        read_time=f"{reading_time(post['content'])} min read",
    )
    from flask import Response
    return Response(png, mimetype="image/png",
                    headers={"Cache-Control": "public, max-age=3600"})


@app.route("/og/default.png")
def og_default():
    """Default site-wide OG image for non-post pages (home, about, etc.)."""
    png = og.generate_og_image(
        title="My Thoughts",
        author=SITE_AUTHOR,
        date_str="",
        read_time="A personal blog",
    )
    from flask import Response
    return Response(png, mimetype="image/png",
                    headers={"Cache-Control": "public, max-age=3600"})


@app.route("/favicon.ico")
def favicon():
    """Tiny branded favicon (orange dot on warm bg)."""
    from flask import Response
    img = Image.new("RGB", (32, 32), (250, 249, 246))
    d = ImageDraw.Draw(img)
    d.ellipse([6, 6, 26, 26], fill=(180, 83, 9))
    buf = io.BytesIO()
    img.save(buf, format="ICO", sizes=[(32, 32)])
    return Response(buf.getvalue(), mimetype="image/x-icon",
                    headers={"Cache-Control": "public, max-age=86400"})


@app.route("/manifest.json")
def manifest():
    from flask import Response, jsonify
    return jsonify({
        "name": "My Thoughts",
        "short_name": "My Thoughts",
        "description": SITE_TAGLINE,
        "start_url": "/",
        "display": "standalone",
        "background_color": "#faf9f6",
        "theme_color": "#b45309",
        "icons": [
            {"src": f"{site_base_url()}/og/default.png",
             "sizes": "1200x630", "type": "image/png"}
        ],
    })


@app.route("/feed.xml")
def rss_feed():
    """RSS 2.0 feed of all posts."""
    posts = db.get_all_posts()
    base = site_base_url()
    items = []
    for p in posts[:20]:
        url = f"{base}/post/{p['slug']}"
        body = render_markdown(p["content"])
        # strip HTML for description
        desc = re.sub(r"<[^>]+>", "", body)[:300]
        items.append(f"""
    <item>
      <title>{escape_xml(p['title'])}</title>
      <link>{url}</link>
      <guid isPermaLink="true">{url}</guid>
      <description>{escape_xml(desc)}</description>
      <pubDate>{format_rfc822(p['created_at'])}</pubDate>
    </item>""")
    feed = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>My Thoughts</title>
    <link>{base}</link>
    <description>{escape_xml(SITE_TAGLINE)}</description>
    <language>en</language>
    <atom:link href="{base}/feed.xml" rel="self" type="application/rss+xml" />{''.join(items)}
  </channel>
</rss>"""
    return Response(feed, mimetype="application/rss+xml; charset=utf-8",
                    headers={"Cache-Control": "public, max-age=600"})


def escape_xml(text):
    if not text:
        return ""
    return (text.replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def format_rfc822(date_str):
    if not date_str:
        return ""
    try:
        dt = date_str.split(".")[0]
        dt = datetime.datetime.fromisoformat(dt.replace("T", " "))
        return dt.strftime("%a, %d %b %Y %H:%M:%S +0000")
    except Exception:
        return date_str


@app.route("/subscribe", methods=["POST"])
def subscribe():
    """Real newsletter subscription — stores email in SQLite."""
    import re as _re
    email = (request.form.get("email") or "").strip().lower()
    if not _re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return jsonify({"ok": False, "msg": "Please enter a valid email."}), 400
    was_new = db.add_subscriber(email)
    return jsonify({
        "ok": True,
        "new": was_new,
        "msg": "You're in! Thanks for subscribing." if was_new
               else "You're already subscribed. Nice!",
        "count": db.subscriber_count(),
    })


@app.route("/api/reading-now")
def reading_now():
    """Believable ambient 'reading now' count — drifts with time of day."""
    import random
    hour = datetime.datetime.utcnow().hour
    # Higher during waking hours, lower at night
    base = 9 if 8 <= hour < 22 else 3
    count = base + random.randint(-2, 3)
    count = max(1, count)
    return jsonify({"count": count})


@app.route("/tags")
def tags_page():
    """Visual tag cloud page."""
    tags = db.get_all_tags()
    posts_by_tag = {}
    for tag in tags:
        posts_by_tag[tag] = db.get_posts_by_tag(tag)
    return render_template("tags.html", tags=tags, posts_by_tag=posts_by_tag, title="Tags")


@app.route("/tag/<tag>")
def tag(tag):
    posts = db.get_posts_by_tag(tag)
    return render_template("tag.html", posts=posts, tag=tag, title=f"#{tag}")


@app.route("/search")
def search():
    q = request.args.get("q", "").strip()
    posts = db.search_posts(q) if q else []
    return render_template("search.html", posts=posts, query=q, title="Search")


@app.route("/about")
def about():
    return render_template("about.html", title="About")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username", "")
        password = request.form.get("password", "")
        if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            session["logged_in"] = True
            flash("Welcome back!", "success")
            return redirect(url_for("admin"))
        flash("Invalid credentials.", "error")
    return render_template("login.html", title="Login")


@app.route("/logout")
def logout():
    session.clear()
    flash("You have been logged out.", "info")
    return redirect(url_for("index"))


@app.route("/admin")
@login_required
def admin():
    posts = db.get_all_posts()
    return render_template("admin/list.html", posts=posts, title="Admin")


@app.route("/admin/new", methods=["GET", "POST"])
@login_required
def admin_new():
    if request.method == "POST":
        title = request.form.get("title", "").strip()
        content = request.form.get("content", "")
        tags = request.form.get("tags", "").strip()
        if not title or not content:
            flash("Title and content are required.", "error")
            return render_template(
                "admin/edit.html", title_text=title, content=content, tags=tags, title="New Post"
            )
        db.create_post(title, content, tags)
        flash("Post published!", "success")
        return redirect(url_for("admin"))
    return render_template("admin/edit.html", title="New Post")


@app.route("/admin/edit/<int:post_id>", methods=["GET", "POST"])
@login_required
def admin_edit(post_id):
    post = db.get_post_by_id(post_id)
    if post is None:
        abort(404)
    if request.method == "POST":
        title = request.form.get("title", "").strip()
        content = request.form.get("content", "")
        tags = request.form.get("tags", "").strip()
        if not title or not content:
            flash("Title and content are required.", "error")
            return render_template("admin/edit.html", post=post, title="Edit Post")
        db.update_post(post_id, title, content, tags)
        flash("Post updated!", "success")
        return redirect(url_for("admin"))
    return render_template("admin/edit.html", post=post, title="Edit Post")


@app.route("/admin/delete/<int:post_id>", methods=["POST"])
@login_required
def admin_delete(post_id):
    db.delete_post(post_id)
    flash("Post deleted.", "info")
    return redirect(url_for("admin"))


@app.errorhandler(404)
def not_found(e):
    return render_template("404.html", title="Not Found"), 404
