import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const appJsContent = fs.readFileSync(path.join(rootDir, 'js/app.js'), 'utf-8');

// Mock browser environment
const createMockEl = (id = '') => ({
  id,
  innerHTML: '',
  textContent: '',
  style: {},
  setAttribute() {},
  getAttribute() { return ''; },
  removeAttribute() {},
  remove() {},
  querySelector() { return null; },
  querySelectorAll() { return []; },
  children: []
});

const elements = {
  revealText: createMockEl('revealText'),
  'kinetic-scrolling-words': createMockEl('kinetic-scrolling-words'),
  'hero-hello-title': createMockEl('hero-hello-title'),
  'home-client-logos': createMockEl('home-client-logos')
};

global.window = {};
global.document = {
  readyState: 'complete',
  getElementById: (id) => elements[id] || createMockEl(id),
  querySelector: (sel) => null,
  querySelectorAll: (sel) => [],
  addEventListener: () => {}
};
global.I18nManager = {
  get: (field, obj) => obj[field]
};

// Evaluate actual js/app.js
eval(appJsContent);

console.log('=== VULNERABILITY 1: splitText XSS in current js/app.js ===');
window.App.data = {
  settings: {
    splitText: 'Texnologiya <innovasiya> & gələcək <script>alert(1)</script>'
  }
};
window.App.renderSiteSettings();
console.log('Actual revealText.innerHTML:\n ', elements.revealText.innerHTML);
const hasRawScriptInSplit = elements.revealText.innerHTML.includes('<script>alert(1)</script>');
console.log('-> Vulnerability confirmed (Raw script injected)?', hasRawScriptInSplit);

console.log('\n=== VULNERABILITY 2: kineticWords XSS in current js/app.js ===');
window.App.data = {
  settings: {
    kineticWords: 'Word1, <img src=x onerror=alert(1)>, Word3'
  }
};
window.App.renderSiteSettings();
console.log('Actual kinetic-scrolling-words.innerHTML:\n ', elements['kinetic-scrolling-words'].innerHTML);
const hasRawImgInKinetic = elements['kinetic-scrolling-words'].innerHTML.includes('<img src=x');
console.log('-> Vulnerability confirmed (Raw img injected)?', hasRawImgInKinetic);

console.log('\n=== VULNERABILITY 3: heroTag XSS in current js/app.js ===');
window.App.data = {
  settings: {
    heroTag: 'Salam <script>evil()</script>'
  }
};
window.App.renderSiteSettings();
console.log('Actual hero-hello-title.innerHTML:\n ', elements['hero-hello-title'].innerHTML);
const hasRawScriptInHeroTag = elements['hero-hello-title'].innerHTML.includes('<script>evil()</script>');
console.log('-> Vulnerability confirmed (Raw script in heroTag)?', hasRawScriptInHeroTag);

console.log('\n=== VULNERABILITY 4: TypeError on null client record in current js/app.js ===');
try {
  window.App.renderClientLogos([null, { active: true, logoUrl: 'https://test.com/logo.svg' }]);
  console.log('Did not throw');
} catch (err) {
  console.log('-> Vulnerability confirmed (TypeError thrown):', err.message);
}

console.log('\n=== VULNERABILITY 5: Fallback logos wiped on empty logoUrl in current js/app.js ===');
elements['home-client-logos'].innerHTML = 'ORIGINAL_8_FALLBACK_LOGOS';
window.App.renderClientLogos([{ id: 1, name: 'NoLogo', active: true, logoUrl: '' }]);
console.log('Actual home-client-logos.innerHTML:\n ', elements['home-client-logos'].innerHTML);
const fallbackWiped = elements['home-client-logos'].innerHTML === '';
console.log('-> Vulnerability confirmed (Fallback wiped to empty string)?', fallbackWiped);
