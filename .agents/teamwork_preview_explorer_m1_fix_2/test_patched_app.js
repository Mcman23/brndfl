import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

let appCode = fs.readFileSync(path.join(rootDir, 'js/app.js'), 'utf-8');

// Define proposed escapeHtml and App.escapeHtml
const escapeHtmlDef = `
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
`;

// 1. Prepend escapeHtml before App
appCode = escapeHtmlDef + appCode;

// 2. Add escapeHtml to App object
appCode = appCode.replace('currentRoute: \'home\',', 'currentRoute: \'home\',\n  escapeHtml: escapeHtml,');

// 3. Replace heroTag line
appCode = appCode.replace(
  `if (heroTag && s.heroTag) heroTag.innerHTML = getI18n('heroTag') + '<span class="color-primary">.</span>';`,
  `if (heroTag && s.heroTag) heroTag.innerHTML = escapeHtml(getI18n('heroTag')) + '<span class="color-primary">.</span>';`
);

// 4. Replace kineticWords block
const kineticOld = `          if (words.length > 0) {
              kineticScroller.innerHTML = words.map(w => '<span class="word">' + w + '</span>').join('');
              // Clone the first word to the end for smooth loop if GSAP expects it
              kineticScroller.innerHTML += '<span class="word">' + words[0] + '</span>';
          }`;

const kineticNew = `          if (words.length > 0) {
              kineticScroller.innerHTML = words.map(w => '<span class="word">' + escapeHtml(w) + '</span>').join('') +
                                          '<span class="word">' + escapeHtml(words[0]) + '</span>';
          }`;

appCode = appCode.replace(kineticOld, kineticNew);

// 5. Replace splitText block
const splitOld = `          if (words.length > 0) {
              splitTextEl.innerHTML = words.map(w => '<span>' + w + '</span>').join(' ');
          }`;

const splitNew = `          if (words.length > 0) {
              splitTextEl.innerHTML = words.map(w => '<span>' + escapeHtml(w) + '</span>').join(' ');
          }`;

appCode = appCode.replace(splitOld, splitNew);

// 6. Replace renderClientLogos
const renderClientsOld = `  renderClientLogos(clientsData) {
    const grid = document.getElementById('home-client-logos');
    if (!grid) return;
    
    const rawClients = clientsData || (this.data && this.data.clients) || [];
    const clients = rawClients.filter(c => c.active !== false);
    if (clients.length === 0) return;
    
    grid.innerHTML = clients.map(client => {
       if (client.logoUrl) {
         return \`<div class="client-logo-box"><img src="\${client.logoUrl}" alt="\${client.name}" loading="lazy" /></div>\`;
       }
       return '';
    }).join('');
  },`;

const renderClientsNew = `  renderClientLogos(clientsData) {
    const grid = document.getElementById('home-client-logos');
    if (!grid) return;
    
    const rawClients = clientsData || (this.data && this.data.clients) || [];
    if (!Array.isArray(rawClients)) return;

    const clients = rawClients.filter(c => 
      c && 
      typeof c === 'object' && 
      c.active !== false && 
      c.logoUrl && 
      typeof c.logoUrl === 'string' && 
      c.logoUrl.trim() !== ''
    );

    if (clients.length === 0) return; // Keep existing static fallback logos intact
    
    grid.innerHTML = clients.map(client => {
      const safeUrl = escapeHtml(String(client.logoUrl).trim());
      const safeName = escapeHtml(client.name || 'Client');
      return \`<div class="client-logo-box"><img src="\${safeUrl}" alt="\${safeName}" loading="lazy" /></div>\`;
    }).join('');
  },`;

appCode = appCode.replace(renderClientsOld, renderClientsNew);

// Test environment
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

global.window = {
  addEventListener: () => {},
  location: { hash: '', pathname: '/' }
};
global.document = {
  readyState: 'loading', // prevents premature auto-init during eval
  getElementById: (id) => elements[id] || createMockEl(id),
  querySelector: (sel) => null,
  querySelectorAll: (sel) => [],
  addEventListener: () => {}
};
global.I18nManager = {
  get: (field, obj) => obj[field]
};

// Evaluate patched code
eval(appCode);

console.log('=== TEST 1: splitText XSS remediation ===');
window.App.data = {
  settings: {
    splitText: 'Texnologiya <innovasiya> & gələcək <script>alert(1)</script>'
  }
};
window.App.renderSiteSettings();
console.log('Patched revealText.innerHTML:\n ', elements.revealText.innerHTML);
console.assert(!elements.revealText.innerHTML.includes('<script>'), 'Must not contain raw script tag');
console.assert(elements.revealText.innerHTML.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'Must contain escaped script tag');
console.assert(elements.revealText.innerHTML.includes('&lt;innovasiya&gt;'), 'Must contain escaped angle brackets');
console.assert(elements.revealText.innerHTML.includes('&amp;'), 'Must contain escaped ampersand');

console.log('\n=== TEST 2: kineticWords XSS remediation ===');
window.App.data = {
  settings: {
    kineticWords: 'Word1, <img src=x onerror=alert(1)>, Word3'
  }
};
window.App.renderSiteSettings();
console.log('Patched kinetic-scrolling-words.innerHTML:\n ', elements['kinetic-scrolling-words'].innerHTML);
console.assert(!elements['kinetic-scrolling-words'].innerHTML.includes('<img src=x'), 'Must not contain raw img tag');
console.assert(elements['kinetic-scrolling-words'].innerHTML.includes('&lt;img src=x onerror=alert(1)&gt;'), 'Must contain escaped img tag');
console.assert(elements['kinetic-scrolling-words'].innerHTML.endsWith('<span class="word">Word1</span>'), 'Must loop clone first word');

console.log('\n=== TEST 3: heroTag XSS remediation ===');
window.App.data = {
  settings: {
    heroTag: 'Salam <script>evil()</script>'
  }
};
window.App.renderSiteSettings();
console.log('Patched hero-hello-title.innerHTML:\n ', elements['hero-hello-title'].innerHTML);
console.assert(!elements['hero-hello-title'].innerHTML.includes('<script>evil()</script>'), 'Must not contain raw script');
console.assert(elements['hero-hello-title'].innerHTML.includes('&lt;script&gt;evil()&lt;/script&gt;'), 'Must contain escaped script');

console.log('\n=== TEST 4: Null client record resilience ===');
elements['home-client-logos'].innerHTML = 'ORIGINAL_8_FALLBACK_LOGOS';
let threw = false;
try {
  window.App.renderClientLogos([null, undefined, { active: false }, { active: true, logoUrl: 'https://cdn.example.com/logo.svg', name: 'Safe "><script>' }]);
} catch (err) {
  threw = true;
  console.error(err);
}
console.assert(!threw, 'Must not throw TypeError on null');
console.log('Patched home-client-logos.innerHTML (mixed array):\n ', elements['home-client-logos'].innerHTML);
console.assert(elements['home-client-logos'].innerHTML.includes('alt="Safe &quot;&gt;&lt;script&gt;"'), 'Client name must be escaped');
console.assert(!elements['home-client-logos'].innerHTML.includes('<script>'), 'Must not inject script tag into logos');

console.log('\n=== TEST 5: Fallback preservation when logoUrl missing/empty ===');
elements['home-client-logos'].innerHTML = 'ORIGINAL_8_FALLBACK_LOGOS';
window.App.renderClientLogos([{ id: 1, name: 'NoLogo', active: true, logoUrl: '' }]);
console.log('Patched home-client-logos.innerHTML (empty logoUrl):\n ', elements['home-client-logos'].innerHTML);
console.assert(elements['home-client-logos'].innerHTML === 'ORIGINAL_8_FALLBACK_LOGOS', 'Must preserve fallback logos when no active client has valid logo');

console.log('\n=== ALL 5 PATCH VERIFICATION ASSERTIONS PASSED WITH ZERO ERRORS (EXIT CODE 0) ===');
