/**
 * challenge-milestone1.js
 * Comprehensive Empirical Stress-Test Suite for Milestone 1
 * 
 * CHALLENGES:
 * 1. requireAuth in backend/src/middleware/auth.js: Bearer parsing (valid, invalid, expired, missing, malformed, edge cases)
 * 2. Route aliasing in backend/src/app.js: /admin/settings vs /api/admin/settings parity, SPA fallback, 404 isolation
 * 3. initDynamicGreeting() in js/app.js: heroSubtitle preservation vs dynamic weekday greeting fallback
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import vm from 'vm';
import jwt from 'jsonwebtoken';
import { requireAuth, requireRole } from '../backend/src/middleware/auth.js';
import app from '../backend/src/app.js';
import prisma from '../backend/src/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'brandfull_dev_jwt_secret_key';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const results = [];

function assert(name, condition, errorMsg = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    results.push({ name, pass: true });
    console.log(`✓ PASS: ${name}`);
  } else {
    failedTests++;
    results.push({ name, pass: false, error: errorMsg });
    console.error(`✗ FAIL: ${name} -> ${errorMsg}`);
  }
}

// Minimal Mock Element & Document for js/app.js tests
class MockElement {
  constructor(tagName, id = '', className = '') {
    this.tagName = (tagName || 'DIV').toUpperCase();
    this.id = id;
    this.className = className;
    this._textContent = '';
    this.attributes = {};
    this.children = [];
    this.parentNode = null;
    this.style = {};
  }
  get textContent() { return this._textContent; }
  set textContent(v) { this._textContent = String(v); }
  get innerText() { return this._textContent; }
  set innerText(v) { this._textContent = String(v); }
  get innerHTML() { return this._textContent; }
  set innerHTML(v) { this._textContent = String(v); }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] !== undefined ? this.attributes[k] : null; }
  hasAttribute(k) { return this.attributes[k] !== undefined; }
  removeAttribute(k) { delete this.attributes[k]; }
  appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
}

class MockDocument {
  constructor() {
    this.elements = {};
    this.readyState = 'loading';
  }
  createElement(tag) { return new MockElement(tag); }
  getElementById(id) { return this.elements[id] || null; }
  querySelector(sel) {
    if (sel.startsWith('#')) return this.getElementById(sel.slice(1));
    return null;
  }
  registerElement(el) {
    if (el.id) this.elements[el.id] = el;
    return el;
  }
  addEventListener() {}
}

async function runChallenges() {
  console.log('===============================================================');
  console.log('STARTING EMPIRICAL CHALLENGE SUITE FOR MILESTONE 1');
  console.log('===============================================================\n');

  // Fetch or create a real admin user from DB
  let adminUser = await prisma.adminUser.findFirst({ where: { active: true } });
  if (!adminUser) {
    adminUser = await prisma.adminUser.create({
      data: {
        email: 'test_super_admin@brandfull.local',
        passwordHash: 'dummy_hash',
        name: 'Test Admin',
        role: 'SUPER_ADMIN',
        active: true
      }
    });
  }

  // Create an inactive user for testing
  let inactiveUser = await prisma.adminUser.findFirst({ where: { active: false } });
  if (!inactiveUser) {
    inactiveUser = await prisma.adminUser.create({
      data: {
        email: 'inactive_admin@brandfull.local',
        passwordHash: 'dummy_hash',
        name: 'Inactive Admin',
        role: 'ADMIN',
        active: false
      }
    });
  }

  // Generate tokens
  const validToken = jwt.sign({ userId: adminUser.id, role: adminUser.role }, JWT_SECRET, { expiresIn: '1h' });
  const expiredToken = jwt.sign({ userId: adminUser.id, role: adminUser.role }, JWT_SECRET, { expiresIn: '-10s' });
  const wrongSecretToken = jwt.sign({ userId: adminUser.id, role: adminUser.role }, 'wrong_secret_123', { expiresIn: '1h' });
  const inactiveToken = jwt.sign({ userId: inactiveUser.id, role: inactiveUser.role }, JWT_SECRET, { expiresIn: '1h' });
  const nonExistentUserToken = jwt.sign({ userId: 'non-existent-user-id-99999' }, JWT_SECRET, { expiresIn: '1h' });
  const noUserIdToken = jwt.sign({ email: 'nouserid@brandfull.local' }, JWT_SECRET, { expiresIn: '1h' });

  // =========================================================================
  // CHALLENGE 1: requireAuth Middleware Stress Testing
  // =========================================================================
  console.log('\n--- [CHALLENGE 1] requireAuth & Bearer Header Stress Tests ---');

  async function testAuth(req) {
    let statusCode = 200;
    let jsonBody = null;
    let nextCalled = false;

    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { jsonBody = data; return this; }
    };
    const next = () => { nextCalled = true; };

    await requireAuth(req, res, next);
    return { statusCode, jsonBody, nextCalled, user: req.user };
  }

  // 1.1 Missing token
  {
    const r = await testAuth({ headers: {}, cookies: {} });
    assert('1.1: Missing token returns 401 UNAUTHORIZED', r.statusCode === 401 && !r.nextCalled && r.jsonBody?.error?.code === 'UNAUTHORIZED');
  }

  // 1.2 Empty authorization header
  {
    const r = await testAuth({ headers: { authorization: '' }, cookies: {} });
    assert('1.2: Empty Authorization header returns 401', r.statusCode === 401 && !r.nextCalled);
  }

  // 1.3 Whitespace-only authorization header
  {
    const r = await testAuth({ headers: { authorization: '    ' }, cookies: {} });
    assert('1.3: Whitespace Authorization header returns 401', r.statusCode === 401 && !r.nextCalled);
  }

  // 1.4 Header with 'Bearer' only
  {
    const r1 = await testAuth({ headers: { authorization: 'Bearer' }, cookies: {} });
    const r2 = await testAuth({ headers: { authorization: 'Bearer ' }, cookies: {} });
    const r3 = await testAuth({ headers: { authorization: 'Bearer    ' }, cookies: {} });
    assert('1.4: Header with Bearer keyword only returns 401', r1.statusCode === 401 && r2.statusCode === 401 && r3.statusCode === 401);
  }

  // 1.5 Malformed token string
  {
    const r1 = await testAuth({ headers: { authorization: 'Bearer not.a.valid.jwt' }, cookies: {} });
    const r2 = await testAuth({ headers: { authorization: 'Bearer random_garbage_string' }, cookies: {} });
    assert('1.5: Malformed Bearer token returns 401', r1.statusCode === 401 && r2.statusCode === 401 && !r1.nextCalled);
  }

  // 1.6 Expired Bearer token
  {
    const r = await testAuth({ headers: { authorization: `Bearer ${expiredToken}` }, cookies: {} });
    assert('1.6: Expired Bearer token returns 401', r.statusCode === 401 && !r.nextCalled);
  }

  // 1.7 Tampered / Wrong Secret Bearer token
  {
    const r = await testAuth({ headers: { authorization: `Bearer ${wrongSecretToken}` }, cookies: {} });
    assert('1.7: Tampered/Wrong Secret token returns 401', r.statusCode === 401 && !r.nextCalled);
  }

  // 1.8 Non-existent user in DB
  {
    const r = await testAuth({ headers: { authorization: `Bearer ${nonExistentUserToken}` }, cookies: {} });
    assert('1.8: Non-existent user ID in JWT payload returns 401', r.statusCode === 401 && !r.nextCalled);
  }

  // 1.9 Inactive user in DB
  {
    const r = await testAuth({ headers: { authorization: `Bearer ${inactiveToken}` }, cookies: {} });
    assert('1.9: Inactive user in DB returns 401', r.statusCode === 401 && !r.nextCalled);
  }

  // 1.10 Valid Bearer token with active user
  {
    const req = { headers: { authorization: `Bearer ${validToken}` }, cookies: {} };
    const r = await testAuth(req);
    assert('1.10: Valid Bearer token authenticates successfully and sets req.user', r.nextCalled && r.user?.id === adminUser.id);
  }

  // 1.11 Bearer case-insensitivity: 'bearer', 'BEARER', multi-space
  {
    const r1 = await testAuth({ headers: { authorization: `bearer ${validToken}` }, cookies: {} });
    const r2 = await testAuth({ headers: { authorization: `BEARER ${validToken}` }, cookies: {} });
    const r3 = await testAuth({ headers: { authorization: `Bearer   ${validToken}` }, cookies: {} });
    assert('1.11: Bearer casing variations (bearer, BEARER, multi-space) authenticate successfully',
      r1.nextCalled && r2.nextCalled && r3.nextCalled);
  }

  // 1.12 Raw token without 'Bearer' prefix
  {
    const r = await testAuth({ headers: { authorization: validToken }, cookies: {} });
    assert('1.12: Raw token without Bearer prefix authenticates successfully (fallback)', r.nextCalled && r.user?.id === adminUser.id);
  }

  // 1.13 Dual-auth cookie vs header precedence
  {
    const rCookie = await testAuth({ headers: {}, cookies: { brandfull_token: validToken } });
    const rBoth = await testAuth({ headers: { authorization: `Bearer ${validToken}` }, cookies: { brandfull_token: validToken } });
    assert('1.13: Cookie authentication works independently and in combination with header',
      rCookie.nextCalled && rBoth.nextCalled);
  }

  // 1.14 JWT payload missing userId
  {
    const r = await testAuth({ headers: { authorization: `Bearer ${noUserIdToken}` }, cookies: {} });
    assert('1.14: JWT token missing userId handled gracefully (401 without unhandled crash)', r.statusCode === 401 && !r.nextCalled);
  }

  // 1.15 Role enforcement (requireRole)
  {
    const superAdminReq = { user: { id: adminUser.id, role: 'SUPER_ADMIN' } };
    const adminReq = { user: { id: adminUser.id, role: 'ADMIN' } };
    const unauthReq = {};

    let superCalled = false, adminCalled = false, unauthCalled = false;
    let adminStatus = 200, unauthStatus = 200;

    const mid = requireRole(['SUPER_ADMIN']);
    mid(superAdminReq, {}, () => { superCalled = true; });
    mid(adminReq, { status(s) { adminStatus = s; return this; }, json() {} }, () => { adminCalled = true; });
    mid(unauthReq, { status(s) { unauthStatus = s; return this; }, json() {} }, () => { unauthCalled = true; });

    assert('1.15: requireRole allows authorized role and forbids unauthorized role with 403',
      superCalled && !adminCalled && adminStatus === 403 && !unauthCalled && unauthStatus === 403);
  }

  // =========================================================================
  // CHALLENGE 2: Route Aliasing Parity Stress Testing (/admin vs /api/admin)
  // =========================================================================
  console.log('\n--- [CHALLENGE 2] Route Aliasing & Endpoint Parity Stress Tests ---');

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 2.1 GET /admin and GET /admin/ serve admin.html
    {
      const res1 = await fetch(`${baseUrl}/admin`);
      const text1 = await res1.text();
      const res2 = await fetch(`${baseUrl}/admin/`);
      const text2 = await res2.text();

      assert('2.1: GET /admin serves admin.html with 200 OK', res1.status === 200 && text1.includes('admin-body'));
      assert('2.2: GET /admin/ serves admin.html with 200 OK', res2.status === 200 && text2.includes('admin-body'));
    }

    // 2.2 Unauthenticated GET /api/admin/settings vs /admin/settings
    {
      const resApi = await fetch(`${baseUrl}/api/admin/settings`);
      const bodyApi = await resApi.json();
      const resAdmin = await fetch(`${baseUrl}/admin/settings`);
      const bodyAdmin = await resAdmin.json();

      assert('2.3: GET /api/admin/settings without auth returns 401', resApi.status === 401 && bodyApi.success === false);
      assert('2.4: GET /admin/settings without auth returns 401', resAdmin.status === 401 && bodyAdmin.success === false);
      assert('2.5: Unauthenticated responses are identical in structure',
        bodyApi.error?.code === bodyAdmin.error?.code && bodyApi.error?.code === 'UNAUTHORIZED');
    }

    // 2.3 Invalid token GET /api/admin/settings vs /admin/settings
    {
      const headers = { Authorization: 'Bearer invalid_garbage_token' };
      const resApi = await fetch(`${baseUrl}/api/admin/settings`, { headers });
      const resAdmin = await fetch(`${baseUrl}/admin/settings`, { headers });

      assert('2.6: GET /api/admin/settings with invalid token returns 401', resApi.status === 401);
      assert('2.7: GET /admin/settings with invalid token returns 401', resAdmin.status === 401);
    }

    // 2.4 Authenticated GET /api/admin/settings vs /admin/settings parity
    {
      const headers = { Authorization: `Bearer ${validToken}` };
      const resApi = await fetch(`${baseUrl}/api/admin/settings`, { headers });
      const bodyApi = await resApi.json();
      const resAdmin = await fetch(`${baseUrl}/admin/settings`, { headers });
      const bodyAdmin = await resAdmin.json();

      assert('2.8: GET /api/admin/settings with valid Bearer returns 200 OK', resApi.status === 200 && bodyApi.success === true);
      assert('2.9: GET /admin/settings with valid Bearer returns 200 OK', resAdmin.status === 200 && bodyAdmin.success === true);
      
      const apiKeys = Object.keys(bodyApi.data || {}).sort();
      const adminKeys = Object.keys(bodyAdmin.data || {}).sort();
      const keysMatch = JSON.stringify(apiKeys) === JSON.stringify(adminKeys);
      assert('2.10: Data schema parity between /api/admin/settings and /admin/settings', keysMatch && apiKeys.length > 0);
    }

    // 2.5 PUT /api/admin/settings vs PUT /admin/settings parity (supported dynamic fields)
    {
      const updatePayload = {
        heroHeadline: 'Empirically Challenged Headline ' + Date.now(),
        kineticText: 'Empirical Kinetic Statement',
        splitText: 'Empirical Split Statement for Testing',
        kineticWords: 'Word1,Word2,Word3'
      };

      const resPutApi = await fetch(`${baseUrl}/api/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validToken}`
        },
        body: JSON.stringify(updatePayload)
      });
      const bodyPutApi = await resPutApi.json();

      assert('2.11: PUT /api/admin/settings persists settings successfully',
        resPutApi.status === 200 && bodyPutApi.success === true && bodyPutApi.data.heroHeadline === updatePayload.heroHeadline);

      const updatePayload2 = {
        ...updatePayload,
        heroHeadline: 'Empirically Challenged Headline Via /admin ' + Date.now()
      };
      const resPutAdmin = await fetch(`${baseUrl}/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validToken}`
        },
        body: JSON.stringify(updatePayload2)
      });
      const bodyPutAdmin = await resPutAdmin.json();

      assert('2.12: PUT /admin/settings persists settings successfully (route alias parity)',
        resPutAdmin.status === 200 && bodyPutAdmin.success === true && bodyPutAdmin.data.heroHeadline === updatePayload2.heroHeadline);
    }

    // 2.6 EMPIRICAL DEFECT TEST: PUT with trailLogos field (F3.3 Whitelist Defect)
    {
      const resPutTrail = await fetch(`${baseUrl}/api/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validToken}`
        },
        body: JSON.stringify({ trailLogos: 'logo1.svg,logo2.svg' })
      });
      const bodyPutTrail = await resPutTrail.json();

      // EMPIRICAL OBSERVATION: Does trailLogos save succeed or fail?
      const trailLogosSucceeded = resPutTrail.status === 200 && bodyPutTrail.success === true;
      assert('2.13: EMPIRICAL DEFECT CHECK: PUT /api/admin/settings with trailLogos persists cleanly without PrismaClientValidationError',
        trailLogosSucceeded,
        `Failed with status ${resPutTrail.status}: ${bodyPutTrail.error?.message || JSON.stringify(bodyPutTrail)}`);
    }

    // 2.7 Route isolation: API 404 vs SPA fallback
    {
      const resNonExistentAdmin = await fetch(`${baseUrl}/admin/nonexistent-subpath`, {
        headers: { Authorization: `Bearer ${validToken}` }
      });
      const bodyNonExistentAdmin = await resNonExistentAdmin.json();
      assert('2.14: Non-existent route /admin/nonexistent-subpath returns 404 JSON (NOT index.html)',
        resNonExistentAdmin.status === 404 && bodyNonExistentAdmin.success === false && bodyNonExistentAdmin.error?.code === 'NOT_FOUND');

      const resNonExistentApi = await fetch(`${baseUrl}/api/nonexistent-endpoint`);
      const bodyNonExistentApi = await resNonExistentApi.json();
      assert('2.15: Non-existent route /api/nonexistent-endpoint returns 404 JSON',
        resNonExistentApi.status === 404 && bodyNonExistentApi.success === false && bodyNonExistentApi.error?.code === 'NOT_FOUND');

      const resSpa = await fetch(`${baseUrl}/projects/some-slug`);
      const textSpa = await resSpa.text();
      assert('2.16: Client SPA route /projects/some-slug falls back to index.html',
        resSpa.status === 200 && textSpa.includes('hero-dark-opening'));
    }

    // 2.8 Public endpoints check
    {
      const resPubSettings = await fetch(`${baseUrl}/api/settings`);
      const pubSettingsData = await resPubSettings.json();
      assert('2.17: GET /api/settings serves public settings without authentication',
        resPubSettings.status === 200 && pubSettingsData.success === true && pubSettingsData.data?.heroHeadline !== undefined);

      const resClients = await fetch(`${baseUrl}/api/clients`);
      const clientsData = await resClients.json();
      assert('2.18: GET /api/clients serves active clients array without authentication',
        resClients.status === 200 && Array.isArray(clientsData));
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
  }

  // =========================================================================
  // CHALLENGE 3: initDynamicGreeting() vs heroSubtitle in js/app.js
  // =========================================================================
  console.log('\n--- [CHALLENGE 3] initDynamicGreeting() & heroSubtitle Stress Tests ---');

  const appJsCode = fs.readFileSync(path.resolve('js/app.js'), 'utf-8');

  function createAppContext(mockDoc) {
    const sandbox = {
      console,
      window: {},
      document: mockDoc,
      Date,
      setTimeout,
      setInterval,
      I18nManager: { get: (field, s) => s[field] || '' },
      BRANDFULL_DEFAULT_DATA: { settings: {} }
    };
    vm.createContext(sandbox);
    vm.runInContext(appJsCode, sandbox);
    return sandbox.window.App;
  }

  // 3.1 When s.heroSubtitle is defined, dynamic greeting NEVER overwrites it
  {
    const doc = new MockDocument();
    const greetingEl = doc.registerElement(new MockElement('span', 'dynamic-greeting-text'));
    const AppInstance = createAppContext(doc);

    AppInstance.data = {
      settings: {
        heroSubtitle: 'Custom Defined Hero Subtitle: Transforming business with AI & Design.'
      }
    };

    AppInstance.renderSiteSettings();
    const renderedSubtitle = greetingEl.textContent;
    const hasRenderedAttr = greetingEl.hasAttribute('data-hero-subtitle-rendered');

    AppInstance.initDynamicGreeting();

    assert('3.1a: renderSiteSettings() populates #dynamic-greeting-text with heroSubtitle',
      renderedSubtitle === 'Custom Defined Hero Subtitle: Transforming business with AI & Design.');
    assert('3.1b: renderSiteSettings() sets data-hero-subtitle-rendered attribute', hasRenderedAttr === true);
    assert('3.1c: initDynamicGreeting() NEVER overwrites defined heroSubtitle',
      greetingEl.textContent === 'Custom Defined Hero Subtitle: Transforming business with AI & Design.');

    for (let i = 0; i < 10; i++) {
      AppInstance.initDynamicGreeting();
    }
    assert('3.1d: Repeated consecutive calls to initDynamicGreeting() preserve heroSubtitle',
      greetingEl.textContent === 'Custom Defined Hero Subtitle: Transforming business with AI & Design.');
  }

  // 3.2 Inverted order: initDynamicGreeting called first, then settings rendered
  {
    const doc = new MockDocument();
    const greetingEl = doc.registerElement(new MockElement('span', 'dynamic-greeting-text'));
    const AppInstance = createAppContext(doc);

    AppInstance.data = { settings: {} };
    AppInstance.initDynamicGreeting();
    const weekdayGreeting = greetingEl.textContent;
    assert('3.2a: Early initDynamicGreeting sets initial weekday greeting when subtitle absent',
      weekdayGreeting.length > 0 && !weekdayGreeting.includes('Custom Defined'));

    AppInstance.data.settings.heroSubtitle = 'Brand New Overriding Subtitle';
    AppInstance.renderSiteSettings();
    assert('3.2b: renderSiteSettings cleanly updates element to heroSubtitle',
      greetingEl.textContent === 'Brand New Overriding Subtitle');

    AppInstance.initDynamicGreeting();
    assert('3.2c: Subsequent initDynamicGreeting does not overwrite newly rendered heroSubtitle',
      greetingEl.textContent === 'Brand New Overriding Subtitle');
  }

  // 3.3 When heroSubtitle is empty string ("")
  {
    const doc = new MockDocument();
    const greetingEl = doc.registerElement(new MockElement('span', 'dynamic-greeting-text'));
    const AppInstance = createAppContext(doc);

    AppInstance.data = { settings: { heroSubtitle: '' } };
    AppInstance.renderSiteSettings();
    AppInstance.initDynamicGreeting();

    assert('3.3: When heroSubtitle is empty string, dynamic weekday greeting is rendered',
      greetingEl.textContent.length > 0 && !greetingEl.hasAttribute('data-hero-subtitle-rendered'));
  }

  // 3.4 When heroSubtitle is null
  {
    const doc = new MockDocument();
    const greetingEl = doc.registerElement(new MockElement('span', 'dynamic-greeting-text'));
    const AppInstance = createAppContext(doc);

    AppInstance.data = { settings: { heroSubtitle: null } };
    AppInstance.renderSiteSettings();
    AppInstance.initDynamicGreeting();

    assert('3.4: When heroSubtitle is null, dynamic weekday greeting is rendered',
      greetingEl.textContent.length > 0);
  }

  // 3.5 When heroSubtitle is undefined / missing from settings
  {
    const doc = new MockDocument();
    const greetingEl = doc.registerElement(new MockElement('span', 'dynamic-greeting-text'));
    const AppInstance = createAppContext(doc);

    AppInstance.data = { settings: {} };
    AppInstance.renderSiteSettings();
    AppInstance.initDynamicGreeting();

    assert('3.5: When heroSubtitle is undefined, dynamic weekday greeting is rendered',
      greetingEl.textContent.length > 0);
  }

  // 3.6 When App.data is null or uninitialized
  {
    const doc = new MockDocument();
    const greetingEl = doc.registerElement(new MockElement('span', 'dynamic-greeting-text'));
    const AppInstance = createAppContext(doc);

    AppInstance.data = null;
    let threw = false;
    try {
      AppInstance.initDynamicGreeting();
    } catch (e) {
      threw = true;
    }

    assert('3.6: When App.data is null, initDynamicGreeting executes without throwing',
      !threw && greetingEl.textContent.length > 0);
  }

  // 3.7 Exhaustive 7-day weekday greeting oracle test
  {
    const expectedGreetings = {
      0: 'Sunday scaries? Maraqlı insanlar onlayndır.',
      1: 'Bazar ertəsi motivasiyası. Biznesinizi gələcəyə daşımağa hazırıq.',
      2: 'Məhsuldar çərşənbə axşamı. Gəlin möhtəşəm bir şeylər yaradaq.',
      3: 'Həftənin ortası. İnnovasiyalar üçün ən yaxşı vaxt.',
      4: 'Cümə axşamı ilhamı. Sürəti kəsmədən irəliləyirik.',
      5: 'Gözəl bir cümə günü. Həftəni uğurla yekunlaşdırmağa hazırıq.',
      6: 'Şənbə günü işləyirsiniz? Hörmətlər. Maraqlı insanlar onlayndır.'
    };

    let allDaysMatch = true;
    for (let day = 0; day <= 6; day++) {
      const doc = new MockDocument();
      const greetingEl = doc.registerElement(new MockElement('span', 'dynamic-greeting-text'));

      const fakeIso = `2026-09-${String(6 + day).padStart(2, '0')}T12:00:00+04:00`;
      class MockDate extends Date {
        constructor(...args) {
          if (args.length === 0) {
            super(fakeIso);
          } else {
            super(...args);
          }
        }
      }

      const sandbox = {
        console,
        window: {},
        document: doc,
        Date: MockDate,
        setTimeout,
        setInterval
      };
      vm.createContext(sandbox);
      vm.runInContext(appJsCode, sandbox);
      const appInst = sandbox.window.App;
      appInst.data = { settings: {} };

      appInst.initDynamicGreeting();

      if (greetingEl.textContent !== expectedGreetings[day]) {
        allDaysMatch = false;
        console.error(`Day ${day} mismatch: expected '${expectedGreetings[day]}', got '${greetingEl.textContent}'`);
      }
    }

    assert('3.7: Exhaustive 7-day weekday greeting oracle matches all days (Sunday-Saturday)', allDaysMatch);
  }

  // 3.8 Missing DOM element resilience
  {
    const doc = new MockDocument();
    const AppInstance = createAppContext(doc);
    AppInstance.data = { settings: {} };
    let threw = false;
    try {
      AppInstance.initDynamicGreeting();
    } catch (e) {
      threw = true;
    }
    assert('3.8: Missing #dynamic-greeting-text element in DOM returns cleanly without error', !threw);
  }

  // 3.9 Azeri unicode characters preservation
  {
    const doc = new MockDocument();
    const greetingEl = doc.registerElement(new MockElement('span', 'dynamic-greeting-text'));
    const AppInstance = createAppContext(doc);
    const azeriSubtitle = 'Şirkətinizi gələcəyə daşıyacaq rəqəmsal həllər və innovasiyalar.';

    AppInstance.data = { settings: { heroSubtitle: azeriSubtitle } };
    AppInstance.renderSiteSettings();
    AppInstance.initDynamicGreeting();

    assert('3.9: Azerbaijani special characters in heroSubtitle preserved without corruption or overwrite',
      greetingEl.textContent === azeriSubtitle);
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n===============================================================');
  console.log(`EMPIRICAL CHALLENGE RESULTS: Total: ${totalTests}, Passed: ${passedTests}, Failed: ${failedTests}`);
  console.log('===============================================================');

  if (failedTests > 0) {
    console.error(`\nCHALLENGE VERDICT: CHALLENGE_FAILED (${failedTests} tests failed).`);
    process.exit(1);
  } else {
    console.log('\nCHALLENGE VERDICT: APPROVE (All empirical challenges passed).\n');
    process.exit(0);
  }
}

runChallenges()
  .catch(err => {
    console.error('Fatal challenge execution error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
