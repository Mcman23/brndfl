/**
 * forensic_test_actual_visual_editor.js
 * Independent Forensic Audit Test Suite for Milestone 2
 * Tests AUTHENTIC js/visual-editor.js and js/admin.js in JSDOM (real browser DOM emulation)
 */

import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

const PROJECT_ROOT = path.resolve('c:/Users/Mcman/Desktop/brndfl-main');

async function runForensicAudit() {
  const results = [];
  function assert(testId, description, condition, details = '') {
    if (condition) {
      results.push({ pass: true, testId, description });
      console.log(`✓ PASS: [${testId}] ${description}`);
    } else {
      results.push({ pass: false, testId, description, details });
      console.error(`✗ FAIL: [${testId}] ${description} -> ${details}`);
    }
  }

  console.log('================================================================');
  console.log('FORENSIC INTEGRITY AUDIT: AUTHENTIC CODE EXECUTION (JSDOM)');
  console.log('================================================================\n');

  const veCode = fs.readFileSync(path.join(PROJECT_ROOT, 'js/visual-editor.js'), 'utf-8');
  const indexHtml = fs.readFileSync(path.join(PROJECT_ROOT, 'index.html'), 'utf-8');
  const adminHtml = fs.readFileSync(path.join(PROJECT_ROOT, 'admin.html'), 'utf-8');
  const adminJs = fs.readFileSync(path.join(PROJECT_ROOT, 'js/admin.js'), 'utf-8');

  // ===========================================================================
  // SECTION 1: Source Code & AST / Static Forensics (Prohibited Patterns Check)
  // ===========================================================================
  console.log('--- SECTION 1: Prohibited Pattern Static Forensics ---');

  // Check for hardcoded test results / facade returns
  assert('CHK-1.1', 'js/visual-editor.js does not contain hardcoded PASS / TEST strings',
    !veCode.includes('✓ PASS') && !veCode.includes('TEST RESULTS') && !veCode.includes('SimulatedVisualEditorEngine'));

  // Check that VisualEditorEngine has real constructor logic
  assert('CHK-1.2', 'js/visual-editor.js contains full constructor implementation',
    veCode.includes('function VisualEditorEngine(') && veCode.includes('this.boundClickHandler = this.handleElementClick.bind(this)'));

  // Check that index.html actually includes js/visual-editor.js
  assert('CHK-1.3', 'index.html includes js/visual-editor.js script tag',
    indexHtml.includes('src="js/visual-editor.js"'));

  // Check that admin.html contains toggleVisualEditBtn and livePreviewIframe
  assert('CHK-1.4', 'admin.html contains #toggleVisualEditBtn',
    adminHtml.includes('id="toggleVisualEditBtn"'));
  assert('CHK-1.5', 'admin.html contains #livePreviewIframe',
    adminHtml.includes('id="livePreviewIframe"'));
  assert('CHK-1.6', 'admin.html contains #view-preview',
    adminHtml.includes('id="view-preview"'));

  // Check that admin.js contains visual editor bridge
  assert('CHK-1.7', 'js/admin.js contains toggleVisualEdit implementation',
    adminJs.includes('toggleVisualEdit()') && adminJs.includes('TOGGLE_VISUAL_EDIT'));
  assert('CHK-1.8', 'js/admin.js contains postMessage message listener for SAVE_SETTINGS',
    adminJs.includes("data.type === 'SAVE_SETTINGS'") && adminJs.includes('/admin/settings'));
  assert('CHK-1.9', 'js/admin.js contains postMessage listener for SAVE_I18N',
    adminJs.includes("data.type === 'SAVE_I18N'") && adminJs.includes('/admin/translations/'));
  assert('CHK-1.10', 'js/admin.js contains OPEN_MEDIA_PICKER / REQUEST_IMAGE_PICKER handler',
    adminJs.includes("data.type === 'OPEN_MEDIA_PICKER'") || adminJs.includes("data.type === 'REQUEST_IMAGE_PICKER'"));

  // ===========================================================================
  // SECTION 2: Dynamic Execution of Authentic js/visual-editor.js in JSDOM
  // ===========================================================================
  console.log('\n--- SECTION 2: Authentic Visual Editor Dynamic Execution ---');

  const parentMessages = [];
  const dom = new JSDOM(indexHtml, {
    url: 'http://localhost:3000/index.html',
    runScripts: 'outside-only',
    resources: 'usable'
  });

  const { window } = dom;

  // Mock parent window to capture postMessage
  window.parent = {
    postMessage: (msg, targetOrigin) => {
      parentMessages.push(msg);
    }
  };

  // Run authentic js/visual-editor.js in this JSDOM window context
  window.eval(veCode);

  assert('CHK-2.1', 'window.VisualEditor is exported onto window',
    typeof window.VisualEditor === 'object' && window.VisualEditor !== null);
  assert('CHK-2.2', 'window.VisualEditorEngine constructor is exported onto window',
    typeof window.VisualEditorEngine === 'function');

  const ve = window.VisualEditor;

  // Verify Public API Contract
  const apiMethods = ['init', 'enable', 'disable', 'toggle', 'isActive', 'on', 'off', 'updateElement', 'destroy'];
  apiMethods.forEach(m => {
    assert(`CHK-2.3-${m}`, `window.VisualEditor has method ${m}()`, typeof ve[m] === 'function');
  });

  // Initial state
  assert('CHK-2.4', 'VisualEditor.isActive() is initially false', ve.isActive() === false);

  // Enable Visual Editor
  ve.enable();
  assert('CHK-2.5', 'VisualEditor.isActive() is true after enable()', ve.isActive() === true);
  assert('CHK-2.6', 'document.body contains class .visual-edit-active',
    window.document.body.classList.contains('visual-edit-active'));

  // Style Injection Verification
  const styleEl = window.document.getElementById('visual-edit-styles');
  assert('CHK-2.7', 'Style tag #visual-edit-styles injected into DOM', styleEl !== null);
  assert('CHK-2.8', 'Injected CSS defines .visual-editable with dashed outline',
    styleEl && styleEl.textContent.includes('dashed'));
  assert('CHK-2.9', 'Injected CSS defines #00c853 for contenteditable="true"',
    styleEl && styleEl.textContent.includes('#00c853'));
  assert('CHK-2.10', 'Injected CSS defines #ff007f for image hover',
    styleEl && styleEl.textContent.includes('#ff007f'));

  // Element targeting on live index.html DOM
  const heroHeadline = window.document.getElementById('hero-hello-headline');
  const heroPoster = window.document.getElementById('heroShowreelVisual');
  const heroTag = window.document.getElementById('hero-hello-title');
  const heroSubtitle = window.document.getElementById('dynamic-greeting-text');
  const kineticText = window.document.getElementById('kinetic-static-text');
  const revealText = window.document.getElementById('revealText');

  assert('CHK-2.11', 'Hero headline has class visual-editable',
    heroHeadline && heroHeadline.classList.contains('visual-editable'));
  assert('CHK-2.12', 'Hero poster image has classes visual-editable & visual-editable-image',
    heroPoster && heroPoster.classList.contains('visual-editable') && heroPoster.classList.contains('visual-editable-image'));
  assert('CHK-2.13', 'Hero tag has class visual-editable',
    heroTag && heroTag.classList.contains('visual-editable'));
  assert('CHK-2.14', 'Hero subtitle has class visual-editable',
    heroSubtitle && heroSubtitle.classList.contains('visual-editable'));
  assert('CHK-2.15', 'Kinetic static text has class visual-editable',
    kineticText && kineticText.classList.contains('visual-editable'));
  assert('CHK-2.16', 'Reveal text has class visual-editable',
    revealText && revealText.classList.contains('visual-editable'));

  // ===========================================================================
  // SECTION 3: Click-to-Edit, Inline ContentEditable & Blur Save
  // ===========================================================================
  console.log('\n--- SECTION 3: Click-to-Edit & Blur Save Verification ---');

  parentMessages.length = 0; // Clear messages

  // Click on headline
  heroHeadline.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

  assert('CHK-3.1', 'Clicking headline sets contenteditable="true"',
    heroHeadline.getAttribute('contenteditable') === 'true');
  assert('CHK-3.2', 'editingElement is set to headline',
    ve.editingElement === heroHeadline);

  // Update text and blur
  heroHeadline.textContent = 'Forensic Test Headline Text 2026';
  heroHeadline.dispatchEvent(new window.FocusEvent('blur'));

  assert('CHK-3.3', 'Blurring headline removes contenteditable',
    heroHeadline.getAttribute('contenteditable') === null);
  assert('CHK-3.4', 'Blurring headline clears editingElement',
    ve.editingElement === null);
  assert('CHK-3.5', 'Blurring dispatches exactly 1 message to parent',
    parentMessages.length === 1);

  const blurMsg = parentMessages[0];
  assert('CHK-3.6', 'Message type is SAVE_SETTINGS',
    blurMsg && blurMsg.type === 'SAVE_SETTINGS');
  assert('CHK-3.7', 'Message key is heroHeadline',
    blurMsg && blurMsg.key === 'heroHeadline');
  assert('CHK-3.8', 'Message value matches new text content',
    blurMsg && blurMsg.value === 'Forensic Test Headline Text 2026');

  // Test Enter key on editable element
  heroHeadline.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert('CHK-3.9', 'Clicking headline sets contenteditable again', heroHeadline.getAttribute('contenteditable') === 'true');
  heroHeadline.textContent = 'Enter Pressed Value';
  heroHeadline.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  // Note: keydown handler in visual-editor calls blur()
  assert('CHK-3.10', 'Enter key triggers blur and removes contenteditable', heroHeadline.getAttribute('contenteditable') === null);

  // Test Escape key reverts original content
  const origText = 'Original Text Before Esc';
  heroHeadline.textContent = origText;
  heroHeadline.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  heroHeadline.textContent = 'Modified But Cancelled';
  heroHeadline.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  assert('CHK-3.11', 'Escape key reverts content to original', heroHeadline.textContent === origText);

  // Test empty text blur does NOT dispatch save
  parentMessages.length = 0;
  heroHeadline.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  heroHeadline.textContent = '    ';
  heroHeadline.dispatchEvent(new window.FocusEvent('blur'));
  assert('CHK-3.12', 'Empty whitespace blur does not dispatch save message', parentMessages.length === 0);

  // ===========================================================================
  // SECTION 4: Image Click & Media Selected Bridge
  // ===========================================================================
  console.log('\n--- SECTION 4: Image Click & Media Selected Bridge ---');

  parentMessages.length = 0;
  heroPoster.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

  assert('CHK-4.1', 'Clicking image dispatches message to parent', parentMessages.length === 1);
  const imgMsg = parentMessages[0];
  assert('CHK-4.2', 'Image click message type is OPEN_MEDIA_PICKER',
    imgMsg && imgMsg.type === 'OPEN_MEDIA_PICKER');
  assert('CHK-4.3', 'Image click target is showreelPosterUrl',
    imgMsg && imgMsg.target === 'showreelPosterUrl');

  // Test MEDIA_SELECTED incoming message
  parentMessages.length = 0;
  const newPosterUrl = 'https://brandfull.az/media/audited-poster.webp';
  window.dispatchEvent(new window.MessageEvent('message', {
    data: {
      type: 'MEDIA_SELECTED',
      target: 'showreelPosterUrl',
      url: newPosterUrl
    }
  }));

  assert('CHK-4.4', 'Incoming MEDIA_SELECTED updates image src attribute',
    heroPoster.src === newPosterUrl);
  assert('CHK-4.5', 'MEDIA_SELECTED triggers SAVE_SETTINGS message to parent',
    parentMessages.some(m => m.type === 'SAVE_SETTINGS' && m.key === 'showreelPosterUrl' && m.value === newPosterUrl));

  // ===========================================================================
  // SECTION 5: Toggle & Destroy Lifecycle
  // ===========================================================================
  console.log('\n--- SECTION 5: Lifecycle (Toggle & Destroy) ---');

  ve.disable();
  assert('CHK-5.1', 've.disable() sets isActive to false', ve.isActive() === false);
  assert('CHK-5.2', 'body does not have .visual-edit-active', !window.document.body.classList.contains('visual-edit-active'));
  assert('CHK-5.3', 'heroHeadline does not have .visual-editable', !heroHeadline.classList.contains('visual-editable'));

  // Window TOGGLE_VISUAL_EDIT incoming message
  window.dispatchEvent(new window.MessageEvent('message', {
    data: { type: 'TOGGLE_VISUAL_EDIT', active: true }
  }));
  assert('CHK-5.4', 'Incoming TOGGLE_VISUAL_EDIT(true) enables editor', ve.isActive() === true);

  window.dispatchEvent(new window.MessageEvent('message', {
    data: { type: 'TOGGLE_VISUAL_EDIT', active: false }
  }));
  assert('CHK-5.5', 'Incoming TOGGLE_VISUAL_EDIT(false) disables editor', ve.isActive() === false);

  // ve.destroy()
  ve.destroy();
  assert('CHK-5.6', 've.destroy() disables and removes style element',
    window.document.getElementById('visual-edit-styles') === null);

  // ===========================================================================
  // SECTION 6: Admin Host Integration in JSDOM
  // ===========================================================================
  console.log('\n--- SECTION 6: Admin Host Integration Execution ---');

  const adminDom = new JSDOM(adminHtml, {
    url: 'http://localhost:3000/admin.html',
    runScripts: 'outside-only'
  });

  const adminWin = adminDom.window;
  const adminDoc = adminWin.document;

  // Track fetch calls from AdminApp
  const interceptedFetches = [];
  adminWin.fetch = async (url, options = {}) => {
    interceptedFetches.push({ url, options, body: options.body ? JSON.parse(options.body) : null });
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: {} })
    };
  };

  // Mock localStorage token
  adminWin.localStorage.setItem('adminToken', 'mock-bearer-token-12345');

  // Execute admin.js in admin window context
  adminWin.eval(adminJs);

  const AdminApp = adminWin.AdminApp;
  assert('CHK-6.1', 'AdminApp is exported on admin window', typeof AdminApp === 'object' && AdminApp !== null);
  assert('CHK-6.2', 'AdminApp.toggleVisualEdit is a function', typeof AdminApp.toggleVisualEdit === 'function');
  assert('CHK-6.3', 'AdminApp.refreshPreview is a function', typeof AdminApp.refreshPreview === 'function');
  assert('CHK-6.4', 'AdminApp.selectMediaFromPicker is a function', typeof AdminApp.selectMediaFromPicker === 'function');

  // Check iframe postMessage when toggleVisualEdit is called
  const previewIframe = adminDoc.getElementById('livePreviewIframe');
  const iframeMessages = [];
  Object.defineProperty(previewIframe, 'contentWindow', {
    value: {
      postMessage: (msg, origin) => {
        iframeMessages.push(msg);
      }
    },
    writable: true,
    configurable: true
  });

  AdminApp.toggleVisualEdit();
  assert('CHK-6.5', 'AdminApp.toggleVisualEdit() sets isVisualEditActive to true',
    AdminApp.isVisualEditActive === true);
  assert('CHK-6.6', 'AdminApp.toggleVisualEdit() posts TOGGLE_VISUAL_EDIT(true) to iframe',
    iframeMessages.some(m => m.type === 'TOGGLE_VISUAL_EDIT' && m.active === true));

  const toggleBtn = adminDoc.getElementById('toggleVisualEditBtn');
  assert('CHK-6.7', 'Toggle button text reflects active status',
    toggleBtn && toggleBtn.textContent.includes('Aktiv'));

  // Simulate incoming SAVE_SETTINGS message to AdminApp
  interceptedFetches.length = 0;
  await adminWin.dispatchEvent(new adminWin.MessageEvent('message', {
    data: {
      type: 'SAVE_SETTINGS',
      key: 'splitText',
      value: 'Yeni Split Text Məzmunu'
    }
  }));

  // Allow async fetch to resolve
  await new Promise(r => setTimeout(r, 50));

  const putCall = interceptedFetches.find(f => f.options.method === 'PUT');
  assert('CHK-6.8', 'SAVE_SETTINGS triggers PUT request', putCall !== undefined);
  assert('CHK-6.9', 'PUT endpoint is /admin/settings', putCall && putCall.url.endsWith('/admin/settings'));
  assert('CHK-6.10', 'PUT Authorization header has Bearer token',
    putCall && putCall.options.headers['Authorization'] === 'Bearer mock-bearer-token-12345');
  assert('CHK-6.11', 'PUT body has { splitText: "Yeni Split Text Məzmunu" }',
    putCall && putCall.body && putCall.body.splitText === 'Yeni Split Text Məzmunu');

  // Simulate incoming SAVE_I18N message to AdminApp
  interceptedFetches.length = 0;
  await adminWin.dispatchEvent(new adminWin.MessageEvent('message', {
    data: {
      type: 'SAVE_I18N',
      key: 'heroGreeting',
      text: 'Salam Dünya'
    }
  }));

  await new Promise(r => setTimeout(r, 50));

  const patchCall = interceptedFetches.find(f => f.options.method === 'PATCH');
  assert('CHK-6.12', 'SAVE_I18N triggers PATCH request', patchCall !== undefined);
  assert('CHK-6.13', 'PATCH endpoint is /admin/translations/heroGreeting',
    patchCall && patchCall.url.includes('/admin/translations/heroGreeting'));
  assert('CHK-6.14', 'PATCH body has { az: "Salam Dünya" }',
    patchCall && patchCall.body && patchCall.body.az === 'Salam Dünya');

  // Simulate OPEN_MEDIA_PICKER & selectMediaFromPicker
  await adminWin.dispatchEvent(new adminWin.MessageEvent('message', {
    data: {
      type: 'OPEN_MEDIA_PICKER',
      target: 'heroPoster'
    }
  }));
  assert('CHK-6.15', 'OPEN_MEDIA_PICKER sets AdminApp.visualEditMediaTarget',
    AdminApp.visualEditMediaTarget === 'heroPoster');

  iframeMessages.length = 0;
  interceptedFetches.length = 0;
  AdminApp.selectMediaFromPicker('https://cdn.example.com/selected-image.jpg');

  assert('CHK-6.16', 'selectMediaFromPicker posts MEDIA_SELECTED to iframe',
    iframeMessages.some(m => m.type === 'MEDIA_SELECTED' && m.target === 'heroPoster' && m.url === 'https://cdn.example.com/selected-image.jpg'));

  await new Promise(r => setTimeout(r, 50));
  const mediaPutCall = interceptedFetches.find(f => f.options.method === 'PUT');
  assert('CHK-6.17', 'selectMediaFromPicker persists showreelPosterUrl via PUT /admin/settings',
    mediaPutCall && mediaPutCall.body && mediaPutCall.body.showreelPosterUrl === 'https://cdn.example.com/selected-image.jpg');

  // ===========================================================================
  // SECTION 7: Adversarial Stress Tests & Malformed Inputs
  // ===========================================================================
  console.log('\n--- SECTION 7: Adversarial & Stress Testing ---');

  // Malformed postMessage events to visual editor
  let crashed = false;
  try {
    ve.handleMessage(null);
    ve.handleMessage({});
    ve.handleMessage({ data: null });
    ve.handleMessage({ data: 12345 });
    ve.handleMessage({ data: 'hello' });
    ve.handleMessage({ data: { type: 'NON_EXISTENT_TYPE' } });
  } catch (e) {
    crashed = true;
  }
  assert('CHK-7.1', 'visual-editor handles malformed postMessage inputs without crashing', !crashed);

  // Script tag and XSS resilience in contenteditable
  parentMessages.length = 0;
  ve.enable();
  heroHeadline.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  heroHeadline.textContent = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
  heroHeadline.dispatchEvent(new window.FocusEvent('blur'));
  const xssMsg = parentMessages.find(m => m.type === 'SAVE_SETTINGS');
  assert('CHK-7.2', 'Script tags in contenteditable captured safely as literal text string',
    xssMsg && xssMsg.value === '<script>alert("xss")</script><img src=x onerror=alert(1)>');

  // Rapid switching between editable elements
  parentMessages.length = 0;
  heroHeadline.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert('CHK-7.3a', 'Headline focused on first click', ve.editingElement === heroHeadline);
  heroHeadline.textContent = 'First Rapid Text';
  heroSubtitle.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert('CHK-7.3b', 'Subtitle focused on second click', ve.editingElement === heroSubtitle);
  assert('CHK-7.3c', 'First element contenteditable removed upon switching',
    heroHeadline.getAttribute('contenteditable') === null);
  assert('CHK-7.3d', 'First element saved upon focus switch',
    parentMessages.some(m => m.key === 'heroHeadline' && m.value === 'First Rapid Text'));

  // Summary
  const total = results.length;
  const passed = results.filter(r => r.pass).length;
  const failed = total - passed;

  console.log('\n================================================================');
  console.log(`FORENSIC AUDIT SUMMARY: Total: ${total}, Passed: ${passed}, Failed: ${failed}`);
  console.log('================================================================');

  return { total, passed, failed, results };
}

runForensicAudit().then(summary => {
  if (summary.failed > 0) {
    console.error(`\nFORENSIC VERDICT: INTEGRITY VIOLATION (${summary.failed} checks failed)`);
    process.exit(1);
  } else {
    console.log(`\nFORENSIC VERDICT: CLEAN (${summary.passed} / ${summary.total} checks passed)`);
    process.exit(0);
  }
}).catch(err => {
  console.error('Fatal execution error during forensic audit:', err);
  process.exit(1);
});
