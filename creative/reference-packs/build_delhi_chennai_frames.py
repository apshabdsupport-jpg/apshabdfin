from __future__ import annotations

import importlib.util
import json
from pathlib import Path


PACKS = Path(__file__).resolve().parent
BUILDER_PATH = (
    PACKS
    / "mumbai-omni-map-animation"
    / "tools"
    / "build_reference_frames.py"
)

spec = importlib.util.spec_from_file_location("map_frame_builder", BUILDER_PATH)
builder = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(builder)


CITY_JOBS = [
    {
        "slug": "delhi",
        "latitude": 28.7041,
        "longitude": 77.1025,
    },
    {
        "slug": "chennai",
        "latitude": 13.0827,
        "longitude": 80.2707,
    },
]


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def build_city(job: dict) -> None:
    root = PACKS / f"{job['slug']}-omni-map-animation"
    source = root / "01-source-data"
    output = root / "04-ready-to-upload"
    output.mkdir(parents=True, exist_ok=True)

    india = load(source / "india-adm0-geoboundaries.geojson")
    city = load(source / f"{job['slug']}-boundary.geojson")
    marker = (job["longitude"], job["latitude"])

    builder.OUTPUT = output
    builder.draw_map(
        india,
        "01-india-start-frame-16x9.png",
        marker=marker,
        district_mode=False,
    )
    builder.draw_map(
        city,
        f"02-{job['slug']}-geography-reference-16x9.png",
        marker=marker,
        district_mode=True,
    )


def main() -> None:
    for job in CITY_JOBS:
        build_city(job)


if __name__ == "__main__":
    main()
