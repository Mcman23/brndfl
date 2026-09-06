# Original User Request

## 2026-09-06T17:39:45Z

# Teamwork Project Prompt — Draft

> Status: Ready for launch — awaiting user approval
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Small focused team

This is a single self-contained fix; keep it small and focused. 
The task is to fix the integration between the Admin Panel Settings (Showreel visual/video) and the main page (`index.html`), ensuring the uploaded media correctly updates and displays in the Hero section. Additionally, ensure the system is clean by verifying unused legacy files are removed.

Working directory: c:\Users\Mcman\Desktop\brndfl-main
Integrity mode: development

## Requirements

### R1. Admin to Hero Media Integration
The main page (`index.html`) Hero section currently has a static `<img class="inflatable-3d-letter" ...>`. It must be connected to the Admin Panel's dynamic settings via `js/app.js`. When a user sets a "Showreel Poster" or "Showreel Video" in the Admin settings, `app.js` should dynamically update the Hero visual (either by replacing the image `src` or dynamically injecting a video element if a video is provided) so it appears on the live site. 

### R2. Clean System Verification
Verify that unused duplicate files (like `original_admin.html`, `original_index.html`, `diff.txt`, `index_git.html`) have been removed from the root directory to ensure a clean deployment state.

## Acceptance Criteria

### R1 Verification (Programmatic/Agent-as-judge)
- [ ] Inspecting the DOM logic in `app.js` confirms that it correctly targets the Hero section element in `index.html`.
- [ ] Simulating a `settings` payload with `showreelPosterUrl` correctly updates the `src` attribute of the Hero visual.

### R2 Verification (Programmatic)
- [ ] A directory listing confirms that the specified legacy backup files no longer exist in the root directory.
