// @ts-check
/**
 * ANSI Terminal Reporter for Kstream E2E Test Suite
 */

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
};

class Reporter {
  constructor(options = {}) {
    this.startTime = Date.now();
    this.results = [];
    this.tierSummaries = {
      1: { name: 'Tier 1: Feature Coverage', suites: 0, total: 0, passed: 0, failed: 0, skipped: 0, time: 0 },
      2: { name: 'Tier 2: Boundary & Corner Cases', suites: 0, total: 0, passed: 0, failed: 0, skipped: 0, time: 0 },
      3: { name: 'Tier 3: Pairwise Combinations', suites: 0, total: 0, passed: 0, failed: 0, skipped: 0, time: 0 },
      4: { name: 'Tier 4: Real-World Scenarios', suites: 0, total: 0, passed: 0, failed: 0, skipped: 0, time: 0 },
    };
  }

  printHeader(meta = {}) {
    console.log(`\n${colors.cyan}${colors.bold}================================================================================${colors.reset}`);
    console.log(`  ${colors.bold}KSTREAM MOBILE RESPONSIVENESS & NETFLIX MIRROR E2E TEST SUITE${colors.reset}`);
    console.log(`  ${colors.dim}Runtime: Node ${process.version} | Base: ${meta.baseUrl || 'http://localhost:3000'} | Engine: Chromium${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}================================================================================${colors.reset}\n`);
  }

  printTierHeader(tierNum, tierName) {
    console.log(`\n${colors.bold}${colors.magenta}[TIER ${tierNum}] ${tierName}${colors.reset}`);
  }

  printSuiteHeader(suiteName) {
    console.log(`  ${colors.bold}▸ ${suiteName}${colors.reset}`);
  }

  recordTest(tier, suiteName, testItem, result) {
    const duration = result.duration || 0;
    const tierStat = this.tierSummaries[tier] || this.tierSummaries[1];
    tierStat.total++;
    tierStat.time += duration;

    if (result.status === 'passed') {
      tierStat.passed++;
      console.log(`    ${colors.green}✔${colors.reset} [${testItem.viewport || '360px'}] ${testItem.id}: ${testItem.title} ${colors.dim}(${duration}ms)${colors.reset}`);
    } else if (result.status === 'skipped') {
      tierStat.skipped++;
      console.log(`    ${colors.yellow}○${colors.reset} [${testItem.viewport || '360px'}] ${testItem.id}: ${testItem.title} ${colors.dim}(skipped)${colors.reset}`);
    } else {
      tierStat.failed++;
      console.log(`    ${colors.red}✖${colors.reset} [${testItem.viewport || '360px'}] ${testItem.id}: ${testItem.title} ${colors.dim}(${duration}ms)${colors.reset}`);
      if (result.error) {
        const errorLines = (result.error.stack || result.error.message || String(result.error)).split('\n');
        for (const line of errorLines.slice(0, 5)) {
          console.log(`      ${colors.red}${line}${colors.reset}`);
        }
      }
    }

    this.results.push({ tier, suiteName, testItem, result });
  }

  printSummary() {
    const totalDuration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    let totalSuites = 0;
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    console.log(`\n${colors.dim}--------------------------------------------------------------------------------${colors.reset}`);
    console.log(`  ${colors.bold}TEST EXECUTION SUMMARY${colors.reset}`);
    console.log(`${colors.dim}--------------------------------------------------------------------------------${colors.reset}`);
    console.log(`  ${'Tier'.padEnd(32)} ${'Tests'.padStart(7)} ${'Passed'.padStart(8)} ${'Failed'.padStart(8)} ${'Skipped'.padStart(8)} ${'Time'.padStart(8)}`);
    console.log(`${colors.dim}--------------------------------------------------------------------------------${colors.reset}`);

    for (let t = 1; t <= 4; t++) {
      const s = this.tierSummaries[t];
      totalTests += s.total;
      totalPassed += s.passed;
      totalFailed += s.failed;
      totalSkipped += s.skipped;
      const timeStr = `${(s.time / 1000).toFixed(2)}s`;
      console.log(`  ${s.name.padEnd(32)} ${String(s.total).padStart(7)} ${colors.green}${String(s.passed).padStart(8)}${colors.reset} ${s.failed > 0 ? colors.red : colors.dim}${String(s.failed).padStart(8)}${colors.reset} ${String(s.skipped).padStart(8)} ${timeStr.padStart(8)}`);
    }

    console.log(`${colors.dim}--------------------------------------------------------------------------------${colors.reset}`);
    console.log(`  ${'TOTAL'.padEnd(32)} ${String(totalTests).padStart(7)} ${colors.green}${String(totalPassed).padStart(8)}${colors.reset} ${totalFailed > 0 ? colors.red : colors.dim}${String(totalFailed).padStart(8)}${colors.reset} ${String(totalSkipped).padStart(8)} ${`${totalDuration}s`.padStart(8)}`);
    console.log(`${colors.cyan}${colors.bold}================================================================================${colors.reset}`);

    if (totalFailed === 0 && totalTests > 0) {
      console.log(`  ${colors.bgGreen}${colors.bold} STATUS: PASS ${colors.reset} All mobile responsiveness and desktop contracts met (${totalTests} tests)`);
    } else if (totalTests === 0) {
      console.log(`  ${colors.yellow}${colors.bold} STATUS: NO TESTS RUN ${colors.reset}`);
    } else {
      console.log(`  ${colors.bgRed}${colors.bold} STATUS: FAIL ${colors.reset} ${totalFailed} assertions failed out of ${totalTests} tests`);
    }
    console.log(`${colors.cyan}${colors.bold}================================================================================${colors.reset}\n`);

    return {
      totalTests,
      totalPassed,
      totalFailed,
      totalSkipped,
      totalDuration,
    };
  }
}

module.exports = {
  Reporter,
  colors,
};
