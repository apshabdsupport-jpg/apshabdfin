from pathlib import Path
import random
import textwrap

from PIL import Image, ImageColor, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent

W, H = 1080, 1440
CREAM = "#F3E6D0"
RED = "#EB3640"
NIGHT = "#000F08"
YELLOW = "#D5A91B"

TANKER = ROOT / "assets/fonts/Tanker_Complete/Fonts/OTF/Tanker-Regular.otf"
HOOVER = ROOT / "assets/fonts/FontshareKit-2608002138/Hoover/Fonts/OTF/Hoover-Light.otf"
LOGO_NIGHT = ROOT / "assets/brand/apshabd-wordmark-night.png"
LOGO_CREAM = ROOT / "assets/brand/apshabd-wordmark-cream.png"
BROOKLYN = OUT / "source-brooklyn-screenshot.png"
THANE = ROOT / "assets/campaign/all-locations/02-mumbai-thane-fisherman.png"
BARBER = ROOT / "assets/campaign/all-locations/07-mumbai-bandra-thane-barber.png"


def fnt(path: Path, size: int):
    return ImageFont.truetype(str(path), size=size)


def cover(im: Image.Image, size, focus=(0.5, 0.5)):
    target_w, target_h = size
    scale = max(target_w / im.width, target_h / im.height)
    resized = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
    extra_x = resized.width - target_w
    extra_y = resized.height - target_h
    left = round(extra_x * focus[0])
    top = round(extra_y * focus[1])
    left = max(0, min(extra_x, left))
    top = max(0, min(extra_y, top))
    return resized.crop((left, top, left + target_w, top + target_h))


def tint_photo(im: Image.Image, contrast=1.08, color=0.92, brightness=0.97):
    im = ImageEnhance.Contrast(im.convert("RGB")).enhance(contrast)
    im = ImageEnhance.Color(im).enhance(color)
    return ImageEnhance.Brightness(im).enhance(brightness)


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


def add_paper_marks(im: Image.Image, color=NIGHT, count=120, seed=31):
    random.seed(seed)
    draw = ImageDraw.Draw(im, "RGBA")
    rgba = ImageColor.getrgb(color) + (24,)
    for _ in range(count):
        x = random.randrange(W)
        y = random.randrange(H)
        length = random.randrange(2, 18)
        draw.line((x, y, x + length, y + random.randrange(-2, 3)), fill=rgba, width=random.choice((1, 1, 2)))


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


def slide_one():
    canvas = Image.new("RGBA", (W, H), CREAM)
    canvas = add_grain(canvas, 0.035, 11).convert("RGBA")
    canvas = add_halftone_screen(canvas, NIGHT, spacing=18, radius=1.3, opacity=18, seed=11)
    canvas = add_halftone_screen(canvas, RED, spacing=17, radius=2.3, opacity=42, region=(480, 540, 1040, 1300), seed=12)
    draw = ImageDraw.Draw(canvas)
    utility_header(canvas, "APSHABD / BORROWED IDENTITY", "01 / 03")

    draw_headline(
        draw,
        (60, 148),
        ["BROOKLYN.", "NEW YORK.", "TOO MANY LETTERS.", "ZERO STORY."],
        [NIGHT, NIGHT, RED, RED],
        960,
        430,
        max_size=105,
        min_size=72,
        gap_ratio=0.08,
    )

    draw.rectangle((44, 592, 474, 864), fill=CREAM, outline=NIGHT, width=2)
    draw.rectangle((60, 625, 74, 848), fill=RED)
    draw_paragraph(
        draw,
        (98, 627),
        "A foreign postcode.\nA default varsity font.\nA city borrowed for decoration.",
        fnt(HOOVER, 35),
        NIGHT,
        360,
        spacing=13,
    )

    src = Image.open(BROOKLYN).convert("RGB")
    src = src.crop((4, 0, 273, 289))
    face_box = (104, 13, 177, 82)
    face = src.crop(face_box).filter(ImageFilter.GaussianBlur(14))
    face_mask = Image.new("L", (face_box[2] - face_box[0], face_box[3] - face_box[1]), 0)
    ImageDraw.Draw(face_mask).ellipse((2, 2, face_mask.width - 2, face_mask.height - 2), fill=255)
    face_mask = face_mask.filter(ImageFilter.GaussianBlur(4))
    src.paste(face, face_box, face_mask)
    src = tint_photo(src, contrast=1.08, color=0.86, brightness=0.98)
    src = add_halftone_screen(src, NIGHT, spacing=8, radius=0.9, opacity=40, seed=15).convert("RGB")
    card_w, card_h = 470, 585
    photo = cover(src, (card_w - 28, card_h - 28), focus=(0.50, 0.36))
    card = Image.new("RGBA", (card_w, card_h), NIGHT)
    card.paste(photo, (14, 14))
    shadow = Image.new("RGBA", (card_w + 40, card_h + 40), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rectangle((28, 28, card_w + 18, card_h + 18), fill=(0, 15, 8, 95))
    shadow = shadow.filter(ImageFilter.GaussianBlur(10))
    card = card.rotate(-2.1, expand=True, resample=Image.Resampling.BICUBIC)
    shadow = shadow.rotate(-2.1, expand=True, resample=Image.Resampling.BICUBIC)
    canvas.alpha_composite(shadow, (516, 617))
    canvas.alpha_composite(card, (508, 604))

    tape = Image.new("RGBA", (410, 62), RED)
    td = ImageDraw.Draw(tape)
    label_font = fnt(TANKER, 25)
    label = "COPY-PASTE CLASSIC."
    lb = td.textbbox((0, 0), label, font=label_font)
    td.text(((410 - (lb[2] - lb[0])) / 2, (62 - (lb[3] - lb[1])) / 2 - lb[1]), label, font=label_font, fill=NIGHT)
    tape = tape.rotate(1.3, expand=True, resample=Image.Resampling.BICUBIC)
    canvas.alpha_composite(tape, (550, 1210))

    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 1322, W, H), fill=NIGHT)
    draw.text((60, 1362), "THE DESIGN TRAVELLED. THE IDEA DIDN'T.", font=fnt(HOOVER, 29), fill=CREAM)
    paste_logo(canvas, LOGO_CREAM, (W - 290, 1351), 230)
    return canvas.convert("RGB")


def slide_two():
    canvas = Image.new("RGBA", (W, H), NIGHT)
    canvas = add_grain(canvas, 0.04, 17).convert("RGBA")
    canvas = add_halftone_screen(canvas, CREAM, spacing=18, radius=1.2, opacity=17, seed=18)
    canvas = add_halftone_screen(canvas, RED, spacing=16, radius=2.2, opacity=35, region=(600, 360, 1080, 1260), seed=19)
    draw = ImageDraw.Draw(canvas, "RGBA")

    random.seed(102)
    for _ in range(34):
        x = random.randrange(-120, W + 80)
        y = random.randrange(420, 1270)
        length = random.randrange(100, 480)
        color = (243, 230, 208, random.randrange(16, 38)) if random.random() > 0.2 else (235, 54, 64, 42)
        if random.random() > 0.5:
            draw.line((x, y, x + length, y), fill=color, width=random.choice((2, 3, 5)))
        else:
            draw.line((x, y, x, y + length), fill=color, width=random.choice((2, 3, 5)))

    utility_header(canvas, "APSHABD / GENERIC CITY TEES", "02 / 03", dark=True)
    draw = ImageDraw.Draw(canvas)
    draw_headline(
        draw,
        (60, 155),
        ["THE NAME OF", "THE PLACE", "AIN'T A POINT", "OF VIEW."],
        [CREAM, CREAM, RED, RED],
        960,
        420,
        max_size=92,
        min_size=62,
        gap_ratio=0.08,
    )

    draw.rectangle((46, 575, 760, 820), fill=NIGHT)
    draw.rectangle((60, 608, 74, 812), fill=RED)
    draw_paragraph(
        draw,
        (100, 610),
        "If the design ends at the postcode, it never really started.",
        fnt(HOOVER, 38),
        CREAM,
        590,
        spacing=15,
    )

    stamp = Image.new("RGBA", (280, 280), (0, 0, 0, 0))
    sd = ImageDraw.Draw(stamp)
    sd.ellipse((14, 14, 266, 266), outline=RED, width=9)
    sd.ellipse((31, 31, 249, 249), outline=RED, width=3)
    zero_font = fnt(TANKER, 68)
    zero = "ZERO"
    zb = sd.textbbox((0, 0), zero, font=zero_font)
    sd.text(((280 - (zb[2] - zb[0])) / 2, 75 - zb[1]), zero, font=zero_font, fill=RED)
    idea_font = fnt(HOOVER, 25)
    ideas = "ORIGINAL IDEAS"
    ib = sd.textbbox((0, 0), ideas, font=idea_font)
    sd.text(((280 - (ib[2] - ib[0])) / 2, 171 - ib[1]), ideas, font=idea_font, fill=RED)
    stamp = stamp.rotate(-8, expand=True, resample=Image.Resampling.BICUBIC)
    canvas.alpha_composite(stamp, (742, 878))
    draw = ImageDraw.Draw(canvas)

    draw.rectangle((60, 1232, 720, 1314), fill=CREAM)
    roast = "NICE CITY. SHAME ABOUT THE TEE."
    roast_font = fnt(TANKER, 29)
    rb = draw.textbbox((0, 0), roast, font=roast_font)
    draw.text((84, 1273 - (rb[3] - rb[1]) / 2 - rb[1]), roast, font=roast_font, fill=NIGHT)
    paste_logo(canvas, LOGO_CREAM, (W - 290, 1346), 230)
    return canvas.convert("RGB")


def slide_three():
    canvas = Image.new("RGBA", (W, H), CREAM)
    canvas = add_grain(canvas, 0.04, 29).convert("RGBA")
    canvas = add_halftone_screen(canvas, NIGHT, spacing=18, radius=1.3, opacity=18, seed=29)
    canvas = add_halftone_screen(canvas, RED, spacing=15, radius=2.0, opacity=32, region=(40, 470, 1040, 1120), seed=30)
    utility_header(canvas, "APSHABD / DROP 01", "03 / 03")
    draw = ImageDraw.Draw(canvas)

    draw_headline(
        draw,
        (60, 150),
        ["WE COULD", "SHOW YOU", "THE DROP."],
        [NIGHT, NIGHT, RED],
        960,
        330,
        max_size=112,
        min_size=76,
        gap_ratio=0.07,
    )

    draw.rectangle((60, 532, 1020, 1085), fill=NIGHT)
    draw.rectangle((60, 532, 1020, 549), fill=RED)
    draw.text((100, 582), "IMAGE WITHHELD", font=fnt(HOOVER, 27), fill=RED)
    draw_headline(
        draw,
        (100, 660),
        ["BUT THEN YOU", "WOULDN'T HAVE", "TO IMAGINE IT."],
        [CREAM, CREAM, CREAM],
        880,
        285,
        max_size=77,
        min_size=54,
        gap_ratio=0.10,
    )

    draw.rectangle((46, 1110, 1020, 1308), fill=CREAM)
    draw.rectangle((60, 1130, 74, 1296), fill=RED)
    draw.text((100, 1136), "PRE-REGISTRATION STARTS", font=fnt(HOOVER, 28), fill=NIGHT)
    draw.text((100, 1182), "28 AUGUST.", font=fnt(TANKER, 62), fill=RED)
    draw.text((100, 1260), "SAVE THE DATE. YOU'LL REGRET MISSING THIS ONE.", font=fnt(HOOVER, 27), fill=NIGHT)

    paste_logo(canvas, LOGO_NIGHT, (60, 1347), 230)
    draw.rectangle((664, 1328, 1020, 1408), fill=RED)
    cta = "SAVE 28 AUGUST"
    cf = fnt(TANKER, 27)
    cb = draw.textbbox((0, 0), cta, font=cf)
    draw.text((842 - (cb[2] - cb[0]) / 2, 1368 - (cb[3] - cb[1]) / 2 - cb[1]), cta, font=cf, fill=NIGHT)
    return canvas.convert("RGB")


def make_preview(paths):
    thumb_w, thumb_h = 360, 480
    preview = Image.new("RGB", (thumb_w * len(paths), thumb_h), NIGHT)
    for idx, path in enumerate(paths):
        im = Image.open(path).convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        preview.paste(im, (idx * thumb_w, 0))
    preview.save(OUT / "apshabd-borrowed-identity-carousel-preview-3x4-v1.jpg", quality=94, subsampling=0)


def main():
    slides = [slide_one(), slide_two(), slide_three()]
    paths = []
    for idx, slide in enumerate(slides, start=1):
        path = OUT / f"apshabd-borrowed-identity-slide-{idx:02d}-3x4-v1.png"
        slide.save(path, optimize=True)
        paths.append(path)
    make_preview(paths)
    for path in paths:
        print(path)


if __name__ == "__main__":
    main()
