// @ts-check
/**
 * Empirical Challenger Verification Harness for Mobile Viewports & Assertions
 * Tests:
 * 1. Viewport boundary limits across fixtures/viewports.js (360x640, 375x667, 390x844, 414x896, 430x932, 1024x768, 1440x900)
 * 2. Touch target tolerance formula & borderline subpixel values
 * 3. Carousel peek affordance and scroll snap assertion logic in helpers/assertions.js
 * 4. Live page verification at exact limits on http://localhost:3005 (Kstream dev server)
 */

const { VIEWPORT_PRESETS, getViewport } = require('./e2e/fixtures/viewports');
const { THRESHOLDS, VIEWPORTS } = require('./e2e/config');
const { assertTouchTarget, assertScrollSnapAndPeek, assertNoHorizontalOverflow } = require('./e2e/helpers/assertions');
const { launchBrowser, createContext } = require('./e2e/helpers/browser');

const TARGET_URL = process.env.BASE_URL || 'http://localhost:3005';

const RESULTS = {
  viewportChallenges: [],
  touchTargetFormulaChallenges: [],
  carouselPeekChallenges: [],
  liveBrowserChallenges: [],
};

// ============================================================================
// CHALLENGE 1: Viewport Boundary Analysis in fixtures/viewports.js
// ============================================================================
function testViewportFixtures() {
  console.log('\n==================================================');
  console.log('CHALLENGE 1: Viewport Fixture & Boundary Analysis');
  console.log('==================================================');

  const targetViewports = [
    { name: 'Android Baseline (16:9)', width: 360, height: 640 },
    { name: 'Samsung S8/S20 Tall (18.5:9)', width: 360, height: 740 },
    { name: 'iPhone SE / Legacy iOS', width: 375, height: 667 },
    { name: 'iPhone 12/13/14 Standard', width: 390, height: 844 },
    { name: 'iPhone XR / 11 Plus', width: 414, height: 896 },
    { name: 'iPhone Pro Max Large Mobile', width: 430, height: 932 },
    { name: 'iPad Landscape / Small Desktop', width: 1024, height: 768 },
    { name: 'Standard Desktop Monitor', width: 1440, height: 900 },
  ];

  for (const target of targetViewports) {
    const presetKey = Object.keys(VIEWPORT_PRESETS).find(
      (k) => VIEWPORT_PRESETS[k].width === target.width
    );
    const preset = presetKey ? VIEWPORT_PRESETS[presetKey] : null;

    // Test getViewport by number
    const byNumber = getViewport(target.width);

    // Test getViewport by string key
    const byKey = presetKey ? getViewport(presetKey) : null;

    const findings = {
      target: `${target.width}x${target.height} (${target.name})`,
      presetKey: presetKey || 'NONE',
      presetHeight: preset ? preset.height : null,
      heightMatchesTarget: preset ? preset.height === target.height : false,
      byNumberResult: `${byNumber.width}x${byNumber.height} (dpr=${byNumber.deviceScaleFactor})`,
      byNumberMatchesTarget: byNumber.height === target.height,
    };

    console.log(`[Target ${target.width}x${target.height}]`);
    console.log(`  - Preset: ${findings.presetKey} -> ${preset ? `${preset.width}x${preset.height}` : 'Not found'}`);
    console.log(`  - Height match: ${findings.heightMatchesTarget ? 'YES' : 'NO (discrepancy!)'}`);
    console.log(`  - getViewport(${target.width}): ${findings.byNumberResult}`);
    console.log(`  - getViewport(${target.width}) matches height: ${findings.byNumberMatchesTarget ? 'YES' : 'NO (defaults to 800 or 768!)'}`);

    RESULTS.viewportChallenges.push(findings);
  }
}

// ============================================================================
// CHALLENGE 2: Touch Target Tolerance Formula Analysis
// ============================================================================
function testTouchTargetFormula() {
  console.log('\n==================================================');
  console.log('CHALLENGE 2: Touch Target Tolerance Formula Stress Test');
  console.log('==================================================');

  // Formula as written in helpers/assertions.js:
  // Math.round(box.width) >= minWidth || box.width >= (minWidth - THRESHOLDS.SUBPIXEL_EPSILON)
  const epsilon = THRESHOLDS.SUBPIXEL_EPSILON; // 0.1

  function evalFormula(width, minWidth) {
    const mathRoundPass = Math.round(width) >= minWidth;
    const epsilonPass = width >= (minWidth - epsilon);
    const overallPass = mathRoundPass || epsilonPass;
    return { width, minWidth, mathRoundPass, epsilonPass, overallPass };
  }

  const testCases44 = [
    { label: 'Exact standard', val: 44.0 },
    { label: 'Subpixel high', val: 44.01 },
    { label: 'Borderline 43.99px', val: 43.99 },
    { label: 'Borderline 43.90px (Exact Epsilon Floor)', val: 43.90 },
    { label: 'Borderline 43.89px (Below Epsilon Floor)', val: 43.89 },
    { label: 'Borderline 43.80px (Prompt test case)', val: 43.80 },
    { label: 'Borderline 43.60px', val: 43.60 },
    { label: 'Borderline 43.50px (Math.round boundary)', val: 43.50 },
    { label: 'Borderline 43.499px (Just below Math.round)', val: 43.499 },
    { label: 'Borderline 43.40px', val: 43.40 },
    { label: 'Substandard 42.0px', val: 42.0 },
    { label: 'Substandard 40.0px (Player control on standard target)', val: 40.0 },
  ];

  console.log(`\nEvaluating Formula against Standard minWidth = 44px (EPSILON = ${epsilon}):`);
  console.log('Width   | Math.round >= 44 | Width >= 43.9 | Overall Formula | Expected by strict 43.9 | Defect?');
  console.log('--------|------------------|---------------|-----------------|-------------------------|--------');

  for (const tc of testCases44) {
    const res = evalFormula(tc.val, 44);
    const expectedStrict43_9 = tc.val >= 43.9;
    const isDefect = res.overallPass !== expectedStrict43_9;
    const defectNote = isDefect
      ? `LEAK: ${tc.val}px passes Math.round(43.5+) despite < 43.9px threshold`
      : 'OK';

    console.log(
      `${tc.val.toFixed(2).padStart(7)} | ` +
      `${String(res.mathRoundPass).padStart(16)} | ` +
      `${String(res.epsilonPass).padStart(13)} | ` +
      `${String(res.overallPass).padStart(15)} | ` +
      `${String(expectedStrict43_9).padStart(23)} | ` +
      `${defectNote}`
    );

    RESULTS.touchTargetFormulaChallenges.push({
      target: 44,
      testedValue: tc.val,
      label: tc.label,
      mathRoundPass: res.mathRoundPass,
      epsilonPass: res.epsilonPass,
      overallPass: res.overallPass,
      expectedStrict43_9,
      isDefect,
      defectNote,
    });
  }

  // Also test minWidth = 40 (Player controls)
  const testCases40 = [
    { label: 'Player exact', val: 40.0 },
    { label: 'Player borderline 39.99', val: 39.99 },
    { label: 'Player borderline 39.90', val: 39.90 },
    { label: 'Player borderline 39.80', val: 39.80 },
    { label: 'Player borderline 39.50', val: 39.50 },
    { label: 'Player borderline 39.49', val: 39.49 },
    { label: 'Substandard 38.0px', val: 38.0 },
  ];

  console.log(`\nEvaluating Formula against Player minWidth = 40px (EPSILON = ${epsilon}):`);
  for (const tc of testCases40) {
    const res = evalFormula(tc.val, 40);
    const expectedStrict39_9 = tc.val >= 39.9;
    const isDefect = res.overallPass !== expectedStrict39_9;
    console.log(
      `  - ${tc.val.toFixed(2)}px: Formula=${res.overallPass} (Math.round=${res.mathRoundPass}, >=39.9=${res.epsilonPass}) -> ${isDefect ? 'LEAK (39.5-39.89 allowed)' : 'OK'}`
    );
  }
}

// ============================================================================
// CHALLENGE 3: Carousel Peek & Scroll Snap Assertion Logic Analysis
// ============================================================================
function testCarouselPeekAssertionLogic() {
  console.log('\n==================================================');
  console.log('CHALLENGE 3: Carousel Peek & Scroll Snap Assertion Inspection');
  console.log('==================================================');

  // Let's inspect the code of assertScrollSnapAndPeek:
  // 1. Does it assert card0Vw == 36vw?
  // 2. Does it assert card2PeekRatio >= 0.20 (20%)?
  // 3. Does it throw when hasPeek is false?
  // 4. Does it verify snapType or card0Snap?
  // 5. Does it return hasPeek: true when cards < 3?

  // Simulate evaluate logic on synthetic DOM configurations:
  function simulateAssertScrollSnapAndPeek(mockData, vpWidth = 360) {
    const { cards, snapType } = mockData;
    if (!cards) return { found: false };
    if (cards.length < 3) {
      return { found: true, count: cards.length, snapType, hasPeek: true };
    }

    const card0 = cards[0];
    const card0Snap = card0.snapAlign || 'none';
    const card2 = cards[2];

    const card0Vw = (card0.width / vpWidth) * 100;
    const card2VisibleWidth = Math.max(0, vpWidth - card2.left);
    const card2PeekRatio = card2VisibleWidth / card2.width;

    return {
      found: true,
      snapType,
      card0Snap,
      card0Width: card0.width,
      card0Vw,
      card2Left: card2.left,
      card2VisibleWidth,
      card2PeekRatio,
      hasPeek: card2.left < vpWidth && (card2.left + card2.width) > vpWidth,
    };
  }

  // Scenario A: Card width is 50vw (violation of 36vw contract), peek is 5% (violation of >= 20% peek contract)
  // card0: width = 180 (50vw of 360), card1: left = 180, width = 180, card2: left = 355, width = 180.
  // Visible width of card2 = 360 - 355 = 5px. Peek ratio = 5 / 180 = 2.7%.
  const scenarioA = simulateAssertScrollSnapAndPeek({
    snapType: 'none', // Violation: missing snap-x snap-mandatory!
    cards: [
      { width: 180, snapAlign: 'none' }, // Violation: missing snap-start!
      { width: 180, snapAlign: 'none' },
      { left: 355, width: 180, snapAlign: 'none' },
    ],
  }, 360);

  console.log('\n[Scenario A: Severe Violations (Card=50vw, Peek=2.7%, No Scroll-Snap)]');
  console.log('  - card0Vw:', scenarioA.card0Vw.toFixed(1) + '% (Expected: ~36vw)');
  console.log('  - card2PeekRatio:', (scenarioA.card2PeekRatio * 100).toFixed(1) + '% (Expected: >= 20%)');
  console.log('  - snapType:', scenarioA.snapType, '(Expected: mandatory x)');
  console.log('  - hasPeek evaluated to:', scenarioA.hasPeek);
  console.log('  - Did assertScrollSnapAndPeek catch w-[36vw] violation? NO (card0Vw is calculated but never asserted)');
  console.log('  - Did assertScrollSnapAndPeek catch < 20% peek ratio violation? NO (hasPeek is true as long as 1px peeks)');
  console.log('  - Did assertScrollSnapAndPeek catch missing scroll snap? NO (snapType is never asserted)');

  // Scenario B: hasPeek is false (card2.left >= vpWidth)
  const scenarioB = simulateAssertScrollSnapAndPeek({
    snapType: 'x mandatory',
    cards: [
      { width: 130, snapAlign: 'start' },
      { width: 130, snapAlign: 'start' },
      { left: 380, width: 130, snapAlign: 'start' }, // completely off screen!
    ],
  }, 360);

  console.log('\n[Scenario B: Card 3 Completely Offscreen (0% Peek)]');
  console.log('  - hasPeek evaluated to:', scenarioB.hasPeek);
  console.log('  - Does assertScrollSnapAndPeek throw an Error? NO! It only returns the result object.');
  console.log('  - Unless caller explicitly checks `if (!result.hasPeek) throw`, this passes silently!');

  // Scenario C: Only 1 card present
  const scenarioC = simulateAssertScrollSnapAndPeek({
    snapType: 'none',
    cards: [
      { width: 130, snapAlign: 'none' },
    ],
  }, 360);

  console.log('\n[Scenario C: Carousel with only 1 card (Broken Carousel)]');
  console.log('  - hasPeek evaluated to:', scenarioC.hasPeek);
  console.log('  - CRITICAL DEFECT: Line 191 returns `hasPeek: true` when cards.length < 3!');
  console.log('  - A carousel with 0, 1, or 2 cards falsely reports `hasPeek: true`!');

  RESULTS.carouselPeekChallenges.push({
    scenarioA,
    scenarioB,
    scenarioC,
  });
}

// ============================================================================
// CHALLENGE 4: Live Browser Verification across Viewports on http://localhost:3000
// ============================================================================
async function testLiveBrowserViewports() {
  console.log('\n==================================================');
  console.log('CHALLENGE 4: Live Browser Viewport Boundary Tests (http://localhost:3000)');
  console.log('==================================================');

  let browser;
  try {
    browser = await launchBrowser({ headless: true });
  } catch (err) {
    console.error('Failed to launch browser for live test:', err.message);
    return;
  }

  const testViewports = [
    { name: '360x640 (Android 16:9 Baseline)', width: 360, height: 640, isMobile: true },
    { name: '360x740 (Samsung S8/S20 Preset)', width: 360, height: 740, isMobile: true },
    { name: '375x667 (iPhone SE Preset)', width: 375, height: 667, isMobile: true },
    { name: '390x844 (iPhone 12/13/14 Preset)', width: 390, height: 844, isMobile: true },
    { name: '414x896 (iPhone XR/11 Plus Preset)', width: 414, height: 896, isMobile: true },
    { name: '430x932 (iPhone Pro Max Preset)', width: 430, height: 932, isMobile: true },
    { name: '1024x768 (Desktop Preset)', width: 1024, height: 768, isMobile: false },
    { name: '1440x900 (Widescreen Preset)', width: 1440, height: 900, isMobile: false },
  ];

  for (const vp of testViewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.isMobile ? (vp.width === 375 ? 2 : 3) : 1,
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
    });

    const page = await context.newPage();
    try {
      await page.goto(`${TARGET_URL}/`, { waitUntil: 'domcontentloaded', timeout: 5000 });
      await page.waitForTimeout(500);

      // 1. Horizontal overflow check
      let overflowResult = { hasLeak: false, scrollWidth: 0, windowWidth: vp.width };
      try {
        overflowResult = await assertNoHorizontalOverflow(page);
      } catch (overflowErr) {
        overflowResult = { hasLeak: true, error: overflowErr.message };
      }

      // 2. Carousel peek and card width measurement on mobile
      let carouselData = null;
      if (vp.isMobile) {
        carouselData = await page.evaluate((vpWidth) => {
          const container = document.querySelector('.overflow-x-auto');
          if (!container) return { found: false };

          const style = window.getComputedStyle(container);
          const snapType = style.scrollSnapType || style['scroll-snap-type'] || '';

          const cards = Array.from(container.querySelectorAll('a[href*="/series/"], a[href*="/movies/"], [data-card]'));
          if (cards.length === 0) return { found: true, count: 0, snapType };

          const card0Rect = cards[0].getBoundingClientRect();
          const card0Snap = window.getComputedStyle(cards[0]).scrollSnapAlign;
          const card0Vw = (card0Rect.width / vpWidth) * 100;

          let card2Data = null;
          if (cards.length >= 3) {
            const card2Rect = cards[2].getBoundingClientRect();
            const visibleWidth = Math.max(0, vpWidth - card2Rect.left);
            const peekRatio = visibleWidth / card2Rect.width;
            card2Data = {
              left: Math.round(card2Rect.left),
              width: Math.round(card2Rect.width),
              visibleWidth: Math.round(visibleWidth),
              peekRatio: Number(peekRatio.toFixed(3)),
              hasPeek: card2Rect.left < vpWidth && (card2Rect.left + card2Rect.width) > vpWidth,
            };
          }

          return {
            found: true,
            count: cards.length,
            snapType,
            card0Snap,
            card0Width: Math.round(card0Rect.width),
            card0Vw: Number(card0Vw.toFixed(1)),
            card2: card2Data,
          };
        }, vp.width);
      }

      // 3. Touch target measurement of interactive elements
      let touchTargets = null;
      if (vp.isMobile) {
        touchTargets = await page.evaluate(() => {
          const targets = [];
          const hamburger = document.querySelector('button[aria-label*="menu" i], button[aria-label*="navigasi" i]');
          if (hamburger) {
            const r = hamburger.getBoundingClientRect();
            targets.push({ name: 'Hamburger', width: r.width, height: r.height });
          }

          const search = document.querySelector('a[href*="/search"], button[aria-label*="cari" i]');
          if (search) {
            const r = search.getBoundingClientRect();
            targets.push({ name: 'Search', width: r.width, height: r.height });
          }

          const heroPlay = document.querySelector('section:has(h1) a, section:has(h1) button');
          if (heroPlay) {
            const r = heroPlay.getBoundingClientRect();
            targets.push({ name: 'Hero CTA', width: r.width, height: r.height });
          }

          return targets;
        });
      }

      // 4. Hero banner height and fold inspection
      const heroMetrics = await page.evaluate((vpHeight) => {
        const hero = document.querySelector('section:has(h1), [data-hero]');
        const h2 = document.querySelector('h2');
        if (!hero) return null;
        const heroRect = hero.getBoundingClientRect();
        const h2Rect = h2 ? h2.getBoundingClientRect() : null;
        return {
          heroHeight: Math.round(heroRect.height),
          heroBottom: Math.round(heroRect.bottom),
          viewportHeight: vpHeight,
          remainingHeightForFold: Math.round(vpHeight - heroRect.bottom),
          h2Top: h2Rect ? Math.round(h2Rect.top) : null,
          isH2AboveFold: h2Rect ? h2Rect.top < vpHeight : false,
        };
      }, vp.height);

      console.log(`\n[Viewport: ${vp.name} (${vp.width}x${vp.height})]`);
      console.log(`  - Horizontal Overflow: ${overflowResult.hasLeak ? 'FAIL (LEAK DETECTED)' : 'PASS (0px overflow)'}`);
      if (heroMetrics) {
        console.log(`  - Hero Height: ${heroMetrics.heroHeight}px | Bottom at: ${heroMetrics.heroBottom}px (Vp Height: ${vp.height}px)`);
        console.log(`  - Fold Clearance: ${heroMetrics.remainingHeightForFold}px remaining | Row 1 H2 top at: ${heroMetrics.h2Top}px (Above fold: ${heroMetrics.isH2AboveFold})`);
      }
      if (carouselData && carouselData.found) {
        console.log(`  - Carousel: ${carouselData.count} cards | snapType: "${carouselData.snapType}" | card0Snap: "${carouselData.card0Snap}"`);
        console.log(`  - Card 0 Width: ${carouselData.card0Width}px (${carouselData.card0Vw}vw)`);
        if (carouselData.card2) {
          console.log(`  - Card 2 Peek: ${carouselData.card2.visibleWidth}px (${(carouselData.card2.peekRatio * 100).toFixed(1)}%) | hasPeek: ${carouselData.card2.hasPeek}`);
        }
      }
      if (touchTargets) {
        for (const t of touchTargets) {
          const wOk = Math.round(t.width) >= 44;
          const hOk = Math.round(t.height) >= 44;
          console.log(`  - Touch Target [${t.name}]: ${t.width.toFixed(1)}x${t.height.toFixed(1)}px -> ${wOk && hOk ? 'PASS' : 'FAIL'}`);
        }
      }

      RESULTS.liveBrowserChallenges.push({
        viewport: vp,
        overflowResult,
        heroMetrics,
        carouselData,
        touchTargets,
      });

    } catch (pageErr) {
      console.error(`Error testing viewport ${vp.name}:`, pageErr.message);
    } finally {
      await page.close().catch(() => {});
      await context.close().catch(() => {});
    }
  }

  await browser.close().catch(() => {});
}

async function main() {
  testViewportFixtures();
  testTouchTargetFormula();
  testCarouselPeekAssertionLogic();
  await testLiveBrowserViewports();

  console.log('\n==================================================');
  console.log('CHALLENGER VERIFICATION COMPLETE');
  console.log('==================================================');
}

main().catch(console.error);
