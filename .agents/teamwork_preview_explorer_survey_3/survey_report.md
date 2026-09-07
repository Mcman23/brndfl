# Survey Report: Track 3 — Standalone Visual Editor Module (R3) & Test Architecture

**Author**: Spec Miner (Survey Subagent 3)  
**Date**: 2026-09-07  
**Project**: Brandfull CMS & Live Visual Editor (`c:\Users\Mcman\Desktop\brndfl-main`)  
**Assignment Target**: `c:\Users\Mcman\Desktop\brndfl-main\.agents\teamwork_preview_explorer_survey_3`  
**Reference Document**: `ORIGINAL_REQUEST.md` (specifically 2026-09-07T04:18:02Z)  

---

## 1. Executive Summary

This survey report provides the authoritative specification for:
1. **R3: Standalone Reusable Module Export to Desktop (`C:\Users\Mcman\Desktop\visual-editor-module`)**:
   - Zero-dependency architecture ensuring inclusion via a single `<script>` tag.
   - Complete file layout (`visual-editor.js`, `visual-editor.css`, `README.md`, `demo.html`).
   - Full programmatic API contract (`window.VisualEditor`, lifecycle methods, configuration schema, event hooks).
   - Bi-directional postMessage communication protocol for parent-iframe embedding.
2. **Testing Infrastructure Survey & Architecture Across R1, R2, R3**:
   - Deep survey of existing test harness (`tests/verify-hero.js`, `tests/test-runner.html`, `package.json`).
   - Programmatic automated test strategy for R1 (WYSIWYG inline edit, postMessage, parent save handling), R2 (GET `/api/settings` schema, DOM dynamic sync for `#revealText`, `#kinetic-scrolling-words`, `#home-client-logos`, trail logos), and R3 (file existence, zero-dependency execution, standalone single-script demo).
   - Exact test runner recommendation for the E2E Testing Track.

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | R3 Module | Standalone Desktop Export | Package and export the Visual Editor module to `C:\Users\Mcman\Desktop\visual-editor-module` containing 4 mandatory files (`visual-editor.js`, `visual-editor.css`, `README.md`, `demo.html`). | Build/export script or copy task targeting Desktop path | Directory and 4 required files on Desktop | Fails if path inaccessible or files missing | `ORIGINAL_REQUEST.md` (R3, lines 56-58, 70-72) |
| 2 | R3 Module | Single `<script>` Tag Zero-Dependency Inclusion | Ability to drop `<script src="visual-editor.js"></script>` into any HTML document with zero external libraries or build step; auto-injects default CSS if stylesheet is not linked. | HTML document containing `<script src="visual-editor.js">` | Functional editor with styles and global `window.VisualEditor` | Graceful fallback if `document.head` not yet ready | `ORIGINAL_REQUEST.md` (R3, line 72), `js/visual-editor.js` |
| 3 | R3 Module | Public JS API Contract | Standard JavaScript object `window.VisualEditor` exposing methods `init(options)`, `enable()`, `disable()`, `toggle()`, `isActive()`, `on(event, cb)`, `off(event, cb)`, `destroy()`. | Options object or method invocations | State change, event dispatch, DOM outline updates | Ignores invalid configs, warns on unknown event types | Architecture Analysis & `ORIGINAL_REQUEST.md` |
| 4 | R3 Module | Standalone Demo Showcase | Standalone demo page `demo.html` with sample headings, paragraphs, buttons, images, a floating toggle button ("✏️ Edit Mode"), and an on-screen JSON event logger. | User clicks or edits elements in `demo.html` | Real-time DOM modification & event log rendering | Validates inputs, handles empty content gracefully | `ORIGINAL_REQUEST.md` (R3, line 57) |
| 5 | R3 Module | Standalone Documentation | Comprehensive `README.md` explaining quick-start, API reference, options, iframe postMessage protocol, and integration examples (vanilla, React, Vue). | N/A | Clean Markdown documentation file | N/A | `ORIGINAL_REQUEST.md` (R3, line 57) |
| 6 | R1 WYSIWYG | Preview Iframe Visual Edit Toggle | Toggle visual edit mode in preview iframe via postMessage `{ type: 'TOGGLE_VISUAL_EDIT', active: boolean }`; highlights editable elements with dashed outline. | postMessage from parent window | Body class `.visual-edit-active`, element class `.visual-editable` | Ignores untrusted origins if origin check active | `ORIGINAL_REQUEST.md` (R1, line 62), `js/visual-editor.js` |
| 7 | R1 WYSIWYG | Inline Text Editing & Save Dispatch | Clicking editable text sets `contenteditable="true"`; on blur or Enter, removes `contenteditable` and emits postMessage (`SAVE_I18N` or `SAVE_SETTINGS`). | Element click, typing, blur/Enter | postMessage `{ type: 'SAVE_I18N', key, text }` or `{ type: 'SAVE_SETTINGS', key, value }` | Trims text; ignores blur if text is empty/unchanged | `ORIGINAL_REQUEST.md` (R1, line 63-64) |
| 8 | R1 WYSIWYG | Interactive Image Picker Bridge | Clicking an editable image dispatches `{ type: 'REQUEST_IMAGE_PICKER', key, currentSrc }` to parent Admin window, which opens media modal and sends back `{ type: 'UPDATE_IMAGE_SRC', key, src }`. | Click on editable image | postMessage to parent; parent updates iframe image src | Falls back to image URL prompt if running standalone | `ORIGINAL_REQUEST.md` (R1, line 51, 63) |
| 9 | R1 WYSIWYG | Admin Parent Window Message Processing | Admin window listens for `SAVE_I18N` and `SAVE_SETTINGS` postMessages, executes `PUT /api/admin/settings` or `PATCH /api/admin/translations/:key`, and shows feedback toast. | postMessage from preview iframe | HTTP PUT/PATCH request to backend, database updated | Shows error toast/alert if API returns success: false | `ORIGINAL_REQUEST.md` (R1, line 64-65) |
| 10 | R2 Dynamic | GET `/api/settings` Full Schema | Public API endpoint `GET /api/settings` returns all dynamic text and media fields including `splitText`, `kineticText`, `kineticWords`, `trailLogos`, `heroHeadline`. | HTTP GET request | JSON `{ success: true, data: { ... } }` | Returns `{ success: true, data: {} }` if not found | `backend/src/routes.js` (line 478-526) |
| 11 | R2 Dynamic | Hero Texts & Headings Dynamic Sync | Live site (`app.js`) updates `#hero-hello-title` (heroTag), `#dynamic-greeting-text` (heroSubtitle), and hero headlines from settings payload. | Settings data object in `App.data.settings` | DOM elements text and HTML updated | Preserves fallback HTML if setting is missing/empty | `js/app.js` (line 161-166), `index.html` |
| 12 | R2 Dynamic | Kinetic Statement Dynamic Sync | Live site (`app.js`) splits `s.kineticWords` by comma into `<span class="word">` elements inside `#kinetic-scrolling-words`, and updates `#kinetic-static-text`. | `s.kineticWords`, `s.kineticText` | Dynamic span elements injected into scroller | Ignores empty or malformed strings | `js/app.js` (line 168-182), `index.html` |
| 13 | R2 Dynamic | Split Statement Dynamic Sync | Live site (`app.js`) splits `s.splitText` by spaces into `<span>word</span>` elements inside `#revealText`. | `s.splitText` string | Dynamic word spans inside `#revealText` | Preserves existing DOM if setting is empty | `js/app.js` (line 184-192), `index.html` |
| 14 | R2 Dynamic | Mouse Trail Media Dynamic Sync | Cursor animation in `js/animations.js` reads `s.trailLogos` (comma-delimited URLs) and dynamically spawns custom logo images on cursor move. | `App.data.settings.trailLogos` | Animated floating trail image wrappers in DOM | Falls back to default logos if `trailLogos` empty | `js/animations.js` (line 227-230) |
| 15 | R2 Dynamic | Client Logos Dynamic Grid Sync | Live site renders active clients from database into `#home-client-logos` with logos and names. | `App.data.clients` array | Grid of `.client-logo-box` elements in `#home-client-logos` | Renders nothing if no active clients have logos | `js/app.js` (line 511-524), `index.html` |
| 16 | R1/R2 Media | Hero Center Visual Media Sync | Dynamic sync for `showreelPosterUrl` and `showreelVideoUrl` switching between `<img>` and `<video>` in `#heroShowreelVisual` / `#heroShowreelVideo` and `#modalVideo`. | `s.showreelVideoUrl`, `s.showreelPosterUrl` | Video element injected or removed, fallback image synced | Video error event captured, fallback image restored | `js/app.js` (line 195-330), `tests/verify-hero.js` |
| 17 | Test Harness | Zero-Dependency Node Test Suite | Fast, deterministic Node.js test script (`tests/verify-hero.js`, `tests/verify-visual-editor.js`) with DOM mock and assertion runner. | `node tests/<script>.js` | Exit code 0 (pass) or 1 (fail), detailed console summary | Captures and logs exact failing assertion and stack | `tests/verify-hero.js`, `package.json` |

---

## 3. Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Single `<script>` inclusion | User does not link `visual-editor.css` in `<head>` | `visual-editor.js` checks if `#visual-editor-styles` exists; if not, dynamically creates and appends `<style id="visual-editor-styles">` containing default CSS rules. Outlines and hover states work immediately. |
| 2 | Text Edit with Whitespace | User edits editable element to only spaces `"   "` | On blur, the editor detects trimmed string is empty. It prevents dispatching empty text or restores previous value, avoiding erasing required page labels. |
| 3 | Link Navigation Suppression | User clicks an `<a>` tag with `href="/work"` while visual edit mode is active | Visual editor captures click in capture phase, calls `e.preventDefault()` and `e.stopPropagation()`, enters inline edit mode instead of navigating away. |
| 4 | Rapid Toggle of Edit Mode | Host sends `TOGGLE_VISUAL_EDIT` with `active: true` followed immediately by `active: false` while an element is being typed into | The editor immediately blurs the active element, commits the change or cancels, removes `contenteditable` from all nodes, removes hover listeners, and removes `.visual-edit-active`. No phantom listeners or stuck green borders remain. |
| 5 | Cross-Origin postMessage | Untrusted parent window or iframe postMessage received from external origin | If `targetOrigin` is configured (or defaults to same-origin), the listener validates `event.origin === window.location.origin` (or matches whitelist); unauthorized origins are ignored. |
| 6 | Image Replacement without Server Picker | Standalone `demo.html` without CMS Admin parent window | Clicking an editable image detects `window.parent === window`. It opens a lightweight built-in prompt or modal dialog asking for image URL, immediately updates image `src`, and fires the local `onSave` / `onChange` callback. |
| 7 | Kinetic Words with Extra Comma/Spaces | `s.kineticWords = "  bizneslər üçün. , , brendlər üçün.  "` | `app.js` splits by comma, trims each item, filters out empty tokens (`filter(Boolean)`), ensuring no empty spinning slots in the kinetic scroller. |
| 8 | Split Text with Punctuation and Accents | Azerbaijani characters (`Ə, ç, ö, ğ, ı, ş`) in `s.splitText` | `splitTextEl` parses UTF-8 words cleanly without character corruption or broken span wrappers. |
| 9 | Multi-line vs Single-line Enter Key | User presses `Enter` on a heading vs `Shift+Enter` or multiline paragraph | Single-line headings: `Enter` triggers `blur()` and saves immediately. Multiline paragraphs: `Shift+Enter` inserts newline, or `Enter` inserts newline if element allows multiline. |
| 10 | Standalone Module Path on Desktop | Desktop path `C:\Users\Mcman\Desktop\visual-editor-module` already exists or contains old files | Export script creates directory recursively (`fs.mkdirSync(..., { recursive: true })`) and cleanly writes latest versions of all 4 files. |

---

## 4. Deep-Dive: R3 Standalone Reusable Module Specification

### 4.1 Target Location and File Structure
The module must be exported to:
`C:\Users\Mcman\Desktop\visual-editor-module\`

Directory Contents:
```text
C:\Users\Mcman\Desktop\visual-editor-module\
├── visual-editor.js    # Core standalone module (< 15 KB, zero external dependencies)
├── visual-editor.css   # Optional standalone stylesheet (also auto-injected by JS)
├── demo.html           # Interactive standalone demo with single-tag inclusion
└── README.md           # Comprehensive integration and API documentation
```

### 4.2 Zero-Dependency Architecture
- **Single `<script>` Inclusion**:
  ```html
  <script src="visual-editor.js"></script>
  ```
- **Self-Sufficiency**: The script detects if CSS rules are present. If `visual-editor.css` is not linked, it automatically injects a `<style id="visual-editor-styles">` tag into `<head>` with full CSS for:
  - Outline styles (`dashed` on hover, `solid` green when active/contenteditable).
  - Floating action toolbar/badge.
  - Image edit overlay badge ("📷 Change Image").
- **No Build Step**: Works directly in browser via ES5/ES6 vanilla JavaScript. Compatible with standard browsers (Chrome, Firefox, Safari, Edge) and Node.js DOM-mock test environments.

### 4.3 Public API Contract (`window.VisualEditor`)

```typescript
interface VisualEditorConfig {
  // CSS selector for editable text elements (default: '[data-i18n], [data-visual-edit], [data-setting], .visual-editable')
  selector?: string;
  // CSS selector for editable image elements (default: 'img[data-visual-edit], img[data-setting-img], .visual-editable-img')
  imageSelector?: string;
  // Enable parent-iframe postMessage communication (default: true)
  postMessage?: boolean;
  // Allowed origin for postMessage (default: window.location.origin or '*')
  targetOrigin?: string;
  // Auto-inject CSS into document head if not loaded (default: true)
  injectStyles?: boolean;
  // Highlight outline color on hover (default: '#6a5acd')
  highlightColor?: string;
  // Active outline color while editing (default: '#00c853')
  activeColor?: string;
  // Display floating standalone toolbar with toggle button (default: false)
  standaloneToolbar?: boolean;
  // Callbacks
  onSave?: (data: { key: string; type: 'text' | 'image' | 'setting'; value: string; element: HTMLElement }) => void;
  onChange?: (data: { key: string; value: string; element: HTMLElement }) => void;
  onToggle?: (active: boolean) => void;
  onSelectImage?: (data: { key: string; currentSrc: string; element: HTMLElement }) => void;
}

interface VisualEditorInstance {
  init(options?: VisualEditorConfig): VisualEditorInstance;
  enable(): void;
  disable(): void;
  toggle(): boolean; // returns new active state
  isActive(): boolean;
  on(event: 'save' | 'change' | 'toggle' | 'selectImage', handler: Function): void;
  off(event: string, handler: Function): void;
  updateElement(key: string, value: string): boolean;
  destroy(): void;
}
```

### 4.4 Bi-Directional postMessage Protocol (Iframe / Admin Embed)

#### Host (Parent Admin) -> Child (Preview Iframe):
| Message Type | Payload | Action in Visual Editor |
|---|---|---|
| `TOGGLE_VISUAL_EDIT` | `{ type: 'TOGGLE_VISUAL_EDIT', active: boolean }` | Enables or disables visual edit mode in the preview page. |
| `UPDATE_IMAGE_SRC` | `{ type: 'UPDATE_IMAGE_SRC', key: string, src: string }` | Finds matching image element and updates its `src` and `srcset`. |
| `UPDATE_TEXT` | `{ type: 'UPDATE_TEXT', key: string, text: string }` | Finds matching text element and updates text/innerHTML. |

#### Child (Preview Iframe) -> Host (Parent Admin):
| Message Type | Payload | Action in Admin Parent |
|---|---|---|
| `VISUAL_EDIT_READY` | `{ type: 'VISUAL_EDIT_READY', version: '1.0.0' }` | Notifies parent that preview iframe is ready to receive edit commands. |
| `SAVE_I18N` | `{ type: 'SAVE_I18N', key: string, text: string, lang?: string }` | Saves translation key to backend via `/api/admin/translations/:key`. |
| `SAVE_SETTINGS` | `{ type: 'SAVE_SETTINGS', key: string, value: any, settingKey?: string }` | Saves dynamic setting to backend via `PUT /api/admin/settings`. |
| `REQUEST_IMAGE_PICKER`| `{ type: 'REQUEST_IMAGE_PICKER', key: string, currentSrc: string }` | Opens CMS Media Library modal for image selection. |
| `VISUAL_EDIT_STATUS` | `{ type: 'VISUAL_EDIT_STATUS', active: boolean }` | Synchronizes Admin toolbar toggle switch state. |

### 4.5 Standalone Demo (`demo.html`) Specification
`demo.html` must include:
1. Single script inclusion: `<script src="visual-editor.js"></script>`.
2. A stylish sample page with:
   - Header with editable logo and brand name.
   - Hero section with editable headline (`data-visual-edit="hero_title"`), subtitle (`data-visual-edit="hero_subtitle"`), CTA button text (`data-visual-edit="cta_text"`), and hero image (`img[data-visual-edit="hero_img"]`).
   - Feature section with 3 editable cards (title, description, and icons/images).
3. Floating control toolbar:
   - "✏️ Edit Mode: OFF/ON" toggle switch.
   - Save counter ("Last saved: [timestamp]").
4. Real-time Event Logger sidebar/drawer:
   - Displays JSON payloads emitted by `VisualEditor.on('save', ...)` and `window.postMessage` in real time.
   - Demonstrates zero dependencies — opens directly by double-clicking `demo.html` in any browser (`file://` or `http://`).

### 4.6 Module Documentation (`README.md`) Specification
`README.md` must include:
- **Title**: Visual Editor — Zero-Dependency Standalone WYSIWYG Module
- **Features List**: In-place editing, image swapping, iframe postMessage bridge, zero runtime dependencies, themeable.
- **Quick Start Guide**:
  ```html
  <!-- 1. Include script -->
  <script src="visual-editor.js"></script>

  <!-- 2. Tag editable elements -->
  <h1 data-visual-edit="headline">Editable Headline</h1>
  <img data-visual-edit="cover" src="cover.jpg" />

  <!-- 3. Initialize (optional for auto-mode) -->
  <script>
    VisualEditor.init({
      standaloneToolbar: true,
      onSave: ({ key, value }) => console.log('Saved:', key, value)
    });
  </script>
  ```
- **Configuration Reference Table**: Full description of all options.
- **API Methods Reference**: Signature and description of all public methods.
- **Iframe Integration Guide**: How to embed in an Admin CMS preview iframe and wire postMessage handlers.
- **CSS Customization**: Table of CSS variables (`--ve-highlight`, `--ve-active`, etc.).

---

## 5. Test Infrastructure Survey & Architecture Across R1, R2, R3

### 5.1 Existing Test Suites Survey
- **`package.json`**:
  - Contains script: `"test": "node tests/verify-hero.js"`.
  - Type: `"module"` (native ES modules).
  - No heavyweight test frameworks installed (e.g. no Jest, Mocha, Playwright, or Cypress).
- **`tests/verify-hero.js`**:
  - Implements an ultra-fast, zero-dependency Node.js test harness.
  - Features a custom DOM simulator (`MockElement`, `MockDocument`) that simulates DOM query selectors (`querySelector`, `querySelectorAll`, `#id`, `.class`), attributes, child nodes, event listeners, and media lifecycle methods (`play`, `pause`, `load`).
  - Executes 68 distinct assertions in < 150ms.
  - Exit code 0 on all assertions passing; exit code 1 with detailed failure output if any assert fails.
- **`tests/test-runner.html`**:
  - Browser-based visual runner displaying green/red result tiles for in-browser visual verification.

### 5.2 Recommended Automated Test Architecture for E2E Testing Track

To maintain 100% consistency with the project's existing high-performance, zero-dependency testing convention, we recommend structuring the automated test suite as modular Node test scripts under `tests/`:

```text
tests/
├── verify-hero.js              # Existing: R1 Media integration & legacy cleanup (68 tests)
├── verify-visual-editor.js     # New: R1 WYSIWYG & R3 Standalone Module tests
├── verify-settings-sync.js     # New: R2 Dynamic Text & Image sync tests
├── run-all-tests.js            # New: Unified Master Test Runner
└── test-runner.html            # Updated: Browser-based visual verification harness
```

### 5.3 Detailed Programmatic Test Specifications

#### Track A: R1 WYSIWYG & postMessage Testing (`tests/verify-visual-editor.js`)
1. **Visual Editor Initialization & Mode Toggle**:
   - Verify `VisualEditor` exports on `window`.
   - Simulating `TOGGLE_VISUAL_EDIT` with `active: true` adds `visual-edit-active` class to document body.
   - All elements matching `[data-i18n]`, `[data-setting]`, `[data-visual-edit]` receive `.visual-editable` class.
   - Simulating `TOGGLE_VISUAL_EDIT` with `active: false` removes `.visual-edit-active` and `.visual-editable`.
2. **Text Click & Blur Save Event**:
   - Simulating `click` on editable element sets `contenteditable="true"` and focuses element.
   - Simulating user editing text and triggering `blur`:
     - Dispatches postMessage `{ type: 'SAVE_I18N', key: '...', text: '...' }` if element has `data-i18n`.
     - Dispatches postMessage `{ type: 'SAVE_SETTINGS', key: '...', value: '...' }` if element has `data-setting`.
     - Invokes `onSave` callback if configured.
     - Removes `contenteditable="true"` from the element.
3. **Image Picker Request**:
   - Simulating `click` on editable image element dispatches `{ type: 'REQUEST_IMAGE_PICKER', key: '...', currentSrc: '...' }`.
   - Simulating message `{ type: 'UPDATE_IMAGE_SRC', key: '...', src: 'https://new-image.jpg' }` updates `img.src` in DOM.
4. **Admin Parent Window Event Processing**:
   - Test that `AdminApp` message listener catches `SAVE_I18N` and invokes translation save.
   - Test that `AdminApp` message listener catches `SAVE_SETTINGS` and invokes `PUT /api/admin/settings`.
   - Test that `AdminApp` message listener catches `REQUEST_IMAGE_PICKER` and opens media picker modal.

#### Track B: R2 Dynamic Settings & Live Site Sync Testing (`tests/verify-settings-sync.js`)
1. **Public API `/api/settings` Schema Verification**:
   - Validates that `GET /api/settings` response contains all required fields:
     `splitText`, `kineticText`, `kineticWords`, `trailLogos`, `heroHeadline`, `heroTag`, `heroSubtitle`, `showreelVideoUrl`, `showreelPosterUrl`.
2. **Dynamic DOM Synchronization on `index.html` via `app.js`**:
   - **Hero Tag & Subtitle**: Payload with `heroTag: "Yeni Salam"` and `heroSubtitle: "Yeni Subtitle"` updates `#hero-hello-title` and `#dynamic-greeting-text`.
   - **Kinetic Statement**:
     - `kineticWords: "wordA, wordB, wordC"` correctly splits into `<span class="word">wordA</span>...` inside `#kinetic-scrolling-words`.
     - `kineticText: "Static Text"` updates `#kinetic-static-text`.
   - **Split Statement**:
     - `splitText: "One Two Three Four"` updates `#revealText` with `<span>One</span> <span>Two</span>...`.
   - **Client Logos**:
     - Array of clients with `logoUrl` populates `#home-client-logos` with `.client-logo-box` containers.
   - **Mouse Trail**:
     - `trailLogos: "logo1.png, logo2.png"` is accessible by `animations.js` and parses into valid logo image array.

#### Track C: R3 Standalone Module Export Verification (`tests/verify-visual-editor.js` & `run-all-tests.js`)
1. **Directory Existence**:
   - Assert `fs.existsSync('C:\\Users\\Mcman\\Desktop\\visual-editor-module') === true`.
2. **Mandatory Files Existence & Integrity**:
   - Assert `fs.existsSync('C:\\Users\\Mcman\\Desktop\\visual-editor-module\\visual-editor.js') === true` and file size > 500 bytes.
   - Assert `fs.existsSync('C:\\Users\\Mcman\\Desktop\\visual-editor-module\\visual-editor.css') === true` and file size > 200 bytes.
   - Assert `fs.existsSync('C:\\Users\\Mcman\\Desktop\\visual-editor-module\\README.md') === true` and contains headers for Quick Start, API, and postMessage.
   - Assert `fs.existsSync('C:\\Users\\Mcman\\Desktop\\visual-editor-module\\demo.html') === true` and contains `<script src="visual-editor.js"></script>`.
3. **Zero-Dependency & Single `<script>` Execution**:
   - Parse `demo.html`: verify no external CDN script dependencies (`jQuery`, `React`, `Vue`, etc.).
   - Verify `visual-editor.js` contains internal style injection fallback (`<style id="visual-editor-styles">`).

### 5.4 Master Test Runner Configuration
Update `package.json` scripts:
```json
"scripts": {
  "dev": "cd backend && npm run dev",
  "start": "cd backend && npm start",
  "test": "node tests/run-all-tests.js",
  "test:hero": "node tests/verify-hero.js",
  "test:visual-editor": "node tests/verify-visual-editor.js",
  "test:settings": "node tests/verify-settings-sync.js",
  "postinstall": "prisma generate"
}
```

When `npm test` is executed, `tests/run-all-tests.js` sequentially runs:
1. Hero Media Integration & Legacy Cleanup (`verify-hero.js` - 68 tests)
2. Live Visual Editor & Standalone Module Export (`verify-visual-editor.js`)
3. Dynamic Settings & Live Site Sync (`verify-settings-sync.js`)
Total assertion count: > 100 assertions, completing in under 1 second.

---

## 6. Implementation Readiness & Risk Assessment

| Risk / Dependency | Severity | Mitigation Strategy |
|---|---|---|
| Desktop folder path creation on Windows (`C:\Users\Mcman\Desktop\visual-editor-module`) | Low | Use Node `fs.mkdirSync(dir, { recursive: true })` before copying/writing files. Verify file existence programmatically. |
| In-memory vs DB persistence in tests | Medium | Test suite uses mocked API/DOM layers to test contracts fast, and integration assertions to verify Prisma schema and Express route handlers directly. |
| Single `<script>` tag CSS missing | Low | Include full self-injecting CSS stylesheet embedded as a string template in `visual-editor.js` with an idempotent tag check (`document.getElementById('visual-editor-styles')`). |
| Enter key causing newline instead of save | Low | Distinguish between single-line headings (Enter triggers blur) and multiline text blocks (Enter creates newline, blur saves). |
| Cross-origin iframe postMessage errors | Medium | Default `targetOrigin` to `window.location.origin` with fallback support for local testing (`*` or configurable origins). |

---

## 7. Next Steps for Implementation Tracks
1. **Track 1 (Visual Editor Core & Live Preview)**:
   - Enhance `js/visual-editor.js` with public API methods, image picker bridge, `SAVE_SETTINGS` support, and self-injecting CSS.
   - Update `admin.html` preview bar with visual edit toggle button and device switcher.
   - Wire `AdminApp` message listener in `js/admin.js` to handle `SAVE_I18N`, `SAVE_SETTINGS`, and `REQUEST_IMAGE_PICKER`.
2. **Track 2 (Dynamic Settings Sync)**:
   - Ensure all dynamic text IDs and `data-setting` attributes are mapped in `index.html` and `js/app.js` (`#hero-hello-title`, `#dynamic-greeting-text`, `#kinetic-static-text`, `#kinetic-scrolling-words`, `#revealText`, `#home-client-logos`).
   - Validate `GET /api/settings` and `PUT /api/admin/settings` field consistency.
3. **Track 3 (Standalone Desktop Export)**:
   - Export finalized `visual-editor.js`, `visual-editor.css`, `README.md`, and `demo.html` to `C:\Users\Mcman\Desktop\visual-editor-module`.
4. **Track 4 (Automated E2E Testing)**:
   - Implement `tests/verify-visual-editor.js`, `tests/verify-settings-sync.js`, and `tests/run-all-tests.js`.
   - Update `package.json` test script to `node tests/run-all-tests.js`.
