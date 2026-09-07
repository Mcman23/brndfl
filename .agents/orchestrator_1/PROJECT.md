# Project: Live Visual Editor & Dynamic Site Integration

## Architecture
- **Admin Panel**: `admin.html`, `js/admin.js` — host application embedding live site in `#livePreviewIframe`. Manages visual edit toggle, listens for `postMessage` events (`SAVE_SETTINGS`, `SAVE_I18N`, `OPEN_MEDIA_PICKER`), bridges to media picker dialog, and persists data via `PUT /api/admin/settings`.
- **Live Site**: `index.html`, `js/app.js`, `js/data.js` — client-facing web application. Loads dynamic settings (`heroTag`, `heroHeadline`, `heroSubtitle`, `kineticText`, `kineticWords`, `splitText`, `trailLogos`) and client records (`GET /api/clients`), dynamically rendering `#revealText`, `#kinetic-scrolling-words`, `#kinetic-static-text`, `#home-client-logos`, and hero visuals.
- **Visual Editor Engine**: `js/visual-editor.js` — zero-dependency inline visual editing engine embedded in live site. Manages outline highlights, `contenteditable` text editing, image picker trigger, public `window.VisualEditor` API, and bidirectional postMessage bridge.
- **Backend API**: `backend/src/routes.js`, `backend/src/routes/admin.js`, `backend/src/middleware/auth.js` — Express REST API with Prisma ORM connected to PostgreSQL. Serves public settings and clients, validates and persists admin settings updates, supports cookie and Bearer auth, and provides route aliases.
- **Standalone Module Export**: `C:\Users\Mcman\Desktop\visual-editor-module` — portable distribution containing `visual-editor.js`, `visual-editor.css`, `README.md`, and `demo.html`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | F1.1: Visual Editor Core Engine | Inline editing, outlines, public API `window.VisualEditor` | M2 | Survey 1, Survey 3 |
| 2 | F1.2: Text Click-to-Edit & Blur Save | `contenteditable="true"`, emits `SAVE_SETTINGS` / `SAVE_I18N` | M2 | Survey 1 |
| 3 | F1.3: Image Pick & Replace Bridge | Intercept img click, emit `OPEN_MEDIA_PICKER`, handle `MEDIA_SELECTED` | M2 | Survey 1 |
| 4 | F2.1: Admin Preview Bar Toggle Button | Visual edit mode toggle button in `admin.html` `.preview-bar` | M2 | Survey 1 |
| 5 | F2.2: Admin PostMessage Bridge | Listen for `SAVE_SETTINGS`, `SAVE_I18N`, `OPEN_MEDIA_PICKER` in `js/admin.js` | M2 | Survey 1 |
| 6 | F2.3: Admin Settings Persistence | Admin calls `PUT /api/admin/settings` on blur/save | M2 | Survey 1 |
| 7 | F3.1: Public GET /api/clients Endpoint | Return active client logos in `backend/src/routes.js` | M1 | Survey 2 |
| 8 | F3.2: API Route Aliasing & Bearer Auth | Support `/admin/settings` and `Authorization: Bearer` auth | M1 | Survey 1, Survey 2 |
| 9 | F3.3: Settings Whitelist Verification | Verify all R2 fields supported in `PUT /api/admin/settings` | M1 | Survey 1, Survey 2 |
| 10 | F4.1: Client Logos Dynamic Pipeline | `BrandfullStore.getClients()`, `App.loadData()`, `#home-client-logos` | M1 | Survey 2 |
| 11 | F4.2: Kinetic Statement Dynamic Text | Add `#kinetic-static-text`, bind `kineticText` & `kineticWords` in `app.js` | M1 | Survey 2 |
| 12 | F4.3: Hero Subtitle & Headline Integration | Prevent greeting overwrite of `heroSubtitle`, bind `heroHeadline` | M1 | Survey 2 |
| 13 | F4.4: Split Text & Mouse Trail Binding | Bind `splitText` to `#revealText` and `trailLogos` | M1 | Survey 2 |
| 14 | F5.1: Desktop Module Packaging | Create `C:\Users\Mcman\Desktop\visual-editor-module` | M3 | Survey 3 |
| 15 | F5.2: Standalone JS & CSS Exports | Zero-dependency `visual-editor.js` and `visual-editor.css` | M3 | Survey 3 |
| 16 | F5.3: Module Documentation & Demo | Comprehensive `README.md` and interactive `demo.html` | M3 | Survey 3 |
| 17 | F6.1: E2E Test Suite (Tiers 1-4) | Comprehensive automated test runners for R1, R2, R3 | E2E-Track | Survey 3 |
| 18 | F6.2: Final E2E Test Pass (100%) | Full validation of all acceptance criteria | M4 | Survey 3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend API & Live Site Dynamic Data | F3.1, F3.2, F3.3, F4.1, F4.2, F4.3, F4.4 | none | DONE |
| M2 | Visual Editor Core & Admin Preview Integration | F1.1, F1.2, F1.3, F2.1, F2.2, F2.3 | M1 | IN_PROGRESS |
| M3 | Standalone Desktop Module Export | F5.1, F5.2, F5.3 | M2 | PLANNED |
| M4 | Final Milestone: 100% E2E Pass & Adversarial Hardening | F6.2 (Tiers 1-5) | M1, M2, M3, E2E-Track | PLANNED |
| E2E | E2E Testing Track (Independent) | F6.1 (Tiers 1-4 test authoring) | none (parallel) | DONE |

## Interface Contracts

### Visual Editor ↔ Host Application (postMessage)
- **Toggle Mode**: Parent -> Iframe: `{ type: 'TOGGLE_VISUAL_EDIT', active: boolean }`
- **Save Setting**: Iframe -> Parent: `{ type: 'SAVE_SETTINGS', key: string, value: any, setting: string }`
- **Save I18n**: Iframe -> Parent: `{ type: 'SAVE_I18N', key: string, text: string }`
- **Request Media Picker**: Iframe -> Parent: `{ type: 'OPEN_MEDIA_PICKER', target: string, currentUrl?: string }`
- **Media Selected**: Parent -> Iframe: `{ type: 'MEDIA_SELECTED', target: string, url: string }`

### Public Programmatic API (`window.VisualEditor`)
- `VisualEditor.init(options?: { debug?: boolean, autoInjectStyles?: boolean })`
- `VisualEditor.enable()` / `VisualEditor.disable()` / `VisualEditor.toggle()`
- `VisualEditor.isActive()` -> boolean
- `VisualEditor.on(event: string, callback: Function)`
- `VisualEditor.updateElement(selectorOrElement, value, type)`

### Backend REST API
- `GET /api/settings` -> `{ publicSettings: { heroTag, heroHeadline, heroSubtitle, kineticText, kineticWords, splitText, trailLogos, showreelVideoUrl, showreelPosterUrl, ... } }`
- `PUT /api/admin/settings` (and `/admin/settings`) -> Body: `{ heroHeadline?, heroSubtitle?, kineticText?, kineticWords?, splitText?, trailLogos?, ... }`
- `GET /api/clients` -> `[{ id, name, slug, logoUrl, websiteUrl, active, order }]`

## Code Layout
- `backend/src/routes.js` — Public routes (`/api/settings`, `/api/clients`)
- `backend/src/routes/admin.js` — Admin settings & entity routes
- `backend/src/middleware/auth.js` — Cookie & Bearer token authentication
- `backend/src/app.js` — Route mounting and aliases
- `js/data.js` — Client-side API store (`BrandfullStore`)
- `js/app.js` — Live site application controller (`App`)
- `js/admin.js` — Admin panel controller (`AdminApp`)
- `js/visual-editor.js` — Live visual editor engine
- `index.html` — Live site template & dynamic DOM containers
- `admin.html` — Admin dashboard & live preview iframe
- `C:\Users\Mcman\Desktop\visual-editor-module\` — Standalone module distribution
- `tests/` — Automated test suites (`verify-visual-editor.js`, `verify-settings-sync.js`, `run-all-tests.js`)
