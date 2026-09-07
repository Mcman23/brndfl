# Task Assignment: Survey 1 - Admin Panel & Visual Editor WYSIWYG Architecture (R1)
Read ORIGINAL_REQUEST.md at c:\Users\Mcman\Desktop\brndfl-main\.agents\ORIGINAL_REQUEST.md.
Investigate the Admin Panel and Preview iframe architecture in c:\Users\Mcman\Desktop\brndfl-main.

## 2026-09-07T04:21:29Z
You are an Explorer subagent in the Survey phase.
Your working directory is: c:\Users\Mcman\Desktop\brndfl-main\.agents\teamwork_preview_explorer_survey_1
Project root: c:\Users\Mcman\Desktop\brndfl-main
Original user request path: c:\Users\Mcman\Desktop\brndfl-main\.agents\ORIGINAL_REQUEST.md

MANDATORY FIRST STEP: Read c:\Users\Mcman\Desktop\brndfl-main\.agents\ORIGINAL_REQUEST.md, focusing on the latest request dated 2026-09-07T04:18:02Z, specifically:
- R1: Admin Live Preview Click-to-Edit Visual Editor (WYSIWYG)

YOUR INVESTIGATION OBJECTIVE:
Examine the Admin Panel architecture, preview iframe mechanics, and communication:
1. Locate admin HTML/JS/CSS files (e.g., admin.html, js/admin.js or similar).
2. Trace the "Live Site Preview" (`view-preview` iframe): how is it mounted, styled, controlled, and navigated?
3. What mechanism currently exists (if any) for toggling visual edit mode, highlighting elements (e.g. dashed outlines), inline contentEditable or click handlers, and image selection via the Admin's media library?
4. How does the iframe communicate with the Admin parent window (postMessage channels, message types like SAVE_I18N, SAVE_SETTINGS, EDIT_MODE_TOGGLE, etc.)?
5. How does the Admin parent window handle incoming messages and invoke backend API endpoints (e.g., PUT /api/admin/settings or /admin/settings)?
6. Identify all relevant files, functions, event listeners, DOM selectors, and exact line numbers.
7. Outline any missing interfaces, technical risks, or edge cases.

OUTPUT REQUIREMENTS:
- Write your detailed findings to c:\Users\Mcman\Desktop\brndfl-main\.agents\teamwork_preview_explorer_survey_1\survey_report.md
- Write a formal handoff to c:\Users\Mcman\Desktop\brndfl-main\.agents\teamwork_preview_explorer_survey_1\handoff.md
- Send a completion message back to the parent orchestrator with a summary and the file paths.
- YOU ARE READ-ONLY: DO NOT modify any application code files.
