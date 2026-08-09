"""Dynamic Open Graph image generation.

Generates a branded 1200x630 preview card for each post so that links
preview beautifully when shared on WhatsApp, X, LinkedIn, iMessage, etc.
"""
import io
import os
import textwrap
from datetime import datetime

from PIL import Image, ImageDraw, ImageFont

FONT_DIR = os.path.join(os.path.dirname(__file__), "static", "fonts")
W, H = 1200, 630

# Palette (warm, matches the site theme)
BG_TOP = (250, 249, 246)        # #faf9f6
BG_BOTTOM = (244, 242, 236)     # #f4f2ec
INK = (31, 29, 26)              # #1f1d1a
INK_SOFT = (87, 83, 78)         # #57534e
INK_FAINT = (139, 133, 124)     # #8b857c
ACCENT = (180, 83, 9)           # #b45309
ACCENT_SOFT = (217, 119, 6)     # #d97706
CARD_BG = (255, 255, 255, 255)


def _font(name, size):
    path = os.path.join(FONT_DIR, name)
    if os.path.exists(path):
        return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def _wrap(draw, text, font, max_width):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=font) <= max_width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def _gradient_bg():
    """Vertical warm gradient background."""
    top = Image.new("RGB", (1, H), BG_TOP)
    bot = Image.new("RGB", (1, H), BG_BOTTOM)
    base = top.resize((W, H))
    # simple linear blend
    for y in range(H):
        t = y / (H - 1)
        r = int(BG_TOP[0] * (1 - t) + BG_BOTTOM[0] * t)
        g = int(BG_TOP[1] * (1 - t) + BG_BOTTOM[1] * t)
        b = int(BG_TOP[2] * (1 - t) + BG_BOTTOM[2] * t)
        for x in range(0, W, 40):
            base.paste((r, g, b), (x, y, x + 40, y + 1))
    return base


def generate_og_image(title, author="Harishwaran", date_str="", read_time=""):
    """Return PNG bytes for an OG card."""
    img = _gradient_bg()
    draw = ImageDraw.Draw(img)

    # Soft white card with shadow effect (drawn as offset rectangles)
    card_margin = 60
    card = [card_margin, card_margin, W - card_margin, H - card_margin]
    for o in range(8, 0, -1):
        alpha = max(0, 18 - o * 2)
        draw.rounded_rectangle(
            [card[0] + o, card[1] + o, card[2] + o, card[3] + o],
            radius=24, fill=(0, 0, 0, alpha) if False else (245, 243, 238),
        )
    draw.rounded_rectangle(card, radius=24, fill=(255, 255, 255))

    # Accent bar (top-left)
    draw.rounded_rectangle([card_margin + 48, card_margin + 48,
                            card_margin + 48 + 56, card_margin + 48 + 6],
                           radius=3, fill=ACCENT)

    # Brand
    brand_font = _font("Inter.ttf", 26)
    draw.text((card_margin + 48, card_margin + 70), "MY THOUGHTS",
              font=brand_font, fill=ACCENT)

    # Title (serif, wrapped)
    title_font = _font("Newsreader.ttf", 64)
    max_w = W - 2 * (card_margin + 48)
    lines = _wrap(draw, title, title_font, max_w)
    # Cap at 4 lines
    if len(lines) > 4:
        lines = lines[:4]
        if len(lines[-1]) < 60:
            lines[-1] += " \u2026"
        else:
            lines[-1] = lines[-1][:58].rstrip() + "\u2026"
    ty = card_margin + 130
    for line in lines:
        draw.text((card_margin + 48, ty), line, font=title_font, fill=INK)
        ty += 74

    # Footer meta line
    meta_font = _font("Inter.ttf", 24)
    meta_soft = _font("Inter.ttf", 24)
    parts = []
    if author:
        parts.append(author)
    if date_str:
        parts.append(date_str)
    if read_time:
        parts.append(read_time)
    meta = "   \u00b7   ".join(parts)
    draw.text((card_margin + 48, H - card_margin - 70), meta,
              font=meta_font, fill=INK_SOFT)

    # Small logo dot bottom-right
    cx, cy = W - card_margin - 48, H - card_margin - 58
    draw.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], fill=ACCENT)

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def format_date_short(date_str):
    if not date_str:
        return ""
    try:
        dt = date_str.split(".")[0]
        dt = datetime.fromisoformat(dt.replace("T", " "))
        return dt.strftime("%b %d, %Y")
    except Exception:
        return date_str[:10] if date_str else ""
