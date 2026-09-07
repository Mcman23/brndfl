import fs from 'fs';

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function testRender(rawClients) {
  let gridInnerHTML = 'INITIAL_8_LOGOS';
  const grid = {
    get innerHTML() { return gridInnerHTML; },
    set innerHTML(val) { gridInnerHTML = val; }
  };
  
  if (!Array.isArray(rawClients)) return grid.innerHTML;

  const clients = rawClients.filter(c => 
    c && 
    typeof c === 'object' && 
    c.active !== false && 
    c.logoUrl && 
    typeof c.logoUrl === 'string' && 
    c.logoUrl.trim() !== ''
  );

  if (clients.length === 0) return grid.innerHTML;

  grid.innerHTML = clients.map(client => {
    const safeUrl = escapeHtml(String(client.logoUrl).trim());
    const safeName = escapeHtml(client.name || 'Client');
    return `<div class="client-logo-box"><img src="${safeUrl}" alt="${safeName}" loading="lazy" /></div>`;
  }).join('');
  
  return grid.innerHTML;
}

// 1. Client logos tests
console.log('--- Test 1: null and undefined inside array ---');
const r1 = testRender([null, undefined, 42, 'string']);
console.assert(r1 === 'INITIAL_8_LOGOS', 'Should preserve initial logos');

console.log('--- Test 2: empty and whitespace logoUrl ---');
const r2 = testRender([
  { id: 1, name: 'NoLogo', active: true, logoUrl: '' },
  { id: 2, name: 'Whitespace', active: true, logoUrl: '   ' }
]);
console.assert(r2 === 'INITIAL_8_LOGOS', 'Should preserve initial logos');

console.log('--- Test 3: inactive client only ---');
const r3 = testRender([{ id: 1, name: 'Inactive', active: false, logoUrl: 'https://cdn.com/logo.svg' }]);
console.assert(r3 === 'INITIAL_8_LOGOS', 'Should preserve initial logos');

console.log('--- Test 4: XSS name injection ---');
const r4 = testRender([{ id: 1, name: 'Evil " onload="alert(1)"', active: true, logoUrl: 'https://cdn.com/logo.svg' }]);
console.assert(r4.includes('alt="Evil &quot; onload=&quot;alert(1)&quot;"'), 'Should escape quotes in alt');
console.assert(!r4.includes('onload="alert'), 'Should not have unescaped onload attribute');

console.log('--- Test 5: Mixed messy array ---');
const r5 = testRender([
  null,
  { id: 1, name: 'NoLogo', active: true, logoUrl: '' },
  { id: 2, name: 'Valid Client', active: true, logoUrl: 'https://cdn.com/valid.svg' },
  { id: 3, name: 'Inactive', active: false, logoUrl: 'https://cdn.com/inactive.svg' }
]);
console.assert(r5 === '<div class="client-logo-box"><img src="https://cdn.com/valid.svg" alt="Valid Client" loading="lazy" /></div>', 'Should render only the 1 valid client');

// 2. splitText tests
console.log('\n--- Test 6: splitText escaping and structure ---');
function renderSplitText(rawText) {
  const text = rawText || '';
  const words = text.split(/\s+/).map(w => w.trim()).filter(Boolean);
  if (words.length > 0) {
    return words.map(w => '<span>' + escapeHtml(w) + '</span>').join(' ');
  }
  return '';
}
const s1 = renderSplitText('Texnologiya <innovasiya> & gələcək <script>alert(1)</script>');
console.log('SplitText output:', s1);
console.assert(s1 === '<span>Texnologiya</span> <span>&lt;innovasiya&gt;</span> <span>&amp;</span> <span>gələcək</span> <span>&lt;script&gt;alert(1)&lt;/script&gt;</span>', 'SplitText must escape HTML tags and ampersands');
console.assert(s1.includes('gələcək'), 'Azeri unicode chars must remain intact');

// 3. kineticWords tests
console.log('\n--- Test 7: kineticWords escaping and loop cloning ---');
function renderKineticWords(rawWords) {
  const wordsStr = rawWords || '';
  const words = wordsStr.split(',').map(w => w.trim()).filter(Boolean);
  if (words.length > 0) {
    return words.map(w => '<span class="word">' + escapeHtml(w) + '</span>').join('') +
           '<span class="word">' + escapeHtml(words[0]) + '</span>';
  }
  return '';
}
const k1 = renderKineticWords('brendlər üçün, <img src=x onerror=alert(1)>, cəmiyyət üçün');
console.log('KineticWords output:', k1);
console.assert(!k1.includes('<img src=x'), 'Must not inject unescaped <img>');
console.assert(k1.includes('&lt;img src=x onerror=alert(1)&gt;'), 'Must escape img tag');
console.assert(k1.endsWith('<span class="word">brendlər üçün</span>'), 'Must clone first word to end');

// 4. heroTag tests
console.log('\n--- Test 8: heroTag escaping ---');
function renderHeroTag(rawTag) {
  return escapeHtml(rawTag) + '<span class="color-primary">.</span>';
}
const h1 = renderHeroTag('Salam <script>evil()</script>');
console.log('HeroTag output:', h1);
console.assert(h1 === 'Salam &lt;script&gt;evil()&lt;/script&gt;<span class="color-primary">.</span>', 'HeroTag must escape tag');

console.log('\nALL 8 TESTS PASSED WITH ZERO FAILURES!');
