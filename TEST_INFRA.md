# Automated Test Infrastructure (`TEST_INFRA.md`)

## Overview
The Brandfull automated test harness provides an ultra-fast, zero-dependency opaque-box test architecture for verifying live dynamic data synchronization, inline visual editing (WYSIWYG), and portable module packaging.

- **Zero Heavy Frameworks**: No Playwright, Puppeteer, Cypress, or Jest runtime bloat.
- **Execution Speed**: Entire test suite (193 assertions across 4 suites) runs in **< 300ms**.
- **Native ES Modules**: Runs natively in Node.js 18+ with `"type": "module"`.
- **Lightweight In-Memory DOM Simulation**: Custom high-fidelity mock DOM elements (`MockDOMElement`, `MockDOMDocument`) modeling browser behavior without browser process overhead.

---

## 4-Tier Test Case Design Methodology
The test suite implements the 4-Tier verification methodology across all requirements:

| Tier | Name | Focus | Test Count |
|------|------|-------|------------|
| **Tier 1** | **Feature Coverage** | Validates primary happy-path behavior, schemas, postMessage protocols, and element bindings | >= 5 tests per feature |
| **Tier 2** | **Boundary & Corner Cases** | Stress tests empty strings, whitespace, special characters, HTML/XSS injection, missing DOM nodes, disconnected parent windows | >= 5 tests per feature |
| **Tier 3** | **Cross-Feature Combinations** | Evaluates multi-lingual switching, simultaneous text + client logo updates, full visual editor -> admin -> database roundtrip | Pairwise coverage |
| **Tier 4** | **Real-World Scenarios** | End-to-end admin workflow simulations, data pipeline loading, standalone module integration | Production workflow |

---

## Test Suite Inventory

### 1. `tests/verify-hero.js` (Milestone Baseline)
- **Scope**: Hero media integration (poster, video injection, autoplay/playsinline/muted attributes, lightbox synchronization) and absence of legacy duplicate files (`original_admin.html`, etc.).
- **Assertions**: 68 passed (100%).
- **Execution Time**: ~60ms.

### 2. `tests/verify-settings-sync.js` (Requirement R2 / Milestone 1)
- **Scope**:
  - `GET /api/settings` public schema validation (`heroTag`, `heroHeadline`, `heroSubtitle`, `kineticText`, `kineticWords`, `splitText`, `trailLogos`, `showreelVideoUrl`, `showreelPosterUrl`).
  - `GET /api/clients` public endpoint schema validation.
  - `PUT /api/admin/settings` allowlist verification.
  - Dynamic DOM updates for `#revealText` (word-level `<span>` wrapping).
  - Dynamic DOM updates for `#kinetic-scrolling-words` (comma-separated parsing + loop clone).
  - Dynamic DOM updates for `#kinetic-static-text` (static statement text).
  - Dynamic DOM updates for `#home-client-logos` (active client logo boxes).
  - Hero visual / poster synchronization.
  - `heroSubtitle` greeting preservation against day-of-week greeting clobbering.
  - Boundary resilience: whitespace, extreme string lengths (200+ words), Azeri unicode characters, missing DOM elements.
- **Assertions**: 52 passed (100%).
- **Execution Time**: ~80ms.

### 3. `tests/verify-visual-editor.js` (Requirement R1 / Milestone 2)
- **Scope**:
  - Preview iframe visual edit toggle (`TOGGLE_VISUAL_EDIT` message, `.visual-edit-active` class).
  - Outline highlights (`.visual-editable`, `#visual-edit-styles` dashed outline styles).
  - Click-to-edit interaction (`contenteditable="true"`, element focus).
  - Blur save postMessage bridge for settings (`SAVE_SETTINGS` with key, value, setting).
  - Blur save postMessage bridge for translations (`SAVE_I18N` with key, text).
  - Image click media picker bridge (`OPEN_MEDIA_PICKER` with target, currentUrl).
  - Media selected dynamic image update (`MEDIA_SELECTED` updating `img.src` and triggering `SAVE_SETTINGS`).
  - Admin parent window listener issuing `PUT /api/admin/settings`.
  - Disconnected parent window fallback (`window.parent === window`).
  - Special character & script injection safety.
  - Keyboard Enter trigger and rapid focus switching.
- **Assertions**: 58 passed (100%).
- **Execution Time**: ~75ms.

### 4. `tests/verify-desktop-module.js` (Requirement R3 / Milestone 3)
- **Scope**:
  - Directory existence: `C:\Users\Mcman\Desktop\visual-editor-module`.
  - Core files existence: `visual-editor.js`, `visual-editor.css`, `README.md`, `demo.html`.
  - Single script inclusion capability (self-contained fallback style injection).
  - Zero external runtime dependencies (vanilla JavaScript).
  - Syntax validity and CSS rules verification.
  - `demo.html` standalone interactive controls and structure.
  - Portability (no leaked paths or project-specific hardcoded URLs).
- **Assertions**: 15 tests (Active, pending M3 module export to Desktop).
- **Execution Time**: ~60ms.

### 5. `tests/run-all-tests.js` (Master Runner)
- **Scope**:
  - Orchestrates execution of all 4 test suites.
  - Aggregates test counts, pass/fail status, and timing.
  - Outputs color-coded terminal dashboard table.
  - Supports CLI options (`--suite=<name>`, `--bail`, `--verbose`, `--help`).

---

## Execution Commands

### Run Full Test Suite via NPM
```bash
npm test
```

### Run Master Test Runner Directly
```bash
node tests/run-all-tests.js
```

### Run Individual Test Suites
```bash
# Baseline Hero Tests
node tests/verify-hero.js

# Settings Sync & Dynamic Data (R2)
node tests/verify-settings-sync.js

# Visual Editor WYSIWYG & Bridge (R1)
node tests/verify-visual-editor.js

# Standalone Desktop Module (R3)
node tests/verify-desktop-module.js
```

### Targeted Execution via Master Runner
```bash
node tests/run-all-tests.js --suite=settings
node tests/run-all-tests.js --suite=visual-editor
node tests/run-all-tests.js --suite=desktop-module
node tests/run-all-tests.js --bail
```
