# BRIEFING — Implementer Round 1

## Mission
Fix Admin Settings to Hero section media integration in index.html/app.js (R1) and verify cleanup of legacy backup files (R2).

## Role & Working Directory
- Role: teamwork_preview_implementer
- Assigned working directory: c:\Users\Mcman\Desktop\brndfl-main\.agents\teamwork_preview_implementer_1
- Workspace root: c:\Users\Mcman\Desktop\brndfl-main

## Requirements
- R1: Connect static `<img class="inflatable-3d-letter" ...>` in `index.html` Hero section to dynamic Admin settings via `js/app.js`. Support dynamic updating of Hero visual with `showreelPosterUrl` (updating `src`) and `showreelVideoUrl` (dynamic video injection if video is provided without poster, modal video sync).
- R2: Verify that unused legacy files (`original_admin.html`, `original_index.html`, `diff.txt`, `index_git.html`) have been removed from the root directory.

## Implementation Details
1. `index.html`:
   - Added `id="heroShowreelVisual"` to the inflatable-3d-letter `<img>` element in the hero opening section.
   - Retained `.hero-dark-center-visual`, `.hero-dark-opening`, and `.inflatable-3d-letter` class structure.
2. `js/app.js`:
   - Updated `renderSiteSettings()` to query `#heroShowreelVisual`, `.hero-dark-center-visual img`, and `.inflatable-3d-letter`.
   - Connected `s.showreelPosterUrl` to dynamically update `heroVisual.src`.
   - Connected `s.showreelVideoUrl` to dynamically inject/update a `<video>` element if video is provided, as well as updating `#heroShowreelVideo` and `#modalVideo` source.
   - Restored image visual and removed injected video element if poster is subsequently provided.
3. Clean System Verification:
   - Verified that `original_admin.html`, `original_index.html`, `diff.txt`, and `index_git.html` are absent from root directory.
