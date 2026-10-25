# TIDE Editorial v3 — Minimal Keepsake

## Design direction
- Minimal archival-journal layout, restrained serif typography, paper whites, ink, muted antique gold.
- Each major page receives a low-contrast local illustration watermark using existing bundled sticker assets (no external image dependency).
- Chat bubbles and composer are softened to feel more like a private correspondence space.
- Existing application DOM, navigation, memory, diary, gallery, settings, and model integration logic are preserved.

## Files changed
- `css/tide-editorial.css`: updated editorial design tokens and page-specific ambient illustration styling.
- `sw.js`: cache version bumped to force clients to fetch the updated stylesheet.

## Deployment
Back up the current repository, then upload the contents of this project preserving the directory structure. After GitHub Pages deploys, test the home, chat, records, settings, calendar and todo screens on both desktop and mobile. This is a source update and has not been fully browser-automated for visual regression.
