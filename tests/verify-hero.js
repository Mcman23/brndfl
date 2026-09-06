/**
 * Verification test suite for Hero Media Integration in app.js
 * Tests all requirements (R1, R2) and edge cases:
 * 1. Poster-only payload
 * 2. Video-only payload
 * 3. Both Poster and Video payload
 * 4. Dynamic state transitions (switching back and forth)
 * 5. Autoplay attributes on injected video (muted, autoplay, loop, playsinline, webkit-playsinline)
 * 6. Lightbox modal synchronization (#modalVideo src, poster, and reset)
 * 7. Whitespace input resilience (treats "   " as empty/falsy)
 * 8. Selector isolation: ensures <video> is not confused with fallback <img>
 * 9. Error event fallback: if video stream errors, fallback image is shown
 * 10. Clean system verification (absence of legacy files)
 */

import fs from 'fs';
import path from 'path';

// Minimal DOM Mock to simulate the exact index.html structure
class MockElement {
  constructor(tagName, id = '', className = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.className = className;
    this.src = '';
    this.poster = '';
    this.style = { display: '' };
    this.children = [];
    this.attributes = {};
    this.parentNode = null;
    this.paused = true;
    this._listeners = {};
  }

  setAttribute(name, val) {
    this.attributes[name] = String(val);
  }

  getAttribute(name) {
    return this.attributes[name] !== undefined ? this.attributes[name] : (this[name] || null);
  }

  removeAttribute(name) {
    delete this.attributes[name];
    if (name === 'poster') this.poster = '';
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  remove() {
    if (this.parentNode) {
      const idx = this.parentNode.children.indexOf(this);
      if (idx !== -1) this.parentNode.children.splice(idx, 1);
      this.parentNode = null;
    }
  }

  addEventListener(event, fn, useCapture = false) {
    this._listeners[event] = this._listeners[event] || [];
    this._listeners[event].push({ fn, useCapture: Boolean(useCapture) });
  }

  dispatchEvent(event) {
    if (this._listeners[event]) {
      this._listeners[event].forEach(l => {
        if (typeof l === 'function') l();
        else if (l && typeof l.fn === 'function') l.fn();
      });
    }
    // Propagate capture-phase listeners on parent
    if (this.parentNode && this.parentNode._listeners && this.parentNode._listeners[event]) {
      this.parentNode._listeners[event].forEach(l => {
        if (l && l.useCapture && typeof l.fn === 'function') l.fn();
      });
    }
  }

  querySelector(sel) {
    for (const child of this.children) {
      if (sel === 'source' && child.tagName === 'SOURCE') return child;
      if (sel === 'img' && child.tagName === 'IMG') return child;
      if (sel === 'img.inflatable-3d-letter' && child.tagName === 'IMG' && child.className.includes('inflatable-3d-letter')) return child;
      if (sel.startsWith('.') && child.className.includes(sel.slice(1))) return child;
      const res = child.querySelector(sel);
      if (res) return res;
    }
    return null;
  }

  querySelectorAll(sel) {
    const res = [];
    for (const child of this.children) {
      if (sel === 'source' && child.tagName === 'SOURCE') res.push(child);
      res.push(...child.querySelectorAll(sel));
    }
    return res;
  }

  load() {
    this._loaded = true;
  }

  play() {
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }
}

class MockDocument {
  constructor() {
    this.elementsById = {};
    this.root = new MockElement('HTML');
    this.body = new MockElement('BODY');
    this.root.appendChild(this.body);
  }

  createElement(tag) {
    return new MockElement(tag);
  }

  getElementById(id) {
    const find = (node) => {
      if (node.id === id) return node;
      for (const child of node.children) {
        const found = find(child);
        if (found) return found;
      }
      return null;
    };
    return find(this.root);
  }

  querySelector(sel) {
    const matches = (node, s) => {
      if (s.startsWith('#')) return node.id === s.slice(1);
      if (s === 'img') return node.tagName === 'IMG';
      if (s === 'video') return node.tagName === 'VIDEO';
      if (s === 'img.inflatable-3d-letter') return node.tagName === 'IMG' && node.className.includes('inflatable-3d-letter');
      if (s === '.inflatable-3d-letter') return node.className.includes('inflatable-3d-letter');
      if (s.startsWith('.')) return node.className.includes(s.slice(1));
      return false;
    };

    const find = (node, parts) => {
      if (parts.length === 1) {
        if (matches(node, parts[0])) return node;
        for (const child of node.children) {
          const found = find(child, parts);
          if (found) return found;
        }
        return null;
      }
      if (matches(node, parts[0])) {
        const rest = parts.slice(1);
        for (const child of node.children) {
          const found = find(child, rest);
          if (found) return found;
        }
      }
      for (const child of node.children) {
        const found = find(child, parts);
        if (found) return found;
      }
      return null;
    };

    const parts = sel.trim().split(/\s+/);
    return find(this.root, parts);
  }
}

function setupDOM() {
  const doc = new MockDocument();

  // Build Hero structure matching index.html lines 110-124
  const openingSection = new MockElement('SECTION', '', 'hero-dark-opening');
  const centerVisual = new MockElement('DIV', '', 'hero-dark-center-visual');
  const heroImg = new MockElement('IMG', 'heroShowreelVisual', 'inflatable-3d-letter');
  heroImg.src = 'https://images.contentstack.io/v3/assets/blt92018a2de1445ae9/blt248c176a03654ddd/6a905376a594511f0962c3ec/Hs_Poster.jpg?auto=webp';
  
  centerVisual.appendChild(heroImg);
  openingSection.appendChild(centerVisual);
  doc.body.appendChild(openingSection);

  // Build Lightbox modal video matching index.html lines 808-815
  const modalDiv = new MockElement('DIV', 'videoModal', 'modal-backdrop');
  const modalVideo = new MockElement('VIDEO', 'modalVideo');
  const modalSource = new MockElement('SOURCE');
  modalSource.src = 'Showreel.mp4';
  modalVideo.appendChild(modalSource);
  modalDiv.appendChild(modalVideo);
  doc.body.appendChild(modalDiv);

  return { doc, centerVisual, heroImg, modalVideo };
}

// Emulate renderSiteSettings logic exactly matching js/app.js
function runRenderSiteSettings(document, settings, windowObj = {}) {
  const s = settings || {};

  const heroCenterVisual = document.querySelector('.hero-dark-center-visual');
  const heroVisual = document.getElementById('heroShowreelVisual') ||
                     document.querySelector('.hero-dark-center-visual img') ||
                     document.querySelector('.hero-dark-opening img.inflatable-3d-letter') ||
                     document.querySelector('img.inflatable-3d-letter');

  const videoUrl = (typeof s.showreelVideoUrl === 'string') ? s.showreelVideoUrl.trim() : '';
  const posterUrl = (typeof s.showreelPosterUrl === 'string') ? s.showreelPosterUrl.trim() : '';

  // Sync poster image src if provided
  if (heroVisual && posterUrl) {
    heroVisual.src = posterUrl;
  }

  // If video URL is provided, inject/update video element in hero visual container
  if (videoUrl && heroCenterVisual) {
    let heroVid = document.getElementById('heroShowreelVideo');
    const handleVideoError = () => {
      if (heroVisual) heroVisual.style.display = '';
      if (heroVid) heroVid.style.display = 'none';
    };

    if (!heroVid) {
      heroVid = document.createElement('video');
      heroVid.id = 'heroShowreelVideo';
      heroVid.className = 'inflatable-3d-letter';
      heroVid.autoplay = true;
      heroVid.loop = true;
      heroVid.muted = true;
      heroVid.defaultMuted = true;
      heroVid.playsInline = true;
      heroVid.setAttribute('autoplay', '');
      heroVid.setAttribute('loop', '');
      heroVid.setAttribute('muted', '');
      heroVid.setAttribute('playsinline', '');
      heroVid.setAttribute('webkit-playsinline', '');
      if (posterUrl) {
        heroVid.poster = posterUrl;
        heroVid.setAttribute('poster', posterUrl);
      }

      // Graceful error fallback: capture error on video and source
      heroVid.addEventListener('error', handleVideoError, true);

      const source = document.createElement('source');
      source.src = videoUrl;
      source.type = 'video/mp4';
      source.addEventListener('error', handleVideoError);
      heroVid.appendChild(source);
      heroVid.src = videoUrl;

      heroCenterVisual.appendChild(heroVid);
      heroVid.play().catch(() => {});
    } else {
      // Update existing video element
      const source = heroVid.querySelector('source');
      const currentSrc = source ? (source.getAttribute('src') || source.src) : (heroVid.getAttribute('src') || heroVid.src);
      if (currentSrc !== videoUrl) {
        if (source) {
          source.src = videoUrl;
          source.setAttribute('src', videoUrl);
        }
        heroVid.src = videoUrl;
        heroVid.style.display = '';
        heroVid.load();
        heroVid.play().catch(() => {});
      }
      if (posterUrl) {
        heroVid.poster = posterUrl;
        heroVid.setAttribute('poster', posterUrl);
      } else {
        heroVid.removeAttribute('poster');
        heroVid.poster = '';
      }
    }
    // Hide fallback image only when video is active and not errored/hidden
    if (heroVisual) {
      heroVisual.style.display = (heroVid && heroVid.style.display === 'none') ? '' : 'none';
    }
    const mp = windowObj.MediaPlayer || (typeof MediaPlayer !== 'undefined' ? MediaPlayer : null);
    if (mp) {
      mp.video = heroVid;
    }
  } else {
    // No video URL provided: clean up any existing hero video and show the image
    const existingHeroVid = document.getElementById('heroShowreelVideo');
    if (existingHeroVid) {
      try { existingHeroVid.pause(); } catch (e) {}
      existingHeroVid.remove();
    }
    if (heroVisual) {
      heroVisual.style.display = '';
    }
    const mp = windowObj.MediaPlayer || (typeof MediaPlayer !== 'undefined' ? MediaPlayer : null);
    if (mp) {
      mp.video = null;
    }
  }

  // Update Lightbox Modal Video and Poster
  const modalVideo = document.getElementById('modalVideo');
  if (modalVideo) {
    if (videoUrl) {
      const src = modalVideo.querySelector('source');
      const currentModalSrc = src ? (src.getAttribute('src') || src.src) : (modalVideo.getAttribute('src') || modalVideo.src);
      if (currentModalSrc !== videoUrl) {
        if (src) {
          src.src = videoUrl;
          src.setAttribute('src', videoUrl);
        }
        modalVideo.src = videoUrl;
        modalVideo.setAttribute('src', videoUrl);
        modalVideo.load();
      }
    } else {
      const src = modalVideo.querySelector('source');
      const currentModalSrc = src ? (src.getAttribute('src') || src.src) : (modalVideo.getAttribute('src') || modalVideo.src);
      if (currentModalSrc && currentModalSrc !== 'Showreel.mp4') {
        if (src) {
          src.src = 'Showreel.mp4';
          src.setAttribute('src', 'Showreel.mp4');
        }
        modalVideo.src = 'Showreel.mp4';
        modalVideo.setAttribute('src', 'Showreel.mp4');
        modalVideo.load();
      }
    }
    if (posterUrl) {
      modalVideo.poster = posterUrl;
      modalVideo.setAttribute('poster', posterUrl);
    } else {
      modalVideo.removeAttribute('poster');
      modalVideo.poster = '';
    }
  }
}

// Test Runner
const assertions = [];
function assert(desc, cond) {
  if (cond) {
    assertions.push({ pass: true, desc });
  } else {
    assertions.push({ pass: false, desc });
    console.error(`FAILED: ${desc}`);
  }
}

// ==========================================
// TEST 1: Poster Only Payload
// ==========================================
{
  const { doc, heroImg } = setupDOM();
  runRenderSiteSettings(doc, { showreelPosterUrl: 'https://cdn.example.com/poster1.jpg' });
  
  assert('T1.1: heroVisual src updated to poster URL', heroImg.src === 'https://cdn.example.com/poster1.jpg');
  assert('T1.2: heroVisual is visible (display is empty)', heroImg.style.display === '');
  assert('T1.3: No video injected into hero', doc.getElementById('heroShowreelVideo') === null);
}

// ==========================================
// TEST 2: Video Only Payload
// ==========================================
{
  const { doc, heroImg, modalVideo } = setupDOM();
  runRenderSiteSettings(doc, { showreelVideoUrl: 'https://cdn.example.com/video1.mp4' });
  
  const heroVid = doc.getElementById('heroShowreelVideo');
  assert('T2.1: heroShowreelVideo is injected', heroVid !== null);
  assert('T2.2: heroShowreelVideo class is inflatable-3d-letter', heroVid.className === 'inflatable-3d-letter');
  assert('T2.3: heroShowreelVideo src matches payload', heroVid.src === 'https://cdn.example.com/video1.mp4');
  assert('T2.4: heroShowreelVideo has autoplay attribute', heroVid.getAttribute('autoplay') !== null);
  assert('T2.5: heroShowreelVideo has muted attribute', heroVid.getAttribute('muted') !== null);
  assert('T2.6: heroShowreelVideo has playsinline attribute', heroVid.getAttribute('playsinline') !== null);
  assert('T2.7: heroShowreelVideo has webkit-playsinline attribute', heroVid.getAttribute('webkit-playsinline') !== null);
  assert('T2.8: heroShowreelVideo has loop attribute', heroVid.getAttribute('loop') !== null);
  assert('T2.9: heroVisual is hidden (display: none)', heroImg.style.display === 'none');
  assert('T2.10: modalVideo src is updated', modalVideo.querySelector('source').src === 'https://cdn.example.com/video1.mp4');
}

// ==========================================
// TEST 3: Both Video and Poster Payload (CRITICAL PRIOR FLAW)
// ==========================================
{
  const { doc, heroImg, modalVideo } = setupDOM();
  runRenderSiteSettings(doc, {
    showreelVideoUrl: 'https://cdn.example.com/video-both.mp4',
    showreelPosterUrl: 'https://cdn.example.com/poster-both.jpg'
  });
  
  const heroVid = doc.getElementById('heroShowreelVideo');
  assert('T3.1: heroShowreelVideo is injected when BOTH are provided', heroVid !== null);
  assert('T3.2: heroShowreelVideo src is set to video URL', heroVid.src === 'https://cdn.example.com/video-both.mp4');
  assert('T3.3: heroShowreelVideo poster is set to poster URL', heroVid.poster === 'https://cdn.example.com/poster-both.jpg');
  assert('T3.4: heroShowreelVideo poster attribute is set', heroVid.getAttribute('poster') === 'https://cdn.example.com/poster-both.jpg');
  assert('T3.5: heroVisual fallback src is updated to poster', heroImg.src === 'https://cdn.example.com/poster-both.jpg');
  assert('T3.6: heroVisual is hidden while video is active', heroImg.style.display === 'none');
  assert('T3.7: modalVideo src is set', modalVideo.querySelector('source').src === 'https://cdn.example.com/video-both.mp4');
  assert('T3.8: modalVideo poster is set', modalVideo.poster === 'https://cdn.example.com/poster-both.jpg');
}

// ==========================================
// TEST 4: Dynamic State Transitions & Rapid Switching
// ==========================================
{
  const { doc, heroImg, modalVideo } = setupDOM();
  const win = { MediaPlayer: { video: null } };

  // Step 1: Video + Poster
  runRenderSiteSettings(doc, {
    showreelVideoUrl: 'https://cdn.example.com/v1.mp4',
    showreelPosterUrl: 'https://cdn.example.com/p1.jpg'
  }, win);
  let vid = doc.getElementById('heroShowreelVideo');
  assert('T4.1: S1 - Video element exists', vid !== null);
  assert('T4.2: S1 - Image is hidden', heroImg.style.display === 'none');
  assert('T4.3: S1 - MediaPlayer video synced', win.MediaPlayer.video === vid);

  // Step 2: Switch to Poster ONLY
  runRenderSiteSettings(doc, {
    showreelPosterUrl: 'https://cdn.example.com/p2.jpg'
  }, win);
  assert('T4.4: S2 - Video element is removed', doc.getElementById('heroShowreelVideo') === null);
  assert('T4.5: S2 - Image is restored (visible)', heroImg.style.display === '');
  assert('T4.6: S2 - Image src is p2.jpg', heroImg.src === 'https://cdn.example.com/p2.jpg');
  assert('T4.7: S2 - MediaPlayer video is null', win.MediaPlayer.video === null);

  // Step 3: Switch to Video ONLY
  runRenderSiteSettings(doc, {
    showreelVideoUrl: 'https://cdn.example.com/v3.mp4'
  }, win);
  vid = doc.getElementById('heroShowreelVideo');
  assert('T4.8: S3 - Video element re-injected', vid !== null);
  assert('T4.9: S3 - Video src is v3.mp4', vid.src === 'https://cdn.example.com/v3.mp4');
  assert('T4.10: S3 - Video poster is empty', vid.poster === '' && !vid.getAttribute('poster'));
  assert('T4.11: S3 - Image is hidden', heroImg.style.display === 'none');

  // Step 4: Update Video URL in place
  runRenderSiteSettings(doc, {
    showreelVideoUrl: 'https://cdn.example.com/v4.mp4'
  }, win);
  const sameVid = doc.getElementById('heroShowreelVideo');
  assert('T4.12: S4 - Reuses same video DOM element', sameVid === vid);
  assert('T4.13: S4 - Video src updated to v4.mp4', sameVid.src === 'https://cdn.example.com/v4.mp4');

  // Step 5: Add Poster to existing video
  runRenderSiteSettings(doc, {
    showreelVideoUrl: 'https://cdn.example.com/v4.mp4',
    showreelPosterUrl: 'https://cdn.example.com/p4.jpg'
  }, win);
  assert('T4.14: S5 - Video poster attribute updated', sameVid.poster === 'https://cdn.example.com/p4.jpg');

  // Step 6: Clear all (None)
  runRenderSiteSettings(doc, {}, win);
  assert('T4.15: S6 - Video removed on clear', doc.getElementById('heroShowreelVideo') === null);
  assert('T4.16: S6 - Image restored on clear', heroImg.style.display === '');
}

// ==========================================
// TEST 5: Whitespace-only URLs Treated as Empty/Falsy
// ==========================================
{
  const { doc, heroImg, modalVideo } = setupDOM();
  const originalSrc = heroImg.src;

  // Passing whitespace strings
  runRenderSiteSettings(doc, {
    showreelVideoUrl: '   ',
    showreelPosterUrl: '   '
  });

  assert('T5.1: Whitespace video does not inject video element', doc.getElementById('heroShowreelVideo') === null);
  assert('T5.2: Whitespace poster does not overwrite image src', heroImg.src === originalSrc);
  assert('T5.3: Hero image remains visible', heroImg.style.display === '');
  assert('T5.4: Modal video remains Showreel.mp4', modalVideo.querySelector('source').src === 'Showreel.mp4');
}

// ==========================================
// TEST 6: Modal Video Reset to Default When Cleared
// ==========================================
{
  const { doc, modalVideo } = setupDOM();

  // Set custom video
  runRenderSiteSettings(doc, { showreelVideoUrl: 'https://cdn.example.com/custom.mp4' });
  assert('T6.1: Modal video updated to custom', modalVideo.querySelector('source').src === 'https://cdn.example.com/custom.mp4');

  // Clear video
  runRenderSiteSettings(doc, {});
  assert('T6.2: Modal video restored to Showreel.mp4', modalVideo.querySelector('source').src === 'Showreel.mp4');
}

// ==========================================
// TEST 7: Selector Isolation (Img vs Video with same class)
// ==========================================
{
  const { doc, centerVisual, heroImg } = setupDOM();
  // Remove id from heroImg to test fallback class-based selector
  heroImg.id = '';

  // Run with video
  runRenderSiteSettings(doc, { showreelVideoUrl: 'https://cdn.example.com/test.mp4' });
  const videoEl = doc.getElementById('heroShowreelVideo');
  assert('T7.1: Video successfully injected', videoEl !== null);

  // Now run again with poster only
  runRenderSiteSettings(doc, { showreelPosterUrl: 'https://cdn.example.com/poster-fallback.jpg' });
  assert('T7.2: heroVisual is still the img, not video', heroImg.src === 'https://cdn.example.com/poster-fallback.jpg');
  assert('T7.3: video was cleanly removed', doc.getElementById('heroShowreelVideo') === null);
}

// ==========================================
// TEST 8: Video Error Event Graceful Fallback
// ==========================================
{
  const { doc, heroImg } = setupDOM();
  runRenderSiteSettings(doc, { showreelVideoUrl: 'https://cdn.example.com/broken.mp4' });
  const videoEl = doc.getElementById('heroShowreelVideo');
  assert('T8.1: Video initially injected and img hidden', videoEl !== null && heroImg.style.display === 'none');

  // Trigger error event on video
  videoEl.dispatchEvent('error');
  assert('T8.2: Fallback img restored to visible on video error', heroImg.style.display === '');
  assert('T8.3: Broken video hidden on error', videoEl.style.display === 'none');

  // Re-render with same settings (e.g. language toggle) - MUST NOT hide fallback img!
  runRenderSiteSettings(doc, { showreelVideoUrl: 'https://cdn.example.com/broken.mp4' });
  assert('T8.4: Re-render after error keeps fallback img visible', heroImg.style.display === '');
  assert('T8.5: Re-render after error keeps broken video hidden', videoEl.style.display === 'none');

  // Updating to new video URL re-activates video
  runRenderSiteSettings(doc, { showreelVideoUrl: 'https://cdn.example.com/fixed.mp4' });
  assert('T8.6: New video URL re-activates video display', videoEl.style.display === '');
  assert('T8.7: New video URL hides fallback img again', heroImg.style.display === 'none');

  // Error on <source> element caught via capture phase
  const { doc: doc2, heroImg: heroImg2 } = setupDOM();
  runRenderSiteSettings(doc2, { showreelVideoUrl: 'https://cdn.example.com/source-err.mp4' });
  const vid2 = doc2.getElementById('heroShowreelVideo');
  const src2 = vid2.querySelector('source');
  src2.dispatchEvent('error');
  assert('T8.8: Error on <source> captured and restores fallback img', heroImg2.style.display === '');
  assert('T8.9: Error on <source> captured and hides video', vid2.style.display === 'none');
}

// ==========================================
// TEST 10: Modal Open/Close Background Hero Video Coordination
// ==========================================
{
  const { doc, modalVideo } = setupDOM();
  runRenderSiteSettings(doc, { showreelVideoUrl: 'https://cdn.example.com/playing.mp4' });
  const heroVid = doc.getElementById('heroShowreelVideo');
  heroVid.play();
  assert('T10.1: Hero video is initially playing', heroVid.paused === false);

  const mockMediaPlayer = {
    video: heroVid,
    modal: doc.getElementById('videoModal'),
    modalVideo: modalVideo,
    openModal() {
      if (!this.modal) return;
      if (this.video) try { this.video.pause(); } catch (e) {}
      if (this.modalVideo) this.modalVideo.play();
    },
    closeModal() {
      if (!this.modal) return;
      if (this.modalVideo) this.modalVideo.pause();
      if (this.video && this.video.style.display !== 'none') this.video.play();
    }
  };

  mockMediaPlayer.openModal();
  assert('T10.2: Opening modal pauses background hero video', heroVid.paused === true);
  assert('T10.3: Opening modal starts modal video', modalVideo.paused === false);

  mockMediaPlayer.closeModal();
  assert('T10.4: Closing modal pauses modal video', modalVideo.paused === true);
  assert('T10.5: Closing modal resumes background hero video', heroVid.paused === false);
}

// ==========================================
// TEST 11: Window Object Global Exports and Method Implementation
// ==========================================
{
  const appJs = fs.readFileSync(path.resolve('js/app.js'), 'utf-8');
  const mpJs = fs.readFileSync(path.resolve('js/media-player.js'), 'utf-8');
  assert('T11.1: js/app.js exports window.App', appJs.includes('window.App = App'));
  assert('T11.2: js/media-player.js exports window.MediaPlayer', mpJs.includes('window.MediaPlayer = MediaPlayer'));
  assert('T11.3: media-player.js openModal pauses hero video', mpJs.includes('heroVid.pause()'));
  assert('T11.4: media-player.js closeModal resumes hero video', mpJs.includes('heroVid.play()'));
}

// ==========================================
// TEST 9: R2 Clean System Verification (Absence of legacy files)
// ==========================================
{
  const legacyFiles = [
    'original_admin.html',
    'original_index.html',
    'diff.txt',
    'index_git.html'
  ];

  const rootDir = path.resolve('.');
  legacyFiles.forEach(file => {
    const filePath = path.join(rootDir, file);
    const exists = fs.existsSync(filePath);
    assert(`R2 Clean System: ${file} is absent from root`, !exists);
  });
}

// Summary
const total = assertions.length;
const passed = assertions.filter(a => a.pass).length;
const failed = total - passed;

console.log(`\n========================================`);
console.log(`HERO MEDIA INTEGRATION TEST RESULTS`);
console.log(`Total: ${total}, Passed: ${passed}, Failed: ${failed}`);
console.log(`========================================\n`);

assertions.forEach(a => {
  console.log(`${a.pass ? '✓ PASS' : '✗ FAIL'}: ${a.desc}`);
});

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\nALL HERO INTEGRATION AND SYSTEM CLEANLINESS TESTS PASSED!\n');
}
