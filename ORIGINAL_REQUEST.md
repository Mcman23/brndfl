# Original User Request

## 2026-09-06T17:39:45Z

# Teamwork Project Prompt — Draft

> Status: Ready for launch — awaiting user approval
> Goal: Craft prompt ↑ get user approval → delegate to teamwork_preview
> Requested team: Small focused team

This is a single self-contained fix; keep it small and focused. 
The task is to fix the integration between the Admin Panel Settings (Showreel visual/video) and the main page (`index.html`), ensuring the uploaded media correctly updates and displays in the Hero section. Additionally, ensure the system is clean by verifying unused legacy files are removed.

Working directory: c:\uSers\mcman\Desktop\brndfl-main
Integrity mode: development

3# Requirements

### R1. Admin to Hero Media Integration
The main page (`index.html`) Hero section currently has a static `<img class="inflatable-3d-letter" ...>`. It must be connected to the Admin Panel's dynamic settings via `js/app.js`. When a user sets a "Showreel Poster" or "Showreel Video" in the Admin settings, `app.js` must dynamically update the Hero visual (either by replacing the image `src` or dynamically injecting a video element if a video is provided) so it appears on the live site. 

### R2. Clean System Verification
Verify that unused duplicate files (like `original_admin.html`, `original_index.html`, `diff.txt`, `index_git.html`) have been removed from the root directory to ensure a clean deployment state.

3# Acceptance Criteria

### R1 Verification (Programmatic/Agent-as-judge)
- [ ] Inspecting the DOM logic in `app.js` confirms that it correctly targets the Hero section element in `index.html`.
- [ ] Simulating a `settings` payload with `showreelPosterUrl` correctly updates the `src` attribute of the Hero visual.

### R2 Verification (Programmatic)
- [ ] A directory listing confirms that the specified legacy backup files no longer exist in the root directory.


## 2026-09-07T04:18:02Z

# Teamwork Project Prompt — Draft

> Status: Ready for launch — awaiting user approval
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Full team

Live Visual Editor integration for Admin Preview iframe + real-time DB persistence + Desktop module export.

Working directory: c:\Users\Mcman\Desktop\brndfl-main
Integrity mode: development

## Requirements

### R1. Admin Live Preview Click-to-Edit Visual Editor (WYSIWYG)
Enable interactive inline visual editing within the Admin Panel's Live Site Preview (`view-preview` iframe). Admin users can click on any text, heading, paragraph, button, image, or section directly inside the preview iframe to edit text inline or pick images from the media library. Clicking "Save" or blurring an edited element sends the updated content via postMessage to the Admin app, which updates the backend database via API (`/api/admin/settings` or entity endpoints) and dynamically reloads/updates the live site.

### R2. Dynamic Text & Image Integration for Live Site
Ensure all hero texts, kinetic statement texts (`kineticText`, `kineticWords`), split statement text (`splitText`), mouse trail images (`trailLogos`), client logos, and project visuals on the live site (`index.html`) are 100% dynamically driven from the API settings and client/project records, with immediate real-time sync when updated in the Admin panel or Visual Editor.

### R3. Standalone Reusable Module Export to Desktop
Package and export the entire Live Visual Editor module as a clean, standalone, zero-dependency reusable module into `C:\Users\Mcman\Desktop\visual-editor-module` containing clean documentation (`README.md`), `visual-editor.js`, `visual-editor.css`, and a standalone demo page (`demo.html`) so it can be easily integrated into future web projects.

## Acceptance Criteria

### R1 Verification (Programmatic / Agent-as-Judge)
- [ ] Toggling visual edit mode in the Admin preview iframe highlights editable elements with a dashed outline.
- [ ] Clicking and editing text or replacing an image updates the DOM and dispatches a postMessage event to the parent Admin window.
- [ ] The Admin parent window processes `SAVE_I18N` or `SAVE_SETTINGS` postMessages and issues a successful `PUT /admin/settings` request to persist changes in the database.

### R2 Verification (Programmatic)
- [ ] GET `/api/settings` returns updated values for `splitText`, `kineticText`, `kineticWords`, `trailLogos`, and `heroHeadline`.
- [ ] `index.html` dynamically updates `#revealText`, `#kinetic-scrolling-words`, `#home-client-logos`, and hero visuals when settings are updated.

### R3 Verification (Programmatic)
- [ ] Directory `C:\Users\Mcman\Desktop\visual-editor-module` exists and contains `visual-editor.js`, `visual-editor.css`, `README.md`, and `demo.html`.
- [ ] The exported module can be included in any web page via a single `<script>` tag.