from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "01-source-data"
OUTPUT = ROOT / "04-ready-to-upload"
WIDTH, HEIGHT = 1920, 1080

BG = "#020b08"
GRID = "#133026"
CREAM = "#f1e8d5"
RED = "#ef3340"
MUTED = "#496d5f"


def load_geojson(name: str) -> dict:
    return json.loads((SOURCE / name).read_text(encoding="utf-8-sig"))


def geometry_rings(geometry: dict):
    kind = geometry.get("type")
    coordinates = geometry.get("coordinates", [])
    if kind == "Polygon":
        for ring in coordinates:
            yield ring
    elif kind == "MultiPolygon":
        for polygon in coordinates:
            for ring in polygon:
                yield ring


def all_rings(collection: dict):
    for feature in collection.get("features", []):
        yield from geometry_rings(feature.get("geometry", {}))


def bounds(rings):
    points = [point for ring in rings for point in ring]
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    return min(xs), min(ys), max(xs), max(ys)


def projector(extent, padding_x=190, padding_y=115):
    min_x, min_y, max_x, max_y = extent
    scale = min(
        (WIDTH - 2 * padding_x) / (max_x - min_x),
        (HEIGHT - 2 * padding_y) / (max_y - min_y),
    )
    offset_x = (WIDTH - (max_x - min_x) * scale) / 2
    offset_y = (HEIGHT - (max_y - min_y) * scale) / 2

    def project(point):
        lon, lat = point[:2]
        return (
            offset_x + (lon - min_x) * scale,
            HEIGHT - (offset_y + (lat - min_y) * scale),
        )

    return project


def background():
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    for x in range(0, WIDTH + 1, 64):
        draw.line((x, 0, x, HEIGHT), fill=GRID, width=1)
    for y in range(0, HEIGHT + 1, 64):
        draw.line((0, y, WIDTH, y), fill=GRID, width=1)
    for x in range(0, WIDTH + 1, 320):
        draw.line((x, 0, x, HEIGHT), fill="#1b4938", width=2)
    for y in range(0, HEIGHT + 1, 320):
        draw.line((0, y, WIDTH, y), fill="#1b4938", width=2)
    return image


def draw_glow(image, line_sets, color, width, blur):
    glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    for points in line_sets:
        if len(points) > 1:
            glow_draw.line(points, fill=color, width=width, joint="curve")
    glow = glow.filter(ImageFilter.GaussianBlur(blur))
    image.paste(glow, (0, 0), glow)


def draw_map(collection, output_name, marker=None, district_mode=False):
    rings = list(all_rings(collection))
    project = projector(bounds(rings), 240 if district_mode else 360, 120)
    projected = [[project(point) for point in ring] for ring in rings]

    image = background()
    draw_glow(image, projected, (239, 51, 64, 120), 16, 16)
    draw = ImageDraw.Draw(image)

    for points in projected:
        if len(points) < 3:
            continue
        draw.polygon(points, fill="#061b14")
        draw.line(points, fill=RED, width=5 if district_mode else 4, joint="curve")

    # Editorial framing guides kept away from the geography.
    draw.line((86, 86, 425, 86), fill=CREAM, width=2)
    draw.line((86, 86, 86, 270), fill=CREAM, width=2)
    draw.line((WIDTH - 86, HEIGHT - 86, WIDTH - 425, HEIGHT - 86), fill=MUTED, width=2)
    draw.line((WIDTH - 86, HEIGHT - 86, WIDTH - 86, HEIGHT - 270), fill=MUTED, width=2)

    if marker is not None:
        x, y = project(marker)
        marker_glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
        marker_draw = ImageDraw.Draw(marker_glow)
        marker_draw.ellipse((x - 42, y - 42, x + 42, y + 42), fill=(239, 51, 64, 150))
        marker_glow = marker_glow.filter(ImageFilter.GaussianBlur(25))
        image.paste(marker_glow, (0, 0), marker_glow)
        draw = ImageDraw.Draw(image)
        draw.ellipse((x - 24, y - 24, x + 24, y + 24), outline=RED, width=3)
        draw.ellipse((x - 8, y - 8, x + 8, y + 8), fill=CREAM)

    image.save(OUTPUT / output_name, optimize=True)


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    india = load_geojson("india-adm0-geoboundaries.geojson")
    mumbai = load_geojson("mumbai-districts.geojson")

    draw_map(
        india,
        "01-india-start-frame-16x9.png",
        marker=(72.8777, 19.0760),
        district_mode=False,
    )
    draw_map(
        mumbai,
        "02-mumbai-geography-reference-16x9.png",
        marker=(72.8777, 19.0760),
        district_mode=True,
    )


if __name__ == "__main__":
    main()
