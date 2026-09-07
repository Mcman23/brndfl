/**
 * verify-genuine-m2.js
 * Independent, adversarial verification of genuine Milestone 2 implementation:
 * - Real js/visual-editor.js loaded in real JSDOM running index.html
 * - Real js/admin.js loaded in real JSDOM running admin.html
 * - Genuine cross-window postMessage communication between Admin parent and Live Preview iframe
 * - Validation of all acceptance criteria R1 without using any simulated engine class
 */

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { JSDOM } from 'jsdom';

const rootDir = path.resolve('.');
const indexHtmlContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
const adminHtmlContent = fs.readFileSync(path.join(rootDir, 'admin.html'), 'utf-8');
const visualEditorJs = fs.readFileSync(path.join(rootDir, 'js/visual-editor.js'), 'utf-8');
const adminJs = fs.readFileSync(path.join(rootDir, 'js/admin.js'), 'utf-8');

const results = [];
function test(name, pass, details = '') {
  results.push({ name, pass, details });
  console.log(`${pass ? '✓ PASS' : '✗ FAIL'}: ${name}${details ? ` (${details})` : ''}`);
}

async function runIndependentVerification() {
  console.log('===============================================================');
  console.log('STARTING INDEPENDENT VERIFICATION OF GENUINE M2 WORK PRODUCT');
  console.log('===============================================================\n');

  // -------------------------------------------------------------------------
  // SECTION 1: CODE INTEGRITY & FACADE AUDIT
  // -------------------------------------------------------------------------
  console.log('--- SECTION 1: Code Integrity & Source Inspection ---');

  // Check 1.1: verify-visual-editor.js vs js/visual-editor.js
  const testSuiteContent = fs.readFileSync(path.join(rootDir, 'tests/verify-visual-editor.js'), 'utf-8');
  const testUsesSimulation = testSuiteContent.includes('SimulatedVisualEditorEngine');
  test(
    'Audit: Check if tests/verify-visual-editor.js relies on SimulatedVisualEditorEngine instead of js/visual-editor.js',
    testUsesSimulation,
    'Note: tests/verify-visual-editor.js defines SimulatedVisualEditorEngine in lines 226-465 rather than importing js/visual-editor.js'
  );

  // Check 1.2: Check if js/visual-editor.js is a facade or contains genuine implementation
  const hasVisualEditorEngine = visualEditorJs.includes('function VisualEditorEngine');
  const hasPublicAPI = visualEditorJs.includes('root.VisualEditor = instance') && visualEditorJs.includes('root.VisualEditorEngine');
  test('Audit: js/visual-editor.js contains genuine VisualEditorEngine class definition', hasVisualEditorEngine);
  test('Audit: js/visual-editor.js exports public window.VisualEditor and window.VisualEditorEngine', hasPublicAPI);

  // Check 1.3: Check admin.html contains toggleVisualEditBtn
  const adminHasToggleBtn = adminHtmlContent.includes('id="toggleVisualEditBtn"');
  test('Audit: admin.html contains #toggleVisualEditBtn in preview bar', adminHasToggleBtn);

  // Check 1.4: Check admin.js contains toggleVisualEdit and postMessage listener
  const adminHasToggleMethod = adminJs.includes('toggleVisualEdit()');
  const adminHasPostMessageBridge = adminJs.includes('SAVE_SETTINGS') && adminJs.includes('SAVE_I18N') && adminJs.includes('OPEN_MEDIA_PICKER');
  test('Audit: js/admin.js implements toggleVisualEdit()', adminHasToggleMethod);
  test('Audit: js/admin.js implements postMessage bridge for SAVE_SETTINGS, SAVE_I18N, OPEN_MEDIA_PICKER', adminHasPostMessageBridge);

  // Check 1.5: index.html contains data-setting attributes on hero and statements
  const indexHasDataSetting = indexHtmlContent.includes('data-setting="heroHeadline"') &&
                              indexHtmlContent.includes('data-setting="showreelPosterUrl"') &&
                              indexHtmlContent.includes('data-setting="splitText"') &&
                              indexHtmlContent.includes('data-setting="kineticText"');
  test('Audit: index.html contains data-setting attributes on hero and statements', indexHasDataSetting);

  // Check 1.6: index.html includes js/visual-editor.js
  const indexIncludesScript = indexHtmlContent.includes('<script src="js/visual-editor.js"></script>');
  test('Audit: index.html loads js/visual-editor.js via script tag', indexIncludesScript);

  // -------------------------------------------------------------------------
  // SECTION 2: GENUINE EXECUTION OF js/visual-editor.js IN REAL JSDOM (index.html)
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Executing Real js/visual-editor.js on index.html ---');

  const liveDom = new JSDOM(indexHtmlContent, {
    url: 'http://localhost:3000/index.html',
    runScripts: 'dangerously'
  });
  const liveWin = liveDom.window;
  const liveDoc = liveWin.document;

  // Mock parent window to intercept postMessages
  const interceptedMessages = [];
  const mockParentWindow = {
    postMessage: (msg, targetOrigin) => {
      interceptedMessages.push(msg);
    }
  };
  // Wire window.parent to mockParentWindow
  Object.defineProperty(liveWin, 'parent', {
    value: mockParentWindow,
    writable: true,
    configurable: true
  });

  // Execute genuine js/visual-editor.js in liveWin
  const scriptEl = liveDoc.createElement('script');
  scriptEl.textContent = visualEditorJs;
  liveDoc.body.appendChild(scriptEl);

  const ve = liveWin.VisualEditor;
  test('Execution: window.VisualEditor singleton is initialized in DOM window', Boolean(ve));
  test('Execution: VisualEditor.isActive() returns false initially', ve && ve.isActive() === false);

  // Test enable()
  ve.enable();
  test('Execution: ve.enable() adds "visual-edit-active" class to document.body', liveDoc.body.classList.contains('visual-edit-active'));
  test('Execution: ve.isActive() returns true after enable()', ve.isActive() === true);

  // Verify CSS injection
  const styleTag = liveDoc.getElementById('visual-edit-styles');
  test('Execution: #visual-edit-styles is injected into document head/body', Boolean(styleTag));
  test('Execution: Injected CSS contains dashed outline rule', styleTag && styleTag.textContent.includes('dashed'));
  test('Execution: Injected CSS contains contenteditable green highlight (#00c853)', styleTag && styleTag.textContent.includes('#00c853'));

  // Verify targeted elements have .visual-editable
  const headlineEl = liveDoc.querySelector('#hero-hello-headline');
  const posterEl = liveDoc.querySelector('#heroShowreelVisual');
  const splitTextEl = liveDoc.querySelector('#revealText');
  const kineticStaticEl = liveDoc.querySelector('#kinetic-static-text');

  test('Targeting: Headline element marked as .visual-editable', headlineEl && headlineEl.classList.contains('visual-editable'));
  test('Targeting: Poster image marked as .visual-editable and .visual-editable-image', posterEl && posterEl.classList.contains('visual-editable') && posterEl.classList.contains('visual-editable-image'));
  test('Targeting: SplitText element marked as .visual-editable', splitTextEl && splitTextEl.classList.contains('visual-editable'));
  test('Targeting: KineticStatic element marked as .visual-editable', kineticStaticEl && kineticStaticEl.classList.contains('visual-editable'));

  // Test click-to-edit on text
  interceptedMessages.length = 0;
  headlineEl.dispatchEvent(new liveWin.MouseEvent('click', { bubbles: true, cancelable: true }));

  test('Interaction: Clicking text element sets contenteditable="true"', headlineEl.getAttribute('contenteditable') === 'true');
  test('Interaction: Active editingElement references headline element', ve.editingElement === headlineEl);

  // Test blur save
  headlineEl.textContent = 'Yeni Dəyişdirilmiş Başlıq (Adversarial)';
  headlineEl.dispatchEvent(new liveWin.FocusEvent('blur', { bubbles: false, cancelable: true }));

  test('Interaction: Blur removes contenteditable attribute', headlineEl.getAttribute('contenteditable') === null);
  test('Interaction: Blur clears editingElement reference', ve.editingElement === null);
  test('postMessage: Dispatched SAVE_SETTINGS message to parent window', interceptedMessages.some(m => m.type === 'SAVE_SETTINGS'));

  const saveMsg = interceptedMessages.find(m => m.type === 'SAVE_SETTINGS');
  test('postMessage: Payload key matches "heroHeadline"', saveMsg && (saveMsg.key === 'heroHeadline' || saveMsg.setting === 'heroHeadline'));
  test('postMessage: Payload value matches updated text', saveMsg && saveMsg.value === 'Yeni Dəyişdirilmiş Başlıq (Adversarial)');

  // Test click on image
  interceptedMessages.length = 0;
  posterEl.dispatchEvent(new liveWin.MouseEvent('click', { bubbles: true, cancelable: true }));

  test('Interaction: Clicking image dispatches OPEN_MEDIA_PICKER to parent', interceptedMessages.some(m => m.type === 'OPEN_MEDIA_PICKER'));
  const openMsg = interceptedMessages.find(m => m.type === 'OPEN_MEDIA_PICKER');
  test('postMessage: OPEN_MEDIA_PICKER contains target identifier', openMsg && openMsg.target === 'showreelPosterUrl');

  // Test MEDIA_SELECTED response from parent
  interceptedMessages.length = 0;
  const newMediaUrl = 'https://cdn.example.com/adversarial-hero-poster.webp';
  liveWin.dispatchEvent(new liveWin.MessageEvent('message', {
    data: {
      type: 'MEDIA_SELECTED',
      target: 'showreelPosterUrl',
      url: newMediaUrl
    }
  }));

  test('Interaction: Receiving MEDIA_SELECTED updates img.src attribute', posterEl.src === newMediaUrl);
  test('Interaction: Updating image automatically emits SAVE_SETTINGS with new URL', interceptedMessages.some(m => m.type === 'SAVE_SETTINGS' && m.value === newMediaUrl));

  // Test disable()
  ve.disable();
  test('Lifecycle: disable() removes "visual-edit-active" from body', !liveDoc.body.classList.contains('visual-edit-active'));
  test('Lifecycle: disable() removes .visual-editable from headline', !headlineEl.classList.contains('visual-editable'));
  test('Lifecycle: disable() removes .visual-editable from image', !posterEl.classList.contains('visual-editable'));
  test('Lifecycle: isActive() is false after disable()', ve.isActive() === false);

  // Test toggle()
  const toggleResult1 = ve.toggle();
  test('Lifecycle: toggle() turns ON editor', toggleResult1 === true && ve.isActive() === true);
  const toggleResult2 = ve.toggle();
  test('Lifecycle: toggle() turns OFF editor', toggleResult2 === false && ve.isActive() === false);

  // -------------------------------------------------------------------------
  // SECTION 3: GENUINE EXECUTION OF js/admin.js (admin.html)
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Executing Real js/admin.js in Admin Environment ---');

  const adminDom = new JSDOM(adminHtmlContent, {
    url: 'http://localhost:3000/admin.html',
    runScripts: 'dangerously'
  });
  const adminWin = adminDom.window;
  const adminDoc = adminWin.document;

  // Polyfill fetch in admin window to capture API calls
  const fetchCalls = [];
  adminWin.fetch = async (url, options = {}) => {
    fetchCalls.push({ url: String(url), options });
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: [] })
    };
  };

  // Mock iframe inside adminDoc
  const previewIframe = adminDoc.getElementById('livePreviewIframe');
  const iframeReceivedMessages = [];
  if (previewIframe) {
    Object.defineProperty(previewIframe, 'contentWindow', {
      value: {
        postMessage: (msg, targetOrigin) => {
          iframeReceivedMessages.push(msg);
        }
      },
      writable: true,
      configurable: true
    });
  }

  // Execute admin.js in adminWin
  const adminScriptEl = adminDoc.createElement('script');
  adminScriptEl.textContent = adminJs;
  adminDoc.body.appendChild(adminScriptEl);

  const AdminApp = adminWin.AdminApp;
  test('Admin: window.AdminApp is defined', Boolean(AdminApp));

  // Initialize AdminApp bindings
  if (AdminApp && typeof AdminApp.bindEvents === 'function') {
    AdminApp.bindEvents();
  }

  // Test AdminApp.toggleVisualEdit()
  iframeReceivedMessages.length = 0;
  AdminApp.toggleVisualEdit();

  test('Admin: toggleVisualEdit() sets isVisualEditActive to true', AdminApp.isVisualEditActive === true);
  test('Admin: toggleVisualEdit() updates toggle button label to active state', adminDoc.getElementById('toggleVisualEditBtn')?.textContent.includes('Aktiv'));
  test('Admin: toggleVisualEdit() dispatches TOGGLE_VISUAL_EDIT to iframe contentWindow', iframeReceivedMessages.some(m => m.type === 'TOGGLE_VISUAL_EDIT' && m.active === true));

  // Test admin postMessage listener for SAVE_SETTINGS
  fetchCalls.length = 0;
  AdminApp.token = 'test-bearer-token-123';
  adminWin.dispatchEvent(new adminWin.MessageEvent('message', {
    data: {
      type: 'SAVE_SETTINGS',
      key: 'heroHeadline',
      value: 'Admin Persisted Headline'
    }
  }));

  // Wait a microtask tick for async fetch handler
  await new Promise(r => setTimeout(r, 50));

  const settingsFetch = fetchCalls.find(f => f.url.includes('/admin/settings') && f.options.method === 'PUT');
  test('Admin Persistence: Message SAVE_SETTINGS triggers PUT /api/admin/settings', Boolean(settingsFetch));
  test('Admin Persistence: Payload includes { heroHeadline: "Admin Persisted Headline" }', settingsFetch && JSON.parse(settingsFetch.options.body).heroHeadline === 'Admin Persisted Headline');
  test('Admin Persistence: Request includes Authorization: Bearer token header', settingsFetch && settingsFetch.options.headers['Authorization'] === 'Bearer test-bearer-token-123');

  // Test admin postMessage listener for SAVE_I18N
  fetchCalls.length = 0;
  adminWin.dispatchEvent(new adminWin.MessageEvent('message', {
    data: {
      type: 'SAVE_I18N',
      key: 'heroSubtitle',
      text: 'Yeni tərcümə mətni'
    }
  }));
  await new Promise(r => setTimeout(r, 50));

  const i18nFetch = fetchCalls.find(f => f.url.includes('/admin/translations/heroSubtitle') && f.options.method === 'PATCH');
  test('Admin Persistence: Message SAVE_I18N triggers PATCH /api/admin/translations/:key', Boolean(i18nFetch));
  test('Admin Persistence: I18n payload includes { az: "Yeni tərcümə mətni" }', i18nFetch && JSON.parse(i18nFetch.options.body).az === 'Yeni tərcümə mətni');

  // Test admin postMessage listener for OPEN_MEDIA_PICKER & selectMediaFromPicker
  iframeReceivedMessages.length = 0;
  fetchCalls.length = 0;

  adminWin.dispatchEvent(new adminWin.MessageEvent('message', {
    data: {
      type: 'OPEN_MEDIA_PICKER',
      target: 'showreelPosterUrl'
    }
  }));

  test('Admin Media Picker: OPEN_MEDIA_PICKER sets AdminApp.visualEditMediaTarget', AdminApp.visualEditMediaTarget === 'showreelPosterUrl');

  // User selects media in media picker dialog
  const pickedUrl = 'https://cdn.example.com/picked-from-dialog.png';
  AdminApp.selectMediaFromPicker(pickedUrl);
  await new Promise(r => setTimeout(r, 50));

  test('Admin Media Picker: selectMediaFromPicker posts MEDIA_SELECTED back to iframe', iframeReceivedMessages.some(m => m.type === 'MEDIA_SELECTED' && m.target === 'showreelPosterUrl' && m.url === pickedUrl));
  const mediaSettingsFetch = fetchCalls.find(f => f.url.includes('/admin/settings') && f.options.method === 'PUT');
  test('Admin Media Picker: selectMediaFromPicker persists new poster URL to backend settings', mediaSettingsFetch && JSON.parse(mediaSettingsFetch.options.body).showreelPosterUrl === pickedUrl);

  // -------------------------------------------------------------------------
  // SECTION 4: ADVERSARIAL STRESS TESTING & EDGE CASES
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 4: Adversarial Stress Testing & Edge Cases ---');

  // Edge Case 4.1: Empty whitespace blur does not overwrite setting with blank
  interceptedMessages.length = 0;
  ve.enable();
  headlineEl.textContent = '   \n\t   ';
  headlineEl.dispatchEvent(new liveWin.FocusEvent('blur', { bubbles: false, cancelable: true }));
  test('Adversarial 4.1: Pure whitespace text edit does not emit SAVE_SETTINGS payload', interceptedMessages.filter(m => m.type === 'SAVE_SETTINGS').length === 0);

  // Edge Case 4.2: XSS script tag injection in edited text
  interceptedMessages.length = 0;
  headlineEl.textContent = '<script>window.__pwned=1;</script><img src=x onerror=alert(1)>';
  headlineEl.dispatchEvent(new liveWin.FocusEvent('blur', { bubbles: false, cancelable: true }));
  const xssMsg = interceptedMessages.find(m => m.type === 'SAVE_SETTINGS');
  test('Adversarial 4.2: Hostile HTML is captured as inert literal string in payload', xssMsg && xssMsg.value === '<script>window.__pwned=1;</script><img src=x onerror=alert(1)>');

  // Edge Case 4.3: Malformed postMessage objects do not crash AdminApp or VisualEditor
  let crashDetected = false;
  try {
    liveWin.dispatchEvent(new liveWin.MessageEvent('message', { data: null }));
    liveWin.dispatchEvent(new liveWin.MessageEvent('message', { data: 'primitive-string' }));
    liveWin.dispatchEvent(new liveWin.MessageEvent('message', { data: { type: 'CORRUPT_UNKNOWN_TYPE', foo: null } }));
    adminWin.dispatchEvent(new adminWin.MessageEvent('message', { data: null }));
    adminWin.dispatchEvent(new adminWin.MessageEvent('message', { data: { type: 'SAVE_SETTINGS', key: null } }));
  } catch (e) {
    crashDetected = true;
  }
  test('Adversarial 4.3: Malformed postMessage payloads handled gracefully without throwing unhandled exceptions', !crashDetected);

  // Edge Case 4.4: Escape key restores original content and cancels edit
  headlineEl.textContent = 'Initial Text';
  headlineEl.dispatchEvent(new liveWin.MouseEvent('click', { bubbles: true, cancelable: true }));
  headlineEl.textContent = 'Dirty Unsaved Changes';
  headlineEl.dispatchEvent(new liveWin.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  test('Adversarial 4.4: Escape key cancels edit and restores original content', headlineEl.textContent === 'Initial Text');

  // Edge Case 4.5: Enter key triggers blur
  let enterBlurred = false;
  headlineEl.addEventListener('blur', () => { enterBlurred = true; }, { once: true });
  headlineEl.dispatchEvent(new liveWin.MouseEvent('click', { bubbles: true, cancelable: true }));
  headlineEl.dispatchEvent(new liveWin.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  test('Adversarial 4.5: Enter key down triggers blur event', enterBlurred);

  // Edge Case 4.6: Rapid toggle cycle stability (50 rapid toggles)
  let rapidToggleSuccess = true;
  try {
    for (let i = 0; i < 50; i++) {
      ve.toggle();
    }
  } catch (e) {
    rapidToggleSuccess = false;
  }
  test('Adversarial 4.6: 50 rapid toggle operations complete without error or leak', rapidToggleSuccess);

  // Clean up
  ve.disable();

  // -------------------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------------------
  const total = results.length;
  const passed = results.filter(r => r.pass).length;
  const failed = total - passed;

  console.log('\n===============================================================');
  console.log(`INDEPENDENT VERIFICATION SUMMARY: Total: ${total}, Passed: ${passed}, Failed: ${failed}`);
  console.log('===============================================================');

  return { total, passed, failed, results };
}

runIndependentVerification().then(res => {
  if (res.failed > 0) {
    process.exit(1);
  } else {
    console.log('\nALL INDEPENDENT VERIFICATION CHECKS PASSED!\n');
    process.exit(0);
  }
}).catch(err => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
