from pathlib import Path
import random

from PIL import Image, ImageColor, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "out"

W, H = 1080, 1440
CREAM = "#F3E6D0"
RED = "#EB3640"
NIGHT = "#000F08"

TANKER = ROOT / "assets/fonts/Tanker-Regular.otf"
HOOVER = ROOT / "assets/fonts/Hoover-Light.otf"
LOGO_NIGHT = ROOT / "assets/brand/apshabd-wordmark-night.png"
LOGO_CREAM = ROOT / "assets/brand/apshabd-wordmark-cream.png"


def fnt(path: Path, size: int):
    return ImageFont.truetype(str(path), size=size)


def add_grain(im: Image.Image, amount=0.045, seed=7):
    random.seed(seed)
    noise = Image.effect_noise(im.size, 30).convert("L")
    noise = ImageOps.colorize(noise, black="#151515", white="#EFE4D0").convert("RGB")
    return Image.blend(im.convert("RGB"), noise, amount)


def add_halftone_screen(im: Image.Image, ink=NIGHT, spacing=18, radius=1.8, opacity=26, region=None, seed=9):
    base = im.convert("RGBA")
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    iw, ih = base.size
    x1, y1, x2, y2 = region or (0, 0, iw, ih)
    random.seed(seed)
    rgb = ImageColor.getrgb(ink)
    row = 0
    y = y1 - spacing
    while y < y2 + spacing:
        offset = spacing // 2 if row % 2 else 0
        x = x1 - spacing + offset
        while x < x2 + spacing:
            jitter = random.choice((-1, 0, 0, 0, 1))
            r = radius + random.choice((-0.25, 0, 0, 0.2))
            draw.ellipse((x - r + jitter, y - r, x + r + jitter, y + r), fill=rgb + (opacity,))
            x += spacing
        row += 1
        y += spacing
    return Image.alpha_composite(base, overlay)


def wrap_pixels(draw, text, font, max_width):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        trial = word if not current else f"{current} {word}"
        if draw.textbbox((0, 0), trial, font=font)[2] <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_paragraph(draw, xy, text, font, fill, max_width, spacing=12):
    x, y = xy
    lines = []
    for paragraph in text.split("\n"):
        lines.extend(wrap_pixels(draw, paragraph, font, max_width))
    bbox = draw.textbbox((0, 0), "Ag", font=font)
    line_h = bbox[3] - bbox[1]
    for line in lines:
        draw.text((x, y - bbox[1]), line, font=font, fill=fill)
        y += line_h + spacing
    return y


def fit_headline(draw, lines, max_width, max_height, max_size=112, min_size=42, gap_ratio=0.14):
    for size in range(max_size, min_size - 1, -1):
        font = fnt(TANKER, size)
        boxes = [draw.textbbox((0, 0), line, font=font) for line in lines]
        heights = [b[3] - b[1] for b in boxes]
        gap = max(6, round(size * gap_ratio))
        total_h = sum(heights) + gap * (len(lines) - 1)
        if max((b[2] - b[0]) for b in boxes) <= max_width and total_h <= max_height:
            return font, boxes, gap
    font = fnt(TANKER, min_size)
    boxes = [draw.textbbox((0, 0), line, font=font) for line in lines]
    return font, boxes, max(6, round(min_size * gap_ratio))


def draw_headline(draw, xy, lines, colors, max_width, max_height, max_size=112, min_size=42, gap_ratio=0.14):
    x, y = xy
    font, boxes, gap = fit_headline(draw, lines, max_width, max_height, max_size, min_size, gap_ratio)
    for line, color, bbox in zip(lines, colors, boxes):
        draw.text((x - bbox[0], y - bbox[1]), line, font=font, fill=color)
        y += (bbox[3] - bbox[1]) + gap
    return y


def paste_logo(canvas, logo_path, xy, width):
    logo = Image.open(logo_path).convert("RGBA")
    height = round(logo.height * width / logo.width)
    logo = logo.resize((width, height), Image.Resampling.LANCZOS)
    canvas.alpha_composite(logo, xy)
    return height


def utility_header(canvas, section, page, dark=False):
    draw = ImageDraw.Draw(canvas)
    color = CREAM if dark else NIGHT
    draw.text((60, 57), section, font=fnt(HOOVER, 23), fill=color)
    page_font = fnt(HOOVER, 23)
    page_box = draw.textbbox((0, 0), page, font=page_font)
    draw.text((W - 60 - (page_box[2] - page_box[0]), 57), page, font=page_font, fill=color)
    draw.line((60, 103, W - 60, 103), fill=color, width=2)


def stamp(canvas, xy, angle, top_text, top_size, bottom_text, bottom_size, size=280):
    stamp_im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(stamp_im)
    sd.ellipse((14, 14, size - 14, size - 14), outline=RED, width=9)
    sd.ellipse((31, 31, size - 31, size - 31), outline=RED, width=3)
    top_font = fnt(TANKER, top_size)
    tb = sd.textbbox((0, 0), top_text, font=top_font)
    sd.text(((size - (tb[2] - tb[0])) / 2, size * 0.27 - tb[1]), top_text, font=top_font, fill=RED)
    bottom_font = fnt(HOOVER, bottom_size)
    bb = sd.textbbox((0, 0), bottom_text, font=bottom_font)
    sd.text(((size - (bb[2] - bb[0])) / 2, size * 0.61 - bb[1]), bottom_text, font=bottom_font, fill=RED)
    stamp_im = stamp_im.rotate(angle, expand=True, resample=Image.Resampling.BICUBIC)
    canvas.alpha_composite(stamp_im, xy)


# ─────────────────────────────────────────────────────────────────────────
# SLIDE 1 — "I'll do it later." (cream)
# ─────────────────────────────────────────────────────────────────────────

def slide_one():
    canvas = Image.new("RGBA", (W, H), CREAM)
    canvas = add_grain(canvas, 0.035, 41).convert("RGBA")
    canvas = add_halftone_screen(canvas, NIGHT, spacing=18, radius=1.3, opacity=18, seed=41)
    canvas = add_halftone_screen(canvas, RED, spacing=17, radius=2.3, opacity=40, region=(560, 560, 1040, 1100), seed=42)
    utility_header(canvas, "APSHABD / EXCUSES DEPARTMENT", "01 / 03")
    draw = ImageDraw.Draw(canvas)

    draw_headline(
        draw,
        (60, 148),
        ["I'LL DO IT", "LATER.", "LATER NEVER", "SHOWS UP."],
        [NIGHT, NIGHT, RED, RED],
        980,
        440,
        max_size=105,
        min_size=72,
        gap_ratio=0.08,
    )

    draw.rectangle((44, 620, 690, 900), fill=CREAM, outline=NIGHT, width=2)
    draw.rectangle((60, 653, 74, 884), fill=RED)
    draw_paragraph(
        draw,
        (98, 656),
        "Later is not a plan.\nLater is just now,\nwearing a disguise.",
        fnt(HOOVER, 36),
        NIGHT,
        580,
        spacing=15,
    )

    stamp(canvas, (740, 590), -9, "EXCUSE", 46, "FILED UNDER: NEVER", 20, size=300)

    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 1322, W, H), fill=NIGHT)
    draw.text((60, 1362), "STILL THINKING ABOUT IT? NOTED.", font=fnt(HOOVER, 29), fill=CREAM)
    paste_logo(canvas, LOGO_CREAM, (W - 290, 1351), 230)
    return canvas.convert("RGB")


# ─────────────────────────────────────────────────────────────────────────
# SLIDE 2 — "I'll wait for the drop." (night)
# ─────────────────────────────────────────────────────────────────────────

def slide_two():
    canvas = Image.new("RGBA", (W, H), NIGHT)
    canvas = add_grain(canvas, 0.04, 47).convert("RGBA")
    canvas = add_halftone_screen(canvas, CREAM, spacing=18, radius=1.2, opacity=17, seed=47)
    canvas = add_halftone_screen(canvas, RED, spacing=16, radius=2.2, opacity=35, region=(560, 340, 1080, 1000), seed=48)
    draw = ImageDraw.Draw(canvas, "RGBA")

    random.seed(148)
    for _ in range(30):
        x = random.randrange(-120, W + 80)
        y = random.randrange(420, 1230)
        length = random.randrange(100, 480)
        color = (243, 230, 208, random.randrange(16, 38)) if random.random() > 0.2 else (235, 54, 64, 42)
        if random.random() > 0.5:
            draw.line((x, y, x + length, y), fill=color, width=random.choice((2, 3, 5)))
        else:
            draw.line((x, y, x, y + length), fill=color, width=random.choice((2, 3, 5)))

    utility_header(canvas, "APSHABD / EXCUSES DEPARTMENT", "02 / 03", dark=True)
    draw = ImageDraw.Draw(canvas)
    draw_headline(
        draw,
        (60, 155),
        ["I'LL WAIT", "FOR THE DROP.", "THE DROP WON'T", "WAIT FOR YOU."],
        [CREAM, CREAM, RED, RED],
        1000,
        430,
        max_size=88,
        min_size=58,
        gap_ratio=0.08,
    )

    draw.rectangle((46, 630, 900, 880), fill=NIGHT, outline=RED, width=2)
    draw.rectangle((60, 663, 74, 864), fill=RED)
    draw_paragraph(
        draw,
        (100, 666),
        "No code, no door. The store\nopens 28 August whether your\nemail's in the sheet or not.",
        fnt(HOOVER, 34),
        CREAM,
        780,
        spacing=15,
    )

    draw.rectangle((60, 1232, 940, 1314), fill=CREAM)
    roast = "NO CODE. NO ENTRY. NO EXCEPTIONS."
    roast_font = fnt(TANKER, 27)
    rb = draw.textbbox((0, 0), roast, font=roast_font)
    draw.text((84, 1273 - (rb[3] - rb[1]) / 2 - rb[1]), roast, font=roast_font, fill=NIGHT)
    paste_logo(canvas, LOGO_CREAM, (W - 290, 1346), 230)
    return canvas.convert("RGB")


# ─────────────────────────────────────────────────────────────────────────
# SLIDE 3 — the actual reminder / CTA (cream)
# ─────────────────────────────────────────────────────────────────────────

def slide_three():
    canvas = Image.new("RGBA", (W, H), CREAM)
    canvas = add_grain(canvas, 0.04, 59).convert("RGBA")
    canvas = add_halftone_screen(canvas, NIGHT, spacing=18, radius=1.3, opacity=18, seed=59)
    canvas = add_halftone_screen(canvas, RED, spacing=15, radius=2.0, opacity=32, region=(40, 470, 1040, 1000), seed=60)
    utility_header(canvas, "APSHABD / LAST CALL", "03 / 03")
    draw = ImageDraw.Draw(canvas)

    draw_headline(
        draw,
        (60, 150),
        ["STILL NOT", "REGISTERED?", "BOLD MOVE."],
        [NIGHT, NIGHT, RED],
        980,
        330,
        max_size=108,
        min_size=76,
        gap_ratio=0.07,
    )

    draw.rectangle((60, 532, 1020, 940), fill=NIGHT)
    draw.rectangle((60, 532, 1020, 549), fill=RED)
    draw.text((100, 582), "STATUS CHECK", font=fnt(HOOVER, 27), fill=RED)
    draw_headline(
        draw,
        (100, 660),
        ["THE DROP DOESN'T", "CARE ABOUT YOUR", "EXCUSES."],
        [CREAM, CREAM, CREAM],
        880,
        250,
        max_size=68,
        min_size=48,
        gap_ratio=0.10,
    )

    draw.rectangle((46, 965, 1020, 1308), fill=CREAM)
    draw.rectangle((60, 985, 74, 1296), fill=RED)
    draw.text((100, 991), "PRE-REGISTRATION IS", font=fnt(HOOVER, 28), fill=NIGHT)
    draw.text((100, 1037), "OPEN NOW.", font=fnt(TANKER, 62), fill=RED)
    draw_paragraph(
        draw,
        (100, 1115),
        "Drop day is 28 August. Get your access\ncode before then — that's the whole plan.",
        fnt(HOOVER, 27),
        NIGHT,
        860,
        spacing=10,
    )

    paste_logo(canvas, LOGO_NIGHT, (60, 1347), 230)
    draw.rectangle((624, 1328, 1020, 1408), fill=RED)
    cta = "PRE-REGISTER NOW"
    cf = fnt(TANKER, 26)
    cb = draw.textbbox((0, 0), cta, font=cf)
    draw.text((822 - (cb[2] - cb[0]) / 2, 1368 - (cb[3] - cb[1]) / 2 - cb[1]), cta, font=cf, fill=NIGHT)
    return canvas.convert("RGB")


def make_preview(paths):
    thumb_w, thumb_h = 360, 480
    preview = Image.new("RGB", (thumb_w * len(paths), thumb_h), NIGHT)
    for idx, path in enumerate(paths):
        im = Image.open(path).convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        preview.paste(im, (idx * thumb_w, 0))
    preview.save(OUT / "apshabd-excuses-carousel-preview-3x4-v1.jpg", quality=94, subsampling=0)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    slides = [slide_one(), slide_two(), slide_three()]
    paths = []
    for idx, slide in enumerate(slides, start=1):
        path = OUT / f"apshabd-excuses-slide-{idx:02d}-3x4-v1.png"
        slide.save(path, optimize=True)
        paths.append(path)
    make_preview(paths)
    for path in paths:
        print(path)


if __name__ == "__main__":
    main()
