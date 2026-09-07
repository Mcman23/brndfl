## 2026-09-07T04:28:00Z
Task: Milestone 1: Backend API & Live Site Dynamic Data Integration.
Working directory: c:\Users\Mcman\Desktop\brndfl-main\.agents\worker_m1
Project root: c:\Users\Mcman\Desktop\brndfl-main

MANDATORY INPUT FILES TO READ BEFORE TOUCHING CODE:
1. c:\Users\Mcman\Desktop\brndfl-main\.agents\ORIGINAL_REQUEST.md (Specifically 2026-09-07T04:18:02Z R2 and Acceptance Criteria)
2. c:\Users\Mcman\Desktop\brndfl-main\.agents\orchestrator_1\PROJECT.md (Milestone 1 scope and interface contracts)
3. c:\Users\Mcman\Desktop\brndfl-main\.agents\teamwork_preview_explorer_survey_2\handoff.md (Detailed architectural survey of live site, backend API, client records, and kinetic text)

EXCLUSIVE WRITE SCOPE:
- backend/src/routes.js
- backend/src/app.js
- backend/src/middleware/auth.js
- js/data.js
- js/app.js
- index.html
- admin.html
- js/admin.js

YOUR TASK REQUIREMENTS:
1. Fix Missing Client Logos API & Store Integration:
   - In backend/src/routes.js: Add public GET /api/clients that queries active clients ordered by `order` ascending from Prisma DB (`prisma.client.findMany({ where: { active: true }, orderBy: { order: 'asc' } })`) and returns JSON array of clients.
   - In js/data.js: Add `BrandfullStore.getClients()` calling `/api/clients`.
   - In js/app.js: Update `App.loadData()` to fetch `BrandfullStore.getClients()`, store on `this.data.clients`, and pass to `this.renderClientLogos(this.data.clients)`. Ensure client logos render dynamically in `#home-client-logos`.
2. Fix Kinetic Statement Dynamic Text:
   - In index.html: In `<h2 class="kinetic-statement-text">`, wrap the static text "Əhəmiyyətli işlər yaradırıq" with `<span id="kinetic-static-text">Əhəmiyyətli işlər yaradırıq</span>` so `app.js` can target it.
   - In js/app.js: Ensure `renderSiteSettings()` dynamically updates `#kinetic-static-text` with `s.kineticText` and `#kinetic-scrolling-words` with `s.kineticWords`.
3. Fix Hero Subtitle Overwrite & Hero Headline:
   - In js/app.js: In `initDynamicGreeting()`, do NOT overwrite `#dynamic-greeting-text` if `s.heroSubtitle` exists and is already rendered.
   - In js/app.js and index.html: Ensure `s.heroHeadline` is dynamically rendered in the hero headline section.
4. Bind Split Statement Text & Mouse Trail Images:
   - In js/app.js: Ensure `s.splitText` dynamically updates `#revealText` (preserving word/character spans for scroll reveal) and `s.trailLogos` dynamically binds to mouse trail.
5. Admin Panel Settings Synchronization:
   - In admin.html and js/admin.js: Add form controls/wiring for `kineticText`, `kineticWords`, `splitText`, `trailLogos` so admins can edit and save them via `saveSettings()`.
6. Backend Route Aliasing & Bearer Auth:
   - In backend/src/app.js: Ensure `/admin/settings` routes to admin router so both `/admin/settings` and `/api/admin/settings` work.
   - In backend/src/middleware/auth.js: Support `Authorization: Bearer <token>` in `requireAuth` alongside cookies so automated API calls succeed with token.

VERIFICATION REQUIREMENTS:
- Run `node tests/verify-hero.js` (or `npm test`) to ensure all 68 baseline tests pass without regression.
- Write your progress and a formal 5-component handoff report (handoff.md) in your working directory.
- Send a completion message to the parent orchestrator.
