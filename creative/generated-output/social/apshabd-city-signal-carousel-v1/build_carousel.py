from pathlib import Path
import sys
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageFilter


ROOT = Path(__file__).resolve().parent
WORKSPACE = ROOT.parents[2]
THREE_BY_FOUR = "--three-by-four" in sys.argv
W, H = 1080, 1440 if THREE_BY_FOUR else 1350

CREAM = "#F3E6D0"
RED = "#EB3640"
NIGHT = "#000F08"
YELLOW = "#D5A91B"

IMPACT = Path(r"C:\Windows\Fonts\impact.ttf")
BAHN = Path(r"C:\Windows\Fonts\bahnschrift.ttf")
TRENCH = WORKSPACE / "design" / "apshabd-logo" / "final" / "typeface" / "trench-slab" / "TrenchSlab-Regular.otf"
BOXING = WORKSPACE / "assets" / "fonts" / "Boxing_Complete" / "Fonts" / "OTF" / "Boxing-Regular.otf"
HOOVER = WORKSPACE / "assets" / "fonts" / "FontshareKit-2608002138" / "Hoover" / "Fonts" / "OTF" / "Hoover-Light.otf"
LOGO = WORKSPACE / "assets" / "brand" / "apshabd-wordmark-cream.png"
MAN_PHOTO = WORKSPACE / "output" / "social" / "thane-tshirt-blackout-man-v1.png"


def font(path, size):
    return ImageFont.truetype(str(path), size=size)


def fit_font(text, path, max_size, max_width, min_size=20):
    for size in range(max_size, min_size - 1, -1):
        f = font(path, size)
        box = f.getbbox(text)
        if box[2] - box[0] <= max_width:
            return f
    return font(path, min_size)


def line_height(f, multiplier=1.0):
    box = f.getbbox("AG")
    return int((box[3] - box[1]) * multiplier)


def draw_lines(draw, lines, xy, max_width, max_size=120, leading=8):
    x, y = xy
    for text, color in lines:
        f = fit_font(text, BOXING, max_size, max_width)
        draw.text((x, y), text, font=f, fill=color, stroke_width=1, stroke_fill=color)
        y += line_height(f) + leading
    return y


def draw_sized_lines(draw, lines, xy):
    """Draw headline lines with deliberate sizes and a shared left edge."""
    x, y = xy
    for text, color, size, advance in lines:
        f = font(BOXING, size)
        draw.text(
            (x, y),
            text,
            font=f,
            fill=color,
            stroke_width=1,
            stroke_fill=color,
            anchor="lt",
        )
        y += advance
    return y


def wrap_text(text, f, max_width):
    words = text.split()
    lines, current = [], ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if f.getlength(candidate) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_wrapped(draw, text, xy, max_width, size=38, color=CREAM, leading=8, font_path=BAHN):
    f = font(font_path, size)
    x, y = xy
    for line in wrap_text(text, f, max_width):
        draw.text((x, y), line, font=f, fill=color)
        y += line_height(f) + leading
    return y


def add_gradient(image, box, alpha_start, alpha_end):
    x0, y0, x1, y1 = box
    h = max(1, y1 - y0)
    grad = Image.new("L", (1, h))
    for y in range(h):
        t = y / max(1, h - 1)
        grad.putpixel((0, y), int(alpha_start * (1 - t) + alpha_end * t))
    grad = grad.resize((x1 - x0, h))
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    block = Image.new("RGBA", (x1 - x0, h), NIGHT)
    block.putalpha(grad)
    layer.alpha_composite(block, (x0, y0))
    return Image.alpha_composite(image, layer)


def place_logo(image):
    logo = Image.open(LOGO).convert("RGBA")
    ratio = min(250 / logo.width, 72 / logo.height)
    logo = logo.resize((int(logo.width * ratio), int(logo.height * ratio)), Image.Resampling.LANCZOS)
    x, y = W - logo.width - 46, 42
    plate = Image.new("RGBA", (logo.width + 26, logo.height + 18), (0, 15, 8, 205))
    image.alpha_composite(plate, (x - 13, y - 9))
    image.alpha_composite(logo, (x, y))


def add_frame(draw, page):
    draw.rectangle((22, 22, W - 22, H - 22), outline=(243, 230, 208, 145), width=2)
    label_f = font(TRENCH, 23)
    draw.text((50, 48), f"CITY SIGNAL / {page}", font=label_f, fill=CREAM)
    page_f = font(BAHN, 20)
    draw.text((W - 116, H - 56), f"{page}/03", font=page_f, fill=CREAM)


def base_image(number):
    image = Image.open(ROOT / f"background-{number:02d}.png").convert("RGB")
    image = ImageOps.fit(image, (W, H), method=Image.Resampling.LANCZOS)
    return image.convert("RGBA")


def slide_one():
    image = add_gradient(base_image(1), (0, 0, 690, H), 75, 10)
    draw = ImageDraw.Draw(image)
    add_frame(draw, "01")
    place_logo(image)
    draw = ImageDraw.Draw(image)

    y = draw_sized_lines(draw, [
        ("SOME CITIES", CREAM, 72, 60),
        ("ARE ALREADY", CREAM, 64, 56),
        ("MAKING", CREAM, 108, 83),
        ("NOISE.", RED, 138, 95),
    ], (58, 132))

    draw.rectangle((58, y + 18, 668, y + 24), fill=RED)
    draw_wrapped(
        draw,
        "THE REST WILL ACT SHOCKED WHEN THE FIRST DROP LANDS WITHOUT THEM.",
        (58, y + 50),
        610,
        size=40,
        color=CREAM,
        leading=10,
        font_path=HOOVER,
    )
    return image


def slide_two():
    image = add_gradient(base_image(2), (0, 0, 665, H), 38, 10)
    draw = ImageDraw.Draw(image)
    add_frame(draw, "02")
    place_logo(image)
    draw = ImageDraw.Draw(image)

    y = draw_sized_lines(draw, [
        ("WE’RE COUNTING", CREAM, 52, 46),
        ("CITIES.", YELLOW, 96, 72),
        ("SIZES.", YELLOW, 96, 72),
        ("STREETS.", YELLOW, 96, 72),
        ("RIGHT NOW.", CREAM, 74, 58),
    ], (58, 132))

    draw.rectangle((58, y + 16, 668, y + 22), fill=YELLOW)
    draw_wrapped(
        draw,
        "THOSE SIGNALS DECIDE WHAT GETS MADE—AND WHERE IT LANDS FIRST.",
        (58, y + 48),
        610,
        size=40,
        color=CREAM,
        leading=10,
        font_path=HOOVER,
    )
    return image


def slide_three():
    image = base_image(3)

    # Bring the edited Thane-shirt portrait into the existing shutter poster.
    # The irregular edge keeps the torn-paper campaign language while leaving
    # a protected text field on the left and the cream CTA strip at the bottom.
    portrait = Image.open(MAN_PHOTO).convert("RGBA")
    portrait_width = int(portrait.width * H / portrait.height)
    portrait = portrait.resize((portrait_width, H), Image.Resampling.LANCZOS)
    portrait_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    portrait_layer.alpha_composite(portrait, (370, 0))

    mask = Image.new("L", (W, H), 0)
    mask_draw = ImageDraw.Draw(mask)
    portrait_cutoff = H - 205
    mask_draw.polygon([
        (670, 0), (632, 92), (682, 178), (644, 270),
        (676, 360), (626, 454), (664, 548), (636, 642),
        (680, 738), (642, 834), (670, 934), (626, 1034),
        (654, portrait_cutoff), (W, portrait_cutoff), (W, 0),
    ], fill=255)
    image = Image.composite(portrait_layer, image, mask)
    image = add_gradient(image, (0, 0, 700, 1130), 26, 0)
    draw = ImageDraw.Draw(image)
    add_frame(draw, "03")
    place_logo(image)
    draw = ImageDraw.Draw(image)

    y = draw_sized_lines(draw, [
        ("IF YOUR AREA", CREAM, 64, 54),
        ("DESERVES", CREAM, 64, 54),
        ("THE DROP,", CREAM, 64, 54),
        ("PUT IT ON", CREAM, 64, 54),
        ("THE RECORD.", RED, 68, 58),
    ], (58, 128))

    stamp_y = y + 32
    draw.rectangle((58, stamp_y, 680, stamp_y + 150), fill=RED)
    stamp_f = font(HOOVER, 40)
    draw.text((84, stamp_y + 22), "NO PUBLIC DATE.", font=stamp_f, fill=NIGHT, stroke_width=1, stroke_fill=NIGHT)
    draw.text((84, stamp_y + 78), "NO SYMPATHY RESTOCK.", font=stamp_f, fill=NIGHT, stroke_width=1, stroke_fill=NIGHT)

    cta_y = H - 183
    cta_head = fit_font("PRE-REGISTER FOR FIRST ACCESS", IMPACT, 50, 850)
    draw.text((58, cta_y), "PRE-REGISTER FOR FIRST ACCESS", font=cta_head, fill=NIGHT)
    draw.rectangle((58, cta_y + 64, 650, cta_y + 69), fill=RED)
    cta_f = font(HOOVER, 32)
    draw.text((58, cta_y + 82), "— LINK IN BIO.", font=cta_f, fill=NIGHT)
    draw.text((W - 232, cta_y + 76), "FIRST ACCESS", font=font(TRENCH, 24), fill=NIGHT)
    return image


def build_contact_sheet(slides, version="v1"):
    thumb_w = 360
    thumb_h = int(H * thumb_w / W)
    sheet = Image.new("RGB", (thumb_w * 3 + 80, thumb_h + 80), (20, 20, 18))
    for i, slide in enumerate(slides):
        thumb = slide.convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        sheet.paste(thumb, (20 + i * (thumb_w + 20), 40))
    sheet.save(ROOT / f"apshabd-city-signal-carousel-preview-{version}.jpg", quality=92)


def main():
    slides = [slide_one(), slide_two(), slide_three()]
    if THREE_BY_FOUR:
        for i, slide in enumerate(slides, start=1):
            slide.convert("RGB").save(
                ROOT / f"apshabd-city-signal-slide-{i:02d}-3x4-boxing-hoover-v1.png",
                format="PNG",
                optimize=True,
            )
        build_contact_sheet(slides, version="3x4-boxing-hoover-v1")
        return

    for i, slide in enumerate(slides[:2], start=1):
        slide.convert("RGB").save(
            ROOT / f"apshabd-city-signal-slide-{i:02d}-v1.png",
            format="PNG",
            optimize=True,
        )
    slides[2].convert("RGB").save(
        ROOT / "apshabd-city-signal-slide-03-v2.png",
        format="PNG",
        optimize=True,
    )
    build_contact_sheet(slides, version="v2")


if __name__ == "__main__":
    main()
