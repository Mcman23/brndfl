import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { JSDOM } from 'jsdom';

// Load real index.html and app.js
const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf-8');
let appJsCode = fs.readFileSync(path.resolve('js/app.js'), 'utf-8');

// The exact escapeHtml helper to be added to app.js
const escapeHtmlFunction = `
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
`;

// Prepend helper
appJsCode = escapeHtmlFunction + appJsCode;

// Patch heroTag to escape and trim
appJsCode = appJsCode.replace(
  "if (heroTag && s.heroTag) heroTag.innerHTML = getI18n('heroTag') + '<span class=\"color-primary\">.</span>';",
  "if (heroTag && s.heroTag && String(getI18n('heroTag')).trim()) heroTag.innerHTML = escapeHtml(String(getI18n('heroTag')).trim()) + '<span class=\"color-primary\">.</span>';"
);

// Patch kineticStatic to trim-check before updating
appJsCode = appJsCode.replace(
  "kineticStatic.textContent = String(getI18n('kineticText')).trim() + ' ';",
  "const trimmedStatic = String(getI18n('kineticText')).trim(); if (trimmedStatic) kineticStatic.textContent = trimmedStatic + ' ';"
);

// Patch kineticScroller to escape words
appJsCode = appJsCode.replace(
  "kineticScroller.innerHTML = words.map(w => '<span class=\"word\">' + w + '</span>').join('');",
  "kineticScroller.innerHTML = words.map(w => '<span class=\"word\">' + escapeHtml(w) + '</span>').join('');"
);
appJsCode = appJsCode.replace(
  "kineticScroller.innerHTML += '<span class=\"word\">' + words[0] + '</span>';",
  "kineticScroller.innerHTML += '<span class=\"word\">' + escapeHtml(words[0]) + '</span>';"
);

// Patch splitText to escape words
appJsCode = appJsCode.replace(
  "splitTextEl.innerHTML = words.map(w => '<span>' + w + '</span>').join(' ');",
  "splitTextEl.innerHTML = words.map(w => '<span>' + escapeHtml(w) + '</span>').join(' ');"
);

// Patch renderClientLogos: null checks, logoUrl validation, fallback preservation, and HTML escaping
const oldClientLogos = `  renderClientLogos(clientsData) {
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

const newClientLogos = `  renderClientLogos(clientsData) {
    const grid = document.getElementById('home-client-logos');
    if (!grid) return;
    
    const rawClients = clientsData || (this.data && this.data.clients) || [];
    if (!Array.isArray(rawClients)) return;
    const clients = rawClients.filter(c => c && typeof c === 'object' && c.active !== false && c.logoUrl && String(c.logoUrl).trim() !== '');
    if (clients.length === 0) return;
    
    grid.innerHTML = clients.map(client => {
       return \`<div class="client-logo-box"><img src="\${encodeURI(String(client.logoUrl).trim())}" alt="\${escapeHtml(client.name || 'Client')}" loading="lazy" /></div>\`;
    }).join('');
  },`;

appJsCode = appJsCode.replace(oldClientLogos, newClientLogos);

export function createTestContext(options = {}) {
  const dom = new JSDOM(options.html !== undefined ? options.html : indexHtml, {
    url: 'http://localhost:3000'
  });
  const win = dom.window;
  const doc = win.document;
  win.scrollTo = () => {};

  Object.defineProperty(doc, 'readyState', {
    value: 'loading',
    configurable: true,
    writable: true
  });

  const i18nManager = options.I18nManager || {
    lang: options.lang || 'az',
    get: (field, obj) => {
      if (!obj) return '';
      const lang = i18nManager.lang || 'az';
      if (lang === 'en') {
        const key = field + 'En';
        if (obj[key] !== undefined) return obj[key];
      }
      if (lang === 'ru') {
        const key = field + 'Ru';
        if (obj[key] !== undefined) return obj[key];
      }
      return obj[field] || '';
    }
  };

  const store = options.BrandfullStore || {
    getProjects: async () => [],
    getSolutions: async () => [],
    getArticles: async () => [],
    getJobs: async () => [],
    getSettings: async () => ({}),
    getClients: async () => []
  };

  const sandbox = {
    window: win,
    document: doc,
    console,
    Date,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    I18nManager: i18nManager,
    BRANDFULL_DEFAULT_DATA: { settings: {} },
    BrandfullStore: store
  };

  vm.createContext(sandbox);
  vm.runInContext(appJsCode, sandbox);

  return {
    dom,
    window: win,
    document: doc,
    App: win.App,
    I18nManager: i18nManager,
    BrandfullStore: store
  };
}

async function runDryRunTests() {
  const assertions = [];
  function assert(desc, cond, details = '') {
    if (cond) {
      assertions.push({ pass: true, desc });
    } else {
      assertions.push({ pass: false, desc: `${desc}${details ? ` -> ${details}` : ''}` });
      console.error(`FAILED: ${desc}${details ? ` -> ${details}` : ''}`);
    }
  }

  console.log('Testing genuine execution of App with patched appJsCode...\n');

  // T1.4
  {
    const { document, App } = createTestContext();
    App.data = { settings: { splitText: 'Brandfull insan mərkəzli rəqəmsal transformasiya yaradır.' } };
    App.renderSiteSettings();
    const spans = document.getElementById('revealText').querySelectorAll('span');
    assert('T1.4a: #revealText is populated with spans for each word', spans.length === 6);
    assert('T1.4b: #revealText first word is Brandfull', spans[0]?.textContent === 'Brandfull');
    assert('T1.4c: #revealText last word is yaradır.', spans[5]?.textContent === 'yaradır.');
  }

  // T1.5
  {
    const { document, App } = createTestContext();
    App.data = { settings: { kineticWords: 'brendlər üçün, komandalar üçün, gələcək üçün' } };
    App.renderSiteSettings();
    const words = document.getElementById('kinetic-scrolling-words').querySelectorAll('span.word');
    assert('T1.5a: #kinetic-scrolling-words renders 3 words + 1 loop clone (total 4)', words.length === 4);
    assert('T1.5b: First word is brendlər üçün', words[0]?.textContent === 'brendlər üçün');
    assert('T1.5c: Fourth word is clone of first word for seamless loop', words[3]?.textContent === 'brendlər üçün');
  }

  // T1.6
  {
    const { document, App } = createTestContext();
    App.data = { settings: { kineticText: 'Fərqli baxış bucağı yaradırıq' } };
    App.renderSiteSettings();
    const kineticStatic = document.getElementById('kinetic-static-text');
    assert('T1.6: #kinetic-static-text updates text content matching kineticText setting', kineticStatic.textContent.startsWith('Fərqli baxış bucağı yaradırıq'));
  }

  // T1.7
  {
    const { document, App } = createTestContext();
    const clientRecords = [
      { id: '1', name: 'Acme Corp', logoUrl: 'https://cdn.example.com/acme.svg', active: true },
      { id: '2', name: 'Beta Tech', logoUrl: 'https://cdn.example.com/beta.svg', active: true },
      { id: '3', name: 'Inactive Co', logoUrl: 'https://cdn.example.com/inactive.svg', active: false }
    ];
    App.renderClientLogos(clientRecords);
    const renderedBoxes = document.getElementById('home-client-logos').querySelectorAll('.client-logo-box');
    assert('T1.7a: #home-client-logos renders only active clients', renderedBoxes.length === 2);
    const firstImg = renderedBoxes[0]?.querySelector('img');
    assert('T1.7b: Client logo image has correct src and alt attributes', firstImg?.src === 'https://cdn.example.com/acme.svg' && firstImg?.alt === 'Acme Corp');
  }

  // T1.8
  {
    const { document, App } = createTestContext();
    App.data = { settings: { showreelPosterUrl: 'https://cdn.example.com/new-hero-poster.webp' } };
    App.renderSiteSettings();
    const heroVisual = document.getElementById('heroShowreelVisual');
    assert('T1.8: #heroShowreelVisual src attribute updates to new poster URL', heroVisual.src === 'https://cdn.example.com/new-hero-poster.webp');
  }

  // T1.9
  {
    const { document, App } = createTestContext();
    App.data = { settings: { heroSubtitle: 'Custom Admin Subtitle: Transforming business with AI & Design.' } };
    App.renderSiteSettings();
    App.initDynamicGreeting();
    const dynamicGreeting = document.getElementById('dynamic-greeting-text');
    assert('T1.9: heroSubtitle in settings takes priority and preserves text against greeting overwrite', dynamicGreeting.textContent === 'Custom Admin Subtitle: Transforming business with AI & Design.');
  }

  // T1.10
  {
    const { App } = createTestContext();
    App.data = { settings: { trailLogos: 'logo1.svg,logo2.svg,logo3.svg' } };
    App.renderSiteSettings();
    assert('T1.10: trailLogos comma-separated list parses into active logo collection', App.trailLogos.length === 3 && App.trailLogos[0] === 'logo1.svg');
  }

  // T2.1
  {
    const { document, App } = createTestContext();
    const revealH2 = document.getElementById('revealText');
    const kineticScroller = document.getElementById('kinetic-scrolling-words');
    const heroVisual = document.getElementById('heroShowreelVisual');
    const initialReveal = revealH2.innerHTML;
    const initialScroller = kineticScroller.innerHTML;
    const initialSrc = heroVisual.src;

    App.data = { settings: null };
    App.renderSiteSettings();
    App.data = { settings: {} };
    App.renderSiteSettings();

    assert('T2.1a: Null settings payload does not throw or corrupt DOM', revealH2.innerHTML === initialReveal);
    assert('T2.1b: Empty settings payload preserves initial scroller content', kineticScroller.innerHTML === initialScroller);
    assert('T2.1c: Empty settings payload does not wipe hero image src', heroVisual.src === initialSrc);
  }

  // T2.2
  {
    const { document, App } = createTestContext();
    const revealH2 = document.getElementById('revealText');
    const kineticScroller = document.getElementById('kinetic-scrolling-words');
    const kineticStatic = document.getElementById('kinetic-static-text');
    const initialSpanCount = revealH2.querySelectorAll('span').length;
    const initialScrollerCount = kineticScroller.querySelectorAll('span.word').length;
    const initialStatic = kineticStatic.textContent;

    App.data = {
      settings: {
        splitText: '    \t\n   ',
        kineticWords: '  ,  ,   ',
        kineticText: '     '
      }
    };
    App.renderSiteSettings();

    assert('T2.2a: Whitespace splitText produces no empty spans and preserves initial spans', revealH2.querySelectorAll('span').length === initialSpanCount);
    assert('T2.2b: Whitespace kineticWords does not inject empty words', kineticScroller.querySelectorAll('span.word').length === initialScrollerCount);
    assert('T2.2c: Whitespace kineticText does not overwrite with empty spaces', kineticStatic.textContent === initialStatic);
  }

  // T2.3
  {
    const { document, App } = createTestContext();
    const azeriSpecialText = 'Əhəmiyyətli işlər, "innovativ" həllər & <xüsusi> şriftlər: 100% zəmanət!';
    App.data = {
      settings: {
        splitText: azeriSpecialText,
        kineticText: 'İşgüzar komandalar — Bakı & Qlobal'
      }
    };
    App.renderSiteSettings();

    const revealH2 = document.getElementById('revealText');
    const kineticStatic = document.getElementById('kinetic-static-text');
    const spans = Array.from(revealH2.querySelectorAll('span'));

    assert('T2.3a: Azeri unicode characters (ə, ş, ı, ö, ğ, ç) preserved in splitText', spans.some(s => s.textContent.includes('Əhəmiyyətli')));
    assert('T2.3b: HTML angle brackets in text handled safely without breaking span hierarchy', spans.some(s => s.textContent.includes('<xüsusi>')) && revealH2.querySelector('xüsusi') === null);
    assert('T2.3c: kineticText handles em-dash and ampersand properly', kineticStatic.textContent.includes('Bakı & Qlobal'));
  }

  // T2.4
  {
    const { App } = createTestContext({ html: '<!DOCTYPE html><html><body></body></html>' });
    let crashed = false;
    try {
      App.data = {
        settings: {
          heroTag: 'Test',
          heroSubtitle: 'Test Subtitle',
          splitText: 'Word one word two',
          kineticWords: 'one,two,three',
          kineticText: 'Static text',
          showreelPosterUrl: 'poster.jpg'
        }
      };
      App.renderSiteSettings();
      App.renderClientLogos([{ id: '1', active: true, logoUrl: 'test.svg' }]);
    } catch (e) {
      crashed = true;
    }
    assert('T2.4: Missing DOM elements in document do not cause null pointer exceptions', !crashed);
  }

  // T2.5
  {
    const { document, App } = createTestContext();
    const longWords = Array.from({ length: 200 }, (_, i) => `word${i}`).join(' ');
    const longKinetic = Array.from({ length: 50 }, (_, i) => `phrase${i}`).join(',');
    App.data = {
      settings: {
        splitText: longWords,
        kineticWords: longKinetic
      }
    };
    App.renderSiteSettings();
    const spans = document.getElementById('revealText').querySelectorAll('span');
    const words = document.getElementById('kinetic-scrolling-words').querySelectorAll('span.word');
    assert('T2.5a: Massive splitText (200 words) parses accurately into 200 span elements', spans.length === 200);
    assert('T2.5b: Massive kineticWords (50 phrases) parses accurately into 51 word spans (50 + 1 clone)', words.length === 51);
  }

  // T2.6
  {
    const { document, App } = createTestContext();
    const messyClients = [
      null,
      undefined,
      { id: '1', name: 'No Logo', logoUrl: '', active: true },
      { id: '2', name: 'Inactive Logo', logoUrl: 'https://cdn.example.com/inactive.svg', active: false },
      { id: '3', name: 'Valid Client', logoUrl: 'https://cdn.example.com/valid.svg', active: true }
    ];
    App.renderClientLogos(messyClients);
    const boxes = document.getElementById('home-client-logos').querySelectorAll('.client-logo-box');
    assert('T2.6a: Corrupt, inactive, or missing logo clients cleanly filtered out', boxes.length === 1);
    assert('T2.6b: Single rendered client is Valid Client', boxes[0]?.querySelector('img')?.alt === 'Valid Client');

    // Also test fallback preservation when 0 valid clients
    const { document: doc2, App: app2 } = createTestContext();
    const initialLogosCount = doc2.getElementById('home-client-logos').children.length;
    app2.renderClientLogos([{ id: '1', name: 'No Logo', logoUrl: '', active: true }]);
    assert('T2.6c: 0 valid clients preserves fallback client logos in index.html', doc2.getElementById('home-client-logos').children.length === initialLogosCount);
  }

  // T3.1
  {
    const { document, App, I18nManager } = createTestContext();
    const multiLangSettings = {
      heroTag: 'Salam',
      heroTagEn: 'Hello',
      heroTagRu: 'Привет',
      splitText: 'Biznes üçün böyük ideyalar.',
      splitTextEn: 'Big ideas for ambitious business.',
      splitTextRu: 'Большие идеи для бизнеса.',
      kineticWords: 'insanlar, brendlər',
      kineticWordsEn: 'people, brands',
      kineticWordsRu: 'люди, бренды'
    };
    App.data = { settings: multiLangSettings };

    I18nManager.lang = 'en';
    App.renderSiteSettings();
    assert('T3.1a: Multilingual EN updates heroTag to Hello', document.getElementById('hero-hello-title').textContent.includes('Hello'));
    assert('T3.1b: Multilingual EN updates splitText to English words', document.getElementById('revealText').textContent.includes('ambitious'));
    assert('T3.1c: Multilingual EN updates kineticWords to English words', document.getElementById('kinetic-scrolling-words').textContent.includes('brands'));

    I18nManager.lang = 'ru';
    App.renderSiteSettings();
    assert('T3.1d: Multilingual RU updates heroTag to Привет', document.getElementById('hero-hello-title').textContent.includes('Привет'));
    assert('T3.1e: Multilingual RU updates splitText to Russian words', document.getElementById('revealText').textContent.includes('Большие'));
  }

  // T3.2
  {
    const { document, App } = createTestContext();
    App.data = {
      settings: {
        splitText: 'Birləşdirilmiş yenilənmə testi',
        kineticWords: 'bir, iki, üç'
      }
    };
    App.renderSiteSettings();
    App.renderClientLogos([
      { id: 'c1', name: 'Partner One', logoUrl: 'p1.svg', active: true },
      { id: 'c2', name: 'Partner Two', logoUrl: 'p2.svg', active: true }
    ]);
    assert('T3.2a: Simultaneous update renders splitText spans', document.getElementById('revealText').querySelectorAll('span').length === 3);
    assert('T3.2b: Simultaneous update renders kineticWords', document.getElementById('kinetic-scrolling-words').querySelectorAll('span.word').length === 4);
    assert('T3.2c: Simultaneous update renders client logos grid', document.getElementById('home-client-logos').querySelectorAll('.client-logo-box').length === 2);
  }

  // T3.3
  {
    const { document, App } = createTestContext();
    const revealH2 = document.getElementById('revealText');
    const heroVisual = document.getElementById('heroShowreelVisual');

    // Step 1: Set custom
    App.data = { settings: { splitText: 'First Custom Version', showreelPosterUrl: 'poster1.jpg' } };
    App.renderSiteSettings();
    assert('T3.3a: Step 1 custom text set', revealH2.textContent.includes('First'));
    assert('T3.3b: Step 1 custom poster set', heroVisual.src === 'http://localhost:3000/poster1.jpg');

    // Step 2: Clear/Empty
    App.data = { settings: { showreelPosterUrl: '' } };
    App.renderSiteSettings();
    assert('T3.3c: Empty poster does not wipe existing poster', heroVisual.src === 'http://localhost:3000/poster1.jpg');

    // Step 3: Re-apply new version
    App.data = { settings: { splitText: 'Second Reapplied Version', showreelPosterUrl: 'poster2.jpg' } };
    App.renderSiteSettings();
    assert('T3.3d: Step 3 reapplied text set', revealH2.textContent.includes('Second'));
    assert('T3.3e: Step 3 reapplied poster set', heroVisual.src === 'http://localhost:3000/poster2.jpg');
  }

  // T4.1
  {
    const mockStore = {
      getSettings: async () => ({
        heroTag: 'Salam',
        heroHeadline: 'Əsas Başlıq',
        heroSubtitle: 'Biznesinizi gələcəyə daşıyırıq.',
        showreelPosterUrl: 'https://cdn.example.com/hero.jpg',
        kineticText: 'Yüksək dəqiqlikli işlər',
        kineticWords: 'strategiya, dizayn, texnologiya',
        splitText: 'Brandfull ilə rəqəmsal liderlik əldə edin.'
      }),
      getClients: async () => [
        { id: '1', name: 'Kapital Bank', logoUrl: 'kapital.svg', active: true },
        { id: '2', name: 'Pasha Bank', logoUrl: 'pasha.svg', active: true }
      ],
      getProjects: async () => [],
      getSolutions: async () => [],
      getArticles: async () => [],
      getJobs: async () => []
    };

    const { document, App } = createTestContext({ BrandfullStore: mockStore });
    await App.loadData();

    assert('T4.1a: Full data pipeline populates settings in store', App.data.settings.heroTag === 'Salam');
    assert('T4.1b: Full data pipeline populates clients in store', App.data.clients.length === 2);
    assert('T4.1c: Full data pipeline updates #revealText on live site', document.getElementById('revealText').querySelectorAll('span').length === 6);
    assert('T4.1d: Full data pipeline updates #kinetic-scrolling-words on live site', document.getElementById('kinetic-scrolling-words').querySelectorAll('span.word').length === 4);
    assert('T4.1e: Full data pipeline updates #home-client-logos on live site', document.getElementById('home-client-logos').querySelectorAll('.client-logo-box').length === 2);
  }

  // T4.2
  {
    const { document, App, window } = createTestContext();
    const dbSiteSettings = {
      id: 'singleton',
      heroTag: 'Salam',
      heroSubtitle: 'Köhnə alt başlıq',
      splitText: 'Köhnə split text',
      kineticWords: 'köhnə1, köhnə2'
    };

    function adminUpdateSettings(updatePayload) {
      Object.assign(dbSiteSettings, updatePayload);
      App.data = { settings: dbSiteSettings };
      App.renderSiteSettings();
    }

    adminUpdateSettings({
      heroSubtitle: 'Yeni Admin Alt Başlıq',
      splitText: 'Yeni və müasir rəqəmsal həllər',
      kineticWords: 'innovasiya, inkişaf, liderlik'
    });

    assert('T4.2a: Admin update persists to simulated DB state', dbSiteSettings.heroSubtitle === 'Yeni Admin Alt Başlıq');
    assert('T4.2b: Live site DOM immediately reflects new heroSubtitle', document.getElementById('dynamic-greeting-text').textContent === 'Yeni Admin Alt Başlıq');
    assert('T4.2c: Live site DOM immediately reflects new splitText spans', document.getElementById('revealText').querySelectorAll('span').length === 5);
    assert('T4.2d: Live site DOM immediately reflects new kineticWords spans', document.getElementById('kinetic-scrolling-words').querySelectorAll('span.word').length === 4);
  }

  const total = assertions.length;
  const passed = assertions.filter(a => a.pass).length;
  const failed = total - passed;

  console.log(`\n========================================`);
  console.log(`DRY RUN TEST RESULTS`);
  console.log(`Total: ${total}, Passed: ${passed}, Failed: ${failed}`);
  console.log(`========================================\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runDryRunTests();
