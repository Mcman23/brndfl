# Reviewer Handoff & QA Audit Report — Round 1

## 1. What the Prior Attempt Got Wrong

### Issue 1 (Fatal Functional Bug): Mutually Exclusive Poster vs. Video Handling
- **Input:** Settings payload with both video and poster, e.g. `{ showreelVideoUrl: 'https://cdn.example.com/video.mp4', showreelPosterUrl: 'https://cdn.example.com/poster.jpg' }` (the standard CMS configuration).
- **Expected:** Hero visual renders an active `<video id="heroShowreelVideo">` element with `poster="https://cdn.example.com/poster.jpg"` and `src="https://cdn.example.com/video.mp4"`, while hiding the underlying static fallback image (`#heroShowreelVisual`).
- **Actual:** The prior code used `if (s.showreelPosterUrl) { ... } else if (s.showreelVideoUrl) { ... }`. Because `s.showreelPosterUrl` evaluated to truthy, it immediately ran `existingHeroVid.remove()`, showed the static image with the poster src, and skipped the `else if` video injection branch entirely. Any uploaded showreel video was completely suppressed and deleted whenever a poster was also set.
- **Root Cause:** Implementer treated poster and video as mutually exclusive instead of complementary; a video element in the Hero section should take precedence for active display while utilizing the poster as its preview/cover and fallback.

### Issue 2 (State Desync / Incomplete Cleanup on Settings Removal):
- **Input:** Admin sets `showreelVideoUrl`, video is injected, then subsequently clears `showreelVideoUrl` in settings (e.g. `s = { showreelVideoUrl: '' }`).
- **Expected:** Injected video is removed from DOM and the default/poster image visual is restored.
- **Actual:** Prior attempt only removed the video if `s.showreelPosterUrl` was truthy. If an admin cleared the video without specifying a new poster, the old injected video remained in the DOM playing indefinitely, and the image remained hidden (`display: none`).
- **Root Cause:** Incomplete conditional branching without an explicit `else` cleanup branch when `showreelVideoUrl` is falsy.

### Issue 3 (Autoplay Rejection on Mobile & Strict Browsers):
- **Input:** Injected `<video>` element into DOM.
- **Expected:** Proper HTML attributes present on the video tag (`muted=""`, `playsinline=""`, `webkit-playsinline=""`, `autoplay=""`, `loop=""`, `defaultMuted = true`), plus explicit `.play().catch(...)` invocation.
- **Actual:** The prior attempt only assigned JavaScript DOM properties (`heroVid.muted = true`, `heroVid.playsInline = true`). iOS Safari and Chromium autoplay policy engines inspect the actual HTML attribute map for `muted` and `playsinline` when parsing dynamic media elements; without them, videos are blocked from autoplaying or forced into native fullscreen modals.
- **Root Cause:** Incomplete attribute configuration on dynamically generated `<video>` DOM nodes.

### Issue 4 (Redundant Duplication & Dead Code):
- **Input:** Inspection of `renderSiteSettings()` lines 214-253.
- **Expected:** Single, coherent source of truth for video element creation and updates.
- **Actual:** Lines 242-253 duplicated the source update checks from lines 230-238, and line 252 (`if (s.showreelPosterUrl) heroVideo.poster = s.showreelPosterUrl;`) was dead code in the case where poster was provided because line 210 had already deleted `heroVideo`.
- **Root Cause:** Fragmented sequential patches by the implementer instead of unified state reconciliation.

### Issue 5 (Incomplete Modal Video Synchronization):
- **Input:** Setting `showreelPosterUrl` in admin.
- **Expected:** `#modalVideo` also receives the poster attribute so the lightbox player displays the poster cover before the user hits play.
- **Actual:** `#modalVideo` only received `src`; `poster` was never assigned.
- **Root Cause:** Omission in modal player synchronization block.

---

## 2. What I Changed

### `js/app.js` (`App.renderSiteSettings()`)
1. **Unified Media Reconciliation:**
   - Synchronizes poster URL to `#heroShowreelVisual` whenever provided.
   - If `s.showreelVideoUrl` is present:
     - Creates or updates `<video id="heroShowreelVideo" class="inflatable-3d-letter">`.
     - Injects both `<source src="...">` and direct `heroVid.src`.
     - Sets full cross-browser autoplay attributes: `autoplay`, `loop`, `muted`, `playsinline`, `webkit-playsinline`, plus `defaultMuted = true`.
     - Dynamically applies `poster` attribute to the video element if `s.showreelPosterUrl` is provided, or cleans it up if not.
     - Automatically calls `.play().catch(() => {})` for seamless autoplay.
     - Hides the fallback image (`#heroShowreelVisual.style.display = 'none'`).
     - Synchronizes `window.MediaPlayer.video = heroVid`.
   - If `s.showreelVideoUrl` is absent / falsy:
     - Pauses and removes any existing `#heroShowreelVideo` element from the DOM.
     - Restores visibility on `#heroShowreelVisual` (`style.display = ''`).
     - Resets `window.MediaPlayer.video = null`.
2. **Modal Video Synchronization:**
   - Synchronizes both `src` and `poster` attributes on `#modalVideo`.
3. **Comprehensive Test Suites Added:**
   - `tests/verify-hero.js`: Standalone test suite verifying all payloads, attribute mappings, and dynamic state switching.
   - `tests/test-runner.html`: In-browser DOM test runner verifying live `App.renderSiteSettings()` execution.

---

## 3. Verification Record

### R1. Admin to Hero Media Integration
- **Deep Verification (Automated Test Scenarios in `tests/verify-hero.js` and `tests/test-runner.html`):**
  - **T1: Poster-only payload (`{ showreelPosterUrl: '...' }`):**
    - `heroVisual.src` is updated to poster URL. (PASS)
    - `heroVisual` remains visible (`display != 'none'`). (PASS)
    - No video element is injected. (PASS)
  - **T2: Video-only payload (`{ showreelVideoUrl: '...' }`):**
    - Video element `#heroShowreelVideo` is dynamically injected with class `inflatable-3d-letter`. (PASS)
    - Video `src` correctly matches payload URL. (PASS)
    - All autoplay attributes (`autoplay`, `loop`, `muted`, `playsinline`, `webkit-playsinline`) are set. (PASS)
    - Fallback image is hidden (`display: none`). (PASS)
    - Modal video `#modalVideo` source is updated. (PASS)
  - **T3: Both Video & Poster (`{ showreelVideoUrl: '...', showreelPosterUrl: '...' }`):**
    - Injected video element is active and NOT removed. (PASS)
    - Injected video element has `poster` attribute set to poster URL. (PASS)
    - Fallback image `src` is updated to poster URL. (PASS)
    - Fallback image remains hidden while video is active. (PASS)
    - Modal video `#modalVideo` receives both source and poster attributes. (PASS)
  - **T4: Dynamic Switching across states (Video + Poster -> Poster only -> Video only -> Updated Video -> Cleared):**
    - Video cleanly removed and image restored when switching from Video to Poster-only. (PASS)
    - Video re-injected and image hidden when switching back to Video-only. (PASS)
    - Video DOM element reused in place when updating Video URL. (PASS)
    - Video removed and image restored when clearing settings entirely. (PASS)
    - `window.MediaPlayer.video` reference accurately tracks active element or null. (PASS)

### R2. Clean System Verification
- Checked root directory for legacy backup files:
  - `original_admin.html`: ABSENT (PASS)
  - `original_index.html`: ABSENT (PASS)
  - `diff.txt`: ABSENT (PASS)
  - `index_git.html`: ABSENT (PASS)

---

## 4. Known Issues
- `None` — All functional and edge cases verified.

---

## 5. Remaining Risk & Next Step
- Edge Case / Risk: Third-party CDN blocking video byte ranges (HTTP 206 Partial Content) could cause video buffering on slow connections. The fallback `poster` attribute ensures a visual is visible during loading.
- Recommendation: Task is complete and ready for final approval.
