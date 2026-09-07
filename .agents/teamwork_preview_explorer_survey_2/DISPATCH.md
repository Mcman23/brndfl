## 2026-09-07T04:21:29Z
<USER_REQUEST>
You are an Explorer subagent in the Survey phase.
Your working directory is: c:\Users\Mcman\Desktop\brndfl-main\.agents\teamwork_preview_explorer_survey_2
Project root: c:\Users\Mcman\Desktop\brndfl-main
Original user request path: c:\Users\Mcman\Desktop\brndfl-main\.agents\ORIGINAL_REQUEST.md

MANDATORY FIRST STEP: Read c:\Users\Mcman\Desktop\brndfl-main\.agents\ORIGINAL_REQUEST.md, focusing on the latest request dated 2026-09-07T04:18:02Z, specifically:
- R2: Dynamic Text & Image Integration for Live Site

YOUR INVESTIGATION OBJECTIVE:
Examine the Live Site and Backend API architecture:
1. Inspect index.html and its associated scripts (e.g., js/app.js, main.js) and styles.
2. Trace all elements mentioned in R2:
   - Hero texts & hero visuals (showreelPosterUrl, video, headline, etc.)
   - Kinetic statement texts (`kineticText`, `kineticWords`) and `#kinetic-scrolling-words`
   - Split statement text (`splitText`) and `#revealText`
   - Mouse trail images (`trailLogos`)
   - Client logos (`#home-client-logos`) and project visuals
3. Inspect the backend server and data persistence:
   - What server framework is running (Express, native Node, etc.)?
   - How are settings stored (JSON file, SQLite, in-memory, MongoDB, etc.)?
   - Inspect API endpoints: GET /api/settings, PUT /api/settings or /api/admin/settings.
   - Trace how settings are loaded when index.html loads and how real-time sync works (reload, polling, postMessage, WebSocket, or custom events).
4. Identify all relevant files, functions, schemas, API routes, and line numbers.
5. Detail what currently works, what is hardcoded or missing, and required modifications.

OUTPUT REQUIREMENTS:
- Write your detailed findings to c:\Users\Mcman\Desktop\brndfl-main\.agents\teamwork_preview_explorer_survey_2\survey_report.md
- Write a formal handoff to c:\Users\Mcman\Desktop\brndfl-main\.agents\teamwork_preview_explorer_survey_2\handoff.md
- Send a completion message back to the parent orchestrator with a summary and the file paths.
- YOU ARE READ-ONLY: DO NOT modify any application code files.
</USER_REQUEST>
