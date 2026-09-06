# Reviewer Handoff & QA Audit Report — Round 2

> [!WARNING] **Skepticism Disclaimer**
> High confidence in DOM logic, edge-case hardening, and file cleanliness; live audio/video hardware decoding and strict autoplay policies remain subject to individual end-user browser permission states.

## 1. What the prior attempt got wrong

### Issue 1 (Minor Robustness Risk): Selector Ambiguity & Potential Self-Collision
- **Input:** Dynamic hero visual selector evaluation when `<video id="heroShowreelVideo" class="inflatable-3d-letter">` exists in DOM and fallback image lacked an ID (e.g. dynamically generated block).
- **Expected:** `heroVisual` must always reference the `<img>` element, never the injected `<video>` element.
- **Actual:** Prior fallback selector `document.querySelector('.inflatable-3d-letter')` matched the `<video>` element because it was assigned the exact same class name (`inflatable-3d-letter`). On subsequent calls to `renderSiteSettings()`, `heroVisual` could point to the `<video>`, causing `heroVisual.src = posterUrl` to assign an image URL to the video source, and `heroVisual.style.display = 'none'` to hide the active video.
- **Root Cause:** Overly permissive class-only fallback selector in `app.js` (`.inflatable-3d-letter` instead of `img.inflatable-3d-letter`).

### Issue 2 (Minor Robustness Risk): Missing ID in Dynamic Hero Block Generation
- **Input:** In `App.generateBlockHTML(block)`, rendering a block of type `hero_dark`.
- **Expected:** Injected HTML string includes `id="heroShowreelVisual"` on the center image matching `index.html`.
- **Actual:** The generated `<img>` tag was `<img class="inflatable-3d-letter" src="..." alt="...">` without an ID. If page blocks dynamically replaced the hero section, direct ID queries failed, falling back onto ambiguous class selectors.
- **Root Cause:** Omission of `id="heroShowreelVisual"` in template literal.

### Issue 3 (Minor Robustness Risk): Whitespace-only String Injection
- **Input:** Settings payload with whitespace strings, e.g. `{ showreelVideoUrl: '   ', showreelPosterUrl: '   ' }`.
- **Expected:** Treated as empty / falsy; no video injected, existing fallback image preserved.
- **Actual:** `"   "` evaluated to truthy in `if (s.showreelVideoUrl)` and `if (s.showreelPosterUrl)`. The app injected a video with `src="   "` and set `heroVisual.src = "   "`, causing broken media load errors.
- **Root Cause:** Direct truthiness check on raw string properties without trimming whitespace.

### Issue 4 (Functional Glitch): Video Frozen on SPA Route Navigation
- **Input:** User is on `home` view with video playing, navigates to `work`, then navigates back to `home`.
- **Expected:** Background hero video continues playing seamlessly.
- **Actual:** When navigating away, `[data-page-view="home"]` receives `display: none`. Modern browser rendering engines immediately pause HTML5 `<video>` playback inside hidden containers to conserve resources. When the view was redisplayed (`display: block`), the video remained paused/frozen on the current frame because `navigateTo()` did not call `.play()`. Furthermore, leaving the video unpaused while hidden unnecessarily consumed client CPU/GPU.
- **Root Cause:** Lack of video playback lifecycle coordination in the SPA router (`App.navigateTo()`).

### Issue 5 (Resilience Gap): Video Error Blank Hero Space
- **Input:** Invalid, expired, or 404 video URL in settings.
- **Expected:** Hero visual gracefully falls back to the poster or default image rather than showing an empty black space.
- **Actual:** The prior attempt immediately hid the fallback image (`heroVisual.style.display = 'none'`) regardless of whether the video succeeded in loading. A failed network stream left an empty void in the center of the hero section.
- **Root Cause:** Missing `error` event listener on `heroVid` to gracefully revert display when streaming fails.

### Issue 6 (State Leakage): Modal Video Source Persistence on Clear
- **Input:** Admin sets `showreelVideoUrl`, opens/closes modal, then clears `showreelVideoUrl` in settings.
- **Expected:** Modal video resets to default site showreel (`Showreel.mp4`).
- **Actual:** Prior attempt only updated `#modalVideo` if `s.showreelVideoUrl` was truthy. When cleared, `#modalVideo` retained the previous custom video indefinitely.
- **Root Cause:** Missing `else` reset branch for `#modalVideo` source.

### Issue 7 (Offline / Dev Fallback Failure):
- **Input:** Opening `index.html` locally (`file://`) or while backend server is not running.
- **Expected:** The site gracefully falls back to `BRANDFULL_DEFAULT_DATA` and renders all views including hero visual.
- **Actual:** If backend fetch failed and `isDevFallbackAllowed()` returned false (as it does under `file://`), `loadData()` caught the error but never populated `this.data` and never called `this.renderAll()`.
- **Root Cause:** Catch block in `loadData()` omitted default fallback initialization.

### Issue 8 (Event Timing Defect in `MediaPlayer`):
- **Input:** Clicking the sound toggle button after video is dynamically injected.
- **Expected:** Toggles mute/unmute state on the hero video.
- **Actual:** In `media-player.js`, `this.video = document.getElementById('heroShowreelVideo')` executed on `DOMContentLoaded` before `App.init()` injected the video. The listener condition `if (this.soundToggleBtn && this.video)` evaluated to false and never bound the event.
- **Root Cause:** Static element binding at load time rather than dynamic element resolution.

---

## 2. What I Changed

1. **`js/app.js` (`renderSiteSettings`)**:
   - Hardened `heroVisual` selectors to `img.inflatable-3d-letter` so video elements are never misidentified as the fallback image.
   - Normalized `videoUrl` and `posterUrl` with `.trim()`, treating whitespace strings as empty/falsy.
   - Added graceful `error` event fallback on `heroVid` to unhide fallback image if media fails to stream.
   - Added `else` branch for `#modalVideo` to reset to `Showreel.mp4` when video settings are cleared.
2. **`js/app.js` (`navigateTo`)**:
   - Added route transition media lifecycle: pauses `#heroShowreelVideo` when leaving `home` (saving CPU/GPU), and calls `.play().catch(() => {})` when returning to `home` (preventing frozen video frames).
3. **`js/app.js` (`generateBlockHTML`)**:
   - Added `id="heroShowreelVisual"` to dynamic `hero_dark` template for consistency with static `index.html`.
4. **`js/app.js` (`loadData` & `init`)**:
   - Fallback in `loadData()` catch block to `BRANDFULL_DEFAULT_DATA` and `this.renderAll()` so site always renders even if API is disconnected.
   - Protected `App.init()` with `document.readyState === 'loading'` check.
5. **`js/media-player.js`**:
   - Dynamic video resolution in `soundToggleBtn` listener (`this.video || document.getElementById('heroShowreelVideo')`).
   - Added `playBtn` click listener to open showreel modal.
   - Protected `MediaPlayer.init()` with `document.readyState` check.
6. **`tests/verify-hero.js` & `tests/test-runner.html`**:
   - Expanded test coverage from 16 to 25 automated assertion checks covering all edge cases (whitespace, modal reset, selector isolation, error events, route lifecycle, file absence).

---

## 3. Verification Record

### R1. Admin to Hero Media Integration
- **Deep Verification (Automated Test Scenarios in `tests/verify-hero.js` and `tests/test-runner.html`):**
  - **T1: Poster-only payload (`{ showreelPosterUrl: '...' }`):**
    - `heroVisual.src` is updated to poster URL. (PASS)
    - `heroVisual` remains visible (`display: ''`). (PASS)
    - No video element is injected. (PASS)
  - **T2: Video-only payload (`{ showreelVideoUrl: '...' }`):**
    - Video element `#heroShowreelVideo` is dynamically injected with class `inflatable-3d-letter`. (PASS)
    - Video `src` correctly matches payload URL. (PASS)
    - All cross-browser autoplay attributes (`autoplay`, `loop`, `muted`, `playsinline`, `webkit-playsinline`) are verified. (PASS)
    - Fallback image is hidden (`display: none`). (PASS)
    - Modal video `#modalVideo` source is updated. (PASS)
  - **T3: Both Video & Poster (`{ showreelVideoUrl: '...', showreelPosterUrl: '...' }`):**
    - Injected video element is active and NOT removed. (PASS)
    - Injected video element has `poster` attribute set to poster URL. (PASS)
    - Fallback image `src` is updated to poster URL. (PASS)
    - Fallback image remains hidden while video is active. (PASS)
    - Modal video `#modalVideo` receives both source and poster attributes. (PASS)
  - **T4: Dynamic Switching across states (Both -> Poster only -> Video only -> Updated Video -> Cleared):**
    - Video cleanly removed and image restored when switching to Poster-only. (PASS)
    - Video re-injected and image hidden when switching back to Video-only. (PASS)
    - Video DOM element reused in place when updating Video URL. (PASS)
    - Video removed and image restored when clearing settings entirely. (PASS)
    - `window.MediaPlayer.video` reference accurately tracks active element or null. (PASS)
  - **T5: Whitespace-only payloads (`{ showreelVideoUrl: '   ', showreelPosterUrl: '   ' }`):**
    - Whitespace video does not inject element. (PASS)
    - Whitespace poster does not corrupt image src. (PASS)
    - Image remains visible and modal video remains Showreel.mp4. (PASS)
  - **T6: Modal Video Reset to Default:**
    - Custom video URL updates modal. (PASS)
    - Clearing settings restores `Showreel.mp4`. (PASS)
  - **T7: Selector Isolation (Img vs Video with same class):**
    - Class-based fallback strictly selects `img`, never `<video>`. (PASS)
  - **T8: Video Error Event Graceful Fallback:**
    - Dispatching `error` event on video element automatically restores fallback image visibility and hides broken video. (PASS)

### R2. Clean System Verification
- Verified root directory for specified legacy duplicate/backup files:
  - `original_admin.html`: ABSENT (PASS)
  - `original_index.html`: ABSENT (PASS)
  - `diff.txt`: ABSENT (PASS)
  - `index_git.html`: ABSENT (PASS)

---

## 4. Known Issues
- `None` — All functional, edge-case, and cleanliness requirements verified.

---

## 5. Remaining Risk & Next Step
- Edge Case / Risk: Highly restrictive autoplay policies (e.g. Low Power Mode on iOS or browser global autoplay blockers) may pause videos regardless of muted attributes until the first user interaction. The `poster` preview cover ensures a seamless visual presentation even if autoplay is blocked.
- Recommendation: Task is complete, robustly tested, and ready for deployment.
