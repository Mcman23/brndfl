# Handoff Report: Track 3 — Standalone Visual Editor Module (R3) & Test Architecture

**Author**: Spec Miner (Survey Subagent 3)  
**Date**: 2026-09-07  
**Type**: Hard Handoff (Task Complete)  
**Working Directory**: `c:\Users\Mcman\Desktop\brndfl-main\.agents\teamwork_preview_explorer_survey_3`  
**Parent Conversation ID**: `8ef6191c-85e0-4fd3-ab4e-38677d6c69c3`  

---

## 1. Observation

1. **User Request & Requirements**:
   - `c:\Users\Mcman\Desktop\brndfl-main\.agents\ORIGINAL_REQUEST.md` (lines 56-58, 70-72):
     ```markdown
     ### R3. Standalone Reusable Module Export to Desktop
     Package and export the entire Live Visual Editor module as a clean, standalone, zero-dependency reusable module into `C:\Users\Mcman\Desktop\visual-editor-module` containing clean documentation (`README.md`), `visual-editor.js`, `visual-editor.css`, and a standalone demo page (`demo.html`) so it can be easily integrated into future web projects.
     ...
     ### R3 Verification (Programmatic)
     - [ ] Directory `C:\Users\Mcman\Desktop\visual-editor-module` exists and contains `visual-editor.js`, `visual-editor.css`, `README.md`, and `demo.html`.
     - [ ] The exported module can be included in any web page via a single `<script>` tag.
     ```

2. **Desktop Directory Status**:
   - `list_dir` on `C:\Users\Mcman\Desktop` confirms `visual-editor-module` directory does NOT currently exist.

3. **Current Visual Editor Implementation**:
   - `c:\Users\Mcman\Desktop\brndfl-main\js\visual-editor.js` exists (118 lines, 4022 bytes).
   - Currently implements an IIFE listening for `{ type: 'TOGGLE_VISUAL_EDIT', active: boolean }` and queries only `[data-i18n]` (line 25).
   - Only emits `{ type: 'SAVE_I18N', key, text }` on line 104; does not yet support `SAVE_SETTINGS`, image replacement (`REQUEST_IMAGE_PICKER`), or expose a public programmatic API (`window.VisualEditor`).
   - Already embeds a basic inline `<style id="visual-edit-styles">` snippet (lines 35-55) demonstrating proof-of-concept for single `<script>` inclusion.
   - `c:\Users\Mcman\Desktop\brndfl-main\index.html` line 1294 imports `<script src="js/visual-editor.js"></script>`.

4. **Admin Panel Preview Section**:
   - `c:\Users\Mcman\Desktop\brndfl-main\admin.html` lines 693-704:
     ```html
     <div id="view-preview" class="admin-view" style="display: none;">
       <div class="preview-container">
         <div class="preview-bar">
           <span style="font-size:0.9rem; font-weight:700; color:var(--adm-text-muted);">CANLI SİNXRONİZASİYA</span>
           <div style="display:flex; gap:0.75rem;">
             <button class="adm-btn adm-btn-secondary" style="padding:0.4rem 0.85rem; font-size:0.8rem;" onclick="AdminApp.refreshPreview()">🔄 Yenilə</button>
             <a href="index.html" target="_blank" class="adm-btn adm-btn-primary" style="padding:0.4rem 0.85rem; font-size:0.8rem;">Ayrı Pəncərədə Aç ↗</a>
           </div>
         </div>
         <iframe id="livePreviewIframe" class="preview-iframe" src="index.html" style="width:100%; height:75vh; border:0;"></iframe>
       </div>
     </div>
     ```
   - Grep for `TOGGLE_VISUAL_EDIT` in `admin.js` returned 0 matches. The Admin preview bar does not yet contain the visual edit toggle button, and `AdminApp` has not wired the message listener for `SAVE_I18N`, `SAVE_SETTINGS`, or image picking.

5. **Existing Test Harness & Scripts**:
   - `c:\Users\Mcman\Desktop\brndfl-main\package.json`:
     ```json
     "scripts": {
       "dev": "cd backend && npm run dev",
       "start": "cd backend && npm start",
       "test": "node tests/verify-hero.js",
       "postinstall": "prisma generate"
     }
     ```
   - Executing `node tests/verify-hero.js` via `run_command` exits with code 0 and passes all 68 assertions in < 150ms without any external test runner (Jest/Mocha/Playwright).
   - Uses native ES modules and a custom DOM simulation harness (`MockElement`, `MockDocument`).
   - `tests/test-runner.html` exists for visual in-browser verification.

6. **Backend Settings & Prisma Schema**:
   - `backend/prisma/schema.prisma` lines 193-233 defines `SiteSettings` containing `heroTag`, `heroHeadline`, `heroSubtitle`, `showreelVideoUrl`, `showreelPosterUrl`, `kineticText`, `kineticWords`, `splitText`, `trailLogos`.
   - `backend/src/routes.js` lines 478-526 provides `GET /api/settings` returning `publicSettings` object with all dynamic fields.
   - `backend/src/routes/admin.js` line 1522 provides `PUT /api/admin/settings` updating these exact fields.

---

## 2. Logic Chain

1. **Need for Standalone Architecture (R3)**:
   - Observation 1 and Observation 2 establish that `C:\Users\Mcman\Desktop\visual-editor-module` must exist and contain `visual-editor.js`, `visual-editor.css`, `README.md`, and `demo.html`.
   - Observation 1 explicitly requires that the module can be included in any web page via a single `<script>` tag with zero dependencies.
   - Observation 3 shows that `js/visual-editor.js` already demonstrated the ability to self-inject fallback `<style>` tags if CSS is not linked.
   - Therefore, by making `visual-editor.js` fully self-contained (self-injecting default styles while also shipping `visual-editor.css` for customization), exposing a clean `window.VisualEditor` API, and bundling an interactive `demo.html` and `README.md`, R3 will be completely satisfied.

2. **Closing the WYSIWYG Integration Loop (R1)**:
   - Observation 3 shows `visual-editor.js` currently only knows about `[data-i18n]` and sends `SAVE_I18N`.
   - Observation 4 shows `admin.html` and `admin.js` have the preview iframe (`#livePreviewIframe`) but lack the toggle button and message handler.
   - Observation 6 shows backend endpoints `PUT /api/admin/settings` and `PATCH /api/admin/translations/:key` already exist.
   - Therefore, by adding `[data-setting]` support, image replacement postMessages, an Admin toggle button, and Admin window message listeners calling the existing endpoints, R1 will be end-to-end functional.

3. **Optimal Test Architecture Across R1, R2, R3**:
   - Observation 5 shows the repository already has an ultra-fast, zero-dependency Node test harness pattern in `tests/verify-hero.js` running 68 tests in < 150ms.
   - Installing heavy test frameworks (like Playwright, Cypress, or Jest) would introduce significant external dependencies and slow down execution.
   - Therefore, the recommended test architecture for the E2E Testing Track is:
     1. `tests/verify-visual-editor.js` (testing R1 WYSIWYG toggling, contenteditable, blur save, postMessage bridges, and R3 Desktop module file existence + integrity).
     2. `tests/verify-settings-sync.js` (testing R2 `GET /api/settings` schema and DOM updates for `#revealText`, `#kinetic-scrolling-words`, `#home-client-logos`, mouse trail, hero visuals).
     3. `tests/run-all-tests.js` as master runner hooked to `npm test`.

---

## 3. Caveats

1. **Desktop Path Access**: The path `C:\Users\Mcman\Desktop\visual-editor-module` is on the local file system. If run in restricted non-Windows CI environments, tests should check local or mock Desktop paths; however, in this user environment, the Desktop is directly writable and located at `C:\Users\Mcman\Desktop\`.
2. **Prisma DB Connection**: Unit tests for DOM updates and postMessage schemas should use mocked responses to be fast and offline-capable, while an integration step can query live API endpoints when the backend server is running.
3. **No other caveats**: The requirements, contracts, existing codebase, and acceptance criteria are completely clear and consistent.

---

## 4. Conclusion

- **R3 Status**: Ready for implementation. The target path `C:\Users\Mcman\Desktop\visual-editor-module` and 4 mandatory files (`visual-editor.js`, `visual-editor.css`, `README.md`, `demo.html`) are fully specified with zero runtime dependencies and single `<script>` inclusion.
- **R1 & R2 Integration**: Existing `js/visual-editor.js` needs extension to support `data-setting` attributes, image picker bridges, and a public `window.VisualEditor` API; `admin.html` and `admin.js` need toggle button and message handling; `app.js` and `index.html` need complete binding for `#kinetic-scrolling-words`, `#revealText`, `#home-client-logos`, and `trailLogos`.
- **Test Architecture**: Fully defined zero-dependency Node test suite (`tests/verify-visual-editor.js`, `tests/verify-settings-sync.js`, `tests/run-all-tests.js`) maintaining seamless compatibility with `npm test`.

---

## 5. Verification Method

To independently verify the findings in this survey:
1. **Inspect Survey Report**:
   - Check `c:\Users\Mcman\Desktop\brndfl-main\.agents\teamwork_preview_explorer_survey_3\survey_report.md`.
2. **Verify Existing Hero Test Baseline**:
   - Run: `node tests/verify-hero.js`
   - Expected: 68 tests passing, exit code 0.
3. **Verify Desktop Directory State**:
   - Check `Test-Path C:\Users\Mcman\Desktop\visual-editor-module` in PowerShell.
   - Expected: `False` (confirming export needs to be created during implementation).
4. **Inspect Route & Schema Alignments**:
   - View `backend/src/routes.js` lines 478-526 to confirm `GET /api/settings` fields.
   - View `backend/src/routes/admin.js` lines 1522-1545 to confirm `PUT /api/admin/settings` allowlist.
