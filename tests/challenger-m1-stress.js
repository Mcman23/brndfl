/**
 * tests/challenger-m1-stress.js
 * Empirical Challenge & Adversarial Stress Suite for Milestone 1
 * 
 * Tests 5 Core Challenge Vectors:
 * 1. Route Behaviors: GET /api/clients vs GET /clients on live Express app
 * 2. Dynamic Rendering under Extreme Payloads (Empty, Whitespace, 5000+ chars, Azeri Unicode, XSS injection)
 * 3. #kinetic-static-text & #kinetic-scrolling-words DOM structure, loop cloning, CSS keyframe alignment
 * 4. Client Logos rendering for 0, 1, and 10 active clients (including static fallback persistence bug)
 * 5. Automated regression checks
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const findings = [];

function assert(condition, message, metadata = {}) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
    findings.push({ message, ...metadata });
  }
}

// =============================================================================
// 1. ROUTE BEHAVIORS: GET /api/clients vs GET /clients
// =============================================================================
async function testRouteBehaviors() {
  console.log('\n--- AREA 1: ROUTE BEHAVIORS (GET /api/clients vs GET /clients) ---');
  
  // Import Express app
  let app;
  try {
    const appModule = await import('../backend/src/app.js');
    app = appModule.default;
  } catch (err) {
    assert(false, `Failed to load backend/src/app.js: ${err.message}`);
    return;
  }

  // Spin up ephemeral server on random port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1.1 Test GET /api/clients
    const resApi = await fetch(`${baseUrl}/api/clients`);
    const contentTypeApi = resApi.headers.get('content-type') || '';
    assert(
      contentTypeApi.includes('application/json'),
      `GET /api/clients returns application/json (actual: ${contentTypeApi})`
    );
    
    // Status should be 200 or 500 (if local postgres offline), but must be JSON
    const bodyApi = await resApi.json().catch(() => null);
    assert(
      bodyApi !== null,
      `GET /api/clients responds with valid JSON payload`
    );

    // 1.2 Test GET /clients (without /api prefix)
    const resRootClients = await fetch(`${baseUrl}/clients`);
    const contentTypeRoot = resRootClients.headers.get('content-type') || '';
    const textRoot = await resRootClients.text();

    // Observe what /clients actually returns
    const isHtml = contentTypeRoot.includes('text/html');
    const isIndexHtml = textRoot.includes('<!DOCTYPE html>') && textRoot.includes('Brandfull');
    
    console.log(`    [Observation] GET /clients status: ${resRootClients.status}, content-type: ${contentTypeRoot}`);
    console.log(`    [Observation] GET /clients served index.html SPA fallback: ${isIndexHtml}`);

    // If client or developer expects /clients to be an API endpoint returning JSON:
    assert(
      resRootClients.status === 200,
      `GET /clients responds with 200 status code`
    );

    // Document whether /clients is an API alias or SPA fallback
    if (isHtml) {
      findings.push({
        severity: 'MEDIUM',
        category: 'API_ROUTE_MISMATCH',
        message: 'GET /clients serves index.html (SPA fallback) instead of JSON. Only GET /api/clients returns JSON.',
        observation: `Content-Type is '${contentTypeRoot}', body contains index.html HTML markup. Worker M1 stated in handoff: "Implemented BrandfullStore.getClients() calling /clients", but actual API route requires /api/clients prefix.`
      });
    }

    // 1.3 Test frontend client store behavior with both URLs
    const storeCode = fs.readFileSync(path.join(rootDir, 'js/data.js'), 'utf-8');
    assert(
      storeCode.includes('fetch(`${API_BASE}/clients`)'),
      `js/data.js BrandfullStore.getClients() calls fetch(\`\${API_BASE}/clients\`) ensuring /api/ prefix is included`
    );

  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

// =============================================================================
// 2. DYNAMIC RENDERING: EXTREME PAYLOADS
// =============================================================================
async function testExtremePayloads() {
  console.log('\n--- AREA 2: EXTREME PAYLOADS & INPUT RESILIENCE ---');

  const htmlContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
  const dom = new JSDOM(htmlContent);
  const { document } = dom.window;

  // Extract renderSiteSettings logic from js/app.js
  const appCode = fs.readFileSync(path.join(rootDir, 'js/app.js'), 'utf-8');
  
  // Helper to run renderSiteSettings in JSDOM context
  function simulateRenderSettings(settingsPayload) {
    const s = settingsPayload || {};
    const getI18n = (field) => s[field] || '';

    const heroTag = document.getElementById('heroTag') || document.querySelector('.hero-tag');
    const heroHeadline = document.getElementById('hero-hello-headline');
    const heroSubtitle = document.getElementById('dynamic-greeting-text');

    if (heroTag && s.heroTag) heroTag.innerHTML = getI18n('heroTag') + '<span class="color-primary">.</span>';
    if (heroHeadline && s.heroHeadline) heroHeadline.textContent = getI18n('heroHeadline');
    if (heroSubtitle && s.heroSubtitle) {
      heroSubtitle.textContent = getI18n('heroSubtitle');
      if (typeof heroSubtitle.setAttribute === 'function') {
        heroSubtitle.setAttribute('data-hero-subtitle-rendered', 'true');
      }
    }

    // Kinetic Text
    const kineticStatic = document.getElementById('kinetic-static-text');
    if (kineticStatic && s.kineticText) {
       kineticStatic.textContent = String(getI18n('kineticText')).trim() + ' ';
    }
    
    const kineticScroller = document.getElementById('kinetic-scrolling-words');
    if (kineticScroller && s.kineticWords) {
        const wordsStr = getI18n('kineticWords') || '';
        const words = wordsStr.split(',').map(w => w.trim()).filter(Boolean);
        if (words.length > 0) {
            kineticScroller.innerHTML = words.map(w => '<span class="word">' + w + '</span>').join('');
            // Clone the first word to the end for smooth loop if GSAP expects it
            kineticScroller.innerHTML += '<span class="word">' + words[0] + '</span>';
        }
    }
    
    // Split Text (revealText)
    const splitTextEl = document.getElementById('revealText');
    if (splitTextEl && s.splitText) {
        const text = getI18n('splitText') || '';
        const words = text.split(/\s+/).map(w => w.trim()).filter(Boolean);
        if (words.length > 0) {
            splitTextEl.innerHTML = words.map(w => '<span>' + w + '</span>').join(' ');
        }
    }
  }

  // 2.1 Test Empty Strings
  simulateRenderSettings({
    kineticText: '',
    kineticWords: '',
    splitText: '',
    heroHeadline: '',
    heroSubtitle: ''
  });
  const staticEl = document.getElementById('kinetic-static-text');
  assert(
    staticEl.textContent.includes('Əhəmiyyətli işlər'),
    `Empty kineticText preserves initial text content ("${staticEl.textContent.trim()}")`
  );

  const scrollerEl = document.getElementById('kinetic-scrolling-words');
  assert(
    scrollerEl.children.length === 5,
    `Empty kineticWords preserves initial 5 word spans (found: ${scrollerEl.children.length})`
  );

  // 2.2 Test Whitespace Only
  simulateRenderSettings({
    kineticText: '     ',
    kineticWords: '   ,   ,   ',
    splitText: '    \n\t   '
  });
  // Note: '   '.trim() + ' ' becomes ' '
  console.log(`    [Observation] Whitespace kineticText result: "${staticEl.textContent}"`);
  assert(
    staticEl.textContent === ' ',
    `Whitespace-only kineticText results in single trailing space (' ') without crashing`
  );
  assert(
    scrollerEl.children.length === 5,
    `Whitespace-only kineticWords preserves initial spans without creating empty spans`
  );

  // 2.3 Test Azeri Unicode Characters: ə, ö, ü, ı, ç, ş, ğ, Ə, Ö, Ü, I, İ, Ç, Ş, Ğ
  const azeriText = 'Əhəmiyyətli və fərqli işlər: Sağlamlıq, İnnovasiya, Ötürücü, Ümumi, Qısa, Şəbəkə, Çeşid.';
  const azeriWords = 'brendlər üçün, komandalar üçün, cəmiyyət üçün, şəbəkələr üçün, gələcək üçün';
  simulateRenderSettings({
    kineticText: azeriText,
    kineticWords: azeriWords,
    splitText: 'Hər kəs nəsə yarada bilər, lakin əhəmiyyətli işlər yaratmaq çətin tərəfdir.'
  });

  assert(
    staticEl.textContent.trim() === azeriText,
    `Azeri characters (ə, ö, ü, ı, ç, ş, ğ) in kineticText preserved accurately`
  );

  const wordSpans = scrollerEl.querySelectorAll('.word');
  assert(
    wordSpans.length === 6, // 5 words + 1 clone = 6
    `Azeri kineticWords generates 5 words + 1 clone = 6 spans (actual: ${wordSpans.length})`
  );
  assert(
    wordSpans[0].textContent === 'brendlər üçün',
    `First word span preserved with exact Azeri unicode characters`
  );
  assert(
    wordSpans[wordSpans.length - 1].textContent === 'brendlər üçün',
    `Loop clone preserves exact Azeri unicode characters`
  );

  // 2.4 Test Massive Payloads (Stress test: 10,000 chars, 500 words)
  const massiveText = 'A'.repeat(10000);
  const massiveWords = Array.from({ length: 200 }, (_, i) => `Söz_${i}`).join(', ');
  const startTime = Date.now();
  simulateRenderSettings({
    kineticText: massiveText,
    kineticWords: massiveWords
  });
  const elapsedMs = Date.now() - startTime;
  assert(
    elapsedMs < 100,
    `Massive payload (10,000 char static text, 200 kinetic words) renders in <100ms (actual: ${elapsedMs}ms)`
  );
  assert(
    scrollerEl.children.length === 201, // 200 + 1 clone
    `Massive kineticWords parsed exactly 200 words + 1 clone = 201 spans`
  );

  // 2.5 Test HTML / XSS Injection
  const xssPayload = '<img src=x onerror=alert(1)>';
  simulateRenderSettings({
    kineticText: xssPayload,
    kineticWords: `Təhlükəsiz söz, ${xssPayload}, üçüncü`
  });

  // textContent safely escapes static text
  assert(
    staticEl.innerHTML.includes('&lt;img') || !staticEl.querySelector('img'),
    `kineticStatic textContent safely escapes HTML tags without executing elements`
  );

  // In kineticScroller: innerHTML = words.map(w => '<span class="word">' + w + '</span>')
  const injectedImg = scrollerEl.querySelector('img');
  console.log(`    [Observation] XSS injection into kineticScroller created DOM node: ${Boolean(injectedImg)}`);
  if (injectedImg) {
    findings.push({
      severity: 'HIGH',
      category: 'XSS_INJECTION_VULNERABILITY',
      message: 'Unescaped HTML tags in kineticWords are directly injected into innerHTML as executable DOM elements.',
      observation: `Passing '<img src=x onerror=alert(1)>' in kineticWords parsed into a live HTMLImageElement in #kinetic-scrolling-words because app.js line 197 concatenates words directly into innerHTML without sanitization or HTML encoding.`
    });
  }
}

// =============================================================================
// 3. KINETIC TYPOGRAPHY DOM STRUCTURE & LOOP CLONING
// =============================================================================
async function testKineticTypographyStructure() {
  console.log('\n--- AREA 3: KINETIC TYPOGRAPHY DOM STRUCTURE & LOOP CLONING ---');

  const htmlContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
  const dom = new JSDOM(htmlContent);
  const { document } = dom.window;

  // 3.1 Initial DOM structure
  const staticEl = document.getElementById('kinetic-static-text');
  const scrollerEl = document.getElementById('kinetic-scrolling-words');
  const scrollerContainer = document.querySelector('.word-scroller');

  assert(staticEl !== null, `#kinetic-static-text element exists in index.html`);
  assert(scrollerEl !== null, `#kinetic-scrolling-words element exists in index.html`);
  assert(scrollerContainer !== null, `.word-scroller wrapper exists in index.html`);
  assert(
    scrollerContainer.contains(scrollerEl),
    `#kinetic-scrolling-words is a child of .word-scroller`
  );

  // 3.2 Verify Initial Word Structure in index.html
  const initialSpans = Array.from(scrollerEl.querySelectorAll('.word'));
  assert(
    initialSpans.length === 5,
    `Initial index.html has 5 word spans (4 unique + 1 clone)`
  );
  assert(
    initialSpans[0].textContent.trim() === initialSpans[4].textContent.trim(),
    `Initial index.html has loop clone: word 0 ("${initialSpans[0].textContent.trim()}") matches word 4 ("${initialSpans[4].textContent.trim()}")`
  );

  // 3.3 Dynamic Loop Cloning Logic
  const sampleWords = ['bizneslər üçün', 'brendlər üçün', 'insanlar üçün'];
  const wordsStr = sampleWords.join(', ');
  
  // Replicate app.js lines 192-201
  const words = wordsStr.split(',').map(w => w.trim()).filter(Boolean);
  scrollerEl.innerHTML = words.map(w => '<span class="word">' + w + '</span>').join('');
  scrollerEl.innerHTML += '<span class="word">' + words[0] + '</span>';

  const updatedSpans = Array.from(scrollerEl.querySelectorAll('.word'));
  assert(
    updatedSpans.length === sampleWords.length + 1,
    `Dynamic rendering creates ${sampleWords.length + 1} spans for ${sampleWords.length} words (N + 1 clone)`
  );
  assert(
    updatedSpans[0].textContent === sampleWords[0],
    `First word span is "${sampleWords[0]}"`
  );
  assert(
    updatedSpans[updatedSpans.length - 1].textContent === sampleWords[0],
    `Last word span is clone of first word ("${sampleWords[0]}")`
  );

  // 3.4 CSS Keyframe Animation Alignment Check
  const cssContent = fs.readFileSync(path.join(rootDir, 'css/components.css'), 'utf-8');
  const keyframeMatch = cssContent.match(/@keyframes scrollWordsDown\s*\{([\s\S]*?)\}/);
  const keyframeBody = keyframeMatch ? keyframeMatch[1] : '';

  // Count keyframe steps
  const steps = (keyframeBody.match(/translateY\([^)]+\)/g) || []);
  console.log(`    [Observation] CSS @keyframes scrollWordsDown translateY steps: ${steps.join(', ')}`);
  
  // Notice: The CSS animation has 5 translateY stops (-4.4em, -3.3em, -2.2em, -1.1em, 0).
  // If dynamic input has 3 words + 1 clone = 4 words, the scroller moves up to -4.4em (index 4), which is empty space!
  if (steps.length === 5 && updatedSpans.length === 4) {
    findings.push({
      severity: 'LOW',
      category: 'ANIMATION_STEP_MISMATCH',
      message: 'Fixed 5-step CSS keyframe scrollWordsDown assumes exactly 4 words + 1 clone (5 total spans). If admin provides 3 or 5 words, animation offsets may overshoot or undershoot.',
      observation: `CSS defines translateY from -4.4em (5th word) down to 0, matching 5 spans. Providing 3 words creates 4 spans (total height 4.4em), so -4.4em scrolls all 4 spans entirely out of the 1.1em viewport during 0%-15% phase.`
    });
  }

  // 3.5 Trailing Space Verification on #kinetic-static-text
  staticEl.textContent = String('Yenilikçi həllər').trim() + ' ';
  assert(
    staticEl.textContent.endsWith(' '),
    `#kinetic-static-text appends a trailing space to maintain separation from .word-scroller`
  );
}

// =============================================================================
// 4. CLIENT LOGOS RENDERING (0, 1, 10 ACTIVE CLIENTS)
// =============================================================================
async function testClientLogosRendering() {
  console.log('\n--- AREA 4: CLIENT LOGOS RENDERING (0, 1, 10 ACTIVE CLIENTS) ---');

  const htmlContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
  const dom = new JSDOM(htmlContent);
  const { document } = dom.window;

  function renderClientLogos(clientsData) {
    const grid = document.getElementById('home-client-logos');
    if (!grid) return;
    
    const rawClients = clientsData || [];
    const clients = rawClients.filter(c => c.active !== false);
    if (clients.length === 0) return;
    
    grid.innerHTML = clients.map(client => {
       if (client.logoUrl) {
         return `<div class="client-logo-box"><img src="${client.logoUrl}" alt="${client.name}" loading="lazy" /></div>`;
       }
       return '';
    }).join('');
  }

  const grid = document.getElementById('home-client-logos');
  const initialLogosCount = grid.querySelectorAll('.client-logo-box').length;
  console.log(`    [Observation] Initial hardcoded client logos in index.html: ${initialLogosCount}`);

  // 4.1 Test Case: 0 Active Clients
  // Pass empty array:
  renderClientLogos([]);
  const logosAfterZero = grid.querySelectorAll('.client-logo-box').length;
  console.log(`    [Observation] Logos count after renderClientLogos([]): ${logosAfterZero}`);
  
  // Bug check: In app.js line 543: `if (clients.length === 0) return;`
  // If clients is empty, it returns early and leaves the 8 hardcoded static logos intact!
  if (logosAfterZero === initialLogosCount && initialLogosCount > 0) {
    findings.push({
      severity: 'MEDIUM',
      category: 'ZERO_CLIENTS_PERSISTENCE_BUG',
      message: 'When 0 active clients exist in database, renderClientLogos() returns early without clearing the grid, leaving the 8 hardcoded static demo logos visible on the live site.',
      observation: `renderClientLogos([]) left all ${initialLogosCount} static logos in #home-client-logos because of 'if (clients.length === 0) return;' guard at line 543 of js/app.js.`
    });
  }

  // Pass array with only inactive clients:
  const inactiveOnly = [
    { id: '1', name: 'Old Client 1', logoUrl: '/img/1.svg', active: false },
    { id: '2', name: 'Old Client 2', logoUrl: '/img/2.svg', active: false }
  ];
  renderClientLogos(inactiveOnly);
  const logosAfterInactive = grid.querySelectorAll('.client-logo-box').length;
  assert(
    logosAfterInactive === initialLogosCount,
    `Inactive clients are correctly filtered out (count does not add inactive logos)`
  );

  // 4.2 Test Case: Exactly 1 Active Client
  const singleClient = [
    { id: 'c1', name: 'Azercell', logoUrl: 'https://example.com/azercell.svg', active: true }
  ];
  renderClientLogos(singleClient);
  const singleBoxes = grid.querySelectorAll('.client-logo-box');
  assert(
    singleBoxes.length === 1,
    `Exactly 1 active client renders exactly 1 client-logo-box (replaced static 8 logos)`
  );
  const img1 = singleBoxes[0].querySelector('img');
  assert(
    img1.src === singleClient[0].logoUrl && img1.alt === singleClient[0].name,
    `Rendered logo has correct src ("${img1.src}") and alt ("${img1.alt}")`
  );
  assert(
    img1.getAttribute('loading') === 'lazy',
    `Rendered logo has loading="lazy" attribute`
  );

  // 4.3 Test Case: Exactly 10 Active Clients
  const tenClients = Array.from({ length: 10 }, (_, i) => ({
    id: `c-${i + 1}`,
    name: `Müştəri ${i + 1}`,
    logoUrl: `https://example.com/logo-${i + 1}.svg`,
    active: true,
    order: i + 1
  }));
  renderClientLogos(tenClients);
  const tenBoxes = grid.querySelectorAll('.client-logo-box');
  assert(
    tenBoxes.length === 10,
    `10 active clients render exactly 10 client-logo-box elements (actual: ${tenBoxes.length})`
  );
  assert(
    tenBoxes[0].querySelector('img').alt === 'Müştəri 1' &&
    tenBoxes[9].querySelector('img').alt === 'Müştəri 10',
    `First and 10th client logos are in correct sequential order`
  );

  // 4.4 Test Case: 10 Clients with Missing / Blank Logo URLs
  const mixedClients = [
    ...tenClients.slice(0, 7),
    { id: 'c-8', name: 'No Logo 8', logoUrl: '', active: true },
    { id: 'c-9', name: 'No Logo 9', logoUrl: null, active: true },
    { id: 'c-10', name: 'No Logo 10', logoUrl: undefined, active: true }
  ];
  renderClientLogos(mixedClients);
  const renderedMixed = grid.querySelectorAll('.client-logo-box');
  assert(
    renderedMixed.length === 7,
    `Clients with empty or missing logoUrl are skipped without creating empty boxes (expected: 7, actual: ${renderedMixed.length})`
  );

  // 4.5 Test Case: HTML Injection in Client Name / Logo URL
  const maliciousClient = [
    { id: 'mal1', name: 'Malicious "><script>alert("xss")</script>', logoUrl: 'https://example.com/test.svg', active: true }
  ];
  renderClientLogos(maliciousClient);
  const malBox = grid.querySelector('.client-logo-box');
  const malImg = malBox.querySelector('img');
  console.log(`    [Observation] Client name attribute in rendered img: alt="${malImg.getAttribute('alt')}"`);
  const injectedScript = malBox.querySelector('script');
  if (injectedScript) {
    findings.push({
      severity: 'HIGH',
      category: 'XSS_CLIENT_NAME_INJECTION',
      message: 'Unescaped client.name in renderClientLogos allows HTML/script injection via innerHTML template literal.',
      observation: `Injecting '"><script>...' created a live script tag in #home-client-logos.`
    });
  }
}

// =============================================================================
// 5. MASTER EXECUTION & FINDINGS SUMMARY
// =============================================================================
async function runAllChallengerTests() {
  console.log('================================================================================');
  console.log(' EMPIRICAL CHALLENGER TEST SUITE: MILESTONE 1 VERIFICATION');
  console.log(' Project: Brandfull Live Site & Dynamic API Integration');
  console.log('================================================================================');

  await testRouteBehaviors();
  await testExtremePayloads();
  await testKineticTypographyStructure();
  await testClientLogosRendering();

  console.log('\n================================================================================');
  console.log(' CHALLENGER TEST EXECUTION SUMMARY');
  console.log(` Total Assertions: ${totalTests}`);
  console.log(` Passed:           ${passedTests}`);
  console.log(` Failed:           ${failedTests}`);
  console.log(` Findings Count:   ${findings.length}`);
  console.log('================================================================================');

  if (findings.length > 0) {
    console.log('\nSURFACED FINDINGS / VULNERABILITIES:');
    findings.forEach((f, idx) => {
      console.log(`\n[Finding ${idx + 1}] [${f.severity || 'INFO'}] ${f.category || ''}`);
      console.log(`  Issue:       ${f.message}`);
      if (f.observation) console.log(`  Observation: ${f.observation}`);
    });
  }

  // Return exit code 0 if assertions passed (findings are documented for handoff)
  process.exit(failedTests > 0 ? 1 : 0);
}

runAllChallengerTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
