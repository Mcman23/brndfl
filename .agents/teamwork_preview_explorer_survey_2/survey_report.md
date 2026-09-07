# SURVEY REPORT: Live Site and Backend API Architecture for Dynamic Integration (R2)

**Explorer**: Survey Agent 2  
**Date**: 2026-09-07  
**Scope**: Verification of Live Site (`index.html`, `js/app.js`, `js/data.js`, `js/animations.js`, `js/i18n.js`, styles) and Backend API (`backend/src/server.js`, `backend/src/app.js`, `backend/src/routes.js`, `backend/src/routes/admin.js`, Prisma schema, Supabase PostgreSQL) against Requirement R2.

---

## Executive Summary

An exhaustive investigation was conducted on the Brandfull web application architecture. The system is an Express.js application powered by Node.js and Prisma ORM connected to Supabase PostgreSQL, serving vanilla JavaScript/HTML/CSS on the frontend.

**Key Finding**: The backend data model (`backend/prisma/schema.prisma`), public endpoint (`GET /api/settings`), and admin endpoint (`PUT /api/admin/settings`) **already define and support** all dynamic fields specified in R2 (`kineticText`, `kineticWords`, `splitText`, `trailLogos`, `heroHeadline`, `heroSubtitle`, `heroTag`, `showreelVideoUrl`, `showreelPosterUrl`). However, several critical gaps and misalignments in the frontend DOM and API layers prevent these dynamic values from rendering or persisting properly:
1. **Client Logos**: There is **no public `GET /api/clients` endpoint**, `BrandfullStore` has no `getClients()` method, and `App.loadData()` does not fetch clients. Consequently, `App.renderClientLogos()` aborts, leaving 8 hardcoded SVG logos in `index.html` despite 6 real clients already existing in the database.
2. **Kinetic Statement Text (`kineticText`)**: `app.js` (line 168) queries `document.getElementById('kinetic-static-text')`, which **does not exist** in `index.html` (the text is bare within `<h2 class="kinetic-statement-text">`), preventing dynamic updates.
3. **Hero Subtitle Overwriting & Missing Headline**: `renderSiteSettings()` assigns `s.heroSubtitle` to `#dynamic-greeting-text`, but `App.initDynamicGreeting()` (line 1286) immediately overwrites it with hardcoded weekday strings ("Bazar ertəsi motivasiyası...", etc.). Furthermore, `s.heroHeadline` is never rendered into the DOM.
4. **Admin Settings Form**: `admin.html` and `js/admin.js` do not include form inputs or payload properties for `kineticText`, `kineticWords`, `splitText`, or `trailLogos`.
5. **Real-time Sync**: While `app.js` listens to `brandfull-data-updated` custom event, neither Admin panel nor preview iframe dispatches this event or communicates via `postMessage`.

---

## 1. Backend Server & Data Persistence Architecture

### 1.1 Server Framework & Runtime
- **Runtime**: Node.js ESM (`package.json` specifies `"type": "module"`).
- **Framework**: Express.js `^4.18.3`.
- **Server Entry Point**: `backend/src/server.js` (lines 1-8). Listens on `process.env.PORT || 5000`.
- **App Configuration**: `backend/src/app.js`:
  - Uses `helmet` (configured with `crossOriginResourcePolicy: "cross-origin"` and relaxed `script-src-attr: ["'unsafe-inline'"]`).
  - Static file routes:
    - `/uploads` -> `path.join(__dirname, '../../uploads')` (line 42)
    - `/` -> root directory `path.join(__dirname, '../../')` serving `index.html`, `admin.html`, `css/`, `js/` (line 45-47)
    - `/admin` -> `admin.html` (line 49-51)
  - API routers:
    - `/api/auth` -> `backend/src/routes/auth.js`
    - `/api/admin` -> `backend/src/routes/admin.js`
    - `/api` -> `backend/src/routes.js` (public endpoints)
  - SPA Fallback: `app.get('*', ...)` redirects non-API requests to `index.html` (lines 86-91).

### 1.2 Database & Prisma ORM
- **Database Provider**: Supabase PostgreSQL (`backend/.env` specifies `DATABASE_URL="postgresql://postgres.irwejbgscefsnhwpapih:Brandfullsayt7887@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1"`).
- **Prisma Client**: Prisma 5.10.2 initialized in `backend/src/db.js`.
- **Verified Running State**: Health check `GET http://localhost:5000/api/health` returned `{ success: true, status: 'ok' }`. Direct database queries confirmed live database connection with active records.

### 1.3 Schema Inspection: `backend/prisma/schema.prisma`

#### `SiteSettings` Model (lines 193-233)
```prisma
model SiteSettings {
  id                String   @id @default("singleton")
  heroTag           String   @default("Salam.")
  heroHeadline      String   @default("İnsanlar üçün əhəmiyyət kəsb edən işlər yaradırıq.")
  heroSubtitle      String   @default("Hər kəs nəsə yarada bilər...")
  showreelVideoUrl  String   @default("")
  showreelPosterUrl String   @default("")
  contactEmail      String   @default("business@brandfull.com")
  contactPhone      String   @default("")
  contactAddress    String   @default("Nizami küç. 142, Landmark Plaza, Bakı")
  workingHours      String   @default("Bazar ertəsi — Cümə, 09:00 — 18:00")
  socialInstagram   String   @default("")
  socialFacebook    String   @default("")
  socialLinkedIn    String   @default("")
  socialYouTube     String   @default("")
  socialTikTok      String   @default("")
  socialVimeo       String   @default("")
  copyrightText     String   @default("Copyright © 2026 Brandfull. All rights reserved.")
  footerLinks       Json     @default("[{\"label\":\"Privacy.\",\"url\":\"/privacy\"}]")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  heroHeadlineEn    String   @default("")
  heroHeadlineRu    String   @default("")
  heroSubtitleEn    String   @default("")
  heroSubtitleRu    String   @default("")
  heroTagEn         String   @default("")
  heroTagRu         String   @default("")

  kineticText       String   @default("Əhəmiyyətli işlər yaradırıq")
  kineticTextEn     String   @default("")
  kineticTextRu     String   @default("")
  kineticWords      String   @default("bizneslər üçün.,brendlər üçün.,insanlar üçün.,komandalar üçün.")
  kineticWordsEn    String   @default("")
  kineticWordsRu    String   @default("")
  
  splitText         String   @db.Text @default("Hər kəs nəsə yarada bilər. Lakin mədəniyyət və bizneslə rezonans doğuran təcrübələr yaratmaq çətin tərəfdir. Bu, dizayn, texnologiya və insan zəkası tələb edir.")
  splitTextEn       String   @db.Text @default("")
  splitTextRu       String   @db.Text @default("")
  trailLogos        String   @default("")
}
```

#### `Client` Model (lines 43-55)
```prisma
model Client {
  id          String    @id @default(uuid())
  name        String
  slug        String    @unique
  logoUrl     String?
  websiteUrl  String    @default("")
  description String    @default("") @db.Text
  active      Boolean   @default(true)
  order       Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  projects    Project[]
}
```

### 1.4 API Endpoints Analysis

#### `GET /api/settings` (`backend/src/routes.js` lines 478-526)
- **Status**: Publicly accessible without authentication.
- **Payload returned**:
  `heroTag`, `heroTagEn`, `heroTagRu`, `heroHeadline`, `heroHeadlineEn`, `heroHeadlineRu`, `heroSubtitle`, `heroSubtitleEn`, `heroSubtitleRu`, `showreelVideoUrl`, `showreelPosterUrl`, `contactEmail`, `contactPhone`, `contactAddress`, `workingHours`, `socialInstagram`, `socialFacebook`, `socialLinkedIn`, `socialYouTube`, `socialTikTok`, `socialVimeo`, `copyrightText`, `footerLinks`, `kineticText`, `kineticTextEn`, `kineticTextRu`, `kineticWords`, `kineticWordsEn`, `kineticWordsRu`, `splitText`, `splitTextEn`, `splitTextRu`, `trailLogos`.
- Verified live response via `node` script returned all these fields correctly.

#### `PUT /api/admin/settings` (`backend/src/routes/admin.js` lines 1522-1570)
- **Status**: Protected by `router.use(requireAuth)` and `requireRole(['SUPER_ADMIN'])`.
- **Allowed fields**:
  `allowedFields` array on line 1527 contains:
  `'heroTag', 'heroHeadline', 'heroSubtitle', 'heroTagEn', 'heroHeadlineEn', 'heroSubtitleEn', 'heroTagRu', 'heroHeadlineRu', 'heroSubtitleRu', 'showreelVideoUrl', 'showreelPosterUrl', 'contactEmail', 'contactPhone', 'contactAddress', 'workingHours', 'socialInstagram', 'socialFacebook', 'socialLinkedIn', 'socialYouTube', 'socialTikTok', 'socialVimeo', 'copyrightText', 'kineticText', 'kineticTextEn', 'kineticTextRu', 'kineticWords', 'kineticWordsEn', 'kineticWordsRu', 'splitText', 'splitTextEn', 'splitTextRu', 'trailLogos'`.
- Upserts the `singleton` record in `SiteSettings`.

#### `GET /api/clients` (Currently Missing on Public Router!)
- `backend/src/routes.js` has **NO** `/clients` endpoint.
- `GET /api/clients` returned `HTTP 404`.
- Only `backend/src/routes/admin.js` line 154 has `router.get('/clients', ...)`, which requires authentication (`HTTP 401` when accessed anonymously).

---

## 2. Live Site Architecture & Script Chain

### 2.1 Scripts Loaded by `index.html`
In `index.html` (lines 934-939 and 1294):
```html
<script src="js/data.js"></script>
<script src="js/i18n.js"></script>
<script src="js/animations.js"></script>
<script src="js/media-player.js"></script>
<script src="js/app.js"></script>
...
<script src="js/visual-editor.js"></script>
```

### 2.2 Store Layer: `js/data.js`
- `BRANDFULL_DEFAULT_DATA` (lines 5-50): Contains initial fallback settings (`heroTag`, `heroHeadline`, `heroSubtitle`, `showreelVideoUrl`, `showreelPosterUrl`, etc.). Notice `clients: []` is **omitted**.
- `API_BASE` (line 52): Detects localhost/file/relative path.
- `BrandfullStore` (lines 53-191):
  - `getProjects()` -> fetches `/api/projects`
  - `getSolutions()` -> fetches `/api/solutions`
  - `getArticles()` -> fetches `/api/articles`
  - `getJobs()` -> fetches `/api/jobs`
  - `getSettings()` -> fetches `/api/settings`
  - **MISSING**: `getClients()` does not exist!

### 2.3 Application Layer: `js/app.js`
- `App.init()` (lines 9-29):
  ```javascript
  async init() {
    this.initRouter();
    await this.loadData();
    this.initMobileMenu();
    this.initProjectDrawer();
    this.initSolutionInteractions();
    this.initArticleReader();
    this.initLegalModal();
    this.initContactDrawer();
    this.initNewsletterForm();
    this.initWorkFilter();
    this.initGlobalClickHandlers();
    this.initJobApplicationModal();
    this.initCookieConsent();
    this.initDynamicGreeting(); // <-- Overwrites greeting text!

    // Re-render when data is updated in Admin panel
    window.addEventListener('brandfull-data-updated', async () => {
      await this.loadData();
    });
  }
  ```
- `App.loadData()` (lines 31-56):
  ```javascript
  const [projects, solutions, articles, jobs, apiSettings] = await Promise.all([
    BrandfullStore.getProjects(),
    BrandfullStore.getSolutions(),
    BrandfullStore.getArticles(),
    BrandfullStore.getJobs(),
    BrandfullStore.getSettings()
    // NOTE: BrandfullStore.getClients() is never called!
  ]);
  ```

---

## 3. Element-by-Element Trace (R2 Requirements)

### 3.1 Hero Visuals & Hero Texts

#### Hero Visuals (`showreelPosterUrl`, `showreelVideoUrl`)
- **DOM Element**: `index.html` line 111-113:
  ```html
  <div class="hero-dark-center-visual">
    <img class="inflatable-3d-letter" id="heroShowreelVisual" src="..." alt="Brandfull 3D Visual" />
  </div>
  ```
- **Rendering Logic**: `js/app.js` lines 194-293:
  - Updates `heroVisual.src = posterUrl`.
  - If `videoUrl` is present: creates/updates `<video id="heroShowreelVideo" class="inflatable-3d-letter" autoplay loop muted playsinline>` with `<source src="${videoUrl}">` and `poster="${posterUrl}"`. Hides fallback image. Handles error event gracefully to restore image.
  - Syncs modal video (`#modalVideo`).
  - **Status**: **Fully functional and verified** (all 68 tests passing in `tests/verify-hero.js`).

#### Hero Tag (`heroTag`)
- **DOM Element**: `index.html` line 117:
  ```html
  <h1 class="hero-hello-title" id="hero-hello-title">Salam<span class="color-primary">.</span></h1>
  ```
- **Rendering Logic**: `js/app.js` line 164:
  `if (heroTag && s.heroTag) heroTag.innerHTML = I18nManager.get('heroTag', s) + '<span class="color-primary">.</span>';`
- **Status**: **Working**.

#### Hero Subtitle (`heroSubtitle`) & Dynamic Greeting Conflict
- **DOM Element**: `index.html` line 118:
  ```html
  <p class="hero-hello-subtitle" id="dynamic-greeting-text">Xoş gəlmisiniz. Biznesinizi gələcəyə daşımağa hazırıq.</p>
  ```
- **Rendering Logic**: `js/app.js` line 165:
  `if (heroSubtitle && s.heroSubtitle) heroSubtitle.textContent = I18nManager.get('heroSubtitle', s);`
- **BUG**: In `App.init()`, `initDynamicGreeting()` (lines 1286-1319) is called right after `loadData()`. It gets the local day of the week and unconditionally sets `greetingEl.innerText = text;` with hardcoded strings ("Sunday scaries...", "Bazar ertəsi motivasiyası...", etc.), instantly wiping out `s.heroSubtitle`!
- **Status**: **Broken by design conflict**. `initDynamicGreeting` must only set fallback text if `s.heroSubtitle` is absent, or respect user configuration.

#### Hero Headline (`heroHeadline`)
- **DOM Element**: **Missing** in `index.html`!
- **Rendering Logic**: In `js/app.js`, `s.heroHeadline` is never referenced in `renderSiteSettings()`.
- **Status**: **Missing from DOM & rendering logic**.

---

### 3.2 Kinetic Statement Texts (`kineticText`, `kineticWords`) & `#kinetic-scrolling-words`

#### DOM Structure in `index.html` (lines 128-141)
```html
<section class="kinetic-statement-section" id="statementSection">
  <h2 class="kinetic-statement-text">
    Əhəmiyyətli işlər yaradırıq 
    <span class="word-scroller">
      <span class="scrolling-words" id="kinetic-scrolling-words">
        <span class="word">bizneslər üçün.</span>
        <span class="word">brendlər üçün.</span>
        <span class="word">insanlar üçün.</span>
        <span class="word">komandalar üçün.</span>
        <span class="word">bizneslər üçün.</span>
      </span>
    </span>
  </h2>
</section>
```

#### Rendering Logic in `js/app.js` (lines 168-182)
```javascript
// Kinetic Text
const kineticStatic = document.getElementById('kinetic-static-text');
if (kineticStatic && s.kineticText) {
   kineticStatic.textContent = I18nManager.get('kineticText', s) + ' ';
}

const kineticScroller = document.getElementById('kinetic-scrolling-words');
if (kineticScroller && s.kineticWords) {
    const wordsStr = I18nManager.get('kineticWords', s) || '';
    const words = wordsStr.split(',').map(w => w.trim()).filter(Boolean);
    if (words.length > 0) {
        kineticScroller.innerHTML = words.map(w => '<span class="word">' + w + '</span>').join('');
        // Clone the first word to the end for smooth loop if GSAP expects it
        kineticScroller.innerHTML += '<span class="word">' + words[0] + '</span>';
    }
}
```

#### Findings:
1. **`kinetic-static-text` ID is missing**: `index.html` has bare text `"Əhəmiyyətli işlər yaradırıq "` directly inside `<h2>`. There is no `<span id="kinetic-static-text">`. As a result, `document.getElementById('kinetic-static-text')` is `null` and `kineticText` is **never updated** dynamically!
2. **`kinetic-scrolling-words`**: Works when words are provided, and clones `words[0]` to the end to maintain the 5-item cycle required by the CSS animation `@keyframes scrollWordsDown` (`css/components.css` lines 147-163).
3. **Admin Settings**: `admin.html` does NOT have input fields for `kineticText` or `kineticWords`. `AdminApp.saveSettings` in `js/admin.js` does NOT include them in the payload.

---

### 3.3 Split Statement Text (`splitText`) & `#revealText`

#### DOM Structure in `index.html` (lines 149-155)
```html
<div>
  <h2 class="scroll-reveal-text" id="revealText">
    <span>Hər</span> <span>kəs</span> <span>nəsə</span> <span>yarada</span> <span>bilər.</span>
    <span>Lakin</span> <span class="color-primary">mədəniyyət</span> <span class="color-primary">və</span> <span class="color-primary">bizneslə</span>
    <span>rezonans</span> <span>doğuran</span> <span>təcrübələr</span> <span>yaratmaq</span> <span>çətin</span> <span>tərəfdir.</span>
    <span>Bu,</span> <span>dizayn,</span> <span>texnologiya</span> <span>və</span> <span>insan</span> <span>zəkası</span> <span>tələb</span> <span>edir.</span>
  </h2>
</div>
```

#### Rendering Logic in `js/app.js` (lines 185-192)
```javascript
const splitTextEl = document.getElementById('revealText');
if (splitTextEl && s.splitText) {
    const text = I18nManager.get('splitText', s) || '';
    const words = text.split(' ').map(w => w.trim()).filter(Boolean);
    if (words.length > 0) {
        splitTextEl.innerHTML = words.map(w => '<span>' + w + '</span>').join(' ');
    }
}
```

#### Animation Logic in `js/animations.js` (lines 190-218)
```javascript
initScrollTextReveal() {
  const container = document.getElementById('revealText');
  if (!container) return;
  
  window.addEventListener('scroll', () => {
    const spans = container.querySelectorAll('span');
    ...
```
`spans` are dynamically re-queried on every scroll tick.

#### Findings:
- Splitting into spans works dynamically.
- Scroll animation dynamically applies `.revealed` to spans.
- **Admin Settings**: `admin.html` and `js/admin.js` lack an input field for `splitText` (and `splitTextEn`, `splitTextRu`).

---

### 3.4 Mouse Trail Images (`trailLogos`)

#### Logic in `js/animations.js` (lines 222-240)
```javascript
initImageTrail() {
  const wrap = document.querySelector('.hero-split-wrap');
  if (!wrap) return;

  const getImages = () => {
    if (window.App && App.data && App.data.settings && App.data.settings.trailLogos) {
      const customLogos = App.data.settings.trailLogos.split(',').map(s => s.trim()).filter(s => s);
      if (customLogos.length > 0) return customLogos;
    }
    return [
      'https://images.contentstack.io/.../mcdonalds.svg',
      ...
    ];
  };
```

#### Findings:
- `App.data.settings.trailLogos` is populated whenever `/api/settings` returns `trailLogos`.
- Comma-delimited URLs are parsed correctly into an array.
- **Admin Settings**: `admin.html` and `js/admin.js` lack an input field or picker for `trailLogos`.

---

### 3.5 Client Logos (`#home-client-logos`) and Project Visuals

#### Client Logos in Database vs DOM
- **In PostgreSQL Database**: Verified 6 records exist in `Client` table:
  1. `client_4`: Amazon (`logoUrl`: `https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg`)
  2. `client_5`: Spotify (`logoUrl`: `https://upload.wikimedia.org/wikipedia/commons/2/26/Spotify_logo_with_text.svg`)
  3. `client_1`: Google (`logoUrl`: `/uploads/a820bdb9-f05f-4ab7-b0a7-2cae45c0ba31.jpg`)
  4. `client_2`: Apple (`logoUrl`: `/uploads/a820bdb9-f05f-4ab7-b0a7-2cae45c0ba31.jpg`)
  5. `4330ab20-...`: aaaaaaaaaaaaaaaaaaaaaaaa (`logoUrl`: `/uploads/883e9a89-061d-415f-93f3-5a1cd89ed2c8.jpg`)
  6. `client_3`: Microsoft (`logoUrl`: `/uploads/d2c0cefc-b6f2-4ef1-b88c-93943b0401bd.jpg`)
- **In `index.html` (lines 189-198)**:
  Contains 8 hardcoded static logos:
  ```html
  <section class="client-logo-grid" id="home-client-logos">
    <div class="client-logo-box"><img src=".../mcdonalds.svg" alt="McDonald's" /></div>
    <div class="client-logo-box"><img src=".../google.svg" alt="Google" /></div>
    ...
  </section>
  ```
- **In `js/app.js` (lines 511-524)**:
  ```javascript
  renderClientLogos() {
    const grid = document.getElementById('home-client-logos');
    if (!grid) return;
    
    const clients = (this.data.clients || []).filter(c => c.active);
    if (clients.length === 0) return; // <-- Early return because this.data.clients is empty!
    
    grid.innerHTML = clients.map(client => {
       if(client.logoUrl) {
         return `<div class="client-logo-box"><img src="${client.logoUrl}" alt="${client.name}" loading="lazy" /></div>`;
       }
       return '';
    }).join('');
  }
  ```
- **CRITICAL BREAK IN THE PIPELINE**:
  1. `backend/src/routes.js` lacks `GET /clients` (returns 404).
  2. `js/data.js` lacks `BrandfullStore.getClients()`.
  3. `js/app.js` `loadData()` never retrieves clients.
  4. Result: `this.data.clients` is undefined, `clients.length === 0` is true, and the hardcoded SVG logos are NEVER replaced by the database client logos!

#### Project Visuals
- `GET /api/projects` functions correctly.
- `renderHomeShowcase()` in `js/app.js` dynamically renders featured project cards into `#home-showcase-scroller`.
- `renderWorkGrid()` in `js/app.js` dynamically renders project cards with `item.image` and `item.clientLogo` into `#homeWorkGrid` and `#fullWorkGrid`.

---

## 4. Admin Preview & Real-Time Sync Architecture

### 4.1 Admin Preview Container (`admin.html` lines 693-704)
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

### 4.2 Preview Sync Mechanism
- `AdminApp.refreshPreview()` in `js/admin.js` lines 3182-3185:
  `if (iframe) iframe.src = iframe.src;`
- **Event Listeners in `index.html`**:
  `window.addEventListener('brandfull-data-updated', async () => { await this.loadData(); });`
- **Current Deficiencies**:
  1. Neither `admin.html` nor `js/admin.js` ever dispatches or sends `brandfull-data-updated` to the iframe.
  2. There is no `postMessage` protocol between `admin.js` and `livePreviewIframe`.
  3. `js/visual-editor.js` exists in `index.html` (line 1294), but it only dispatches `SAVE_I18N` postMessages, which `admin.js` does not listen for!

---

## 5. Comprehensive Summary of Required Modifications

To fulfill Requirement R2 and enable dynamic, real-time synchronization:

| Item | Target File | Nature of Change | Description of Modification |
|---|---|---|---|
| **1. Public Clients Endpoint** | `backend/src/routes.js` | Backend API | Add `GET /clients` route returning `prisma.client.findMany({ where: { active: true }, orderBy: { order: 'asc' } })`. |
| **2. Store Clients Method** | `js/data.js` | Frontend Store | Add `getClients()` to `BrandfullStore`, fetching `${API_BASE}/clients` with local fallback. |
| **3. Load Clients in App** | `js/app.js` | Frontend Logic | Update `loadData()` to call `BrandfullStore.getClients()` and store in `this.data.clients`. |
| **4. Kinetic Text Tag** | `index.html` | DOM Structure | Wrap "Əhəmiyyətli işlər yaradırıq" inside `<span id="kinetic-static-text">Əhəmiyyətli işlər yaradırıq</span> ` in `statementSection`. |
| **5. Hero Headline Element** | `index.html` & `js/app.js` | DOM & Logic | Add `#heroHeadline` or bind `s.heroHeadline` into hero title/headline element so it dynamically updates. |
| **6. Hero Subtitle Greeting Conflict** | `js/app.js` | Frontend Logic | Prevent `initDynamicGreeting()` from clobbering `s.heroSubtitle` when a custom subtitle is configured in settings. |
| **7. Admin Settings Fields** | `admin.html` | Admin UI | Add form inputs for `kineticText`, `kineticWords`, `splitText`, and `trailLogos` (plus multilingual En/Ru inputs if desired). |
| **8. Admin Settings Persistence** | `js/admin.js` | Admin Logic | Update `loadSettings()` and `saveSettings()` to read and write `kineticText`, `kineticWords`, `splitText`, `trailLogos`. |
| **9. Real-Time Sync via PostMessage** | `js/admin.js` & `index.html` | Real-time Sync | In `AdminApp`, after saving settings or clients/projects, send a `postMessage` (e.g. `{ type: 'DATA_UPDATED' }`) to `livePreviewIframe.contentWindow`, and trigger `window.dispatchEvent(new CustomEvent('brandfull-data-updated'))` inside `index.html`. |
| **10. Visual Editor postMessage Bridge** | `js/admin.js` & `js/visual-editor.js` | WYSIWYG Integration | Add `window.addEventListener('message', ...)` in `admin.js` to process `SAVE_I18N` and `SAVE_SETTINGS` postMessages and call `PUT /api/admin/settings`. |

---
*Report prepared for orchestrator handoff and implementation planning.*
