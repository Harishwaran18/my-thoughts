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
            "views": p["views"] or 0,
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
        total_views=db.total_views(),
        cmd_index=cmd_index,
        title="My Thoughts",
        description=SITE_TAGLINE,
    )


@app.route("/post/<slug>")
def post(slug):
    post = db.get_post(slug)
    if post is None:
        abort(404)
    db.increment_views(slug)
    related = db.get_related_posts(post, limit=3)
    toc = extract_toc(post["content"])
    return render_template(
        "post.html",
        post=post,
        related=related,
        toc=toc,
        title=post["title"],
        description=excerpt(post["content"], 160),
        og_image_url=f"{site_base_url()}/og/{slug}.png",
    )


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
