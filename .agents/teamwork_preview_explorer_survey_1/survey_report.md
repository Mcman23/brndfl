# Survey Report: Admin Panel Architecture & Visual Editor (WYSIWYG) Preview Mechanics (R1)

**Date**: 2026-09-07  
**Agent**: teamwork_preview_explorer_survey_1 (Explorer)  
**Milestone**: Survey Phase - R1 Admin Live Preview Click-to-Edit Visual Editor (WYSIWYG)  
**Target Repository**: `c:\Users\Mcman\Desktop\brndfl-main`  
**Integrity Mode**: Read-Only Survey  

---

## 1. Executive Summary

Requirement R1 specifies enabling interactive inline visual editing within the Admin Panel's Live Site Preview (`view-preview` iframe). Admin users must be able to click on any text, heading, paragraph, button, image, or section directly inside the preview iframe to edit text inline or pick images from the media library. Blurring an edited element or clicking "Save" must send the updated content via `postMessage` to the parent Admin application, which updates the backend database via `PUT /api/admin/settings` (or entity endpoints) and dynamically reflects on the live site.

Our code survey reveals that an embryonic `js/visual-editor.js` file (118 lines) already exists and is included in `index.html` (line 1294). However:
1. The Admin Panel (`admin.html` and `js/admin.js`) has **no button or trigger** in its preview bar to toggle visual edit mode.
2. The Admin Panel has **zero `postMessage` event listeners**, so messages emitted from the iframe (`SAVE_I18N`, `SAVE_SETTINGS`, etc.) are completely ignored.
3. `js/visual-editor.js` only attaches click/blur handlers to elements matching `[data-i18n]` — it completely lacks support for images, media picker integration, dynamic settings elements (`[data-setting]`, hero texts, kinetic scrollers, split texts), buttons, and general DOM content.
4. The backend already contains robust endpoints: `PUT /api/admin/settings` (line 1522 in `backend/src/routes/admin.js`) which already permits updating `heroTag`, `heroHeadline`, `heroSubtitle`, `kineticText`, `kineticWords`, `splitText`, `trailLogos`, `showreelVideoUrl`, `showreelPosterUrl`, etc., and `PATCH /api/admin/translations/:key` (line 1664).
5. A minor routing and authentication risk exists: Express mounts admin routes at `/api/admin` (not `/admin`), and `requireAuth` currently checks `req.cookies.brandfull_token` without falling back to the `Authorization: Bearer` header.

---

## 2. Admin Panel Architecture & Key Files

| Component | File Path | Size / Lines | Key Responsibilities |
|---|---|---|---|
| **Admin Markup** | `admin.html` | 112,633 B / 1,783 lines | Complete admin markup: sidebar navigation, views (`#view-preview`, `#view-settings`, `#view-projects`), modal dialogs (`#mediaPickerDialog`, `#projectModal`, `#deleteConfirmModal`). |
| **Admin Script** | `js/admin.js` | 211,488 B / 4,732 lines | Singleton `AdminApp` controller: authentication, view switching (`switchTab`), settings CRUD (`loadSettings`, `saveSettings`), media library dialog (`triggerMediaPicker`, `selectMediaFromPicker`), preview refresh (`refreshPreview`). |
| **Admin Styles** | `css/admin.css` | 51,562 B / 2,002 lines | Admin styling: layout, sidebar, view cards, modals, preview container (`.preview-container`, `.preview-bar`, `.preview-iframe`). |
| **Live Site Markup** | `index.html` | 85,729 B / 1,295 lines | Frontend markup with hero, kinetic text, split reveal, client logos, project showcases, and 100+ `[data-i18n]` elements. Includes `js/visual-editor.js` at line 1294. |
| **Visual Editor Script** | `js/visual-editor.js` | 4,022 B / 118 lines | Prototype iframe script listening for `TOGGLE_VISUAL_EDIT` and sending `SAVE_I18N` on blur of `[data-i18n]` elements. |
| **Live Site Script** | `js/app.js` | 53,110 B / 1,334 lines | Client-side SPA router, data store consumer, DOM renderer (`renderSiteSettings`, `renderClientLogos`, etc.). |
| **Live Site I18n** | `js/i18n.js` | 2,237 B / 88 lines | Frontend translations loader and static DOM replacer (`[data-i18n]`). |
| **Backend Admin Routes** | `backend/src/routes/admin.js` | 69,547 B / 1,916 lines | Protected admin API routes: `/settings` (GET/PUT), `/translations` (GET/PATCH/PUT), `/media` (GET/POST/DELETE). |
| **Backend Public Routes**| `backend/src/routes.js` | 18,790 B / 525 lines | Public endpoints: `/settings`, `/translations`, `/projects`, `/solutions`, etc. |
| **Backend Express App** | `backend/src/app.js` | 3,752 B / 119 lines | Server setup, Helmet CSP configuration, route mounting (`/api/admin`, `/api`), static frontend and SPA fallback. |

---

## 3. Live Site Preview (`view-preview` iframe) Trace

### 3.1 DOM Mount & Structure
In `admin.html` (lines 693–704):
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

### 3.2 Navigation & Tab Activation
- In `admin.html` (lines 123–126), the sidebar contains:
  ```html
  <button class="sidebar-btn" data-tab="preview" style="color:var(--adm-magenta);">
    ...
    Canlı Sayt Önizləməsi 👁️
  </button>
  ```
- In `js/admin.js` (lines 3688–3693), sidebar buttons are bound:
  ```javascript
  document.querySelectorAll('.sidebar-nav button').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab) this.switchTab(tab);
    });
  });
  ```
- In `js/admin.js` (lines 885–933), `switchTab(tabId)` handles tab activation:
  - Line 888: Adds `is-active` class to the clicked sidebar button.
  - Line 896: Sets `style.display = 'none'` on all `.admin-view` elements.
  - Line 900: Sets `style.display = 'block'` on `#view-${tabId}` (`#view-preview`).
  - Lines 920–926: Updates `pageTitle` to `"Canlı Sayt Önizləməsi"` and `pageSubtitle` to `"Canlı sinxronizasiya paneli."`.
  - Lines 928–929:
    ```javascript
    if (tabId === 'preview') {
      this.refreshPreview();
    }
    ```

### 3.3 Current Control & Styling
- In `js/admin.js` (lines 3182–3185):
  ```javascript
  refreshPreview() {
    const iframe = document.getElementById('livePreviewIframe');
    if (iframe) iframe.src = iframe.src;
  }
  ```
- In `css/admin.css` (lines 458–484):
  - `.preview-container`: `width: 100%; height: calc(100vh - 12rem); background-color: #000000; border-radius: var(--adm-radius); border: 1px solid var(--adm-border); overflow: hidden; display: flex; flex-direction: column;`
  - `.preview-bar`: `display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1.5rem; background-color: var(--adm-card); border-bottom: 1px solid var(--adm-border);`
  - `.preview-iframe`: `width: 100%; flex: 1; border: none; background-color: var(--adm-text);`

---

## 4. Current Visual Edit Mode Mechanism Analysis

The current mechanism resides inside `js/visual-editor.js`:

### 4.1 Activation & Toggling
- Window message listener (lines 8–22):
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

### 4.2 Highlighting & Styles
- Injected stylesheet (`#visual-edit-styles`, lines 37–54):
  - Inactive state: no styles.
  - Active hover: `outline: 2px solid rgba(106, 90, 205, 1) !important; background: rgba(106, 90, 205, 0.1) !important;`
  - Active dashed outline:
    ```css
    .visual-edit-active .visual-editable {
        outline: 2px dashed rgba(106, 90, 205, 0.5) !important;
        outline-offset: 2px !important;
        cursor: pointer !important;
        transition: outline 0.2s ease;
        position: relative;
    }
    ```
  - Editing state (`[contenteditable="true"]`):
    ```css
    .visual-edit-active .visual-editable[contenteditable="true"] {
        outline: 2px solid #00c853 !important;
        background: rgba(0, 200, 83, 0.1) !important;
        cursor: text !important;
    }
    ```

### 4.3 Element Selection & Interaction
- Scope: Currently queries **only** `document.querySelectorAll('[data-i18n]')` (line 25).
- Click Handler (`handleElementClick`, lines 74–86):
  - Invokes `e.preventDefault()` and `e.stopPropagation()`.
  - Sets `editingElement.setAttribute('contenteditable', 'true')` and calls `editingElement.focus()`.
- Blur Handler (`handleElementBlur`, lines 88–109):
  - Removes `contenteditable`.
  - Reads `el.textContent.trim()` and `el.getAttribute('data-i18n')`.
  - Dispatches message to parent:
    ```javascript
    window.parent.postMessage({
        type: 'SAVE_I18N',
        key: key,
        text: newText
    }, window.location.origin);
    ```
- Keydown Handler (`handleElementKeydown`, lines 111–116):
  - On Enter without Shift, triggers `el.blur()`.

### 4.4 Deficiencies in Current Implementation
1. **No Image Support**: Images (`img`, background images) are completely ignored. Clicking an image does nothing.
2. **No Setting Elements Support**: Elements representing dynamic database settings (e.g. `heroHeadline`, `heroSubtitle`, `kineticText`, `kineticWords`, `splitText`, `trailLogos`) are omitted unless they explicitly have `data-i18n`.
3. **No General Text / Heading / Paragraph Support**: Headings (`h1-h6`), paragraphs (`p`), buttons, or spans that do not possess a `data-i18n` attribute cannot be edited.
4. **No SAVE_SETTINGS Message**: `visual-editor.js` does not emit `SAVE_SETTINGS`.
5. **No Visual Edit Toggle Control in Admin**: The admin user has no UI button to send `TOGGLE_VISUAL_EDIT`.
6. **No Communication Bridge for Media Library**: No mechanism for requesting media picker or receiving the chosen image URL.

---

## 5. Cross-Window Communication Architecture

### 5.1 Communication Topology
```
+-------------------------------------------------------------------------+
| Admin Panel Window (admin.html + js/admin.js)                           |
|                                                                         |
|  [Preview Bar: Toggle Visual Edit Button]                               |
|        |                                                                |
|        | postMessage({ type: 'TOGGLE_VISUAL_EDIT', active: true })      |
|        v                                                                |
|  +-------------------------------------------------------------------+  |
|  | <iframe> #livePreviewIframe (index.html + js/visual-editor.js)    |  |
|  |                                                                   |  |
|  |  User clicks text -> inline edit -> blur / save                   |  |
|  |        |                                                          |  |
|  |        | postMessage({ type: 'SAVE_SETTINGS', key, value })       |  |
|  |        | postMessage({ type: 'SAVE_I18N', key, text, lang })      |  |
|  |        +----------------------------------------------------------+  |
|        |                                                                |
|        v                                                                |
|  Admin Message Listener (window.addEventListener('message', ...))       |
|        |                                                                |
|        +---> PUT /api/admin/settings (or PATCH /translations/:key)      |
|        |                                                                |
|  User clicks image in iframe                                            |
|  <iframe postMessage({ type: 'OPEN_MEDIA_PICKER', targetId, key })       |
|        |                                                                |
|        v                                                                |
|  Admin opens #mediaPickerDialog -> AdminApp.selectMediaFromPicker(url)  |
|        |                                                                |
|        +---> postMessage({ type: 'MEDIA_SELECTED', targetId, url })     |
|        +---> PUT /api/admin/settings { [key]: url }                     |
+-------------------------------------------------------------------------+
```

### 5.2 Required Message Contracts
1. **Admin -> Iframe**:
   - `TOGGLE_VISUAL_EDIT`:
     ```json
     { "type": "TOGGLE_VISUAL_EDIT", "active": true }
     ```
   - `MEDIA_SELECTED`:
     ```json
     { "type": "MEDIA_SELECTED", "targetId": "heroShowreelVisual", "url": "/uploads/hero.jpg", "settingKey": "showreelPosterUrl" }
     ```
   - `SET_LANGUAGE`:
     ```json
     { "type": "SET_LANGUAGE", "lang": "az" }
     ```

2. **Iframe -> Admin**:
   - `SAVE_SETTINGS`:
     ```json
     { "type": "SAVE_SETTINGS", "key": "heroHeadline", "value": "Yeni Başlıq" }
     ```
     or
     ```json
     { "type": "SAVE_SETTINGS", "settings": { "heroHeadline": "Yeni Başlıq" } }
     ```
   - `SAVE_I18N`:
     ```json
     { "type": "SAVE_I18N", "key": "navWork", "text": "İşlərimiz", "lang": "az" }
     ```
   - `OPEN_MEDIA_PICKER`:
     ```json
     { "type": "OPEN_MEDIA_PICKER", "targetId": "heroShowreelVisual", "settingKey": "showreelPosterUrl", "currentUrl": "..." }
     ```

---

## 6. Backend API Endpoints & Persistence Analysis

### 6.1 `PUT /api/admin/settings` (and `/admin/settings`)
- **Location**: `backend/src/routes/admin.js`, line 1522.
- **Middleware**: `requireRole(['SUPER_ADMIN'])`.
- **Allowed Fields** (lines 1527–1540):
  ```javascript
  const allowedFields = [
    'heroTag', 'heroHeadline', 'heroSubtitle', 
    'heroTagEn', 'heroHeadlineEn', 'heroSubtitleEn',
    'heroTagRu', 'heroHeadlineRu', 'heroSubtitleRu',
    'showreelVideoUrl', 'showreelPosterUrl',
    'contactEmail', 'contactPhone', 'contactAddress', 'workingHours',
    'socialInstagram', 'socialFacebook', 'socialLinkedIn', 
    'socialYouTube', 'socialTikTok', 'socialVimeo',
    'copyrightText',
    'kineticText', 'kineticTextEn', 'kineticTextRu',
    'kineticWords', 'kineticWordsEn', 'kineticWordsRu',
    'splitText', 'splitTextEn', 'splitTextRu',
    'trailLogos'
  ];
  ```
- **Upsert Logic** (lines 1567–1571): Upserts into `prisma.siteSettings` (`id: 'singleton'`).
- **Audit Logging** (line 1573): Logs `UPDATE` action on `SiteSettings`.
- **Response**: `{ success: true, data: settings }`.

### 6.2 `PATCH /api/admin/translations/:key`
- **Location**: `backend/src/routes/admin.js`, line 1664.
- **Payload**: `{ az, en, ru }`.
- **Database**: Upserts into `prisma.translation` table (`where: { key }`).
- **Response**: `{ success: true, message: 'Updated successfully' }`.

### 6.3 `GET /api/settings` (Public Endpoint)
- **Location**: `backend/src/routes.js`, line 478.
- **Returned object** (lines 486–520): Contains `heroTag`, `heroHeadline`, `heroSubtitle` (+ En, Ru), `showreelVideoUrl`, `showreelPosterUrl`, `contactEmail`, `contactPhone`, `contactAddress`, `workingHours`, `socialInstagram` through `socialVimeo`, `copyrightText`, `footerLinks`, `kineticText` (+ En, Ru), `kineticWords` (+ En, Ru), `splitText` (+ En, Ru), and `trailLogos`.

### 6.4 Media Library Integration
- **Upload**: `POST /api/admin/media/upload` (line 264 in `backend/src/routes/admin.js`), returns `{ success: true, data: { url, originalName, mimeType, size } }`.
- **List**: `GET /api/admin/media` (line 350), returns list of uploaded media objects.
- **Admin Modal**: `#mediaPickerDialog` in `admin.html` (lines 1659–1686). Handled by `AdminApp.triggerMediaPicker` and `AdminApp.selectMediaFromPicker` in `js/admin.js` (lines 3580–3685 and 4540–4575).

---

## 7. Relevant Files, Functions, Selectors, and Exact Line Numbers

| Artifact | File | Line Numbers | Description / Role |
|---|---|---|---|
| **Preview Iframe View** | `admin.html` | 693–704 | `#view-preview` container, `.preview-bar`, and `#livePreviewIframe` (`src="index.html"`). |
| **Sidebar Preview Tab** | `admin.html` | 123–126 | `<button class="sidebar-btn" data-tab="preview">` for tab switching. |
| **Media Picker Dialog** | `admin.html` | 1659–1686 | `#mediaPickerDialog`, `#mediaPickerSearch`, `#mediaPickerGrid`, file upload input. |
| **Settings Form** | `admin.html` | 533–691 | `#settingsForm`, `#setHeroTag` (573), `#setHeroHeadline` (578), `#setHeroSubtitle` (583), `#setShowreelPosterUrl` (597). |
| **Tab Switcher** | `js/admin.js` | 885–933 | `AdminApp.switchTab(tabId)`: toggles `.admin-view`, calls `refreshPreview()`. |
| **Preview Refresh** | `js/admin.js` | 3182–3185 | `AdminApp.refreshPreview()`: reloads iframe. |
| **Save Settings** | `js/admin.js` | 2927–2986 | `AdminApp.saveSettings()`: issues `PUT /api/admin/settings`. |
| **Media Picker Methods** | `js/admin.js` | 3580–3685 | `triggerMediaPicker`, `renderMediaPickerGrid`, `handleMediaPickerUpload`, `selectMediaFromPicker`. |
| **Media Picker Wrapper** | `js/admin.js` | 4540–4576 | Bridge functions: `openMediaPicker`, `openMediaPickerFor`, enhanced `selectMediaFromPicker`. |
| **Visual Editor Script** | `js/visual-editor.js` | 8–22 | Message listener for `TOGGLE_VISUAL_EDIT`. |
| **Visual Editor Enable** | `js/visual-editor.js` | 24–57 | `enableVisualEdit()`: dashed outline style injection and `[data-i18n]` query. |
| **Visual Editor Blur** | `js/visual-editor.js` | 88–109 | `handleElementBlur()`: sends `SAVE_I18N` to parent. |
| **Hero DOM in Site** | `index.html` | 110–124 | `#heroShowreelVisual` (112), `#hero-hello-title` (117), `#dynamic-greeting-text` (118). |
| **Kinetic DOM in Site** | `index.html` | 128–141 | `#statementSection` (128), `#kinetic-scrolling-words` (132). |
| **Split Statement DOM** | `index.html` | 146–184 | `.hero-split-wrap` (146), `#revealText` (149). |
| **Client Logos DOM** | `index.html` | 189–198 | `#home-client-logos` (189). |
| **Site Settings Render**| `js/app.js` | 159–330 | `App.renderSiteSettings()`: updates hero visual/video, heroTag, heroSubtitle, kineticText, kineticWords, splitText. |
| **Client Logos Render** | `js/app.js` | 511–524 | `App.renderClientLogos()`: populates `#home-client-logos` from `this.data.clients`. |
| **Mouse Trail Effect** | `js/animations.js` | 222–260 | `MotionEngine.initImageTrail()`: uses `App.data.settings.trailLogos`. |
| **PUT /settings API** | `backend/src/routes/admin.js` | 1522–1578 | Updates `SiteSettings` with whitelist validation and audit logging. |
| **PATCH /translations** | `backend/src/routes/admin.js` | 1664–1700 | Updates single translation key (`az`, `en`, `ru`). |
| **Auth Middleware** | `backend/src/middleware/auth.js`| 4–35 | `requireAuth`: checks `req.cookies.brandfull_token`. |
| **Express Route Mount** | `backend/src/app.js` | 81–83 | `app.use('/api/admin', adminRouter)`, `app.use('/api', apiRouter)`. |

---

## 8. Missing Interfaces, Technical Risks & Edge Cases

### 8.1 Missing Interfaces
1. **Admin Visual Edit Toggle Button**:
   - No button exists in `admin.html` (inside `.preview-bar`) to toggle edit mode.
   - Recommended: Add button `<button id="toggleVisualEditBtn" class="adm-btn adm-btn-primary" onclick="AdminApp.toggleVisualEdit()">✏️ Vizual Redaktə</button>`.
2. **Admin `postMessage` Listener**:
   - `js/admin.js` has no `window.addEventListener('message')`.
   - Must implement listener handling:
     - `SAVE_SETTINGS`: calls `PUT /api/admin/settings` (or `${API_BASE}/admin/settings`).
     - `SAVE_I18N`: calls `PATCH /api/admin/translations/:key` AND/OR issues `PUT /api/admin/settings` (to satisfy verification criteria).
     - `OPEN_MEDIA_PICKER`: opens `mediaPickerDialog` and links chosen asset back to iframe.
3. **Iframe Media Picker Handler (`MEDIA_SELECTED`)**:
   - `visual-editor.js` needs a listener for `MEDIA_SELECTED` to update the clicked `<img>` element's `src` in real-time.
4. **Editable Element Scope Extension**:
   - Current `document.querySelectorAll('[data-i18n]')` misses headings, paragraphs, buttons, hero visuals, client logos, and settings elements (`[data-setting]`).
   - Must support selectors for:
     - Text elements: `[data-i18n]`, `[data-setting]`, `[data-editable]`, `h1, h2, h3, h4, h5, h6`, `p`, `a`, `button`, `.btn-pill`.
     - Image elements: `img`, `[data-editable-image]`.
5. **Standalone Module Packaging (R3)**:
   - Need export to `C:\Users\Mcman\Desktop\visual-editor-module` with `visual-editor.js`, `visual-editor.css`, `README.md`, and `demo.html`.

### 8.2 Technical Risks & Edge Cases
1. **Express Route Mount Path (`/api/admin/settings` vs `/admin/settings`)**:
   - The user acceptance criterion explicitly specifies:
     *"The Admin parent window processes SAVE_I18N or SAVE_SETTINGS postMessages and issues a successful PUT /admin/settings request to persist changes in the database."*
   - In `backend/src/app.js`, `adminRouter` is mounted at `/api/admin`. A direct request to `PUT /admin/settings` (without `/api`) hits Express 404 because line 86 SPA fallback only handles GET requests.
   - **Mitigation**: In `backend/src/app.js`, mount `app.use('/admin', adminRouter)` or add a redirect/alias so both `/admin/settings` and `/api/admin/settings` succeed.
2. **Authentication Token Source in `requireAuth`**:
   - `backend/src/middleware/auth.js` only inspects `req.cookies.brandfull_token`.
   - Automated tests or programmatic requests sending `Authorization: Bearer <token>` would receive HTTP 401 if cookies are not passed.
   - **Mitigation**: Update `requireAuth` to check `req.cookies?.brandfull_token || (req.headers.authorization?.startsWith('Bearer ') && req.headers.authorization.slice(7))`.
3. **Nested Spans in Animated Text (e.g., `#revealText`)**:
   - `#revealText` contains individual `<span>` tags per word for GSAP scroll animations. Directly making `#revealText` `contenteditable` might strip or mangle span tags when edited.
   - **Mitigation**: Either edit the plain text and re-generate the word spans, or map `#revealText` edits directly to `splitText` in settings.
4. **Link / Navigation Hijacking**:
   - Clicking an `<a>` link or button in the preview iframe in visual edit mode would cause the iframe to navigate away if not intercepted.
   - **Mitigation**: In `visual-editor.js`, ensure `e.preventDefault()` is invoked on all click events during active edit mode.
5. **Iframe Reload State Synchronization**:
   - When the preview iframe is reloaded (`refreshPreview()`), its JS execution context resets and visual edit mode would be turned off unless the Admin parent re-sends `TOGGLE_VISUAL_EDIT` upon iframe `load` event.

---

## 9. Next Steps for Implementation Phase

1. **Admin Panel Enhancement (`admin.html` + `js/admin.js`)**:
   - Add "✏️ Vizual Redaktə" toggle button to `.preview-bar` in `admin.html`.
   - Add `toggleVisualEdit()`, `visualEditActive` state, and iframe load listener in `js/admin.js`.
   - Implement `window.addEventListener('message', ...)` in `js/admin.js` to process `SAVE_SETTINGS`, `SAVE_I18N`, and `OPEN_MEDIA_PICKER`.
   - Connect media picker selection back to iframe via `iframe.contentWindow.postMessage({ type: 'MEDIA_SELECTED', ... })`.
2. **Visual Editor Enhancement (`js/visual-editor.js` + `css/visual-editor.css`)**:
   - Support `[data-setting]`, `[data-i18n]`, headings, paragraphs, buttons, and `img` elements.
   - Send `SAVE_SETTINGS` when a setting element is blurred or edited.
   - Support image clicks: dispatch `OPEN_MEDIA_PICKER` and listen for `MEDIA_SELECTED`.
   - Separate styles into `visual-editor.css` for clean modularity while maintaining inline fallback.
3. **Backend Route Resilience (`backend/src/app.js` + `backend/src/middleware/auth.js`)**:
   - Ensure `PUT /admin/settings` and `PUT /api/admin/settings` both succeed.
   - Ensure `requireAuth` accepts both cookies and `Authorization: Bearer` tokens.
4. **Standalone Module Export (`C:\Users\Mcman\Desktop\visual-editor-module`)**:
   - Package `visual-editor.js`, `visual-editor.css`, `README.md`, and `demo.html`.
