## 2026-09-07T04:28:00Z
You are an E2E Test Writer subagent on the independent E2E Testing Track.
Your working directory is: c:\Users\Mcman\Desktop\brndfl-main\.agents\test_writer_e2e
Project root: c:\Users\Mcman\Desktop\brndfl-main

MANDATORY INPUT FILES TO READ BEFORE TOUCHING CODE:
1. c:\Users\Mcman\Desktop\brndfl-main\.agents\ORIGINAL_REQUEST.md (Specifically 2026-09-07T04:18:02Z R1, R2, R3, and Acceptance Criteria)
2. c:\Users\Mcman\Desktop\brndfl-main\.agents\orchestrator_1\PROJECT.md (Project Architecture, Milestones, and Interface Contracts)
3. c:\Users\Mcman\Desktop\brndfl-main\.agents\teamwork_preview_explorer_survey_3\handoff.md (Test Architecture specification and zero-dependency harness pattern)

EXCLUSIVE WRITE SCOPE:
- tests/ (create tests/verify-settings-sync.js, tests/verify-visual-editor.js, tests/verify-desktop-module.js, tests/run-all-tests.js)
- package.json (update test script to run master runner)
- TEST_INFRA.md and TEST_READY.md (in project root or .agents/orchestrator_1/)

YOUR TASK REQUIREMENTS:
1. Build Opaque-Box Automated Test Suite (Tiers 1-4) following the 4-Tier Test Case Design Methodology:
   - Tier 1 (Feature Coverage, >=5 tests per feature):
     - R1: Visual edit mode toggle in preview iframe, dashed outline highlight, contenteditable text click/blur, postMessage bridge `SAVE_SETTINGS`, `SAVE_I18N`, image click postMessage `OPEN_MEDIA_PICKER`, Admin parent listener invoking PUT /api/admin/settings.
     - R2: GET /api/settings schema (all fields present), GET /api/clients returns active client list, DOM dynamic updates for `#revealText` (splitText), `#kinetic-scrolling-words` (kineticWords), `#kinetic-static-text` (kineticText), `#home-client-logos` (clientLogos), hero visual/poster, heroSubtitle greeting preservation.
     - R3: Desktop directory C:\Users\Mcman\Desktop\visual-editor-module exists, contains visual-editor.js, visual-editor.css, README.md, demo.html, single script tag inclusion capability, zero external dependencies.
   - Tier 2 (Boundary & Corner Cases, >=5 tests per feature):
     - Empty/null values for settings, long strings, special characters, missing DOM elements handled gracefully without crashing, disconnected parent window fallback.
   - Tier 3 (Cross-Feature Combinations, pairwise coverage):
     - Visual editor blur save -> postMessage -> admin handler -> PUT /admin/settings -> backend DB update -> live site dynamic sync.
   - Tier 4 (Real-World Application Scenarios):
     - End-to-end admin workflow: toggle visual edit mode, update headline, pick media logo, save, verify live site reflects changes.
2. Structure Test Harness:
   - Use native Node.js ES modules and custom DOM simulation following `tests/verify-hero.js` pattern (zero heavy external framework dependencies like Playwright/Puppeteer, fast <1s execution).
   - Create `tests/run-all-tests.js` as the master runner that executes `verify-hero.js`, `verify-settings-sync.js`, `verify-visual-editor.js`, and `verify-desktop-module.js`.
   - Update `package.json` "test" script to: `"node tests/run-all-tests.js"`.
3. Publish `TEST_INFRA.md` and `TEST_READY.md` documenting coverage summary and how to run tests.
4. Run `npm test` or `node tests/run-all-tests.js` to verify test runner execution. Note: Tests for M2/M3 may initially fail or can be structured so that once M1/M2/M3 implement features, they turn green. Document current test results in handoff.md.

VERIFICATION & OUTPUT:
- Write formal 5-component handoff report to c:\Users\Mcman\Desktop\brndfl-main\.agents\test_writer_e2e\handoff.md.
- Send completion message to parent orchestrator.
