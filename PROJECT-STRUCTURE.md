# APSHABD project structure

This repository is organized around a protected live website at the root. The
root HTML, CSS, and JavaScript files intentionally remain together because the
site is deployed directly from this directory and uses relative asset paths.

## Main folders

- `assets/` — media used by the live website, organized by brand, city,
  campaign, icons, fonts, social previews, and video.
- `creative/` — editable brand design files, city design libraries, generated
  visual outputs, and social campaign working material.
- `content/` — finished content deliverables, currently presentation decks and
  their inspection reports.
- `docs/` — brand documentation, marketing copy, design decisions, and website
  operating notes.
- `tools/` — scripts used to generate or maintain project artifacts.
- `.workspace/` and other dot-prefixed QA/build folders — temporary local
  working material that is not deployed.

## Protected website core

Keep the root `*.html`, `*.css`, and `*.js` files together with `.htaccess`,
`robots.txt`, `sitemap.xml`, `site.webmanifest`, `.well-known/`, and `assets/`.
Moving any of these requires updating page references and deployment rules.

## Organization map

- `design/` → `creative/brand-design/`
- `designs/` → `creative/city-design-library/`
- `City Designs/` → `creative/city-design-legacy/`
- `output/` → `creative/generated-output/`
- `all posts/` → `creative/social/published-posts/`
- `social/` → `creative/social/campaigns/`
- `Logo/` → `assets/brand/legacy-logo-media/`
- `assets/model 2/` → `assets/reference-models/`
- Root presentation files → `content/presentations/`
- Root project documents → the appropriate `docs/` category
