// @ts-check
/**
 * Challenger M2-1 Empirical Measurement & Stress Test Script
 * 
 * Verifies:
 * 1. HeroBanner section dimensions across 360px, 375px, 390px, 414px, 430px (>= 380px height).
 * 2. Action button touch targets: width >= 44px, height >= 44px on all mobile viewports.
 * 3. Spacing between HeroBanner and Row 1 (<= 36px on mobile).
 * 4. Desktop parity on 1024px and 1280px (widescreen aspect ratio, zero layout regression).
 * 5. Zero horizontal overflow across all viewports.
 */

const { launchBrowser, createContext } = require('./helpers/browser');
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3008';

const VIEWPORTS = [
  { name: 'mobile-360', width: 360, height: 640, isMobile: true, hasTouch: true },
  { name: 'mobile-375', width: 375, height: 667, isMobile: true, hasTouch: true },
  { name: 'mobile-390', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'mobile-414', width: 414, height: 896, isMobile: true, hasTouch: true },
  { name: 'mobile-430', width: 430, height: 932, isMobile: true, hasTouch: true },
  { name: 'desktop-1024', width: 1024, height: 768, isMobile: false, hasTouch: false },
  { name: 'desktop-1280', width: 1280, height: 800, isMobile: false, hasTouch: false },
  { name: 'desktop-1440', width: 1440, height: 900, isMobile: false, hasTouch: false },
];

async function runMeasurements() {
  console.log('================================================================');
  console.log('  CHALLENGER M2-1 EMPIRICAL MEASUREMENT HARNESS');
  console.log(`  Target: ${BASE_URL}`);
  console.log('================================================================\n');

  const browser = await launchBrowser({ headless: true });
  const results = {
    heroDimensions: [],
    touchTargets: [],
    spacing: [],
    desktopParity: [],
    overflow: [],
  };

  try {
    for (const vp of VIEWPORTS) {
      console.log(`--- Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
      const context = await createContext(browser, vp);
      const page = await context.newPage();
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      // 1. Measure HeroBanner Section Dimensions
      const heroGeo = await page.evaluate(() => {
        const hero = document.querySelector('section:has(h1), [data-hero]');
        if (!hero) return null;
        const rect = hero.getBoundingClientRect();
        const style = window.getComputedStyle(hero);
        return {
          width: Math.round(rect.width * 100) / 100,
          height: Math.round(rect.height * 100) / 100,
          aspectRatio: style.aspectRatio,
          minHeight: style.minHeight,
          className: hero.className,
        };
      });

      console.log(`  [HeroBanner] Dim: ${heroGeo?.width}x${heroGeo?.height}px | min-height: ${heroGeo?.minHeight} | aspect-ratio: ${heroGeo?.aspectRatio}`);
      results.heroDimensions.push({
        viewport: vp.name,
        width: heroGeo?.width,
        height: heroGeo?.height,
        minHeight: heroGeo?.minHeight,
        aspectRatio: heroGeo?.aspectRatio,
        passHeightThreshold: vp.isMobile ? (heroGeo?.height >= 380) : true,
      });

      // 2. Measure Action Button Touch Targets
      const buttonsGeo = await page.evaluate(() => {
        const hero = document.querySelector('section:has(h1), [data-hero]');
        if (!hero) return [];
        const links = Array.from(hero.querySelectorAll('a, button')).filter((b) => {
          const text = b.textContent || '';
          return text.includes('Tonton') || text.includes('Detail') || text.includes('Putar') || text.includes('Mulai');
        });
        return links.map((btn) => {
          const rect = btn.getBoundingClientRect();
          const style = window.getComputedStyle(btn);
          return {
            text: (btn.textContent || '').trim().replace(/\s+/g, ' '),
            width: Math.round(rect.width * 100) / 100,
            height: Math.round(rect.height * 100) / 100,
            padding: `${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft}`,
            minHeight: style.minHeight,
            left: Math.round(rect.left * 100) / 100,
            right: Math.round(rect.right * 100) / 100,
            top: Math.round(rect.top * 100) / 100,
            bottom: Math.round(rect.bottom * 100) / 100,
          };
        });
      });

      for (const btn of buttonsGeo) {
        const passTouch = btn.width >= 43.9 && btn.height >= 43.9;
        console.log(`  [Action Target] "${btn.text}" -> ${btn.width}x${btn.height}px (minHeight: ${btn.minHeight}) | Pass 44x44: ${passTouch}`);
        results.touchTargets.push({
          viewport: vp.name,
          button: btn.text,
          width: btn.width,
          height: btn.height,
          passTouch,
        });
      }

      // Check gap between buttons if at least 2 exist
      if (buttonsGeo.length >= 2) {
        const dx = Math.abs(buttonsGeo[1].left - buttonsGeo[0].right);
        const dy = Math.abs(buttonsGeo[1].top - buttonsGeo[0].bottom);
        const gap = Math.min(dx, dy);
        console.log(`  [Button Gap] dx=${dx.toFixed(2)}px, dy=${dy.toFixed(2)}px (>= 8px: ${dx >= 8 || dy >= 8})`);
      }

      // 3. Measure Spacing between HeroBanner and Row 1
      const spacingGeo = await page.evaluate(() => {
        const hero = document.querySelector('section:has(h1), [data-hero]');
        const row1 = document.querySelector('section:has(h2)');
        if (!hero || !row1) return null;
        const heroRect = hero.getBoundingClientRect();
        const row1Rect = row1.getBoundingClientRect();
        return {
          heroBottom: Math.round(heroRect.bottom * 100) / 100,
          row1Top: Math.round(row1Rect.top * 100) / 100,
          gap: Math.round((row1Rect.top - heroRect.bottom) * 100) / 100,
          row1Heading: row1.querySelector('h2')?.textContent?.trim() || '',
        };
      });

      console.log(`  [Spacing Hero->Row 1] Gap: ${spacingGeo?.gap}px (Heading: "${spacingGeo?.row1Heading}") | Mobile requirement (<= 36px): ${vp.isMobile ? spacingGeo?.gap <= 36 : 'N/A'}`);
      results.spacing.push({
        viewport: vp.name,
        isMobile: vp.isMobile,
        gap: spacingGeo?.gap,
        row1Heading: spacingGeo?.row1Heading,
        passSpacingThreshold: vp.isMobile ? (spacingGeo?.gap <= 36) : true,
      });

      // 4. Desktop Parity & Aspect Ratio Verification
      if (!vp.isMobile) {
        const desktopChecks = await page.evaluate(() => {
          const hero = document.querySelector('section:has(h1), [data-hero]');
          const heroRect = hero?.getBoundingClientRect();
          const aspectRatio = heroRect ? Math.round((heroRect.width / heroRect.height) * 100) / 100 : 0;
          const buttons = Array.from(document.querySelectorAll('button'));
          const arrows = buttons.filter((b) => {
            const text = b.textContent || '';
            const cls = b.className || '';
            return text.includes('←') || text.includes('→') || cls.includes('left-2') || cls.includes('right-2');
          });
          const arrowsVisible = arrows.length > 0 && arrows.some(a => window.getComputedStyle(a).display !== 'none');
          const desktopNav = document.querySelector('nav .hidden.lg\\:flex, nav .lg\\:flex');
          const navVisible = desktopNav ? window.getComputedStyle(desktopNav).display !== 'none' : true;
          return {
            heroAspectRatio: aspectRatio,
            arrowsVisible,
            navVisible,
          };
        });

        console.log(`  [Desktop Parity] Aspect ratio: ${desktopChecks.heroAspectRatio} (widescreen > 2.0) | Nav visible: ${desktopChecks.navVisible} | Slider arrows visible: ${desktopChecks.arrowsVisible}`);
        results.desktopParity.push({
          viewport: vp.name,
          ...desktopChecks,
        });
      }

      // 5. Zero Horizontal Overflow
      const overflowInfo = await page.evaluate(() => {
        const docEl = document.documentElement;
        const body = document.body;
        const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
        const clientWidth = docEl.clientWidth;
        const hasOverflow = scrollWidth > clientWidth;

        let overflowingElements = [];
        if (hasOverflow) {
          const all = document.querySelectorAll('*');
          for (const el of all) {
            const r = el.getBoundingClientRect();
            if (r.right > clientWidth + 1) {
              overflowingElements.push({
                tag: el.tagName,
                class: el.className ? String(el.className).slice(0, 50) : '',
                right: r.right,
              });
            }
          }
        }

        return {
          scrollWidth,
          clientWidth,
          hasOverflow,
          overflowingElements: overflowingElements.slice(0, 5),
        };
      });

      console.log(`  [Overflow Check] scrollWidth: ${overflowInfo.scrollWidth}px, clientWidth: ${overflowInfo.clientWidth}px | Zero overflow: ${!overflowInfo.hasOverflow}`);
      results.overflow.push({
        viewport: vp.name,
        ...overflowInfo,
      });

      console.log('');
      await context.close();
    }
  } finally {
    await browser.close();
  }

  console.log('================================================================');
  console.log('  MEASUREMENT SUMMARY');
  console.log('================================================================');
  console.log(JSON.stringify(results, null, 2));
}

runMeasurements().catch(console.error);
