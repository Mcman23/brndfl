# Handoff Report — Survey Phase: Live Site and Backend API Architecture (R2)

## 1. Observation

1. **Prisma Schema for Settings & Clients**:
   - `backend/prisma/schema.prisma` lines 193-233 defines `model SiteSettings` with fields:
     `heroTag`, `heroHeadline`, `heroSubtitle`, `showreelVideoUrl`, `showreelPosterUrl`, `kineticText`, `kineticWords`, `splitText`, `trailLogos`, and language variants (`heroTagEn/Ru`, `kineticTextEn/Ru`, etc.).
   - `backend/prisma/schema.prisma` lines 43-55 defines `model Client` with fields `id`, `name`, `slug`, `logoUrl`, `websiteUrl`, `active`, `order`.
2. **Backend API Endpoints**:
   - `backend/src/routes.js` lines 478-526 provides `GET /api/settings`, returning all `SiteSettings` fields.
   - `backend/src/routes/admin.js` lines 1522-1570 provides `PUT /api/admin/settings`, which validates against `allowedFields` (line 1527) and updates `SiteSettings`.
   - `backend/src/routes.js` has **no** `GET /clients` route. Command `fetch('http://localhost:5000/api/clients')` returned HTTP 404.
   - Only `backend/src/routes/admin.js` line 154 has `router.get('/clients')`, protected by `router.use(requireAuth)` (line 20), which returned HTTP 401 when accessed without an auth token.
3. **Database Records**:
   - Queried live database with `prisma.client.findMany()` and verified 6 client records exist in the Supabase PostgreSQL database: Amazon, Spotify, Google, Apple, aaaaaaaaa, Microsoft.
   - Queried `prisma.project.findMany()` and verified 2 project records exist (`proj_1`, `proj_2`).
4. **Live Site Store & Data Loading**:
   - `js/data.js` lines 69-146 implements `getProjects()`, `getSolutions()`, `getArticles()`, `getJobs()`, and `getSettings()`, but **lacks** `getClients()`.
   - `js/app.js` lines 33-56:
     ```javascript
     const [projects, solutions, articles, jobs, apiSettings] = await Promise.all([
       BrandfullStore.getProjects(),
       BrandfullStore.getSolutions(),
       BrandfullStore.getArticles(),
       BrandfullStore.getJobs(),
       BrandfullStore.getSettings()
     ]);
     ```
     `clients` is omitted from `loadData()`.
5. **Live Site DOM & Rendering Gaps**:
   - In `index.html` lines 189-198, `#home-client-logos` contains 8 hardcoded static logos (McDonald's, Google, NBC, Nike, etc.).
   - In `js/app.js` lines 511-524, `renderClientLogos()` checks `const clients = (this.data.clients || []).filter(c => c.active); if (clients.length === 0) return;`. Because `this.data.clients` is empty, it returns immediately and never replaces the hardcoded logos.
   - In `index.html` line 130, "Əhəmiyyətli işlər yaradırıq" is unwrapped raw text inside `<h2 class="kinetic-statement-text">`.
   - In `js/app.js` line 168, `renderSiteSettings()` executes `const kineticStatic = document.getElementById('kinetic-static-text'); if (kineticStatic && s.kineticText) ...`. Because `#kinetic-static-text` does not exist in `index.html`, `kineticStatic` is `null` and `kineticText` is never dynamically rendered.
   - In `js/app.js` lines 1286-1319, `initDynamicGreeting()` is invoked in `App.init()` (line 23) and unconditionally sets `document.getElementById("dynamic-greeting-text").innerText` with hardcoded weekday strings, overwriting `s.heroSubtitle` set at line 165.
   - In `index.html`, there is no element for `heroHeadline`, and `s.heroHeadline` is never referenced in `renderSiteSettings()`.
6. **Admin Panel Form & Preview Integration**:
   - `admin.html` lines 567-603 has inputs for `heroTag`, `heroHeadline`, `heroSubtitle`, `showreelVideoUrl`, and `showreelPosterUrl`, but **no inputs** for `kineticText`, `kineticWords`, `splitText`, or `trailLogos`.
   - `js/admin.js` lines 2927-2962 (`saveSettings`) does not extract or send `kineticText`, `kineticWords`, `splitText`, or `trailLogos`.
   - `admin.html` line 702 embeds `<iframe id="livePreviewIframe" src="index.html">`. `AdminApp.refreshPreview()` (line 3182) simply re-assigns `iframe.src = iframe.src`. Neither `admin.html` nor `js/admin.js` has a `postMessage` listener or transmitter.

---

## 2. Logic Chain

1. **Client Logos**:
   - Observation 2 establishes that `/api/clients` is 404 for public visitors and 401 on `/api/admin/clients`.
   - Observation 4 establishes that `BrandfullStore` has no `getClients()` method and `App.loadData()` does not query clients.
   - Observation 5 establishes that `renderClientLogos()` aborts when `this.data.clients` is empty, preserving the static HTML fallback.
   - *Inference*: Despite real client logos existing in the database (Observation 3), the live site is completely decoupled from the client database because of the missing public API endpoint, missing store method, and missing data fetch in `app.js`.

2. **Kinetic Statement Text (`kineticText`)**:
   - Observation 1 establishes that `kineticText` exists in the Prisma schema and settings payload.
   - Observation 5 establishes that `app.js` specifically targets an element with ID `kinetic-static-text`.
   - Observation 5 confirms that `index.html` has no element with ID `kinetic-static-text`.
   - *Inference*: The DOM selector fails to resolve, rendering the dynamic `kineticText` assignment in `app.js` inert.

3. **Hero Subtitle Conflict**:
   - Observation 5 shows `renderSiteSettings()` correctly assigns `s.heroSubtitle` to `#dynamic-greeting-text`.
   - Observation 5 shows `App.init()` calls `this.initDynamicGreeting()` immediately afterwards, which unconditionally overwrites `#dynamic-greeting-text` with weekday strings.
   - *Inference*: Any dynamic subtitle from API settings is immediately wiped from the user's screen during page load.

4. **Admin Panel Settings Sync**:
   - Observation 1 & 2 show the backend DB schema and `PUT /api/admin/settings` route accept `kineticText`, `kineticWords`, `splitText`, and `trailLogos`.
   - Observation 6 shows `admin.html` and `AdminApp.saveSettings` completely ignore these fields.
   - *Inference*: The database can store them, but administrators have no UI controls to update them through the Admin panel.

5. **Real-Time Synchronization**:
   - Observation 6 shows no `postMessage` handling exists in `admin.js`, and `app.js`'s `brandfull-data-updated` listener is never dispatched.
   - *Inference*: Live site and preview iframe currently rely entirely on manual browser reloads rather than dynamic event-driven sync.

---

## 3. Caveats

- **Database credentials**: Connection to Supabase PostgreSQL is active and verified; however, direct external modification should only be performed through Prisma migrations or the Express API.
- **Visual Editor scope**: `js/visual-editor.js` exists in the repo and is referenced in `index.html` (line 1294), but was only partially stubbed for `[data-i18n]` tags and is not yet hooked into the parent Admin window.
- **Production vs Dev**: The Express server is currently configured for development on port 5000 (`PORT=5000`).

---

## 4. Conclusion

The system's backend data model and API are architecturally prepared for Requirement R2, but the live site dynamic pipeline is currently blocked by five specific defects:
1. Missing public `GET /api/clients` endpoint on `backend/src/routes.js`.
2. Missing `BrandfullStore.getClients()` in `js/data.js` and missing `clients` fetch in `App.loadData()`.
3. Missing DOM ID `kinetic-static-text` in `index.html` around "Əhəmiyyətli işlər yaradırıq".
4. Greeting overwrite collision in `App.initDynamicGreeting()` wiping out `heroSubtitle`.
5. Missing input fields and payload wiring for `kineticText`, `kineticWords`, `splitText`, and `trailLogos` in `admin.html` and `js/admin.js`.

Addressing these five items will achieve 100% dynamic data integration for the live site.

---

## 5. Verification Method

1. **Automated Test Command**:
   - Run `npm test` from project root `c:\Users\Mcman\Desktop\brndfl-main`.
   - Verifies all 68 tests in `tests/verify-hero.js` pass.
2. **Endpoint Verification**:
   - Test `GET /api/settings`:
     `node -e "fetch('http://localhost:5000/api/settings').then(r => r.json()).then(console.log)"`
   - Test `GET /api/clients` (after implementing):
     `node -e "fetch('http://localhost:5000/api/clients').then(r => r.json()).then(console.log)"`
     Should return HTTP 200 with active clients array.
3. **DOM & Dynamic Script Verification**:
   - Inspect `index.html`: Confirm presence of `<span id="kinetic-static-text">` and `#home-client-logos`.
   - Inspect `js/app.js`: Confirm `loadData()` fetches `BrandfullStore.getClients()` and passes `clients` to `renderClientLogos()`.
   - Invalidation Condition: If `fetch('http://localhost:5000/api/clients')` returns 404, or if `#kinetic-static-text` is missing in `index.html`, the dynamic integration remains broken.
