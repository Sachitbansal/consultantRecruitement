#!/usr/bin/env python3
"""
Brand diagrams for the marketing site, written to public/assets/img/.

    python3 scripts/make-diagrams.py            # all
    python3 scripts/make-diagrams.py comparison # one, by name

Needs Pillow and the Carlito font (Calibri-metric, `fonts-crosextra-carlito`
on Debian/Ubuntu). Each image is drawn at 2x and downsampled for clean edges,
then saved as WebP. Brand: navy #011A41, grey #6F6F6F, white.

Only the diagrams that were redrawn or added in this repo live here; the
remaining images under public/assets/img came from the reference build.
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent.parent / "public/assets/img"
NAVY = (1, 26, 65)
GREY = (111, 111, 111)
TINT = (232, 236, 242)
WHITE = (255, 255, 255)
TEXT = (28, 36, 51)
S = 2  # supersampling factor

FONT_DIR = Path("/usr/share/fonts/truetype/crosextra")


def font(size, bold=False):
    name = "Carlito-Bold.ttf" if bold else "Carlito-Regular.ttf"
    return ImageFont.truetype(str(FONT_DIR / name), size * S)


def canvas(w, h):
    img = Image.new("RGB", (w * S, h * S), WHITE)
    return img, ImageDraw.Draw(img)


def save(img, name, w, h):
    img = img.resize((w, h), Image.LANCZOS)
    img.save(OUT / name, "WEBP", quality=88, method=6)
    print(f"wrote {name} ({w}x{h})")


def center_text(d, box, lines, fnt, fill, gap=6):
    """Draw lines centred in box (x0, y0, x1, y1), all in unscaled px."""
    x0, y0, x1, y1 = (v * S for v in box)
    heights = [d.textbbox((0, 0), ln, font=fnt)[3] for ln in lines]
    total = sum(heights) + gap * S * (len(lines) - 1)
    y = y0 + (y1 - y0 - total) / 2
    for ln, h in zip(lines, heights):
        w = d.textlength(ln, font=fnt)
        d.text((x0 + (x1 - x0 - w) / 2, y), ln, font=fnt, fill=fill)
        y += h + gap * S


def rect(d, box, fill, radius=4):
    d.rounded_rectangle([v * S for v in box], radius=radius * S, fill=fill)


# --------------------------------------------------------------------------


def comparison():
    """Advisory vs operator-led consulting: what you get, side by side."""
    w, h = 1100, 660
    img, d = canvas(w, h)
    rows = [
        ("Strategy deck and recommendations", "Changes made inside the business"),
        ("Analysts and consultants deliver", "Experienced operators deliver"),
        ("Accountable for the report", "Accountable for agreed KPIs"),
        ("Works from outside the team", "Works inside your team, weekly"),
        ("Hands over a plan", "Hands over a working system"),
    ]
    lx, rx, cw = 155, 581, 392
    rect(d, (lx, 96, lx + cw, 164), GREY)
    rect(d, (rx, 96, rx + cw, 164), NAVY)
    center_text(d, (lx, 96, lx + cw, 164), ["Advisory"], font(30, True), WHITE)
    center_text(d, (rx, 96, rx + cw, 164), ["Operator-led (GOP)"], font(30, True), WHITE)
    y = 188
    for left, right in rows:
        rect(d, (lx, y, lx + cw, y + 61), TINT)
        rect(d, (rx, y, rx + cw, y + 61), TINT)
        center_text(d, (lx, y, lx + cw, y + 61), [left], font(21), TEXT)
        center_text(d, (rx, y, rx + cw, y + 61), [right], font(21, True), NAVY)
        y += 76
    save(img, "operator-led-vs-advisory-consulting-comparison.webp", w, h)


def chevron(d, x, y, w, h, notch, fill, first=False):
    pts = [(x, y), (x + w - notch, y), (x + w, y + h / 2), (x + w - notch, y + h), (x, y + h)]
    if not first:
        pts.append((x + notch, y + h / 2))
    d.polygon([(px * S, py * S) for px, py in pts], fill=fill)


def engagement():
    """Diagnostic → roadmap → implementation."""
    w, h = 1400, 490
    img, d = canvas(w, h)
    steps = [
        ("1  Diagnostic", NAVY, ["Fixed scope, 1–2 weeks", "Scorecard of strengths", "and gaps"]),
        ("2  Roadmap", GREY, ["Sequenced, costed plan", "Owners and dates", "KPI scoreboard agreed", "before we start"]),
        ("3  Implementation", NAVY, ["Operators embedded in", "your team, working to", "KPIs with a weekly", "review"]),
    ]
    x = 193
    for i, (label, fill, notes) in enumerate(steps):
        chevron(d, x, 86, 348, 126, 45, fill, first=(i == 0))
        center_text(d, (x + 20, 86, x + 330, 212), [label], font(30, True), WHITE)
        center_text(d, (x, 240, x + 348, 400), notes, font(22), TEXT, gap=10)
        x += 357
    save(img, "diagnostic-roadmap-implementation-engagement-model.webp", w, h)


def portrait(name, initials):
    """Neutral 640x640 placeholder until the real photo is dropped in."""
    w = h = 640
    img, d = canvas(w, h)
    d.rectangle([0, 0, w * S, h * S], fill=NAVY)
    d.ellipse([170 * S, 120 * S, 470 * S, 420 * S], outline=(201, 207, 219), width=4 * S)
    center_text(d, (170, 120, 470, 420), [initials], font(120, True), WHITE)
    center_text(d, (0, 460, w, 520), ["Photo to follow"], font(30), (201, 207, 219))
    save(img, name, w, h)


JOBS = {
    "comparison": comparison,
    "engagement": engagement,
    "team": lambda: (
        portrait("team-atul-saxena.webp", "AS"),
        portrait("team-mahaveer-upadhyaya.webp", "MU"),
    ),
}

if __name__ == "__main__":
    for key in sys.argv[1:] or JOBS:
        JOBS[key]()
