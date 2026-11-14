#!/usr/bin/env node
// @ts-check
/**
 * Kstream Central E2E Test Suite Runner & Orchestrator
 *
 * Supports CLI flags:
 *   --tier=<1|2|3|4|all>
 *   --viewport=<360|375|390|414|430|1024|1440|all>
 *   --file=<pattern>
 *   --grep=<pattern>
 *   --bail
 *   --headless=<true|false>
 *   --url=<url> | --base-url=<url>
 *   --dry-run
 *   --help
 *
 * Exit code semantics:
 *   0: PASS — All test assertions passed / dry-run / help
 *   1: FAIL — One or more test assertions failed, 0 tests discovered, or CLI argument syntax error
 *   2: ERROR — Dev server unreachable, foreign server detected, or browser runtime failure
 */

const fs = require('fs');
const path = require('path');
const { BASE_URL, VIEWPORTS, TEST_TIERS } = require('./config');
const { resolveKstreamServer, launchBrowser, createContext } = require('./helpers/browser');
const { Reporter, colors } = require('./helpers/reporter');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    tier: 'all',
    viewport: 'all',
    filePattern: '',
    grepPattern: '',
    bail: false,
    headless: true,
    baseUrl: process.env.BASE_URL || BASE_URL,
    isExplicitUrl: !!process.env.BASE_URL,
    dryRun: false,
    help: false,
    parseError: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--bail') {
      options.bail = true;
    } else if (arg.startsWith('--tier=')) {
      options.tier = arg.slice(7).trim();
    } else if (arg === '--tier' && i + 1 < args.length) {
      options.tier = args[++i].trim();
    } else if (arg.startsWith('--viewport=')) {
      options.viewport = arg.slice(11).trim();
    } else if (arg === '--viewport' && i + 1 < args.length) {
      options.viewport = args[++i].trim();
    } else if (arg.startsWith('--file=')) {
      options.filePattern = arg.slice(7).trim();
    } else if (arg === '--file' && i + 1 < args.length) {
      options.filePattern = args[++i].trim();
    } else if (arg.startsWith('--grep=')) {
      options.grepPattern = arg.slice(7).trim();
    } else if (arg === '--grep' && i + 1 < args.length) {
      options.grepPattern = args[++i].trim();
    } else if (arg.startsWith('--base-url=')) {
      options.baseUrl = arg.slice(11).trim();
      options.isExplicitUrl = true;
    } else if (arg === '--base-url' && i + 1 < args.length) {
      options.baseUrl = args[++i].trim();
      options.isExplicitUrl = true;
    } else if (arg.startsWith('--url=')) {
      options.baseUrl = arg.slice(6).trim();
      options.isExplicitUrl = true;
    } else if (arg === '--url' && i + 1 < args.length) {
      options.baseUrl = args[++i].trim();
      options.isExplicitUrl = true;
    } else if (arg.startsWith('--headless=')) {
      options.headless = arg.slice(11).trim() !== 'false';
    } else {
      options.parseError = `Unrecognized CLI option: "${arg}". Use --help for usage information.`;
      return options;
    }
  }

  const validTiers = ['1', '2', '3', '4', 'all'];
  if (!validTiers.includes(options.tier)) {
    options.parseError = `Invalid tier "${options.tier}". Valid tiers are: ${validTiers.join(', ')}.`;
    return options;
  }

  const validViewports = ['360', '375', '390', '414', '430', '1024', '1440', 'all'];
  if (!validViewports.includes(options.viewport)) {
    options.parseError = `Invalid viewport "${options.viewport}". Valid viewports are: ${validViewports.join(', ')}.`;
    return options;
  }

  return options;
}

function printHelp() {
  console.log(`
${colors.bold}Kstream E2E Test Runner${colors.reset}

${colors.bold}USAGE:${colors.reset}
  node tests/e2e/runner.js [options]
  npm run test:e2e [-- options]

${colors.bold}OPTIONS:${colors.reset}
  --tier=<1|2|3|4|all>      Run tests belonging to a specific tier (default: all)
  --viewport=<vp|all>       Filter by viewport (360, 375, 390, 414, 430, 1024, 1440, all)
  --file=<pattern>          Filter spec files matching pattern
  --grep=<regex>            Filter test descriptions matching pattern
  --bail                    Abort immediately on first failed assertion
  --dry-run                 Discover and plan tests without executing browser
  --headless=<true|false>   Run browser in headless mode (default: true)
  --url=<url>, --base-url   Target base URL (default: http://localhost:3000, auto-discovers port 3005)
  --help, -h                Display this help screen

${colors.bold}EXIT CODES:${colors.reset}
  0                         All tests passed / dry-run successful
  1                         One or more test assertions failed, 0 tests matched, or invalid CLI flag
  2                         Infrastructure error (server offline, foreign server, browser failure)
`);
}

function discoverSpecFiles(tierFilter = 'all', filePattern = '') {
  const rootDir = __dirname;
  const tiers = ['tier1', 'tier2', 'tier3', 'tier4'];
  const files = [];

  for (let i = 0; i < tiers.length; i++) {
    const tierNum = String(i + 1);
    if (tierFilter !== 'all' && tierFilter !== tierNum) continue;

    const tierDir = path.join(rootDir, tiers[i]);
    if (!fs.existsSync(tierDir)) continue;

    const entries = fs.readdirSync(tierDir);
    for (const file of entries) {
      if (file.endsWith('.spec.js')) {
        if (!filePattern || file.includes(filePattern)) {
          files.push({
            tier: Number(tierNum),
            filePath: path.join(tierDir, file),
            fileName: file,
          });
        }
      }
    }
  }

  return files;
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  if (options.parseError) {
    console.error(`\n${colors.red}${colors.bold}[CLI ERROR] ${options.parseError}${colors.reset}\n`);
    process.exit(1);
  }

  const reporter = new Reporter();
  reporter.printHeader({ baseUrl: options.baseUrl });

  // Discover test files
  const specFiles = discoverSpecFiles(options.tier, options.filePattern);
  if (specFiles.length === 0) {
    console.error(`\n${colors.red}${colors.bold}[FILTER ERROR] No test spec files matched the filter criteria:${colors.reset} tier="${options.tier}", file="${options.filePattern}".\n`);
    process.exit(1);
  }

  // Load and filter tests
  const plan = [];
  let totalDiscovered = 0;

  for (const item of specFiles) {
    try {
      const suiteModule = require(item.filePath);
      const tests = (suiteModule.tests || []).filter((test) => {
        if (options.viewport !== 'all') {
          const vpStr = String(options.viewport);
          const testVp = String(test.viewport || '');
          if (!testVp.includes(vpStr)) return false;
        }
        if (options.grepPattern) {
          const regex = new RegExp(options.grepPattern, 'i');
          const matched = regex.test(test.id || '') || regex.test(test.title || '');
          if (!matched) return false;
        }
        return true;
      });

      if (tests.length > 0) {
        plan.push({
          tier: item.tier,
          fileName: item.fileName,
          description: suiteModule.description || item.fileName,
          tests,
        });
        totalDiscovered += tests.length;
      }
    } catch (err) {
      console.error(`${colors.red}[ERROR] Failed to load spec file ${item.fileName}:${colors.reset}`, err);
      process.exit(2);
    }
  }

  if (totalDiscovered === 0) {
    console.error(`\n${colors.red}${colors.bold}[FILTER ERROR] No runnable tests matched the filter criteria:${colors.reset} grep="${options.grepPattern}", viewport="${options.viewport}". Discovered 0 tests.\n`);
    process.exit(1);
  }

  console.log(`${colors.cyan}Discovered ${totalDiscovered} tests across ${plan.length} suites.${colors.reset}\n`);

  // Handle dry-run mode
  if (options.dryRun) {
    console.log(`${colors.yellow}${colors.bold}DRY RUN MODE: Listing discovered test plan (no browser launched)${colors.reset}\n`);
    let currentTier = 0;
    for (const suite of plan) {
      if (suite.tier !== currentTier) {
        currentTier = suite.tier;
        const tierName = TEST_TIERS[currentTier] ? TEST_TIERS[currentTier].name : `Tier ${currentTier}`;
        reporter.printTierHeader(currentTier, tierName);
      }
      reporter.printSuiteHeader(suite.fileName);
      for (const test of suite.tests) {
        reporter.recordTest(suite.tier, suite.fileName, test, { status: 'passed', duration: 1 });
      }
    }
    reporter.printSummary();
    process.exit(0);
  }

  // Verify application server identity & auto-discover if needed
  console.log(`Checking connection to application server at ${colors.cyan}${options.baseUrl}${colors.reset}...`);
  const serverResolution = await resolveKstreamServer(options.baseUrl, options.isExplicitUrl);
  if (!serverResolution.success) {
    console.log(`\n${colors.red}${colors.bold}[INFRASTRUCTURE ERROR] Target application server is unreachable or not Kstream!${colors.reset}`);
    console.log(`  ${serverResolution.error}`);
    console.log(`  Please ensure the genuine Kstream Next.js app is running via 'npm run dev' or 'npm run start'.`);
    console.log(`  To validate test suite discovery without a running server, use: ${colors.yellow}node tests/e2e/runner.js --dry-run${colors.reset}\n`);
    process.exit(2);
  }

  if (serverResolution.autoDiscovered) {
    console.log(`${colors.yellow}[NOTICE] ${serverResolution.details}${colors.reset}`);
    options.baseUrl = serverResolution.url;
  }

  console.log(`${colors.green}Application server verified: ${serverResolution.details}.${colors.reset} Launching browser...\n`);

  let browser;
  try {
    browser = await launchBrowser({ headless: options.headless });
  } catch (err) {
    console.error(`\n${colors.red}${colors.bold}[INFRASTRUCTURE ERROR] Failed to launch browser:${colors.reset}`, err.message);
    process.exit(2);
  }

  let bailTriggered = false;
  let currentTier = 0;

  try {
    for (const suite of plan) {
      if (bailTriggered) break;

      if (suite.tier !== currentTier) {
        currentTier = suite.tier;
        const tierName = TEST_TIERS[currentTier] ? TEST_TIERS[currentTier].name : `Tier ${currentTier}`;
        reporter.printTierHeader(currentTier, tierName);
      }

      reporter.printSuiteHeader(suite.fileName);

      for (const test of suite.tests) {
        if (bailTriggered) break;

        const testStartTime = Date.now();
        let context = null;
        let page = null;

        try {
          context = await createContext(browser, test.viewport || 'mobile-360', {
            defaultTimeout: 3000,
            navigationTimeout: 10000,
          });
          page = await context.newPage();
          page.setDefaultTimeout(3000);
          page.setDefaultNavigationTimeout(10000);

          await test.run({
            page,
            context,
            baseUrl: options.baseUrl,
          });

          const duration = Date.now() - testStartTime;
          reporter.recordTest(suite.tier, suite.fileName, test, { status: 'passed', duration });
        } catch (testErr) {
          const duration = Date.now() - testStartTime;
          reporter.recordTest(suite.tier, suite.fileName, test, { status: 'failed', duration, error: testErr });

          if (options.bail) {
            console.log(`\n${colors.yellow}Bail flag enabled. Aborting test run on first failure.${colors.reset}`);
            bailTriggered = true;
          }
        } finally {
          if (page) await page.close().catch(() => {});
          if (context) await context.close().catch(() => {});
        }
      }
    }
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }

  const summary = reporter.printSummary();

  if (summary.totalFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(`\n${colors.red}[FATAL RUNNER ERROR]${colors.reset}`, err);
  process.exit(2);
});
