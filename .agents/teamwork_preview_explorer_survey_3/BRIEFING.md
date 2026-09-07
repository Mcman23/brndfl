# BRIEFING — 2026-09-07T04:22:00Z

## Mission
Survey and specify requirements for Standalone Reusable Module Export to Desktop (R3) and testing infrastructure / acceptance criteria across R1, R2, R3.

## 🔒 My Identity
- Archetype: Spec Miner
- Roles: Teamwork specialist, Specification Miner
- Working directory: c:\Users\Mcman\Desktop\brndfl-main\.agents\teamwork_preview_explorer_survey_3
- Original parent: 8ef6191c-85e0-4fd3-ab4e-38677d6c69c3
- Milestone: Survey Phase - Track 3 (R3 Standalone Module Export & Test Architecture)

## 🔒 Key Constraints
- Read-only on application codebase; do NOT modify application code files.
- Deliver findings to survey_report.md and formal handoff to handoff.md.
- Follow Handoff Protocol (Observation, Logic Chain, Caveats, Conclusion, Verification Method).
- Send completion message to parent via send_message.

## Current Parent
- Conversation ID: 8ef6191c-85e0-4fd3-ab4e-38677d6c69c3
- Updated: 2026-09-07T04:22:00Z

## Task Summary
- **What to survey**:
  1. R3 requirements: Target path `C:\Users\Mcman\Desktop\visual-editor-module`, required files (`visual-editor.js`, `visual-editor.css`, `README.md`, `demo.html`), zero-dependency single `<script>` inclusion, API / interface contract (init, config, events, postMessage bridges).
  2. Test infrastructure: Existing tests/harnesses in project, how to run programmatic automated tests for R1, R2, R3, exact test runner and test structure recommendation.
- **Success criteria**: Comprehensive specification report and handoff covering all interface requirements and test architecture.
- **Interface contracts**: ORIGINAL_REQUEST.md
- **Code layout**: .agents/ contains metadata only.

## Key Decisions Made
- Export target: `C:\Users\Mcman\Desktop\visual-editor-module` with 4 mandatory files (`visual-editor.js`, `visual-editor.css`, `README.md`, `demo.html`).
- Zero-dependency design: `visual-editor.js` embeds fallback stylesheet injection so a single `<script>` tag is 100% self-sufficient, while also providing `visual-editor.css` for custom styling.
- Public API contract: Expose `window.VisualEditor` with `.init()`, `.enable()`, `.disable()`, `.toggle()`, `.on()`, `.off()`, `.destroy()`.
- Dual message contract: Support both `SAVE_I18N` and `SAVE_SETTINGS` alongside `REQUEST_IMAGE_PICKER` and `UPDATE_IMAGE_SRC`.
- Testing architecture: Replicate proven zero-dependency Node.js harness from `tests/verify-hero.js` to create `tests/verify-visual-editor.js`, `tests/verify-settings-sync.js`, and master runner `tests/run-all-tests.js` integrated into `npm test`.

## Artifact Index
- survey_report.md — Detailed findings for R3 & Test Architecture
- handoff.md — 5-component handoff report
- progress.md — Liveness heartbeat and progress tracking
