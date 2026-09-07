import { createTestContext } from '../../tests/verify-settings-sync.js';

const { document, App } = createTestContext();

// Test 1: Kinetic words XSS
App.data = { settings: { kineticWords: '<script>alert(1)</script>,<img src=x onerror=alert(1)>' } };
App.renderSiteSettings();
const scroller = document.getElementById('kinetic-scrolling-words');
const scrollerXSS = scroller.querySelectorAll('script, img').length;

// Test 2: Split text XSS
App.data = { settings: { splitText: '<script>evil()</script> <b onclick="bad()">click</b>' } };
App.renderSiteSettings();
const reveal = document.getElementById('revealText');
const revealXSS = reveal.querySelectorAll('script, b').length;

// Test 3: Client Logos XSS in name and logoUrl
App.renderClientLogos([
  { id: '1', name: '"><script>alert(2)</script>', logoUrl: 'https://example.com/logo.svg" onload="alert(3)', active: true }
]);
const logos = document.getElementById('home-client-logos');
const logosXSS = logos.querySelectorAll('script').length;

// Test 4: Verify escaping
console.log('Scroller HTML:', scroller.innerHTML);
console.log('Scroller XSS tag count (expect 0):', scrollerXSS);
console.log('Reveal HTML:', reveal.innerHTML);
console.log('Reveal XSS tag count (expect 0):', revealXSS);
console.log('Logos HTML:', logos.innerHTML);
console.log('Logos XSS tag count (expect 0):', logosXSS);

if (scrollerXSS === 0 && revealXSS === 0 && logosXSS === 0) {
  console.log('ALL XSS INJECTIONS PROPERLY SANITIZED/ESCAPED: PASS');
  process.exit(0);
} else {
  console.error('XSS VULNERABILITY DETECTED: FAIL');
  process.exit(1);
}
