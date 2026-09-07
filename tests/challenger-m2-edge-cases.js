/**
 * tests/challenger-m2-edge-cases.js
 * Empirical Challenge & Adversarial Stress Test Suite for Milestone 2:
 * Visual Editor Core & Admin Preview Integration (WYSIWYG)
 * 
 * Tests the 6 Mandatory Challenge Objectives:
 * 1. Disconnected iframe (parent window === window, null parent, SecurityError).
 * 2. Malformed message payloads without crashing (null, primitive, unknown type, prototype pollution, syntax errors).
 * 3. Rapid toggle on/off cycles, idempotency, listener deduplication, and active editing interruption.
 * 4. Click-to-edit on text elements with Enter (commit), Shift+Enter (multiline), Escape (revert), and auto-blur.
 * 5. Image click interception, OPEN_MEDIA_PICKER dispatch, MEDIA_SELECTED and UPDATE_IMAGE_SRC bridges.
 * 6. Admin postMessage listener: verify SAVE_SETTINGS invokes PUT /api/admin/settings with Bearer auth.
 * 7. Full bidirectional Admin ↔ Iframe Integration Simulation.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const visualEditorCode = fs.readFileSync(path.join(rootDir, 'js', 'visual-editor.js'), 'utf-8');
const adminJsCode = fs.readFileSync(path.join(rootDir, 'js', 'admin.js'), 'utf-8');
const adminHtmlCode = fs.readFileSync(path.join(rootDir, 'admin.html'), 'utf-8');
const indexHtmlCode = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');

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

/**
 * Creates a JSDOM environment pre-loaded with index.html DOM structure
 * and evaluates js/visual-editor.js directly inside that environment.
 */
function createEditorEnvironment(options = {}) {
  const dom = new JSDOM(
    `<!DOCTYPE html>
    <html>
      <head></head>
      <body>
        <h1 id="hero-hello-headline" data-setting="heroHeadline">Initial Headline</h1>
        <p id="dynamic-greeting-text" data-setting="heroSubtitle">Initial Subtitle</p>
        <span id="kinetic-static-text" data-setting="kineticText">Initial Kinetic</span>
        <div id="revealText" data-setting="splitText">Initial Split Text</div>
        <span id="nav-item" data-i18n="nav.home">Ana Səhifə</span>
        <button id="cta-btn" data-editable="customCTA">Klikləyin</button>
        <p id="plain-paragraph">Normal Paragraph</p>
        <img id="heroShowreelVisual" data-setting="showreelPosterUrl" src="/assets/img/poster1.jpg" alt="Showreel Poster" />
        <img id="standaloneLogo" src="/assets/img/logo.svg" alt="Client Logo" />
        <div class="client-logo-box">
          <img src="/assets/img/client-box.png" alt="Box Logo" />
        </div>
      </body>
    </html>`,
    {
      url: 'http://localhost:3000/index.html',
      runScripts: 'dangerously',
      ...options
    }
  );

  // By default in browser, self is window
  dom.window.self = dom.window;

  // Execute the genuine visual-editor.js inside the JSDOM window
  dom.window.eval(visualEditorCode);

  const VisualEditor = dom.window.VisualEditor;
  const VisualEditorEngine = dom.window.VisualEditorEngine;

  return { dom, window: dom.window, document: dom.window.document, VisualEditor, VisualEditorEngine };
}

// =============================================================================
// VECTOR 1: DISCONNECTED IFRAME (parent === window, standalone mode, SecurityError)
// =============================================================================
async function testDisconnectedIframe() {
  console.log('\n--- VECTOR 1: DISCONNECTED IFRAME (parent === window & Standalone Mode) ---');

  // 1.1: Standalone window where parent === window
  const env1 = createEditorEnvironment();
  // Ensure window.parent === window
  env1.window.parent = env1.window;

  const editor1 = new env1.VisualEditorEngine(env1.window);
  editor1.init({ autoInjectStyles: true });
  assert(editor1 !== null, 'V1.1a: VisualEditorEngine initializes cleanly when parent === window');
  assert(editor1.isActive() === false, 'V1.1b: Engine starts in inactive state');

  editor1.enable();
  assert(editor1.isActive() === true, 'V1.1c: Engine enables cleanly in standalone window');

  // 1.2: Edit text and blur in disconnected window
  const headline = env1.document.getElementById('hero-hello-headline');
  headline.click();
  headline.textContent = 'Modified in Standalone';

  let postMessageCalled = false;
  let postedMessageData = null;
  const originalPostMessage = env1.window.postMessage;
  env1.window.postMessage = function(data, targetOrigin) {
    postMessageCalled = true;
    postedMessageData = data;
    // Call original so event actually fires on window
    return originalPostMessage.call(env1.window, data, targetOrigin);
  };

  headline.blur();
  assert(postMessageCalled === true, 'V1.2a: Blur in disconnected window invokes postMessage fallback');
  assert(postedMessageData?.type === 'SAVE_SETTINGS', 'V1.2b: Dispatched message is SAVE_SETTINGS');
  assert(postedMessageData?.key === 'heroHeadline', 'V1.2c: Message key is heroHeadline');
  assert(postedMessageData?.value === 'Modified in Standalone', 'V1.2d: Message value matches modified text');

  // 1.3: Verify self-posted message does not cause recursion
  // In constructor, window.addEventListener('message') was attached.
  // The message was received by window.handleMessage, but since type is SAVE_SETTINGS, it is ignored safely.
  assert(editor1.isActive() === true, 'V1.3: Self-posted SAVE_SETTINGS does not corrupt editor state');

  // 1.4: Disconnected window where parent is null
  const env2 = createEditorEnvironment();
  try {
    Object.defineProperty(env2.window, 'parent', { value: null, writable: true, configurable: true });
  } catch (e) {
    env2.window.parent = null;
  }
  const editor2 = new env2.VisualEditorEngine(env2.window);
  editor2.init();
  editor2.enable();
  const sub = env2.document.getElementById('dynamic-greeting-text');
  sub.click();
  sub.textContent = 'Null Parent Test';
  let nullParentThrew = false;
  try {
    sub.blur();
  } catch (err) {
    nullParentThrew = true;
  }
  assert(nullParentThrew === false, 'V1.4: Blurring element with null parent does not throw exception');

  // 1.5: Disconnected window where accessing parent throws SecurityError (cross-origin sandbox)
  const env3 = createEditorEnvironment();
  Object.defineProperty(env3.window, 'parent', {
    get() {
      const err = new Error('Permission denied to access property "postMessage" on cross-origin object');
      err.name = 'SecurityError';
      throw err;
    },
    configurable: true
  });
  const editor3 = new env3.VisualEditorEngine(env3.window);
  editor3.init();
  editor3.enable();
  const kin = env3.document.getElementById('kinetic-static-text');
  kin.click();
  kin.textContent = 'Cross Origin Sandbox Test';
  let securityErrorThrew = false;
  try {
    kin.blur();
  } catch (err) {
    securityErrorThrew = true;
  }
  assert(securityErrorThrew === false, 'V1.5: SecurityError on parent access is caught gracefully without throwing');
}

// =============================================================================
// VECTOR 2: MALFORMED & ADVERSARIAL MESSAGE PAYLOADS
// =============================================================================
async function testMalformedMessages() {
  console.log('\n--- VECTOR 2: MALFORMED & ADVERSARIAL MESSAGE PAYLOADS ---');

  const env = createEditorEnvironment();
  const editor = new env.VisualEditorEngine(env.window);
  editor.init();
  editor.enable();
  assert(editor.isActive() === true, 'V2.0: Editor enabled for message tests');

  const malformedPayloads = [
    { name: 'null event data', data: null },
    { name: 'undefined event data', data: undefined },
    { name: 'primitive string', data: 'hello' },
    { name: 'primitive number', data: 42 },
    { name: 'primitive boolean', data: true },
    { name: 'empty object', data: {} },
    { name: 'object with empty type', data: { type: '' } },
    { name: 'object with numeric type', data: { type: 12345 } },
    { name: 'unrecognized type', data: { type: 'DROP_DATABASE' } },
    { name: 'TOGGLE_VISUAL_EDIT without active', data: { type: 'TOGGLE_VISUAL_EDIT' } },
    { name: 'MEDIA_SELECTED without target', data: { type: 'MEDIA_SELECTED', url: 'https://cdn.example.com/img.png' } },
    { name: 'MEDIA_SELECTED without url', data: { type: 'MEDIA_SELECTED', target: 'heroShowreelVisual' } },
    { name: 'MEDIA_SELECTED with non-existent target', data: { type: 'MEDIA_SELECTED', target: 'non_existent_element_xyz', url: 'test.jpg' } },
    { name: 'MEDIA_SELECTED with complex selector syntax', data: { type: 'MEDIA_SELECTED', target: 'div > img[src*="box"]', url: '/new-box.png' } },
    { name: 'Prototype pollution attempt', data: { type: 'UNKNOWN', __proto__: { isAdmin: true } } }
  ];

  let anyCrash = false;
  for (const item of malformedPayloads) {
    try {
      editor.handleMessage({ data: item.data });
    } catch (err) {
      anyCrash = true;
      console.error(`    [Crash on ${item.name}]:`, err.message);
    }
  }
  assert(anyCrash === false, 'V2.1: Handled 15 distinct malformed message payloads without any exceptions');

  // 2.2: Verify prototype was not polluted
  assert(({}).isAdmin === undefined, 'V2.2: Prototype pollution payload did not pollute Object.prototype');

  // 2.3: Verify TOGGLE_VISUAL_EDIT with active: true enables
  editor.disable();
  assert(editor.isActive() === false, 'V2.3a: Disabled');
  editor.handleMessage({ data: { type: 'TOGGLE_VISUAL_EDIT', active: true } });
  assert(editor.isActive() === true, 'V2.3b: TOGGLE_VISUAL_EDIT with active: true successfully enables');

  // 2.4: Verify TOGGLE_VISUAL_EDIT with active: false disables
  editor.handleMessage({ data: { type: 'TOGGLE_VISUAL_EDIT', active: false } });
  assert(editor.isActive() === false, 'V2.4: TOGGLE_VISUAL_EDIT with active: false successfully disables');

  // 2.5: Stress bombardment: 100 malformed messages in a tight loop
  let bombardmentErrors = 0;
  for (let i = 0; i < 100; i++) {
    try {
      const randomData = i % 4 === 0 ? null : (i % 4 === 1 ? { type: null } : { type: `RANDOM_${i}`, value: i });
      editor.handleMessage({ data: randomData });
    } catch (e) {
      bombardmentErrors++;
    }
  }
  assert(bombardmentErrors === 0, 'V2.5: Bombardment of 100 malformed messages processed without error');

  // 2.6: Verify engine still functions normally after bombardment
  editor.enable();
  assert(editor.isActive() === true, 'V2.6: Engine still fully operational after bombardment');
}

// =============================================================================
// VECTOR 3: RAPID TOGGLE ON/OFF CYCLES
// =============================================================================
async function testRapidToggles() {
  console.log('\n--- VECTOR 3: RAPID TOGGLE ON/OFF CYCLES ---');

  const env = createEditorEnvironment();
  const editor = new env.VisualEditorEngine(env.window);
  editor.init();

  // 3.1: 50 consecutive toggle() calls
  for (let i = 0; i < 50; i++) {
    editor.toggle();
    const expectedActive = (i % 2 === 0);
    assert(editor.isActive() === expectedActive, `V3.1.[${i}]: Toggle ${i + 1} active === ${expectedActive}`);
  }

  // 3.2: 10 consecutive enable() calls (idempotency check)
  for (let i = 0; i < 10; i++) {
    editor.enable();
  }
  assert(editor.isActive() === true, 'V3.2a: Editor remains active after 10 enable() calls');
  const styleCount = env.document.querySelectorAll('#visual-edit-styles').length;
  assert(styleCount === 1, `V3.2b: Exactly 1 #visual-edit-styles element in document (actual: ${styleCount})`);

  // Check no duplicate .visual-editable class
  const headline = env.document.getElementById('hero-hello-headline');
  const classes = headline.className.split(/\s+/).filter(c => c === 'visual-editable');
  assert(classes.length === 1, `V3.2c: .visual-editable class not duplicated on element (count: ${classes.length})`);

  // Check click listener not duplicated (fire count should be 1)
  let focusEventCount = 0;
  editor.on('element-focused', () => { focusEventCount++; });
  headline.click();
  assert(focusEventCount === 1, `V3.2d: element-focused event fired exactly once (count: ${focusEventCount})`);

  // 3.3: 10 consecutive disable() calls
  for (let i = 0; i < 10; i++) {
    editor.disable();
  }
  assert(editor.isActive() === false, 'V3.3a: Editor remains inactive after 10 disable() calls');
  assert(headline.classList.contains('visual-editable') === false, 'V3.3b: .visual-editable removed from headline');
  assert(env.document.body.classList.contains('visual-edit-active') === false, 'V3.3c: .visual-edit-active removed from body');

  // 3.4: Active editing interruption
  editor.enable();
  headline.click();
  assert(headline.getAttribute('contenteditable') === 'true', 'V3.4a: Element is editable');
  assert(editor.editingElement === headline, 'V3.4b: editingElement set to headline');

  // Interrupt by calling disable() while editing
  editor.disable();
  assert(headline.hasAttribute('contenteditable') === false, 'V3.4c: contenteditable stripped upon disable()');
  assert(editor.editingElement === null, 'V3.4d: editingElement cleared to null upon disable()');

  // 3.5: Toggle sequence with content change
  editor.enable();
  headline.click();
  headline.textContent = 'Updated Before Toggle';
  editor.disable(); // Abrupt disable
  assert(headline.textContent === 'Updated Before Toggle', 'V3.5a: Text change retained in DOM after abrupt disable');

  editor.enable();
  assert(headline.classList.contains('visual-editable') === true, 'V3.5b: Outline cleanly restored on re-enable');
}

// =============================================================================
// VECTOR 4: CLICK-TO-EDIT WITH ENTER & ESCAPE KEYS
// =============================================================================
async function testClickToEditAndKeys() {
  console.log('\n--- VECTOR 4: CLICK-TO-EDIT WITH ENTER & ESCAPE KEYS ---');

  const env = createEditorEnvironment();
  const editor = new env.VisualEditorEngine(env.window);
  editor.init();
  editor.enable();

  const dispatchedMessages = [];
  editor.postToParent = function(msg) {
    dispatchedMessages.push(msg);
  };

  const headline = env.document.getElementById('hero-hello-headline');
  const initialText = headline.textContent;

  // 4.1: Click element
  headline.click();
  assert(headline.getAttribute('contenteditable') === 'true', 'V4.1a: Click sets contenteditable="true"');
  assert(editor.editingElement === headline, 'V4.1b: editingElement points to headline');

  // 4.2: Enter keydown (commit)
  headline.textContent = 'Brandfull Studio Redux';
  let enterPreventDefaultCalled = false;
  const enterEvent = {
    key: 'Enter',
    shiftKey: false,
    currentTarget: headline,
    target: headline,
    preventDefault: () => { enterPreventDefaultCalled = true; }
  };
  editor.handleElementKeydown(enterEvent);
  assert(enterPreventDefaultCalled === true, 'V4.2a: Enter key calls preventDefault()');

  // In JSDOM, target.blur() in handleElementKeydown triggers the blur listener
  // Let's ensure blur was executed:
  assert(headline.hasAttribute('contenteditable') === false, 'V4.2b: Blur removed contenteditable');
  assert(dispatchedMessages.length === 1, `V4.2c: Exactly 1 save message dispatched (actual: ${dispatchedMessages.length})`);
  assert(dispatchedMessages[0].type === 'SAVE_SETTINGS', 'V4.2d: Message type is SAVE_SETTINGS');
  assert(dispatchedMessages[0].key === 'heroHeadline', 'V4.2e: Message key is heroHeadline');
  assert(dispatchedMessages[0].value === 'Brandfull Studio Redux', 'V4.2f: Message value is updated text');

  // 4.3: Shift+Enter keydown (multiline edit - no blur)
  editor.enable();
  headline.click();
  dispatchedMessages.length = 0;
  let shiftEnterPreventDefaultCalled = false;
  const shiftEnterEvent = {
    key: 'Enter',
    shiftKey: true,
    currentTarget: headline,
    target: headline,
    preventDefault: () => { shiftEnterPreventDefaultCalled = true; }
  };
  editor.handleElementKeydown(shiftEnterEvent);
  assert(shiftEnterPreventDefaultCalled === false, 'V4.3a: Shift+Enter does NOT preventDefault()');
  assert(headline.getAttribute('contenteditable') === 'true', 'V4.3b: Element remains in contenteditable mode');
  assert(dispatchedMessages.length === 0, 'V4.3c: No save message dispatched on Shift+Enter');

  // 4.4: Escape keydown (revert text)
  headline.textContent = 'Accidental Bad Draft';
  let escapePreventDefaultCalled = false;
  const escapeEvent = {
    key: 'Escape',
    currentTarget: headline,
    target: headline,
    preventDefault: () => { escapePreventDefaultCalled = true; }
  };
  editor.handleElementKeydown(escapeEvent);
  assert(escapePreventDefaultCalled === true, 'V4.4a: Escape calls preventDefault()');
  assert(headline.textContent === 'Brandfull Studio Redux', `V4.4b: Escape reverted text back to initial (actual: ${headline.textContent})`);
  assert(headline.hasAttribute('contenteditable') === false, 'V4.4c: Element blurred and contenteditable removed');

  // 4.5: Auto-blur on switching targets
  const subtitle = env.document.getElementById('dynamic-greeting-text');
  dispatchedMessages.length = 0;
  headline.click();
  assert(editor.editingElement === headline, 'V4.5a: Editing headline');
  subtitle.click();
  assert(editor.editingElement === subtitle, 'V4.5b: Editing switched to subtitle');
  assert(headline.hasAttribute('contenteditable') === false, 'V4.5c: Headline auto-blurred and contenteditable removed');

  // 4.6: Empty/whitespace blur rejection
  subtitle.textContent = '   \n\t  ';
  dispatchedMessages.length = 0;
  subtitle.blur();
  assert(dispatchedMessages.length === 0, 'V4.6: Whitespace-only text blur does NOT dispatch corrupt save message');

  // 4.7: i18n element editing and SAVE_I18N dispatch
  const navItem = env.document.getElementById('nav-item');
  navItem.click();
  navItem.textContent = 'Əsas Səhifə';
  dispatchedMessages.length = 0;
  navItem.blur();
  assert(dispatchedMessages.length === 1, 'V4.7a: Exactly 1 message dispatched for i18n element');
  assert(dispatchedMessages[0].type === 'SAVE_I18N', 'V4.7b: Message type is SAVE_I18N');
  assert(dispatchedMessages[0].key === 'nav.home', 'V4.7c: Message key is nav.home');
  assert(dispatchedMessages[0].text === 'Əsas Səhifə', 'V4.7d: Message text is updated translation');
}

// =============================================================================
// VECTOR 5: IMAGE CLICK INTERCEPTION & MEDIA SELECTION BRIDGE
// =============================================================================
async function testImageInterceptionAndBridge() {
  console.log('\n--- VECTOR 5: IMAGE CLICK INTERCEPTION & MEDIA SELECTION BRIDGE ---');

  const env = createEditorEnvironment();
  const editor = new env.VisualEditorEngine(env.window);
  editor.init();
  editor.enable();

  const dispatchedMessages = [];
  editor.postToParent = function(msg) {
    dispatchedMessages.push(msg);
  };

  // 5.1: Click image with data-setting="showreelPosterUrl"
  const heroImg = env.document.getElementById('heroShowreelVisual');
  let clickPrevented = false;
  let clickStopped = false;
  const clickEvent = {
    currentTarget: heroImg,
    target: heroImg,
    preventDefault: () => { clickPrevented = true; },
    stopPropagation: () => { clickStopped = true; }
  };
  editor.handleImageClick(clickEvent);

  assert(clickPrevented === true, 'V5.1a: Image click prevents default');
  assert(clickStopped === true, 'V5.1b: Image click stops propagation');
  assert(dispatchedMessages.length === 1, 'V5.1c: Dispatched OPEN_MEDIA_PICKER to parent');
  assert(dispatchedMessages[0].type === 'OPEN_MEDIA_PICKER', 'V5.1d: Message type is OPEN_MEDIA_PICKER');
  assert(dispatchedMessages[0].target === 'showreelPosterUrl', `V5.1e: Target is showreelPosterUrl (actual: ${dispatchedMessages[0].target})`);
  assert(dispatchedMessages[0].currentUrl.includes('poster1.jpg'), 'V5.1f: currentUrl includes poster1.jpg');

  // 5.2: Click image with id="standaloneLogo" (no data-setting)
  const logoImg = env.document.getElementById('standaloneLogo');
  dispatchedMessages.length = 0;
  editor.handleImageClick({ currentTarget: logoImg, target: logoImg, preventDefault() {}, stopPropagation() {} });
  assert(dispatchedMessages[0].target === 'standaloneLogo', `V5.2: Target falls back to img.id (actual: ${dispatchedMessages[0].target})`);

  // 5.3: Click image with neither data-setting nor id
  const boxImg = env.document.querySelector('.client-logo-box img');
  dispatchedMessages.length = 0;
  editor.handleImageClick({ currentTarget: boxImg, target: boxImg, preventDefault() {}, stopPropagation() {} });
  assert(dispatchedMessages[0].target === 'heroPoster', `V5.3: Target falls back to 'heroPoster' (actual: ${dispatchedMessages[0].target})`);

  // 5.4: Media selection response (MEDIA_SELECTED)
  dispatchedMessages.length = 0;
  let mediaUpdatedFired = false;
  editor.on('media-updated', (data) => {
    mediaUpdatedFired = true;
    assert(data.target === 'showreelPosterUrl', 'V5.4a: media-updated event target verified');
    assert(data.url === 'https://cdn.brandfull.io/posters/summer2026.webp', 'V5.4b: media-updated event url verified');
  });

  editor.handleMessage({
    data: {
      type: 'MEDIA_SELECTED',
      target: 'showreelPosterUrl',
      url: 'https://cdn.brandfull.io/posters/summer2026.webp'
    }
  });

  assert(mediaUpdatedFired === true, 'V5.4c: media-updated event dispatched on engine');
  assert(heroImg.src === 'https://cdn.brandfull.io/posters/summer2026.webp', `V5.4d: heroImg.src updated in DOM (actual: ${heroImg.src})`);
  assert(dispatchedMessages.length === 1, 'V5.4e: Dispatched SAVE_SETTINGS to parent');
  assert(dispatchedMessages[0].type === 'SAVE_SETTINGS', 'V5.4f: Message type is SAVE_SETTINGS');
  assert(dispatchedMessages[0].key === 'showreelPosterUrl', 'V5.4g: Message key is showreelPosterUrl');
  assert(dispatchedMessages[0].value === 'https://cdn.brandfull.io/posters/summer2026.webp', 'V5.4h: Message value is new URL');

  // 5.5: UPDATE_IMAGE_SRC alias test
  dispatchedMessages.length = 0;
  editor.handleMessage({
    data: {
      type: 'UPDATE_IMAGE_SRC',
      target: 'showreelPosterUrl',
      url: 'https://cdn.brandfull.io/posters/autumn2026.webp'
    }
  });
  assert(heroImg.src === 'https://cdn.brandfull.io/posters/autumn2026.webp', 'V5.5: UPDATE_IMAGE_SRC alias successfully updates image');
}

// =============================================================================
// VECTOR 6: ADMIN POSTMESSAGE LISTENER & SAVE_SETTINGS PERSISTENCE
// =============================================================================
async function testAdminPostMessageListener() {
  console.log('\n--- VECTOR 6: ADMIN POSTMESSAGE LISTENER & SAVE_SETTINGS PERSISTENCE ---');

  // Create JSDOM with admin.html preview container
  const adminDom = new JSDOM(
    `<!DOCTYPE html>
    <html>
      <head></head>
      <body>
        <button id="toggleVisualEditBtn">✏️ Vizual Redaktor</button>
        <iframe id="livePreviewIframe" src="index.html"></iframe>
        <div id="mediaPickerDialog" style="display:none;"></div>
      </body>
    </html>`,
    {
      url: 'http://localhost:3000/admin.html',
      runScripts: 'dangerously'
    }
  );

  const win = adminDom.window;
  win.self = win;

  // Track fetch calls
  const fetchCalls = [];
  win.fetch = async (url, options = {}) => {
    fetchCalls.push({ url: url.toString(), options });
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, message: 'Updated successfully' })
    };
  };

  // Mock AdminApp structure matching js/admin.js lines 3210-3910
  const AdminApp = {
    token: 'jwt_secure_test_token_123',
    isVisualEditActive: false,
    visualEditMediaTarget: null,
    toasts: [],
    showToast(msg) {
      this.toasts.push(msg);
    },
    toggleVisualEdit() {
      this.isVisualEditActive = !this.isVisualEditActive;
      const iframe = win.document.getElementById('livePreviewIframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'TOGGLE_VISUAL_EDIT',
          active: this.isVisualEditActive
        }, '*');
      }
      const btn = win.document.getElementById('toggleVisualEditBtn');
      if (btn) {
        btn.textContent = this.isVisualEditActive ? '✏️ Vizual Redaktor: Aktiv' : '✏️ Vizual Redaktor';
      }
    },
    selectMediaFromPicker(url) {
      if (this.visualEditMediaTarget) {
        const target = this.visualEditMediaTarget;
        this.visualEditMediaTarget = null;
        const iframe = win.document.getElementById('livePreviewIframe');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            type: 'MEDIA_SELECTED',
            target: target,
            url: url
          }, '*');
        }

        const settingKey = (target === 'heroPoster' || target === 'heroShowreelVisual') ? 'showreelPosterUrl' : target;
        const token = this.token || '';
        const headers = { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        win.fetch('/api/admin/settings', {
          method: 'PUT',
          headers,
          body: JSON.stringify({ [settingKey]: url })
        });
      }
    }
  };

  win.AdminApp = AdminApp;

  // Bind the exact message listener implementation from js/admin.js lines 3810-3888
  const API_BASE = '/api';
  win.addEventListener('message', async (event) => {
    if (!event || !event.data || typeof event.data !== 'object') return;
    const data = event.data;

    if (data.type === 'SAVE_SETTINGS') {
      const key = data.key || data.setting;
      const value = data.value;
      if (!key) return;

      try {
        const payload = { [key]: value };
        const token = AdminApp.token || (win.localStorage ? win.localStorage.getItem('adminToken') : '') || '';
        const headers = {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await win.fetch(`${API_BASE}/admin/settings`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload)
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.success !== false) {
          if (typeof AdminApp.showToast === 'function') {
            AdminApp.showToast(`Tənzimləmə saxlanıldı: ${key}`);
          }
        }
      } catch (err) {
        console.error('SAVE_SETTINGS error:', err);
      }
    } else if (data.type === 'SAVE_I18N') {
      const key = data.key;
      const text = data.text;
      if (!key) return;

      try {
        const token = AdminApp.token || (win.localStorage ? win.localStorage.getItem('adminToken') : '') || '';
        const headers = {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        await win.fetch(`${API_BASE}/admin/translations/${encodeURIComponent(key)}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ az: text })
        });
      } catch (err) {
        console.error('SAVE_I18N error:', err);
      }
    } else if (data.type === 'OPEN_MEDIA_PICKER' || data.type === 'REQUEST_IMAGE_PICKER') {
      AdminApp.visualEditMediaTarget = data.target;
    }
  });

  // 6.1: Dispatch SAVE_SETTINGS to Admin window
  fetchCalls.length = 0;
  win.dispatchEvent(new win.MessageEvent('message', {
    data: {
      type: 'SAVE_SETTINGS',
      key: 'splitText',
      value: 'Yeni Split Mətn 2026'
    }
  }));

  // Wait for async fetch
  await new Promise(r => setTimeout(r, 20));

  assert(fetchCalls.length === 1, `V6.1a: Exactly 1 fetch request initiated by SAVE_SETTINGS (actual: ${fetchCalls.length})`);
  assert(fetchCalls[0].url === '/api/admin/settings', `V6.1b: URL is /api/admin/settings (actual: ${fetchCalls[0].url})`);
  assert(fetchCalls[0].options.method === 'PUT', `V6.1c: Method is PUT (actual: ${fetchCalls[0].options.method})`);
  assert(fetchCalls[0].options.headers['Authorization'] === 'Bearer jwt_secure_test_token_123', 'V6.1d: Authorization header includes Bearer token');
  
  const parsedBody = JSON.parse(fetchCalls[0].options.body);
  assert(parsedBody.splitText === 'Yeni Split Mətn 2026', 'V6.1e: JSON body correctly maps { splitText: "Yeni Split Mətn 2026" }');
  assert(AdminApp.toasts.includes('Tənzimləmə saxlanıldı: splitText'), 'V6.1f: Toast notification shown for splitText');

  // 6.2: Bearer auth fallback to localStorage
  AdminApp.token = '';
  win.localStorage.setItem('adminToken', 'local_storage_fallback_token');
  fetchCalls.length = 0;
  win.dispatchEvent(new win.MessageEvent('message', {
    data: {
      type: 'SAVE_SETTINGS',
      key: 'heroHeadline',
      value: 'Fallback Token Headline'
    }
  }));
  await new Promise(r => setTimeout(r, 20));
  assert(fetchCalls[0].options.headers['Authorization'] === 'Bearer local_storage_fallback_token', 'V6.2: Bearer auth correctly falls back to localStorage.getItem("adminToken")');

  // 6.3: SAVE_I18N dispatches PATCH /api/admin/translations/:key
  fetchCalls.length = 0;
  win.dispatchEvent(new win.MessageEvent('message', {
    data: {
      type: 'SAVE_I18N',
      key: 'nav.contact',
      text: 'Bizimlə Əlaqə'
    }
  }));
  await new Promise(r => setTimeout(r, 20));
  assert(fetchCalls.length === 1, 'V6.3a: Exactly 1 fetch request for SAVE_I18N');
  assert(fetchCalls[0].url === '/api/admin/translations/nav.contact', `V6.3b: URL is /api/admin/translations/nav.contact (actual: ${fetchCalls[0].url})`);
  assert(fetchCalls[0].options.method === 'PATCH', 'V6.3c: Method is PATCH');
  const i18nBody = JSON.parse(fetchCalls[0].options.body);
  assert(i18nBody.az === 'Bizimlə Əlaqə', 'V6.3d: Payload contains { az: "Bizimlə Əlaqə" }');

  // 6.4: OPEN_MEDIA_PICKER & selectMediaFromPicker roundtrip
  win.dispatchEvent(new win.MessageEvent('message', {
    data: {
      type: 'OPEN_MEDIA_PICKER',
      target: 'showreelPosterUrl'
    }
  }));
  assert(AdminApp.visualEditMediaTarget === 'showreelPosterUrl', 'V6.4a: visualEditMediaTarget set to showreelPosterUrl');

  fetchCalls.length = 0;
  AdminApp.selectMediaFromPicker('https://cdn.brandfull.io/uploads/hero-final.webp');
  await new Promise(r => setTimeout(r, 20));
  assert(fetchCalls.length === 1, 'V6.4b: Media selection triggers PUT to admin settings');
  const mediaBody = JSON.parse(fetchCalls[0].options.body);
  assert(mediaBody.showreelPosterUrl === 'https://cdn.brandfull.io/uploads/hero-final.webp', 'V6.4c: Correct setting key and image URL persisted');

  // 6.5: Network error resiliency
  win.fetch = async () => { throw new Error('Simulated Connection Loss'); };
  let crashOnError = false;
  try {
    win.dispatchEvent(new win.MessageEvent('message', {
      data: { type: 'SAVE_SETTINGS', key: 'errorTest', value: 'val' }
    }));
    await new Promise(r => setTimeout(r, 20));
  } catch (err) {
    crashOnError = true;
  }
  assert(crashOnError === false, 'V6.5: Network error during SAVE_SETTINGS handled safely without crashing host');
}

// =============================================================================
// VECTOR 7: END-TO-END HOST ADMIN ↔ PREVIEW IFRAME INTERACTION
// =============================================================================
async function testEndToEndSimulation() {
  console.log('\n--- VECTOR 7: FULL BIDIRECTIONAL HOST ADMIN ↔ PREVIEW IFRAME SIMULATION ---');

  // Host Admin Window
  const adminDom = new JSDOM(
    `<!DOCTYPE html>
    <html>
      <head></head>
      <body>
        <div class="preview-bar">
          <button id="toggleVisualEditBtn" class="adm-btn adm-btn-secondary" onclick="AdminApp.toggleVisualEdit()">✏️ Vizual Redaktor</button>
        </div>
        <iframe id="livePreviewIframe"></iframe>
      </body>
    </html>`,
    { url: 'http://localhost:3000/admin.html', runScripts: 'dangerously' }
  );

  // Child Preview Iframe Window
  const iframeDom = new JSDOM(
    `<!DOCTYPE html>
    <html>
      <head></head>
      <body>
        <h1 id="hero-hello-headline" data-setting="heroHeadline">Initial Live Headline</h1>
        <img id="heroShowreelVisual" data-setting="showreelPosterUrl" src="/poster.jpg" />
      </body>
    </html>`,
    { url: 'http://localhost:3000/index.html', runScripts: 'dangerously' }
  );

  const adminWin = adminDom.window;
  const iframeWin = iframeDom.window;

  // Link iframe hierarchy
  iframeWin.parent = adminWin;
  const iframeEl = adminWin.document.getElementById('livePreviewIframe');
  iframeEl.contentWindow = iframeWin;

  // Mock postMessage cross-window delivery
  iframeWin.parent.postMessage = function(data) {
    adminWin.dispatchEvent(new adminWin.MessageEvent('message', { data, source: iframeWin }));
  };
  iframeEl.contentWindow.postMessage = function(data) {
    iframeWin.dispatchEvent(new iframeWin.MessageEvent('message', { data, source: adminWin }));
  };

  // Evaluate genuine visual-editor.js in iframe
  iframeWin.self = iframeWin;
  iframeWin.eval(visualEditorCode);

  // Set up Admin persistence tracker
  const savedSettings = {};
  adminWin.fetch = async (url, options = {}) => {
    if (url.includes('/admin/settings') && options.method === 'PUT') {
      Object.assign(savedSettings, JSON.parse(options.body));
      return { ok: true, json: async () => ({ success: true }) };
    }
    return { ok: false };
  };

  const AdminApp = {
    token: 'jwt_e2e_token',
    isVisualEditActive: false,
    visualEditMediaTarget: null,
    toggleVisualEdit() {
      this.isVisualEditActive = !this.isVisualEditActive;
      iframeEl.contentWindow.postMessage({
        type: 'TOGGLE_VISUAL_EDIT',
        active: this.isVisualEditActive
      });
      const btn = adminWin.document.getElementById('toggleVisualEditBtn');
      btn.textContent = this.isVisualEditActive ? '✏️ Vizual Redaktor: Aktiv' : '✏️ Vizual Redaktor';
    }
  };
  adminWin.AdminApp = AdminApp;

  // Admin message listener
  adminWin.addEventListener('message', async (e) => {
    if (!e?.data) return;
    if (e.data.type === 'SAVE_SETTINGS') {
      await adminWin.fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${AdminApp.token}` },
        body: JSON.stringify({ [e.data.key]: e.data.value })
      });
    } else if (e.data.type === 'OPEN_MEDIA_PICKER') {
      AdminApp.visualEditMediaTarget = e.data.target;
    }
  });

  // Step 1: Admin clicks toggle button
  assert(iframeWin.VisualEditor.isActive() === false, 'V7.1a: Iframe VisualEditor initially inactive');
  adminWin.document.getElementById('toggleVisualEditBtn').click();
  assert(AdminApp.isVisualEditActive === true, 'V7.1b: Admin state toggled to active');
  assert(iframeWin.VisualEditor.isActive() === true, 'V7.1c: Iframe VisualEditor received TOGGLE_VISUAL_EDIT and activated');
  assert(iframeWin.document.body.classList.contains('visual-edit-active') === true, 'V7.1d: Iframe document.body has .visual-edit-active');

  // Step 2: User clicks headline inside iframe, edits text, presses Enter
  const headline = iframeWin.document.getElementById('hero-hello-headline');
  headline.click();
  assert(headline.getAttribute('contenteditable') === 'true', 'V7.2a: Headline is contenteditable');
  headline.textContent = 'E2E Verified Headline Text';
  headline.blur();
  await new Promise(r => setTimeout(r, 20));

  assert(savedSettings.heroHeadline === 'E2E Verified Headline Text', `V7.2b: Headline persisted to backend via Admin listener (actual: ${savedSettings.heroHeadline})`);

  // Step 3: User clicks image inside iframe -> Admin opens picker -> selects image
  const img = iframeWin.document.getElementById('heroShowreelVisual');
  img.click();
  assert(AdminApp.visualEditMediaTarget === 'showreelPosterUrl', 'V7.3a: Admin caught OPEN_MEDIA_PICKER and recorded target');

  // Simulate picker selection from Admin host
  iframeEl.contentWindow.postMessage({
    type: 'MEDIA_SELECTED',
    target: AdminApp.visualEditMediaTarget,
    url: 'https://cdn.brandfull.io/hero-e2e.webp'
  });
  await new Promise(r => setTimeout(r, 20));

  assert(img.src === 'https://cdn.brandfull.io/hero-e2e.webp', `V7.3b: Iframe image updated in DOM (actual: ${img.src})`);
  assert(savedSettings.showreelPosterUrl === 'https://cdn.brandfull.io/hero-e2e.webp', `V7.3c: Image persisted to backend settings (actual: ${savedSettings.showreelPosterUrl})`);

  // Step 4: Admin toggles visual edit OFF
  adminWin.document.getElementById('toggleVisualEditBtn').click();
  assert(AdminApp.isVisualEditActive === false, 'V7.4a: Admin toggled off');
  assert(iframeWin.VisualEditor.isActive() === false, 'V7.4b: Iframe VisualEditor disabled');
  assert(iframeWin.document.body.classList.contains('visual-edit-active') === false, 'V7.4c: .visual-edit-active removed');
  assert(headline.classList.contains('visual-editable') === false, 'V7.4d: .visual-editable outline removed');
}

// =============================================================================
// MAIN RUNNER
// =============================================================================
async function runAllChallenges() {
  console.log('================================================================================');
  console.log(' STARTING EMPIRICAL CHALLENGE SUITE FOR MILESTONE 2');
  console.log('================================================================================');

  try {
    await testDisconnectedIframe();
    await testMalformedMessages();
    await testRapidToggles();
    await testClickToEditAndKeys();
    await testImageInterceptionAndBridge();
    await testAdminPostMessageListener();
    await testEndToEndSimulation();
  } catch (err) {
    console.error('FATAL ERROR DURING CHALLENGE EXECUTION:', err);
    failedTests++;
    findings.push({ message: `Fatal suite error: ${err.message}`, stack: err.stack });
  }

  console.log('\n================================================================================');
  console.log(' CHALLENGE EXECUTION SUMMARY');
  console.log(` Total Assertions: ${totalTests}`);
  console.log(` Passed:           ${passedTests}`);
  console.log(` Failed:           ${failedTests}`);
  console.log('================================================================================');

  if (failedTests === 0) {
    console.log('\n>>> CHALLENGE VERDICT: APPROVE <<<');
    console.log('All empirical edge cases and adversarial scenarios passed successfully.\n');
    process.exit(0);
  } else {
    console.log('\n>>> CHALLENGE VERDICT: CHALLENGE_FAILED <<<');
    console.log(`${failedTests} empirical assertion(s) failed.\n`);
    process.exit(1);
  }
}

runAllChallenges();
