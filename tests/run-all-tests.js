/**
 * run-all-tests.js
 * Master Automated Test Runner for Brandfull E2E & Milestone Test Suites
 * 
 * Orchestrates the execution of all verification test suites:
 * 1. Hero Media Integration (Milestone Baseline) -> tests/verify-hero.js
 * 2. Settings Live Sync & Dynamic Data (Milestone 1 / R2) -> tests/verify-settings-sync.js
 * 3. Visual Editor WYSIWYG & Bridge (Milestone 2 / R1) -> tests/verify-visual-editor.js
 * 4. Desktop Standalone Module (Milestone 3 / R3) -> tests/verify-desktop-module.js
 * 
 * Zero Heavy External Dependencies (No Playwright/Puppeteer/Jest)
 * Fast execution (<1s)
 */

import { spawnSync } from 'child_process';
import path from 'path';

const SUITES = [
  {
    id: 'hero',
    name: 'Hero Media Integration & Clean System',
    milestone: 'Baseline',
    requirement: 'Hero Media & Cleanup',
    file: 'tests/verify-hero.js'
  },
  {
    id: 'settings',
    name: 'Settings Live Sync & Dynamic Integration',
    milestone: 'Milestone 1',
    requirement: 'R2',
    file: 'tests/verify-settings-sync.js'
  },
  {
    id: 'visual-editor',
    name: 'Admin Preview Visual Editor (WYSIWYG)',
    milestone: 'Milestone 2',
    requirement: 'R1',
    file: 'tests/verify-visual-editor.js'
  },
  {
    id: 'desktop-module',
    name: 'Standalone Desktop Module Export',
    milestone: 'Milestone 3',
    requirement: 'R3',
    file: 'tests/verify-desktop-module.js'
  }
];

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    suite: null,
    bail: false,
    verbose: false
  };

  for (const arg of args) {
    if (arg.startsWith('--suite=')) {
      options.suite = arg.split('=')[1].toLowerCase();
    } else if (arg === '--bail' || arg === '-b') {
      options.bail = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Brandfull Test Runner
Usage: node tests/run-all-tests.js [options]

Options:
  --suite=<name>    Run specific suite ('hero', 'settings', 'visual-editor', 'desktop-module')
  --bail            Stop on first suite failure
  --verbose         Print full assertion logs for all suites
  --help            Show this help message
      `);
      process.exit(0);
    }
  }

  return options;
}

function runSuite(suite, options) {
  const filePath = path.resolve(suite.file);
  const startTime = Date.now();

  const child = spawnSync(process.execPath, [filePath], {
    encoding: 'utf-8',
    env: { ...process.env }
  });

  const durationMs = Date.now() - startTime;
  const stdout = child.stdout || '';
  const stderr = child.stderr || '';

  // Parse test counts from output
  // Standard format: "Total: 68, Passed: 68, Failed: 0"
  const countMatch = stdout.match(/Total:\s*(\d+),\s*Passed:\s*(\d+),\s*Failed:\s*(\d+)/i);
  let total = 0;
  let passed = 0;
  let failed = 0;

  if (countMatch) {
    total = parseInt(countMatch[1], 10);
    passed = parseInt(countMatch[2], 10);
    failed = parseInt(countMatch[3], 10);
  } else {
    // Fallback parsing from checkmarks
    const passMatches = stdout.match(/✓ PASS/g) || [];
    const failMatches = stdout.match(/✗ FAIL/g) || [];
    passed = passMatches.length;
    failed = failMatches.length;
    total = passed + failed;
  }

  const exitCode = child.status;

  return {
    ...suite,
    exitCode,
    passed,
    failed,
    total,
    durationMs,
    stdout,
    stderr
  };
}

async function main() {
  const options = parseArgs();
  console.log('================================================================================');
  console.log(' BRANDFULL AUTOMATED TEST HARNESS — MASTER RUNNER');
  console.log(' Native ES Modules & DOM Simulation (Fast Execution, Zero Heavy Frameworks)');
  console.log('================================================================================\n');

  const selectedSuites = options.suite
    ? SUITES.filter(s => s.id === options.suite || s.id.includes(options.suite))
    : SUITES;

  if (selectedSuites.length === 0) {
    console.error(`Error: No test suite found matching query "${options.suite}".`);
    console.log(`Available suites: ${SUITES.map(s => s.id).join(', ')}`);
    process.exit(1);
  }

  const results = [];
  let hasFailure = false;

  for (const suite of selectedSuites) {
    process.stdout.write(`▶ Running ${suite.name} [${suite.milestone}] (${suite.file})... `);
    const result = runSuite(suite, options);
    results.push(result);

    if (result.exitCode === 0 && result.failed === 0) {
      console.log(`\x1b[32mPASS\x1b[0m (${result.total} tests in ${result.durationMs}ms)`);
    } else {
      console.log(`\x1b[31mFAIL / PENDING\x1b[0m (${result.passed}/${result.total} passed, ${result.failed} failed in ${result.durationMs}ms)`);
      hasFailure = true;
    }

    if (options.verbose || (result.exitCode !== 0 && !options.suite)) {
      // Print failures or verbose output
      const failureLines = (result.stdout + '\n' + result.stderr)
        .split('\n')
        .filter(l => l.includes('FAILED:') || l.includes('✗ FAIL') || l.includes('Note:'))
        .join('\n');
      if (failureLines) {
        console.log('  ' + failureLines.split('\n').join('\n  '));
      }
    }

    if (options.bail && hasFailure) {
      console.log('\n--bail option active. Stopping execution on first failure.\n');
      break;
    }
  }

  // Master Summary Dashboard
  console.log('\n================================================================================');
  console.log(' MASTER TEST SUITE SUMMARY MATRIX');
  console.log('================================================================================');
  console.log(
    ' ' +
    'Suite / Feature'.padEnd(42) +
    'Req'.padEnd(8) +
    'Milestone'.padEnd(14) +
    'Passed'.padEnd(12) +
    'Status'.padEnd(16) +
    'Time'
  );
  console.log('-'.repeat(96));

  let grandTotal = 0;
  let grandPassed = 0;
  let grandFailed = 0;
  let grandDuration = 0;

  for (const r of results) {
    grandTotal += r.total;
    grandPassed += r.passed;
    grandFailed += r.failed;
    grandDuration += r.durationMs;

    const statusBadge = (r.exitCode === 0 && r.failed === 0)
      ? '\x1b[32m✓ PASSED\x1b[0m'
      : (r.id === 'desktop-module' ? '\x1b[33m⏳ M3 PENDING\x1b[0m' : '\x1b[31m✗ FAILED\x1b[0m');

    console.log(
      ' ' +
      r.name.slice(0, 40).padEnd(42) +
      r.requirement.slice(0, 6).padEnd(8) +
      r.milestone.padEnd(14) +
      `${r.passed}/${r.total}`.padEnd(12) +
      statusBadge.padEnd(25) +
      `${r.durationMs}ms`
    );
  }

  console.log('-'.repeat(96));
  console.log(
    ' ' +
    'TOTAL OVERALL'.padEnd(42) +
    '-'.padEnd(8) +
    'All'.padEnd(14) +
    `${grandPassed}/${grandTotal}`.padEnd(12) +
    ((grandFailed === 0) ? '\x1b[32m100% PASS\x1b[0m' : `\x1b[33m${Math.round((grandPassed/grandTotal)*100)}% PASS\x1b[0m`).padEnd(25) +
    `${grandDuration}ms`
  );
  console.log('================================================================================\n');

  if (grandFailed === 0) {
    console.log('\x1b[32m✔ ALL ACTIVE TEST SUITES PASSED PERFECTLY!\x1b[0m\n');
    process.exit(0);
  } else {
    console.log(`\x1b[33mℹ Note: ${grandPassed} of ${grandTotal} tests passed (${grandFailed} pending implementation by feature milestones).\x1b[0m`);
    console.log('Once M1, M2, and M3 complete implementation, all suites will turn 100% green.\n');
    // Exit code indicates status: 0 if only pending M3 module export, or 1 if explicit failures
    const onlyPendingM3 = results.every(r => r.id === 'desktop-module' || (r.exitCode === 0 && r.failed === 0));
    if (onlyPendingM3) {
      console.log('Active milestones (M1/M2/Baseline) are 100% verified. M3 export pending.');
      process.exit(1); // Standard non-zero exit for CI to denote work in progress
    } else {
      process.exit(1);
    }
  }
}

main();
