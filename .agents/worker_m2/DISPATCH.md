## 2026-09-07T04:57:29Z
You are a Worker subagent assigned to Milestone 2: Visual Editor Core & Admin Preview Integration (R1).
Your working directory is: c:\Users\Mcman\Desktop\brndfl-main\.agents\worker_m2
Project root: c:\Users\Mcman\Desktop\brndfl-main

MANDATORY INPUTS TO READ BEFORE TOUCHING CODE:
1. c:\Users\Mcman\Desktop\brndfl-main\.agents\ORIGINAL_REQUEST.md (Specifically 2026-09-07T04:18:02Z R1 and Acceptance Criteria)
2. c:\Users\Mcman\Desktop\brndfl-main\.agents\orchestrator_1\PROJECT.md (Milestone 2 scope and interface contracts)
3. c:\Users\Mcman\Desktop\brndfl-main\.agents\teamwork_preview_explorer_survey_1\handoff.md (Detailed architectural survey of Admin preview and visual editor)
4. c:\Users\Mcman\Desktop\brndfl-main\tests\verify-visual-editor.js (58 test assertions covering all required behaviors)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE SCOPE:
- js/visual-editor.js
- admin.html
- js/admin.js
- index.html (if additional data-setting or data-editable attributes are needed)

YOUR TASK REQUIREMENTS:
1. Live Visual Editor Core Engine in js/visual-editor.js:
   - Provide full implementation of public API `window.VisualEditor` (and auto-init):
     - `VisualEditor.init(options)`
     - `VisualEditor.enable()`
     - `VisualEditor.disable()`
     - `VisualEditor.toggle()`
     - `VisualEditor.isActive()`
     - `VisualEditor.on(event, callback)`
     - `VisualEditor.off(event, callback)`
     - `VisualEditor.updateElement(selectorOrEl, val, type)`
     - `VisualEditor.destroy()`
   - Style injection: Self-inject CSS if not already present (`#visual-edit-styles`), providing `.visual-edit-active .visual-editable { outline: 2px dashed rgba(106, 90, 205, 0.6) !important; cursor: pointer !important; position: relative !important; }`, hover dashed color shift, badge styling.
   - Target editable elements: query `[data-i18n]`, `[data-setting]`, `[data-editable]`, `h1, h2, h3, h4, h5, h6`, `p`, `a`, `button`, and `img`.
   - Text click-to-edit inline:
     - On click: set `contentEditable="true"`, focus.
     - On blur / Enter / Escape: disable `contentEditable`. If text changed, dispatch postMessage to parent:
       - For `[data-setting]`: `{ type: 'SAVE_SETTINGS', key: settingKey, value: newText, setting: settingKey }`
       - For `[data-i18n]`: `{ type: 'SAVE_I18N', key: i18nKey, text: newText }`
   - Image click-to-edit:
     - On click: prevent default/navigation, dispatch `{ type: 'OPEN_MEDIA_PICKER', target: selectorOrId, currentUrl: img.src }` (or `REQUEST_IMAGE_PICKER`) to parent.
   - Message listener in iframe:
     - Handle `{ type: 'TOGGLE_VISUAL_EDIT', active: boolean }`
     - Handle `{ type: 'MEDIA_SELECTED', target: selectorOrId, url: string }` / `{ type: 'UPDATE_IMAGE_SRC', ... }`: update target image `src` in DOM and emit setting save if image has `data-setting`.
2. Admin Preview Bar UI in admin.html:
   - In `#view-preview .preview-bar`, add Visual Edit toggle button (`<button id="toggleVisualEditBtn" class="adm-btn adm-btn-secondary" onclick="AdminApp.toggleVisualEdit()">✏️ Vizual Redaktor</button>`).
3. Admin Panel PostMessage & Persistence in js/admin.js:
   - Implement `AdminApp.toggleVisualEdit()`:
     - Track active state. Send `{ type: 'TOGGLE_VISUAL_EDIT', active: isVisualEditActive }` to `#livePreviewIframe.contentWindow`.
     - Update button style/label to indicate active status (e.g. "✏️ Vizual Redaktor: Aktiv").
   - Add `window.addEventListener('message', ...)` in `AdminApp`:
     - Handle `SAVE_SETTINGS`: Call `PUT /api/admin/settings` (and `/admin/settings`) with Bearer auth token and payload `{ [key]: value }`. Show toast/notification on success.
     - Handle `SAVE_I18N`: Call `PATCH /api/admin/translations/:key` or update translation.
     - Handle `OPEN_MEDIA_PICKER` / `REQUEST_IMAGE_PICKER`: Open `#mediaPickerDialog` (`AdminApp.openMediaPickerFor(...)`), and upon selection postMessage `{ type: 'MEDIA_SELECTED', target: data.target, url: selectedUrl }` back to `#livePreviewIframe.contentWindow` and persist to backend settings.
4. Comprehensive Verification:
   - Run `node tests/verify-visual-editor.js` (must pass 58/58)
   - Run `node tests/verify-settings-sync.js` (must pass 53/53)
   - Run `node tests/verify-hero.js` (must pass 68/68)
   - Run `npm test`

Write your formal handoff report in `handoff.md` and send a message to parent orchestrator.
