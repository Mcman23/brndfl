# BRIEFING — 2026-09-07T04:25:00Z

## Mission
Survey the Admin Panel and Preview iframe architecture for R1: Admin Live Preview Click-to-Edit Visual Editor (WYSIWYG).

## 🔒 My Identity
- Archetype: explorer
- Roles: survey, analysis, synthesis
- Working directory: c:\Users\Mcman\Desktop\brndfl-main\.agents\teamwork_preview_explorer_survey_1
- Original parent: 8ef6191c-85e0-4fd3-ab4e-38677d6c69c3
- Milestone: Survey Phase - R1 Admin Live Preview Click-to-Edit Visual Editor Architecture

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do NOT modify application code files
- Write reports in working directory only

## Current Parent
- Conversation ID: 8ef6191c-85e0-4fd3-ab4e-38677d6c69c3
- Updated: 2026-09-07T04:21:29Z

## Investigation State
- **Explored paths**: `admin.html`, `js/admin.js`, `css/admin.css`, `index.html`, `js/visual-editor.js`, `js/app.js`, `js/i18n.js`, `js/data.js`, `js/animations.js`, `backend/src/routes/admin.js`, `backend/src/routes.js`, `backend/src/app.js`, `backend/src/middleware/auth.js`, `backend/prisma/schema.prisma`.
- **Key findings**:
  1. `admin.html` mounts `#livePreviewIframe` in `#view-preview`, but lacks a visual edit mode toggle button in `.preview-bar`.
  2. `js/admin.js` has zero `postMessage` listeners and no `toggleVisualEdit()` function.
  3. `js/visual-editor.js` exists in `index.html` (line 1294), handles `TOGGLE_VISUAL_EDIT` and adds dashed outlines, but queries ONLY `[data-i18n]` and lacks image selection or settings integration.
  4. Backend `PUT /api/admin/settings` (line 1522 in `backend/src/routes/admin.js`) already allows updating `heroTag`, `heroHeadline`, `heroSubtitle`, `kineticText`, `kineticWords`, `splitText`, `trailLogos`, `showreelPosterUrl`, etc.
  5. `admin.html` has `#mediaPickerDialog` (lines 1659–1686) which can easily be wired to iframe image clicks.
- **Unexplored areas**: None for Survey 1. Fully surveyed.

## Key Decisions Made
- Survey completed. Produced `survey_report.md` and 5-component `handoff.md`.
- Identified critical path for implementer: toggle button in Admin, postMessage channel bridge, image picker flow, and backend route alias.

## Artifact Index
- `DISPATCH.md` — Assignment instructions
- `BRIEFING.md` — Persistent working memory
- `progress.md` — Liveness heartbeat
- `survey_report.md` — Comprehensive findings report
- `handoff.md` — Formal 5-component handoff report
