import { createTestContext } from '../../tests/verify-settings-sync.js';

// Verify that App is genuinely loaded and interactive
const { document, App } = createTestContext();

// Baseline check
App.data = { settings: { splitText: 'Salam dünya' } };
App.renderSiteSettings();
const spans = document.getElementById('revealText').querySelectorAll('span');

if (spans.length !== 2) {
  console.error('FAILED: Baseline test failed');
  process.exit(1);
}

// Now verify sensitivity: if App.renderSiteSettings did nothing, spans wouldn't change
App.data = { settings: { splitText: 'Bir iki uc dord' } };
App.renderSiteSettings();
const newSpans = document.getElementById('revealText').querySelectorAll('span');

if (newSpans.length !== 4) {
  console.error('FAILED: Mutation sensitivity test failed');
  process.exit(1);
}

console.log('App execution and JSDOM reactivity verified: PASS');
process.exit(0);
