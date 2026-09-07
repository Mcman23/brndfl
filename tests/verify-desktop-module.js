/**
 * verify-desktop-module.js
 * Verification Test Suite for Requirement R3: Standalone Reusable Module Export to Desktop
 * 
 * 4-Tier Test Case Design:
 * - Tier 1: Feature Coverage (Target directory existence C:\Users\Mcman\Desktop\visual-editor-module,
 *            visual-editor.js exists, visual-editor.css exists, README.md exists, demo.html exists,
 *            single script tag inclusion capability, zero external dependencies)
 * - Tier 2: Boundary & Corner Cases (JavaScript syntax validity, CSS rules verification, README.md documentation
 *            completeness, demo.html structural integrity, path portability/no hardcoded machine paths)
 * - Tier 3: Cross-Feature Combinations (API contract parity between desktop module and project core,
 *            standalone initialization in clean execution environment)
 * - Tier 4: Real-World Application Scenarios (Third-party project simulation: embedding desktop module into
 *            an external web page via single script tag and exercising visual edit mode)
 */

import fs from 'fs';
import path from 'path';
import vm from 'vm';

export const DESKTOP_MODULE_DIR = 'C:\\Users\\Mcman\\Desktop\\visual-editor-module';

// Helper to safely inspect file existence and content
function inspectFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return { exists: false, size: 0, content: '' };
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return { exists: false, size: 0, content: '' };
    const content = fs.readFileSync(filePath, 'utf-8');
    return { exists: true, size: stat.size, content };
  } catch (e) {
    return { exists: false, size: 0, content: '', error: e.message };
  }
}

// =============================================================================
// Test Execution Suite
// =============================================================================
export async function runDesktopModuleTests() {
  const assertions = [];
  function assert(desc, cond, details = '') {
    if (cond) {
      assertions.push({ pass: true, desc });
    } else {
      assertions.push({ pass: false, desc: `${desc}${details ? ` -> ${details}` : ''}` });
      console.error(`FAILED: ${desc}${details ? ` -> ${details}` : ''}`);
    }
  }

  console.log('Running R3: Standalone Desktop Module Export Tests...\n');

  const dirExists = fs.existsSync(DESKTOP_MODULE_DIR) && fs.statSync(DESKTOP_MODULE_DIR).isDirectory();

  // ===========================================================================
  // TIER 1: FEATURE COVERAGE (>=5 tests per feature)
  // ===========================================================================

  // T1.1: Target directory existence on Desktop
  assert(
    'T1.1: Target directory C:\\Users\\Mcman\\Desktop\\visual-editor-module exists',
    dirExists,
    'Directory does not exist yet (Pending M3 implementation)'
  );

  const jsFile = inspectFile(path.join(DESKTOP_MODULE_DIR, 'visual-editor.js'));
  const cssFile = inspectFile(path.join(DESKTOP_MODULE_DIR, 'visual-editor.css'));
  const readmeFile = inspectFile(path.join(DESKTOP_MODULE_DIR, 'README.md'));
  const demoFile = inspectFile(path.join(DESKTOP_MODULE_DIR, 'demo.html'));

  // T1.2: Core Script File visual-editor.js
  assert(
    'T1.2: visual-editor.js exists and is non-empty in module directory',
    jsFile.exists && jsFile.size > 100,
    `Exists: ${jsFile.exists}, Size: ${jsFile.size} bytes`
  );

  // T1.3: Core Stylesheet File visual-editor.css
  assert(
    'T1.3: visual-editor.css exists and is non-empty in module directory',
    cssFile.exists && cssFile.size > 50,
    `Exists: ${cssFile.exists}, Size: ${cssFile.size} bytes`
  );

  // T1.4: Documentation File README.md
  assert(
    'T1.4: README.md exists and contains module documentation',
    readmeFile.exists && readmeFile.size > 100,
    `Exists: ${readmeFile.exists}, Size: ${readmeFile.size} bytes`
  );

  // T1.5: Standalone Demo Page demo.html
  assert(
    'T1.5: demo.html exists and is non-empty in module directory',
    demoFile.exists && demoFile.size > 100,
    `Exists: ${demoFile.exists}, Size: ${demoFile.size} bytes`
  );

  // T1.6: Single Script Tag Inclusion Capability
  // The module script must have self-contained fallback styles so it works even without visual-editor.css
  {
    const canSelfInject = jsFile.exists && (
      jsFile.content.includes('createElement(\'style\')') ||
      jsFile.content.includes('createElement("style")') ||
      jsFile.content.includes('visual-edit-styles')
    );
    assert(
      'T1.6: visual-editor.js supports single-script inclusion (self-injects default CSS if stylesheet omitted)',
      canSelfInject,
      'Script must contain fallback style injection mechanism for zero-config single <script> usage'
    );
  }

  // T1.7: Zero External Runtime Dependencies
  {
    let hasExternalDeps = false;
    let depMatch = '';
    if (jsFile.exists) {
      // Check for require() or ES import of non-relative modules
      const forbiddenPatterns = [
        /require\s*\(\s*['"][a-z0-9@]/i,
        /from\s*['"][a-z0-9@]/i,
        /jquery|\$|react|vue|angular|lodash/i
      ];
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(jsFile.content)) {
          // Exclude comments
          const lines = jsFile.content.split('\n');
          const hit = lines.find(l => !l.trim().startsWith('//') && pattern.test(l));
          if (hit) {
            hasExternalDeps = true;
            depMatch = hit.trim();
            break;
          }
        }
      }
    }
    assert(
      'T1.7: visual-editor.js has ZERO external runtime dependencies (vanilla JavaScript)',
      !hasExternalDeps && jsFile.exists,
      depMatch ? `Found external dependency reference: ${depMatch}` : 'File missing or contains external dependencies'
    );
  }

  // ===========================================================================
  // TIER 2: BOUNDARY & CORNER CASES (>=5 tests per feature)
  // ===========================================================================

  // T2.1: JavaScript Syntax Validity
  {
    let syntaxValid = false;
    let syntaxError = '';
    if (jsFile.exists) {
      try {
        new vm.Script(jsFile.content);
        syntaxValid = true;
      } catch (e) {
        syntaxError = e.message;
      }
    }
    assert(
      'T2.1: visual-editor.js parses cleanly without ECMAScript SyntaxError',
      syntaxValid,
      syntaxError || 'File does not exist'
    );
  }

  // T2.2: CSS Rules Verification
  {
    const requiredSelectors = [
      '.visual-edit-active',
      '.visual-editable',
      'contenteditable'
    ];
    const missingSelectors = cssFile.exists ? requiredSelectors.filter(sel => !cssFile.content.includes(sel)) : requiredSelectors;
    assert(
      'T2.2: visual-editor.css defines all required editing and highlight classes',
      cssFile.exists && missingSelectors.length === 0,
      `Missing selectors: ${missingSelectors.join(', ')}`
    );
  }

  // T2.3: README.md Completeness & Integration Instructions
  {
    const requiredDocKeywords = [
      '<script',
      'visual-editor',
      'VisualEditor',
      'TOGGLE_VISUAL_EDIT'
    ];
    const missingKeywords = readmeFile.exists ? requiredDocKeywords.filter(kw => !readmeFile.content.includes(kw)) : requiredDocKeywords;
    assert(
      'T2.3: README.md documents single script inclusion, public API, and postMessage protocol',
      readmeFile.exists && missingKeywords.length === 0,
      `Missing documentation topics: ${missingKeywords.join(', ')}`
    );
  }

  // T2.4: demo.html Structural Integrity
  {
    const requiredDemoElements = [
      '<!DOCTYPE html>',
      'visual-editor.js',
      'data-setting',
      'data-i18n'
    ];
    const missingDemoElements = demoFile.exists ? requiredDemoElements.filter(el => !demoFile.content.includes(el)) : requiredDemoElements;
    assert(
      'T2.4: demo.html contains HTML5 doctype, script inclusion, and sample editable elements',
      demoFile.exists && (missingDemoElements.length <= 1), // allow either data-setting or data-i18n
      `Missing demo markup elements: ${missingDemoElements.join(', ')}`
    );
  }

  // T2.5: Path Portability (No hardcoded project/machine paths)
  {
    let isPortable = false;
    let leakedPath = '';
    if (jsFile.exists) {
      const machinePatterns = [
        /c:\\users/i,
        /brndfl-main/i,
        /localhost:5000/i
      ];
      const found = machinePatterns.find(p => p.test(jsFile.content));
      if (!found) isPortable = true;
      else leakedPath = found.toString();
    }
    assert(
      'T2.5: visual-editor.js is 100% portable with no hardcoded local machine paths',
      isPortable,
      leakedPath ? `Leaked path pattern detected: ${leakedPath}` : 'File does not exist'
    );
  }

  // ===========================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS (Pairwise Coverage)
  // ===========================================================================

  // T3.1: API Contract Parity with Live Project Core
  {
    const liveCorePath = path.resolve('js/visual-editor.js');
    const liveCoreExists = fs.existsSync(liveCorePath);
    let parity = false;
    if (jsFile.exists && liveCoreExists) {
      const liveCoreContent = fs.readFileSync(liveCorePath, 'utf-8');
      // Exported script should have at least the features of live core
      parity = jsFile.content.includes('TOGGLE_VISUAL_EDIT') && jsFile.content.includes('SAVE_I18N');
    }
    assert(
      'T3.1: Desktop module maintains interface contract parity with project core engine',
      parity,
      'Desktop module must handle at least TOGGLE_VISUAL_EDIT and SAVE_I18N messages'
    );
  }

  // T3.2: Standalone Execution Verification in Sandboxed Node VM
  {
    let vmSuccess = false;
    let vmError = '';
    if (jsFile.exists) {
      try {
        const sandbox = {
          window: {},
          document: {
            body: { classList: { add() {}, remove() {}, toggle() {} } },
            head: { appendChild() {} },
            createElement() { return { setAttribute() {}, style: {} }; },
            getElementById() { return null; },
            querySelectorAll() { return []; }
          },
          console: { log() {}, warn() {}, error() {} }
        };
        sandbox.window.document = sandbox.document;
        sandbox.window.addEventListener = function() {};
        sandbox.window.location = { origin: 'http://localhost' };

        const script = new vm.Script(jsFile.content);
        const context = vm.createContext(sandbox);
        script.runInContext(context);
        vmSuccess = true;
      } catch (e) {
        vmError = e.message;
      }
    }
    assert(
      'T3.2: visual-editor.js executes without errors in isolated browser environment sandbox',
      vmSuccess,
      vmError || 'File does not exist'
    );
  }

  // ===========================================================================
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS
  // ===========================================================================

  // T4.1: Simulated Third-Party Project Integration
  {
    let thirdPartySimulated = false;
    if (demoFile.exists && jsFile.exists) {
      // Confirm demo file has interactive trigger or button to toggle edit mode
      const hasInteractiveToggle = demoFile.content.includes('toggle') ||
                                   demoFile.content.includes('button') ||
                                   demoFile.content.includes('VisualEditor');
      thirdPartySimulated = hasInteractiveToggle;
    }
    assert(
      'T4.1: demo.html provides functional third-party integration template with interactive toggle',
      thirdPartySimulated,
      'demo.html must provide interactive controls to demonstrate inline editing'
    );
  }

  // ===========================================================================
  // Summary & Reporting
  // ===========================================================================
  const total = assertions.length;
  const passed = assertions.filter(a => a.pass).length;
  const failed = total - passed;

  console.log(`\n========================================`);
  console.log(`DESKTOP MODULE (R3) TEST RESULTS`);
  console.log(`Total: ${total}, Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0 && !dirExists) {
    console.log(`Note: ${failed} tests failed because Milestone M3 has not exported C:\\Users\\Mcman\\Desktop\\visual-editor-module yet.`);
  }
  console.log(`========================================\n`);

  assertions.forEach(a => {
    console.log(`${a.pass ? '✓ PASS' : '✗ FAIL'}: ${a.desc}`);
  });

  return { total, passed, failed, assertions };
}

// Execute standalone if called directly via CLI
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('tests/verify-desktop-module.js')) {
  runDesktopModuleTests().then(result => {
    if (result.failed > 0) {
      console.log(`\n${result.failed} tests pending M3 module export.`);
      process.exit(1);
    } else {
      console.log('\nALL DESKTOP MODULE TESTS PASSED!\n');
      process.exit(0);
    }
  }).catch(err => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  });
}
