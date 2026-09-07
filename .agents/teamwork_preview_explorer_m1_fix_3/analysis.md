# Comprehensive Analysis: Test Integrity Restoration & Production DOM Verification

**Target File**: `tests/verify-settings-sync.js`  
**Associated Production File**: `js/app.js`  
**Project Root**: `c:\Users\Mcman\Desktop\brndfl-main`  
**Author**: Explorer Subagent (Milestone 1 Remediation Track)  
**Date**: 2026-09-07T04:47:30Z  

---

## 1. Executive Summary

Reviewer 2 identified a critical integrity violation in Milestone 1: `tests/verify-settings-sync.js` implemented a duplicate test helper function `applySettingsToDOM()` (lines 282–357) along with synthetic `MockElement` (lines 22–177) and `MockDocument` (lines 179–216) classes. Instead of testing the production `App` object from `js/app.js`, all 17 DOM assertions in Tiers 1 through 4 were executed exclusively against `applySettingsToDOM()`.

Crucially, the author of `applySettingsToDOM()` embedded defensive logic (HTML entity escaping and null-safe filtering) inside the test mock that did **not** exist in `js/app.js`. This self-certifying facade masked critical bugs and vulnerabilities in production code:
1. **Stored XSS & DOM Hierarchy Corruption**: `revealText`, `kinetic-scrolling-words`, and `hero-hello-title` inject unescaped HTML strings into `innerHTML`.
2. **Unhandled TypeError Crash**: `App.renderClientLogos([null])` throws `Cannot read properties of null (reading 'active')`.
3. **Fallback Logo Erasure Bug**: Calling `App.renderClientLogos()` with client records lacking `logoUrl` overwrites `#home-client-logos` with empty HTML `""`, destroying the 8 default static client logos.
4. **Whitespace Overwrite Defect**: Passing whitespace for `kineticText` or `heroTag` overwrites initial DOM text with empty spaces because `trimmed.length > 0` was not guarded.

We have validated that `tests/verify-settings-sync.js` can be refactored to directly instantiate and execute the genuine `App` from `js/app.js` against the real `index.html` DOM using `JSDOM` and Node's built-in `vm` module. An empirical dry-run (`test-dry-run.js`) confirms that 100% of the assertions (49/49 DOM checks + 4 schema checks = 53 total) pass cleanly once `js/app.js` is patched with the missing defensive logic.

---

## 2. Root Cause Analysis & Empirical Evidence

### 2.1 The Test Facade in `tests/verify-settings-sync.js`
In `tests/verify-settings-sync.js`:
- Lines 22–177: Synthetic `MockElement` class replicating basic DOM tree nodes.
- Lines 179–216: Synthetic `MockDocument` class replicating `document.getElementById` and `querySelector`.
- Lines 219–280: Synthetic `setupLiveSiteDOM()` creating fragments mimicking `index.html`.
- Lines 282–357: `applySettingsToDOM(doc, settings, clients = null, options = {})`.

Lines 437, 449, 461, 478, 489, 500, 527, 541, 556, 572, 593, 616, 642, 648, 665, 677, 732, and 762 all call `applySettingsToDOM(...)`. The actual methods `App.renderSiteSettings()`, `App.renderClientLogos()`, and `App.loadData()` are never called anywhere in the test suite.

### 2.2 Discrepancies between Mock and Production

| Feature | Mock `applySettingsToDOM()` (`verify-settings-sync.js`) | Production `App` (`js/app.js`) | Impact |
|---|---|---|---|
| **Split Text Escaping** | Line 334: `words.map(w => '<span>' + w.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>')` | Line 209: `words.map(w => '<span>' + w + '</span>')` | Stored XSS / DOM tag injection in production |
| **Kinetic Words Escaping** | Lines 322–323: `<span class="word">${w}</span>` | Line 197: `<span class="word">' + w + '</span>` | Special characters / tags corrupt scroller |
| **Client Array Filtering** | Line 349: `clients.filter(c => c && c.active && c.logoUrl)` | Line 542: `rawClients.filter(c => c.active !== false)` | Unhandled TypeError crash on `null` or `undefined` |
| **Fallback Logo Protection** | Line 350: `if (activeClients.length > 0) { grid.innerHTML = ... }` | Lines 543–550: Early return if `clients.length === 0`, but clients with empty `logoUrl` pass filter, resulting in `grid.innerHTML = ""` | Default 8 client logos in `index.html` erased to empty string |
| **Whitespace Kinetic Text** | Line 310: `if (trimmed.length > 0) kineticStatic.textContent = trimmed + ' ';` | Line 188: `if (kineticStatic && s.kineticText) kineticStatic.textContent = String(getI18n('kineticText')).trim() + ' ';` | Whitespace `'   '` overwrites static text with `' '` |
| **Whitespace Hero Subtitle** | Line 298: `if (subtitleVal && typeof subtitleVal === 'string' && subtitleVal.trim().length > 0)` | Line 179: `if (heroSubtitle && s.heroSubtitle) heroSubtitle.textContent = getI18n('heroSubtitle');` | Whitespace `'   '` overwrites subtitle with blank string |

---

## 3. Technical Feasibility & Solution Architecture

### 3.1 Can `js/app.js` be directly imported as an ES Module?
No. In `index.html` line 939:
```html
<script src="js/app.js"></script>
```
`js/app.js` is loaded as a classic browser script (not `type="module"`). Adding top-level `export default App;` or `export { App };` will cause browsers to throw `Uncaught SyntaxError: Unexpected token 'export'`. Furthermore, `package.json` sets `"type": "module"`, so direct Node imports expect ESM syntax.

### 3.2 The Proven Solution: JSDOM + Node `vm` Context
Node.js includes the `vm` standard library (`import vm from 'vm'`). `jsdom` is already installed and available in the environment.

The execution pattern:
1. Load `index.html` via `fs.readFileSync(path.resolve('index.html'), 'utf-8')`.
2. Instantiate `JSDOM`:
   ```javascript
   const dom = new JSDOM(indexHtml, { url: 'http://localhost:3000' });
   const win = dom.window;
   const doc = win.document;
   ```
3. Polyfill `win.scrollTo = () => {}` to prevent JSDOM unimplemented navigation warnings.
4. Set `Object.defineProperty(doc, 'readyState', { value: 'loading', configurable: true, writable: true })`.
   - **Why this is critical**: Lines 1362–1368 in `js/app.js` state:
     ```javascript
     if (document.readyState === 'loading') {
       document.addEventListener('DOMContentLoaded', () => { App.init(); });
     } else {
       App.init();
     }
     ```
     By setting `readyState = 'loading'`, `App.init()` does NOT automatically execute during script evaluation. This allows the test suite to control when and how `App.init()` or individual methods are invoked.
5. Provide a test sandbox with standard browser globals and mock data stores:
   ```javascript
   const sandbox = {
     window: win,
     document: doc,
     console,
     Date,
     setTimeout,
     clearTimeout,
     setInterval,
     clearInterval,
     I18nManager: {
       lang: options.lang || 'az',
       get: (field, obj) => {
         if (!obj) return '';
         const lang = sandbox.I18nManager.lang || 'az';
         if (lang === 'en' && obj[field + 'En']) return obj[field + 'En'];
         if (lang === 'ru' && obj[field + 'Ru']) return obj[field + 'Ru'];
         return obj[field] || '';
       }
     },
     BRANDFULL_DEFAULT_DATA: { settings: {} },
     BrandfullStore: options.BrandfullStore || {
       getProjects: async () => [],
       getSolutions: async () => [],
       getArticles: async () => [],
       getJobs: async () => [],
       getSettings: async () => ({}),
       getClients: async () => []
     }
   };
   ```
6. Evaluate `js/app.js` into the sandbox:
   ```javascript
   vm.createContext(sandbox);
   vm.runInContext(appJsCode, sandbox);
   ```
7. Extract the real production object: `const App = win.App`.

Execution time is ~15ms per context initialization. Tests run in under 2 seconds total.

---

## 4. Exact Refactoring Plan for Worker

The Worker must execute two coordinated changes:
1. Fix production defects in `js/app.js`.
2. Eliminate mock facade in `tests/verify-settings-sync.js`.

### 4.1 Production Code Fixes in `js/app.js`

#### Step 1: Add `escapeHtml` helper at top of `js/app.js`
Place after line 4 (before `const App = {`):
```javascript
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```

#### Step 2: Update `App.renderSiteSettings()` (lines 164–215)
Replace lines 177–211 with:
```javascript
      if (heroTag && s.heroTag && String(getI18n('heroTag')).trim()) {
        heroTag.innerHTML = escapeHtml(String(getI18n('heroTag')).trim()) + '<span class="color-primary">.</span>';
      }
      if (heroHeadline && s.heroHeadline && String(getI18n('heroHeadline')).trim()) {
        heroHeadline.textContent = String(getI18n('heroHeadline')).trim();
      }
      if (heroSubtitle && s.heroSubtitle && String(getI18n('heroSubtitle')).trim()) {
        heroSubtitle.textContent = String(getI18n('heroSubtitle')).trim();
        if (typeof heroSubtitle.setAttribute === 'function') {
          heroSubtitle.setAttribute('data-hero-subtitle-rendered', 'true');
        }
      }

      // Kinetic Text
      const kineticStatic = document.getElementById('kinetic-static-text');
      if (kineticStatic && s.kineticText) {
         const trimmedStatic = String(getI18n('kineticText')).trim();
         if (trimmedStatic) {
           kineticStatic.textContent = trimmedStatic + ' ';
         }
      }
      
      const kineticScroller = document.getElementById('kinetic-scrolling-words');
      if (kineticScroller && s.kineticWords) {
          const wordsStr = getI18n('kineticWords') || '';
          const words = wordsStr.split(',').map(w => w.trim()).filter(Boolean);
          if (words.length > 0) {
              kineticScroller.innerHTML = words.map(w => '<span class="word">' + escapeHtml(w) + '</span>').join('') +
                                          '<span class="word">' + escapeHtml(words[0]) + '</span>';
          }
      }
      
      // Split Text (revealText)
      const splitTextEl = document.getElementById('revealText');
      if (splitTextEl && s.splitText) {
          const text = getI18n('splitText') || '';
          const words = text.split(/\s+/).map(w => w.trim()).filter(Boolean);
          if (words.length > 0) {
              splitTextEl.innerHTML = words.map(w => '<span>' + escapeHtml(w) + '</span>').join(' ');
          }
      }
```

#### Step 3: Update `App.renderClientLogos()` (lines 537–551)
Replace lines 537–551 with:
```javascript
  renderClientLogos(clientsData) {
    const grid = document.getElementById('home-client-logos');
    if (!grid) return;
    
    const rawClients = clientsData || (this.data && this.data.clients) || [];
    if (!Array.isArray(rawClients)) return;
    const clients = rawClients.filter(c => c && typeof c === 'object' && c.active !== false && c.logoUrl && String(c.logoUrl).trim() !== '');
    if (clients.length === 0) return;
    
    grid.innerHTML = clients.map(client => {
       return `<div class="client-logo-box"><img src="${encodeURI(String(client.logoUrl).trim())}" alt="${escapeHtml(client.name || 'Client')}" loading="lazy" /></div>`;
    }).join('');
  },
```

---

### 4.2 Test Suite Refactoring in `tests/verify-settings-sync.js`

#### Step 1: Replace Mocks with JSDOM Context Factory
Remove lines 19–357 (entire `MockElement`, `MockDocument`, `setupLiveSiteDOM`, and `applySettingsToDOM`).
Add:
```javascript
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { JSDOM } from 'jsdom';

const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf-8');
const appJsCode = fs.readFileSync(path.resolve('js/app.js'), 'utf-8');

export function createTestContext(options = {}) {
  const dom = new JSDOM(options.html !== undefined ? options.html : indexHtml, {
    url: 'http://localhost:3000'
  });
  const win = dom.window;
  const doc = win.document;
  win.scrollTo = () => {};

  Object.defineProperty(doc, 'readyState', {
    value: 'loading',
    configurable: true,
    writable: true
  });

  const i18nManager = options.I18nManager || {
    lang: options.lang || 'az',
    get: (field, obj) => {
      if (!obj) return '';
      const lang = i18nManager.lang || 'az';
      if (lang === 'en') {
        const key = field + 'En';
        if (obj[key] !== undefined) return obj[key];
      }
      if (lang === 'ru') {
        const key = field + 'Ru';
        if (obj[key] !== undefined) return obj[key];
      }
      return obj[field] || '';
    }
  };

  const store = options.BrandfullStore || {
    getProjects: async () => [],
    getSolutions: async () => [],
    getArticles: async () => [],
    getJobs: async () => [],
    getSettings: async () => ({}),
    getClients: async () => []
  };

  const sandbox = {
    window: win,
    document: doc,
    console,
    Date,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    I18nManager: i18nManager,
    BRANDFULL_DEFAULT_DATA: { settings: {} },
    BrandfullStore: store
  };

  vm.createContext(sandbox);
  vm.runInContext(appJsCode, sandbox);

  return {
    dom,
    window: win,
    document: doc,
    App: win.App,
    I18nManager: i18nManager,
    BrandfullStore: store
  };
}
```

#### Step 2: Update All Test Assertions to Use Real `App`

- **T1.4 (revealText)**:
  ```javascript
  const { document, App } = createTestContext();
  App.data = { settings: { splitText: 'Brandfull insan mərkəzli rəqəmsal transformasiya yaradır.' } };
  App.renderSiteSettings();
  const spans = document.getElementById('revealText').querySelectorAll('span');
  assert('T1.4a: #revealText is populated with spans for each word', spans.length === 6);
  assert('T1.4b: #revealText first word is Brandfull', spans[0]?.textContent === 'Brandfull');
  assert('T1.4c: #revealText last word is yaradır.', spans[5]?.textContent === 'yaradır.');
  ```

- **T1.5 (kinetic-scrolling-words)**:
  ```javascript
  const { document, App } = createTestContext();
  App.data = { settings: { kineticWords: 'brendlər üçün, komandalar üçün, gələcək üçün' } };
  App.renderSiteSettings();
  const words = document.getElementById('kinetic-scrolling-words').querySelectorAll('span.word');
  assert('T1.5a: #kinetic-scrolling-words renders 3 words + 1 loop clone (total 4)', words.length === 4);
  assert('T1.5b: First word is brendlər üçün', words[0]?.textContent === 'brendlər üçün');
  assert('T1.5c: Fourth word is clone of first word for seamless loop', words[3]?.textContent === 'brendlər üçün');
  ```

- **T1.6 (kinetic-static-text)**:
  ```javascript
  const { document, App } = createTestContext();
  App.data = { settings: { kineticText: 'Fərqli baxış bucağı yaradırıq' } };
  App.renderSiteSettings();
  const kineticStatic = document.getElementById('kinetic-static-text');
  assert('T1.6: #kinetic-static-text updates text content matching kineticText setting', kineticStatic.textContent.startsWith('Fərqli baxış bucağı yaradırıq'));
  ```

- **T1.7 (home-client-logos)**:
  ```javascript
  const { document, App } = createTestContext();
  const clientRecords = [
    { id: '1', name: 'Acme Corp', logoUrl: 'https://cdn.example.com/acme.svg', active: true },
    { id: '2', name: 'Beta Tech', logoUrl: 'https://cdn.example.com/beta.svg', active: true },
    { id: '3', name: 'Inactive Co', logoUrl: 'https://cdn.example.com/inactive.svg', active: false }
  ];
  App.renderClientLogos(clientRecords);
  const renderedBoxes = document.getElementById('home-client-logos').querySelectorAll('.client-logo-box');
  assert('T1.7a: #home-client-logos renders only active clients', renderedBoxes.length === 2);
  const firstImg = renderedBoxes[0]?.querySelector('img');
  assert('T1.7b: Client logo image has correct src and alt attributes', firstImg?.src === 'https://cdn.example.com/acme.svg' && firstImg?.alt === 'Acme Corp');
  ```

- **T1.8 (heroShowreelVisual)**:
  ```javascript
  const { document, App } = createTestContext();
  App.data = { settings: { showreelPosterUrl: 'https://cdn.example.com/new-hero-poster.webp' } };
  App.renderSiteSettings();
  const heroVisual = document.getElementById('heroShowreelVisual');
  assert('T1.8: #heroShowreelVisual src attribute updates to new poster URL', heroVisual.src === 'https://cdn.example.com/new-hero-poster.webp');
  ```

- **T1.9 (heroSubtitle dynamic greeting preservation)**:
  ```javascript
  const { document, App } = createTestContext();
  App.data = { settings: { heroSubtitle: 'Custom Admin Subtitle: Transforming business with AI & Design.' } };
  App.renderSiteSettings();
  App.initDynamicGreeting();
  const dynamicGreeting = document.getElementById('dynamic-greeting-text');
  assert('T1.9: heroSubtitle in settings takes priority and preserves text against greeting overwrite', dynamicGreeting.textContent === 'Custom Admin Subtitle: Transforming business with AI & Design.');
  ```

- **T1.10 (trailLogos parsing)**:
  ```javascript
  const { App } = createTestContext();
  App.data = { settings: { trailLogos: 'logo1.svg,logo2.svg,logo3.svg' } };
  App.renderSiteSettings();
  assert('T1.10: trailLogos comma-separated list parses into active logo collection', App.trailLogos.length === 3 && App.trailLogos[0] === 'logo1.svg');
  ```

- **T2.1 (Empty/null settings)**:
  ```javascript
  const { document, App } = createTestContext();
  const revealH2 = document.getElementById('revealText');
  const kineticScroller = document.getElementById('kinetic-scrolling-words');
  const heroVisual = document.getElementById('heroShowreelVisual');
  const initialReveal = revealH2.innerHTML;
  const initialScroller = kineticScroller.innerHTML;
  const initialSrc = heroVisual.src;

  App.data = { settings: null };
  App.renderSiteSettings();
  App.data = { settings: {} };
  App.renderSiteSettings();

  assert('T2.1a: Null settings payload does not throw or corrupt DOM', revealH2.innerHTML === initialReveal);
  assert('T2.1b: Empty settings payload preserves initial scroller content', kineticScroller.innerHTML === initialScroller);
  assert('T2.1c: Empty settings payload does not wipe hero image src', heroVisual.src === initialSrc);
  ```

- **T2.2 (Whitespace-only strings)**:
  ```javascript
  const { document, App } = createTestContext();
  const revealH2 = document.getElementById('revealText');
  const kineticScroller = document.getElementById('kinetic-scrolling-words');
  const kineticStatic = document.getElementById('kinetic-static-text');
  const initialSpanCount = revealH2.querySelectorAll('span').length;
  const initialScrollerCount = kineticScroller.querySelectorAll('span.word').length;
  const initialStatic = kineticStatic.textContent;

  App.data = {
    settings: {
      splitText: '    \t\n   ',
      kineticWords: '  ,  ,   ',
      kineticText: '     '
    }
  };
  App.renderSiteSettings();

  assert('T2.2a: Whitespace splitText produces no empty spans and preserves initial spans', revealH2.querySelectorAll('span').length === initialSpanCount);
  assert('T2.2b: Whitespace kineticWords does not inject empty words', kineticScroller.querySelectorAll('span.word').length === initialScrollerCount);
  assert('T2.2c: Whitespace kineticText does not overwrite with empty spaces', kineticStatic.textContent === initialStatic);
  ```

- **T2.3 (Azeri unicode & angle bracket escaping)**:
  ```javascript
  const { document, App } = createTestContext();
  const azeriSpecialText = 'Əhəmiyyətli işlər, "innovativ" həllər & <xüsusi> şriftlər: 100% zəmanət!';
  App.data = {
    settings: {
      splitText: azeriSpecialText,
      kineticText: 'İşgüzar komandalar — Bakı & Qlobal'
    }
  };
  App.renderSiteSettings();

  const revealH2 = document.getElementById('revealText');
  const kineticStatic = document.getElementById('kinetic-static-text');
  const spans = Array.from(revealH2.querySelectorAll('span'));

  assert('T2.3a: Azeri unicode characters (ə, ş, ı, ö, ğ, ç) preserved in splitText', spans.some(s => s.textContent.includes('Əhəmiyyətli')));
  assert('T2.3b: HTML angle brackets in text handled safely without breaking span hierarchy', spans.some(s => s.textContent.includes('<xüsusi>')) && revealH2.querySelector('xüsusi') === null);
  assert('T2.3c: kineticText handles em-dash and ampersand properly', kineticStatic.textContent.includes('Bakı & Qlobal'));
  ```

- **T2.4 (Missing DOM elements resiliency)**:
  ```javascript
  const { App } = createTestContext({ html: '<!DOCTYPE html><html><body></body></html>' });
  let crashed = false;
  try {
    App.data = {
      settings: {
        heroTag: 'Test',
        heroSubtitle: 'Test Subtitle',
        splitText: 'Word one word two',
        kineticWords: 'one,two,three',
        kineticText: 'Static text',
        showreelPosterUrl: 'poster.jpg'
      }
    };
    App.renderSiteSettings();
    App.renderClientLogos([{ id: '1', active: true, logoUrl: 'test.svg' }]);
  } catch (e) {
    crashed = true;
  }
  assert('T2.4: Missing DOM elements in document do not cause null pointer exceptions', !crashed);
  ```

- **T2.5 (Extreme string sizes)**:
  ```javascript
  const { document, App } = createTestContext();
  const longWords = Array.from({ length: 200 }, (_, i) => `word${i}`).join(' ');
  const longKinetic = Array.from({ length: 50 }, (_, i) => `phrase${i}`).join(',');
  App.data = {
    settings: {
      splitText: longWords,
      kineticWords: longKinetic
    }
  };
  App.renderSiteSettings();
  const spans = document.getElementById('revealText').querySelectorAll('span');
  const words = document.getElementById('kinetic-scrolling-words').querySelectorAll('span.word');
  assert('T2.5a: Massive splitText (200 words) parses accurately into 200 span elements', spans.length === 200);
  assert('T2.5b: Massive kineticWords (50 phrases) parses accurately into 51 word spans (50 + 1 clone)', words.length === 51);
  ```

- **T2.6 (Messy client list filtering & fallback preservation)**:
  ```javascript
  const { document, App } = createTestContext();
  const messyClients = [
    null,
    undefined,
    { id: '1', name: 'No Logo', logoUrl: '', active: true },
    { id: '2', name: 'Inactive Logo', logoUrl: 'https://cdn.example.com/inactive.svg', active: false },
    { id: '3', name: 'Valid Client', logoUrl: 'https://cdn.example.com/valid.svg', active: true }
  ];
  App.renderClientLogos(messyClients);
  const boxes = document.getElementById('home-client-logos').querySelectorAll('.client-logo-box');
  assert('T2.6a: Corrupt, inactive, or missing logo clients cleanly filtered out', boxes.length === 1);
  assert('T2.6b: Single rendered client is Valid Client', boxes[0]?.querySelector('img')?.alt === 'Valid Client');

  // Fallback preservation test:
  const { document: doc2, App: app2 } = createTestContext();
  const initialLogosCount = doc2.getElementById('home-client-logos').children.length;
  app2.renderClientLogos([{ id: '1', name: 'No Logo', logoUrl: '', active: true }]);
  assert('T2.6c: 0 valid clients preserves fallback client logos in index.html', doc2.getElementById('home-client-logos').children.length === initialLogosCount);
  ```

- **T3.1 (Multilingual Az/En/Ru)**:
  ```javascript
  const { document, App, I18nManager } = createTestContext();
  const multiLangSettings = {
    heroTag: 'Salam',
    heroTagEn: 'Hello',
    heroTagRu: 'Привет',
    splitText: 'Biznes üçün böyük ideyalar.',
    splitTextEn: 'Big ideas for ambitious business.',
    splitTextRu: 'Большие идеи для бизнеса.',
    kineticWords: 'insanlar, brendlər',
    kineticWordsEn: 'people, brands',
    kineticWordsRu: 'люди, бренды'
  };
  App.data = { settings: multiLangSettings };

  I18nManager.lang = 'en';
  App.renderSiteSettings();
  assert('T3.1a: Multilingual EN updates heroTag to Hello', document.getElementById('hero-hello-title').textContent.includes('Hello'));
  assert('T3.1b: Multilingual EN updates splitText to English words', document.getElementById('revealText').textContent.includes('ambitious'));
  assert('T3.1c: Multilingual EN updates kineticWords to English words', document.getElementById('kinetic-scrolling-words').textContent.includes('brands'));

  I18nManager.lang = 'ru';
  App.renderSiteSettings();
  assert('T3.1d: Multilingual RU updates heroTag to Привет', document.getElementById('hero-hello-title').textContent.includes('Привет'));
  assert('T3.1e: Multilingual RU updates splitText to Russian words', document.getElementById('revealText').textContent.includes('Большие'));
  ```

- **T3.2 (Simultaneous sync)**:
  ```javascript
  const { document, App } = createTestContext();
  App.data = {
    settings: {
      splitText: 'Birləşdirilmiş yenilənmə testi',
      kineticWords: 'bir, iki, üç'
    }
  };
  App.renderSiteSettings();
  App.renderClientLogos([
    { id: 'c1', name: 'Partner One', logoUrl: 'p1.svg', active: true },
    { id: 'c2', name: 'Partner Two', logoUrl: 'p2.svg', active: true }
  ]);
  assert('T3.2a: Simultaneous update renders splitText spans', document.getElementById('revealText').querySelectorAll('span').length === 3);
  assert('T3.2b: Simultaneous update renders kineticWords', document.getElementById('kinetic-scrolling-words').querySelectorAll('span.word').length === 4);
  assert('T3.2c: Simultaneous update renders client logos grid', document.getElementById('home-client-logos').querySelectorAll('.client-logo-box').length === 2);
  ```

- **T3.3 (State transitions)**:
  ```javascript
  const { document, App } = createTestContext();
  const revealH2 = document.getElementById('revealText');
  const heroVisual = document.getElementById('heroShowreelVisual');

  App.data = { settings: { splitText: 'First Custom Version', showreelPosterUrl: 'poster1.jpg' } };
  App.renderSiteSettings();
  assert('T3.3a: Step 1 custom text set', revealH2.textContent.includes('First'));
  assert('T3.3b: Step 1 custom poster set', heroVisual.src === 'http://localhost:3000/poster1.jpg');

  App.data = { settings: { showreelPosterUrl: '' } };
  App.renderSiteSettings();
  assert('T3.3c: Empty poster does not wipe existing poster', heroVisual.src === 'http://localhost:3000/poster1.jpg');

  App.data = { settings: { splitText: 'Second Reapplied Version', showreelPosterUrl: 'poster2.jpg' } };
  App.renderSiteSettings();
  assert('T3.3d: Step 3 reapplied text set', revealH2.textContent.includes('Second'));
  assert('T3.3e: Step 3 reapplied poster set', heroVisual.src === 'http://localhost:3000/poster2.jpg');
  ```

- **T4.1 (Full App.loadData() pipeline)**:
  ```javascript
  const mockStore = {
    getSettings: async () => ({
      heroTag: 'Salam',
      heroHeadline: 'Əsas Başlıq',
      heroSubtitle: 'Biznesinizi gələcəyə daşıyırıq.',
      showreelPosterUrl: 'https://cdn.example.com/hero.jpg',
      kineticText: 'Yüksək dəqiqlikli işlər',
      kineticWords: 'strategiya, dizayn, texnologiya',
      splitText: 'Brandfull ilə rəqəmsal liderlik əldə edin.'
    }),
    getClients: async () => [
      { id: '1', name: 'Kapital Bank', logoUrl: 'kapital.svg', active: true },
      { id: '2', name: 'Pasha Bank', logoUrl: 'pasha.svg', active: true }
    ],
    getProjects: async () => [],
    getSolutions: async () => [],
    getArticles: async () => [],
    getJobs: async () => []
  };

  const { document, App } = createTestContext({ BrandfullStore: mockStore });
  await App.loadData();

  assert('T4.1a: Full data pipeline populates settings in store', App.data.settings.heroTag === 'Salam');
  assert('T4.1b: Full data pipeline populates clients in store', App.data.clients.length === 2);
  assert('T4.1c: Full data pipeline updates #revealText on live site', document.getElementById('revealText').querySelectorAll('span').length === 6);
  assert('T4.1d: Full data pipeline updates #kinetic-scrolling-words on live site', document.getElementById('kinetic-scrolling-words').querySelectorAll('span.word').length === 4);
  assert('T4.1e: Full data pipeline updates #home-client-logos on live site', document.getElementById('home-client-logos').querySelectorAll('.client-logo-box').length === 2);
  ```

- **T4.2 (Admin settings persistence roundtrip & live site sync)**:
  ```javascript
  const { document, App } = createTestContext();
  const dbSiteSettings = {
    id: 'singleton',
    heroTag: 'Salam',
    heroSubtitle: 'Köhnə alt başlıq',
    splitText: 'Köhnə split text',
    kineticWords: 'köhnə1, köhnə2'
  };

  function adminUpdateSettings(updatePayload) {
    Object.assign(dbSiteSettings, updatePayload);
    App.data = { settings: dbSiteSettings };
    App.renderSiteSettings();
  }

  adminUpdateSettings({
    heroSubtitle: 'Yeni Admin Alt Başlıq',
    splitText: 'Yeni və müasir rəqəmsal həllər',
    kineticWords: 'innovasiya, inkişaf, liderlik'
  });

  assert('T4.2a: Admin update persists to simulated DB state', dbSiteSettings.heroSubtitle === 'Yeni Admin Alt Başlıq');
  assert('T4.2b: Live site DOM immediately reflects new heroSubtitle', document.getElementById('dynamic-greeting-text').textContent === 'Yeni Admin Alt Başlıq');
  assert('T4.2c: Live site DOM immediately reflects new splitText spans', document.getElementById('revealText').querySelectorAll('span').length === 5);
  assert('T4.2d: Live site DOM immediately reflects new kineticWords spans', document.getElementById('kinetic-scrolling-words').querySelectorAll('span.word').length === 4);
  ```

---

## 5. Verification & Test Execution Results

We verified this entire refactoring via `.agents/teamwork_preview_explorer_m1_fix_3/test-dry-run.js`:
- `node .agents/teamwork_preview_explorer_m1_fix_3/test-dry-run.js`
- **Result**: `Total: 49, Passed: 49, Failed: 0` (Exit code 0).
- Combined with T1.1–T1.3 (schema and router checks: 4 tests), the test suite will produce **53 total tests, 53 passed, 0 failed**.
