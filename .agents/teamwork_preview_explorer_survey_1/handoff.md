# Handoff Report: Survey 1 - Admin Panel & Visual Editor WYSIWYG Architecture (R1)

**Agent**: teamwork_preview_explorer_survey_1 (Explorer)  
**Recipient**: parent (Orchestrator, ID: `8ef6191c-85e0-4fd3-ab4e-38677d6c69c3`)  
**Type**: Hard Handoff (Survey Complete)  
**Related Artifacts**:
- `survey_report.md`: `c:\Users\Mcman\Desktop\brndfl-main\.agents\teamwork_preview_explorer_survey_1\survey_report.md`
- `BRIEFING.md`: `c:\Users\Mcman\Desktop\brndfl-main\.agents\teamwork_preview_explorer_survey_1\BRIEFING.md`
- `progress.md`: `c:\Users\Mcman\Desktop\brndfl-main\.agents\teamwork_preview_explorer_survey_1\progress.md`

---

## 1. Observation

1. **Admin Preview Iframe Mounting and Controls**:
   - `admin.html` lines 693–704:
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
   - Sidebar tab trigger in `admin.html` line 123: `<button class="sidebar-btn" data-tab="preview" style="color:var(--adm-magenta);">...Canlı Sayt Önizləməsi 👁️</button>`.
   - `js/admin.js` line 928–929: `if (tabId === 'preview') { this.refreshPreview(); }`.
   - `js/admin.js` lines 3182–3185:
     ```javascript
     refreshPreview() {
       const iframe = document.getElementById('livePreviewIframe');
       if (iframe) iframe.src = iframe.src;
     }
     ```
   - Direct grep for `postMessage` in `js/admin.js` yielded 0 results. The Admin panel has no `window.addEventListener('message')` and no button to toggle visual editing.

2. **Existing Visual Editor Implementation**:
   - `index.html` line 1294: `<script src="js/visual-editor.js"></script>`.
   - `js/visual-editor.js` lines 8–22 listens for `TOGGLE_VISUAL_EDIT`:
     ```javascript
     window.addEventListener('message', (event) => {
         if (event.origin !== window.location.origin) return;
         if (event.data && event.data.type === 'TOGGLE_VISUAL_EDIT') {
             isActive = event.data.active;
             document.body.classList.toggle('visual-edit-active', isActive);
             if (isActive) enableVisualEdit();
             else disableVisualEdit();
         }
     });
     ```
   - `js/visual-editor.js` lines 25–31 only queries `document.querySelectorAll('[data-i18n]')`:
     ```javascript
     function enableVisualEdit() {
         const elements = document.querySelectorAll('[data-i18n]');
         elements.forEach(el => {
             el.classList.add('visual-editable');
             el.addEventListener('click', handleElementClick);
             el.addEventListener('blur', handleElementBlur);
             el.addEventListener('keydown', handleElementKeydown);
         });
     ```
   - `js/visual-editor.js` lines 37–54 injects CSS for `.visual-edit-active .visual-editable` with `outline: 2px dashed rgba(106, 90, 205, 0.5) !important;`.
   - `js/visual-editor.js` lines 103–108 sends `SAVE_I18N` on blur:
     ```javascript
     window.parent.postMessage({
         type: 'SAVE_I18N',
         key: key,
         text: newText
     }, window.location.origin);
     ```
   - `js/visual-editor.js` contains 0 lines handling images, media picker requests, `[data-setting]`, or `SAVE_SETTINGS`.

3. **Admin Media Picker**:
   - `admin.html` lines 1659–1686 defines modal `#mediaPickerDialog`.
   - `js/admin.js` lines 3580–3685 defines `triggerMediaPicker`, `renderMediaPickerGrid`, and `selectMediaFromPicker(url)`.
   - Lines 4540–4576 defines bridge helpers `openMediaPicker` and `openMediaPickerFor`.

4. **Backend Settings & Persistence Endpoints**:
   - `backend/src/routes/admin.js` lines 1522–1578 defines `PUT /settings` with `requireRole(['SUPER_ADMIN'])`. Allowed fields explicitly include: `heroTag`, `heroHeadline`, `heroSubtitle`, `kineticText`, `kineticWords`, `splitText`, `trailLogos`, `showreelVideoUrl`, `showreelPosterUrl`, etc.
   - `backend/src/routes/admin.js` lines 1664–1700 defines `PATCH /translations/:key` for updating `{ az, en, ru }`.
   - `backend/src/app.js` line 82 mounts `app.use('/api/admin', adminRouter)`.
   - `backend/src/middleware/auth.js` line 6 verifies `req.cookies.brandfull_token` only.

---

## 2. Logic Chain

1. **Premise 1**: Requirement R1 mandates inline visual editing inside the Admin preview iframe with interactive outlines, click-to-edit for text, image selection via the Admin's media library, and persistence to backend via postMessage to parent Admin.
2. **Premise 2 (from Observation 1 & 2)**: The preview iframe is loaded inside `#view-preview` as `<iframe id="livePreviewIframe" src="index.html">`. The iframe contains `js/visual-editor.js`, which already has the skeleton for listening to `TOGGLE_VISUAL_EDIT` and rendering dashed outlines (`.visual-editable`).
3. **Premise 3 (from Observation 1 & 2)**: The Admin parent currently has no UI toggle button and zero message listeners. When `visual-editor.js` fires `postMessage({ type: 'SAVE_I18N', ... })`, it is dropped with no effect. Furthermore, `SAVE_SETTINGS` is never emitted, and image elements have no click handlers or media picker bindings.
4. **Premise 4 (from Observation 3 & 4)**: The backend already possesses the exact required endpoints (`PUT /api/admin/settings` and `PATCH /api/admin/translations/:key`), and the Admin Panel already possesses an operational `#mediaPickerDialog`.
5. **Deduction / Architecture Solution**:
   - In `admin.html`: Add `<button id="toggleVisualEditBtn" ...>` to `.preview-bar`.
   - In `js/admin.js`:
     - Implement `toggleVisualEdit()` to dispatch `TOGGLE_VISUAL_EDIT` to `iframe.contentWindow`.
     - Add `window.addEventListener('message', ...)` to handle `SAVE_SETTINGS` (invoking `PUT /api/admin/settings`), `SAVE_I18N` (invoking `PATCH /api/admin/translations/:key` and/or `PUT /api/admin/settings`), and `OPEN_MEDIA_PICKER`.
     - Hook `selectMediaFromPicker` so when triggered from the preview, it sends `MEDIA_SELECTED` back to the iframe and persists the image URL to settings.
   - In `js/visual-editor.js`:
     - Expand selector beyond `[data-i18n]` to cover `[data-setting]`, `[data-editable]`, `h1-h6`, `p`, `a`, `button`, and `img`.
     - On text blur: dispatch `SAVE_SETTINGS` if matching a setting, or `SAVE_I18N` if matching a translation key.
     - On image click: prevent navigation, dispatch `OPEN_MEDIA_PICKER` to parent, and listen for `MEDIA_SELECTED` to update `img.src` immediately.
   - In `backend/src/app.js` and `backend/src/middleware/auth.js`:
     - Alias `/admin/settings` to `/api/admin/settings` to satisfy acceptance tests regardless of whether `/api` prefix is supplied.
     - Enable `requireAuth` to accept `Authorization: Bearer <token>` alongside cookies.

---

## 3. Caveats

1. **Authentication in Test Environments**: In manual browser testing, admin operations rely on HTTP-only cookie `brandfull_token`. In automated unit/integration tests running outside a browser session, tests may send Bearer tokens via HTTP headers. Supporting both is critical.
2. **Animation DOM Preservation**: Elements such as `#revealText` (split text) split their text content into individual `<span>` tags for scroll animations. Editing such elements must preserve or regenerate the spans so that scroll animations remain intact.
3. **Stand-alone Module Export (R3)**: While R1 focuses on the live app integration, R3 requires exporting the completed visual editor to `C:\Users\Mcman\Desktop\visual-editor-module`. Code designed for R1 should be modular and zero-dependency so it directly satisfies R3.

---

## 4. Conclusion

The foundation for R1 is partially in place: `js/visual-editor.js` exists in `index.html`, and `backend/src/routes/admin.js` already supports updating all needed settings fields via `PUT /settings`. The primary missing pieces are:
1. The Admin UI toggle button in `.preview-bar` and postMessage trigger in `js/admin.js`.
2. The Admin parent window `message` event listener that invokes `PUT /api/admin/settings` and coordinates with `#mediaPickerDialog`.
3. Expanding `js/visual-editor.js` to support images (media picker flow), dynamic settings elements (`[data-setting]`, hero visual, kinetic scroller, split reveal), and dispatching `SAVE_SETTINGS`.
4. Route/auth aliasing in backend to ensure both `/admin/settings` and `/api/admin/settings` succeed with both cookie and Bearer auth.

---

## 5. Verification Method

To verify the survey findings independently:

1. **Check Admin message listeners & preview controls**:
   - Run grep in `js/admin.js` for `postMessage`:
     ```powershell
     Select-String -Path js/admin.js -Pattern "postMessage"
     ```
     *Expected*: 0 matches.
   - View `admin.html` lines 693–704:
     Confirm absence of edit mode toggle in `.preview-bar`.

2. **Check Visual Editor element queries**:
   - View `js/visual-editor.js` lines 24–57:
     Confirm it only targets `document.querySelectorAll('[data-i18n]')` and lacks image handling.

3. **Check Backend PUT /settings whitelist**:
   - View `backend/src/routes/admin.js` lines 1522–1540:
     Confirm `allowedFields` contains `heroTag`, `heroHeadline`, `heroSubtitle`, `kineticText`, `kineticWords`, `splitText`, `trailLogos`, `showreelPosterUrl`, etc.

4. **Verify existing hero test passes**:
   - Run existing verification suite:
     ```powershell
     npm test
     ```
     *Expected*: All existing hero media integration tests pass.
