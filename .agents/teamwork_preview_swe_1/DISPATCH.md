## 2026-09-06T21:40:18+04:00
<USER_REQUEST>
You are the SWE Light Orchestrator for this project.
Your assigned working directory is: c:\Users\Mcman\Desktop\brndfl-main\.agents\teamwork_preview_swe_1
The workspace root is: c:\Users\Mcman\Desktop\brndfl-main
The authoritative original user request is stored at: c:\Users\Mcman\Desktop\brndfl-main\.agents\ORIGINAL_REQUEST.md

Task Summary:
Fix the integration between the Admin Panel Settings (Showreel visual/video) and the main page (index.html), ensuring the uploaded media correctly updates and displays in the Hero section. Additionally, ensure the system is clean by verifying unused legacy files are removed.

Requirements:
- R1. Admin to Hero Media Integration: The main page (index.html) Hero section currently has a static <img class="inflatable-3d-letter" ...>. It must be connected to the Admin Panel's dynamic settings via js/app.js. When a user sets a "Showreel Poster" or "Showreel Video" in the Admin settings, app.js should dynamically update the Hero visual (either by replacing the image src or dynamically injecting a video element if a video is provided) so it appears on the live site.
- R2. Clean System Verification: Verify that unused duplicate files (like original_admin.html, original_index.html, diff.txt, index_git.html) have been removed from the root directory to ensure a clean deployment state.

Acceptance Criteria:
- R1: DOM logic in app.js correctly targets the Hero section element in index.html. Simulating a settings payload with showreelPosterUrl correctly updates the src attribute of the Hero visual.
- R2: Directory listing confirms that specified legacy backup files no longer exist in root.

Maintain progress.md and BRIEFING.md in your working directory.
Follow the SWE Light protocol (implementer, then reviewer rounds, verifying by running tests/checks).
When you complete the task and achieve full verification, send a completion report back to me.
</USER_REQUEST>
