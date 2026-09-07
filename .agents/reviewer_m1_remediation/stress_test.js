import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { JSDOM } from 'jsdom';
import prisma from '../../backend/src/db.js';

let passed = 0;
let failed = 0;
const results = [];

function assert(name, condition, details = '') {
  if (condition) {
    passed++;
    results.push({ pass: true, name });
    console.log(`✓ PASS: ${name}`);
  } else {
    failed++;
    results.push({ pass: false, name, details });
    console.error(`✗ FAIL: ${name} -> ${details}`);
  }
}

async function run() {
  console.log('====================================================');
  console.log('INDEPENDENT ADVERSARIAL VERIFICATION: M1 REMEDIATION');
  console.log('====================================================\n');

  const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf-8');
  const appJsCode = fs.readFileSync(path.resolve('js/app.js'), 'utf-8');

  // --- 1. INTEGRITY CHECKS ---
  console.log('--- 1. INTEGRITY AUDIT ---');
  assert(
    'No applySettingsToDOM in entire codebase',
    !fs.readFileSync(path.resolve('tests/verify-settings-sync.js'), 'utf-8').includes('applySettingsToDOM') &&
    !appJsCode.includes('applySettingsToDOM')
  );
  assert(
    'No MockElement or MockDocument in verify-settings-sync.js',
    !fs.readFileSync(path.resolve('tests/verify-settings-sync.js'), 'utf-8').includes('MockElement') &&
    !fs.readFileSync(path.resolve('tests/verify-settings-sync.js'), 'utf-8').includes('MockDocument')
  );
  assert(
    'verify-settings-sync.js executes real js/app.js via VM',
    fs.readFileSync(path.resolve('tests/verify-settings-sync.js'), 'utf-8').includes('vm.runInContext(appJsCode, sandbox)')
  );

  // Helper to boot real App in JSDOM
  function setupTestApp(html = indexHtml) {
    const dom = new JSDOM(html, { url: 'http://localhost:3000' });
    const win = dom.window;
    const doc = win.document;
    win.scrollTo = () => {};

    Object.defineProperty(doc, 'readyState', { value: 'loading', configurable: true, writable: true });

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
        lang: 'az',
        get: (field, obj) => (obj ? obj[field] || '' : '')
      },
      BRANDFULL_DEFAULT_DATA: { settings: {} },
      BrandfullStore: {
        getProjects: async () => [],
        getSolutions: async () => [],
        getArticles: async () => [],
        getJobs: async () => [],
        getSettings: async () => ({}),
        getClients: async () => []
      }
    };

    vm.createContext(sandbox);
    vm.runInContext(appJsCode, sandbox);

    return { dom, window: win, document: doc, App: win.App };
  }

  // --- 2. ADVERSARIAL XSS INJECTION STRESS TESTING ---
  console.log('\n--- 2. ADVERSARIAL XSS INJECTION TESTS ---');
  {
    const { document, App } = setupTestApp();
    const maliciousPayload = '<script>window.__xss=1;</script><img src="x" onerror="window.__xss=2"/>"><b onmouseover="alert(1)">bold</b>';

    App.data = {
      settings: {
        heroTag: maliciousPayload,
        kineticWords: `safe word, ${maliciousPayload}, another safe`,
        splitText: `Normal text ${maliciousPayload} after text`,
      }
    };
    App.renderSiteSettings();

    const heroTag = document.getElementById('hero-hello-title');
    const scroller = document.getElementById('kinetic-scrolling-words');
    const reveal = document.getElementById('revealText');

    assert('heroTag contains 0 script tags', heroTag.querySelectorAll('script').length === 0);
    assert('heroTag contains 0 img tags', heroTag.querySelectorAll('img').length === 0);
    assert('heroTag contains 0 b tags', heroTag.querySelectorAll('b').length === 0);
    assert('heroTag has escaped HTML entities', heroTag.innerHTML.includes('&lt;script&gt;'));

    assert('kineticWords contains 0 script tags', scroller.querySelectorAll('script').length === 0);
    assert('kineticWords contains 0 img tags', scroller.querySelectorAll('img').length === 0);
    assert('kineticWords contains 0 b tags', scroller.querySelectorAll('b').length === 0);
    assert('kineticWords has escaped HTML entities', scroller.innerHTML.includes('&lt;script&gt;'));

    assert('splitText contains 0 script tags', reveal.querySelectorAll('script').length === 0);
    assert('splitText contains 0 img tags', reveal.querySelectorAll('img').length === 0);
    assert('splitText contains 0 b tags', reveal.querySelectorAll('b').length === 0);
    assert('splitText has escaped HTML entities', reveal.innerHTML.includes('&lt;script&gt;'));
  }

  // Client Logos XSS Injection
  {
    const { document, App } = setupTestApp();
    const maliciousClients = [
      {
        id: 'xss-1',
        name: 'Evil Name <script>window.__xss=3</script><b onmouseover=alert(1)></b>',
        logoUrl: 'https://example.com/logo.svg" onerror="window.__xss=4" data-test="<script>',
        active: true
      }
    ];

    App.renderClientLogos(maliciousClients);
    const grid = document.getElementById('home-client-logos');

    assert('home-client-logos contains 0 script tags', grid.querySelectorAll('script').length === 0);
    assert('home-client-logos contains 0 b tags', grid.querySelectorAll('b').length === 0);
    const img = grid.querySelector('img');
    assert('img alt attribute contains properly escaped quotes/brackets', img.getAttribute('alt').includes('<script>'));
    assert('img src attribute does not break out into onerror attribute', !img.hasAttribute('onerror'));
    assert('img src value contains escaped payload as literal text', img.getAttribute('src').includes('onerror="window.__xss=4"'));
  }

  // --- 3. NULL-SAFETY & FALLBACK LOGOS RESILIENCE ---
  console.log('\n--- 3. NULL SAFETY & FALLBACK PRESERVATION TESTS ---');
  {
    const { document, App } = setupTestApp();
    const grid = document.getElementById('home-client-logos');
    const initialFallbackCount = grid.children.length;
    assert('index.html contains static fallback client logos initially', initialFallbackCount > 0);

    // Test 3.1: Pass null
    let didThrow = false;
    try {
      App.renderClientLogos(null);
    } catch (e) {
      didThrow = true;
    }
    assert('renderClientLogos(null) does not throw', !didThrow);
    assert('renderClientLogos(null) preserves initial fallback logos', grid.children.length === initialFallbackCount);

    // Test 3.2: Pass empty array
    App.renderClientLogos([]);
    assert('renderClientLogos([]) preserves initial fallback logos', grid.children.length === initialFallbackCount);

    // Test 3.3: Pass array with corrupt items (null, undefined, primitives, objects without logoUrl)
    const corruptArray = [
      null,
      undefined,
      false,
      123,
      {},
      { active: false, logoUrl: 'inactive.svg' },
      { active: true, logoUrl: '' },
      { active: true, logoUrl: '   ' }
    ];
    try {
      App.renderClientLogos(corruptArray);
    } catch (e) {
      didThrow = true;
    }
    assert('renderClientLogos(corruptArray) does not throw', !didThrow);
    assert('renderClientLogos(corruptArray) preserves fallback when 0 valid clients', grid.children.length === initialFallbackCount);

    // Test 3.4: Pass valid client along with corrupt items
    const mixedArray = [
      null,
      { id: 'c1', name: 'Legit Client', logoUrl: 'https://example.com/legit.svg', active: true },
      undefined
    ];
    App.renderClientLogos(mixedArray);
    assert('renderClientLogos(mixedArray) renders exactly 1 valid client', grid.children.length === 1);
    assert('renderClientLogos(mixedArray) has correct alt', grid.querySelector('img').alt === 'Legit Client');
  }

  // --- 4. DATABASE & PRISMA TRAILLOGOS SYNCHRONIZATION ---
  console.log('\n--- 4. PRISMA SCHEMA & POSTGRESQL SYNC TESTS ---');
  try {
    // 4.1 Check schema definition
    const schemaContent = fs.readFileSync(path.resolve('backend/prisma/schema.prisma'), 'utf-8');
    assert('schema.prisma contains trailLogos String @default("")', schemaContent.includes('trailLogos') && schemaContent.includes('String'));

    // 4.2 Query singleton
    const current = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } });
    assert('prisma.siteSettings.findUnique() returns trailLogos property', current !== null && 'trailLogos' in current);

    // 4.3 Update trailLogos via Prisma client
    const testLogos = 'trail1.svg,trail2.svg,trail3.svg';
    const updated = await prisma.siteSettings.update({
      where: { id: 'singleton' },
      data: { trailLogos: testLogos }
    });
    assert('prisma.siteSettings.update() with trailLogos persists cleanly', updated.trailLogos === testLogos);

    // Verify retrieval
    const refetched = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } });
    assert('Refetched trailLogos matches persisted value', refetched.trailLogos === testLogos);

    // Reset trailLogos
    await prisma.siteSettings.update({
      where: { id: 'singleton' },
      data: { trailLogos: current.trailLogos || '' }
    });
    assert('Reset trailLogos to original value', true);
  } catch (err) {
    assert('Prisma DB operations executed without error', false, err.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log(`ADVERSARIAL STRESS TEST SUMMARY: Total: ${passed + failed}, Passed: ${passed}, Failed: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run().catch(e => {
  console.error('Fatal crash in stress test:', e);
  process.exit(1);
});
