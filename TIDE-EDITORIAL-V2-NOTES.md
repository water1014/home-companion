# TIDE Editorial Refresh v2

This iteration follows the user's visual references: editorial keepsake journal, restrained typography, paper texture, warm watercolor light, and muted antique-gold accents.

## Changes
- Added `css/tide-editorial.css` as a visual-only override layer.
- Linked the new stylesheet after `css/tide-refresh.css`.
- Bumped the service-worker cache name and added the stylesheet to its precache list.
- Kept the existing DOM, data model, and interaction code intact.

## Apply
Upload the contents of this folder to the existing GitHub Pages repository, preserving directory structure. Keep a backup first. Test the site on desktop and mobile after deployment. This package has not been browser-automated for full visual regression testing.
