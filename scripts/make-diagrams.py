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


def costing():
    """Cost build-up from material to contribution, as stacked layers."""
    w, h = 1400, 560
    img, d = canvas(w, h)
    layers = [
        ("Material, at actual consumption and scrap", NAVY),
        ("Direct conversion: machine and labour hours", GREY),
        ("Plant overheads, allocated by driver", NAVY),
        ("Cost to serve: freight, packing, credit days, claims", GREY),
        ("Price realised after discounts and rebates", NAVY),
    ]
    center_text(d, (0, 30, w, 80), ["From standard cost to true contribution"], font(34, True), NAVY)
    y = 110
    for i, (label, fill) in enumerate(layers):
        x0 = 200 + i * 40
        rect(d, (x0, y, w - 200 - i * 40, y + 66), fill)
        center_text(d, (x0, y, w - 200 - i * 40, y + 66), [label], font(24, True), WHITE)
        y += 82
    center_text(d, (0, 520, w, 550), ["Contribution per product and customer = price realised minus every layer above"], font(22), TEXT)
    save(img, "costing-architecture-product-customer-contribution.webp", w, h)


def working_capital():
    """Cash conversion cycle: inventory days + receivable days - payable days."""
    w, h = 1400, 520
    img, d = canvas(w, h)
    center_text(d, (0, 30, w, 80), ["The cash conversion cycle"], font(34, True), NAVY)
    # timeline
    y = 250
    d.line([(150 * S, y * S), (1250 * S, y * S)], fill=GREY, width=6 * S)
    rect(d, (150, 150, 750, 220), NAVY)
    center_text(d, (150, 150, 750, 220), ["Inventory days: material in to goods shipped"], font(22, True), WHITE)
    rect(d, (750, 150, 1250, 220), GREY)
    center_text(d, (750, 150, 1250, 220), ["Receivable days: invoice to cash"], font(22, True), WHITE)
    rect(d, (150, 280, 600, 350), TINT)
    center_text(d, (150, 280, 600, 350), ["Payable days: supplier credit"], font(22, True), NAVY)
    rect(d, (600, 280, 1250, 350), NAVY)
    center_text(d, (600, 280, 1250, 350), ["Cash conversion cycle: cash tied up in the business"], font(22, True), WHITE)
    center_text(d, (0, 400, w, 470), ["Cash conversion cycle = inventory days + receivable days - payable days", "Shorten the navy bars, not the supplier relationship."], font(23), TEXT, gap=10)
    save(img, "working-capital-cash-conversion-cycle.webp", w, h)


def mis_tree():
    """KPI tree: one business outcome broken into owned, controllable metrics."""
    w, h = 1400, 620
    img, d = canvas(w, h)
    center_text(d, (0, 24, w, 70), ["An MIS built as a KPI tree"], font(34, True), NAVY)
    rect(d, (550, 100, 850, 170), NAVY)
    center_text(d, (550, 100, 850, 170), ["Operating profit"], font(26, True), WHITE)
    mids = [("Revenue", 200), ("Gross margin", 575), ("Overheads and cash", 950)]
    leaves = {
        "Revenue": ["Order intake", "Win rate", "Price realisation"],
        "Gross margin": ["Material yield", "Conversion cost", "Cost to serve"],
        "Overheads and cash": ["Fixed cost trend", "Inventory days", "Receivable days"],
    }
    for name, x in mids:
        d.line([((x + 125) * S, 230 * S), (700 * S, 170 * S)], fill=GREY, width=3 * S)
        # Spine along the left edge so it never runs through the leaf labels.
        d.line([((x + 12) * S, 290 * S), ((x + 12) * S, (340 + 2 * 74 + 28) * S)], fill=(170, 178, 190), width=2 * S)
        rect(d, (x, 230, x + 250, 290), GREY)
        center_text(d, (x, 230, x + 250, 290), [name], font(23, True), WHITE)
        for j, leaf in enumerate(leaves[name]):
            ly = 340 + j * 74
            d.line([((x + 12) * S, (ly + 28) * S), ((x + 30) * S, (ly + 28) * S)], fill=(170, 178, 190), width=2 * S)
            rect(d, (x + 30, ly, x + 250, ly + 56), TINT)
            center_text(d, (x + 30, ly, x + 250, ly + 56), [leaf], font(21), NAVY)
    center_text(d, (0, 572, w, 605), ["Every box has one named owner. The pack reads top-down; actions are taken at the leaves."], font(21), TEXT)
    save(img, "mis-design-kpi-tree-manufacturer.webp", w, h)


def qoe_reconciliation():
    """Illustrative EBITDA reconciliation with no numbers: reported to adjusted."""
    w, h = 1400, 600
    img, d = canvas(w, h)
    center_text(d, (0, 24, w, 70), ["Illustrative only: from reported to adjusted EBITDA"], font(32, True), NAVY)
    base = 480
    bars = [
        ("Reported EBITDA", 0, 300, NAVY),
        ("One-off items", 300, 270, GREY),
        ("Related-party pricing", 270, 245, GREY),
        ("Inventory and provisions", 245, 230, GREY),
        ("Run-rate changes", 230, 250, GREY),
        ("Adjusted EBITDA", 0, 250, NAVY),
    ]
    x = 150
    bw = 160
    for label, a, b, fill in bars:
        top, bottom = base - max(a, b), base - min(a, b)
        rect(d, (x, top, x + bw, bottom), fill, radius=2)
        lines = label.split(" ", 1) if len(label) > 16 else [label]
        center_text(d, (x - 20, base + 12, x + bw + 20, base + 70), lines, font(19), TEXT, gap=4)
        x += bw + 30
    d.line([(130 * S, base * S), (1270 * S, base * S)], fill=GREY, width=2 * S)
    center_text(d, (0, 558, w, 590), ["Bar heights are schematic. Direction and size of each adjustment differ in every business."], font(20), (90, 90, 90))
    save(img, "quality-of-earnings-ebitda-reconciliation-illustrative.webp", w, h)


def diligence_checklist():
    """What investors diligence, as a checklist grid."""
    w, h = 1400, 640
    img, d = canvas(w, h)
    center_text(d, (0, 24, w, 70), ["What investors diligence in a promoter-led manufacturer"], font(32, True), NAVY)
    cols = [
        ("Financial", ["Quality of earnings", "Working capital norms", "Related-party items", "Tax and statutory position"]),
        ("Commercial", ["Customer concentration", "Pricing power and margin", "Pipeline and order book", "Market and competition"]),
        ("Operational", ["Capacity and utilisation", "Quality and delivery record", "Supplier dependence", "Capex needs"]),
        ("People and governance", ["Management depth", "Board and approvals", "Policies and compliance", "MIS and controls"]),
    ]
    x = 80
    for head, items in cols:
        rect(d, (x, 100, x + 300, 160), NAVY)
        center_text(d, (x, 100, x + 300, 160), [head], font(24, True), WHITE)
        for j, it in enumerate(items):
            y = 180 + j * 96
            rect(d, (x, y, x + 300, y + 80), TINT)
            d.rectangle([(x + 18) * S, (y + 28) * S, (x + 42) * S, (y + 52) * S], outline=NAVY, width=3 * S)
            center_text(d, (x + 52, y, x + 292, y + 80), [it], font(21), NAVY)
        x += 315
    save(img, "investor-due-diligence-checklist-manufacturer.webp", w, h)


def ninety_day():
    """90-day transformation plan in three phases with workstreams."""
    w, h = 1400, 560
    img, d = canvas(w, h)
    center_text(d, (0, 24, w, 70), ["A 90-day transformation plan"], font(34, True), NAVY)
    phases = [("Days 1-30: baseline", NAVY), ("Days 31-60: first wins", GREY), ("Days 61-90: make it routine", NAVY)]
    x = 240
    for label, fill in phases:
        rect(d, (x, 100, x + 370, 160), fill)
        center_text(d, (x, 100, x + 370, 160), [label], font(23, True), WHITE)
        x += 380
    rows = [
        ("Numbers", ["Reconcile margin by product", "Weekly scoreboard live", "Owners run the review"]),
        ("Operations", ["Map flow, time changeovers", "Fix one line end to end", "Standard work on all lines"]),
        ("Commercial", ["Find price and discount leak", "Discount bands, approvals", "Account plans for top 20"]),
        ("People", ["Name owners and counterpart", "Delegate first approvals", "Promoter reviews, not approves"]),
    ]
    y = 180
    for name, cells in rows:
        center_text(d, (40, y, 230, y + 70), [name], font(23, True), NAVY)
        x = 240
        for c in cells:
            rect(d, (x, y, x + 370, y + 70), TINT)
            center_text(d, (x, y, x + 370, y + 70), [c], font(21), TEXT)
            x += 380
        y += 86
    save(img, "ninety-day-transformation-plan-manufacturer.webp", w, h)


JOBS = {
    "comparison": comparison,
    "engagement": engagement,
    "costing": costing,
    "working-capital": working_capital,
    "mis": mis_tree,
    "qoe": qoe_reconciliation,
    "diligence": diligence_checklist,
    "ninety-day": ninety_day,
    "team": lambda: (
        portrait("team-atul-saxena.webp", "AS"),
        portrait("team-mahaveer-upadhyaya.webp", "MU"),
    ),
}

if __name__ == "__main__":
    for key in sys.argv[1:] or JOBS:
        JOBS[key]()
