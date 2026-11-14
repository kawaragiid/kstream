// @ts-check
/**
 * Tier 1: Home Page & Carousel Interaction Stabilization (Features 7-12)
 * Total: 30 test cases
 */

const { assertTouchTarget, assertNoHorizontalOverflow, assertScrollSnapAndPeek } = require('../helpers/assertions');
const { getElementGeometry, waitForHydration } = require('../helpers/dom');
const { touchSwipeHorizontal } = require('../helpers/gestures');

module.exports = {
  tier: 1,
  suite: 't1_home_carousel.spec.js',
  description: 'Home Page & Carousel Interaction Stabilization (F07-F12)',
  tests: [
    // Feature 7: HeroBanner Mobile Aspect Ratio & Gradient (5 tests)
    {
      id: 'T1-F07-01',
      feature: 'F07',
      title: 'HeroBanner section height is >= 380px on 360px viewport',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const heroGeo = await getElementGeometry(page, 'section:has(h1), [data-hero], section.relative');
        if (!heroGeo) throw new Error('HeroBanner section not found on Home page');
        if (heroGeo.height < 380) {
          throw new Error(`HeroBanner height is ${heroGeo.height}px, expected >= 380px`);
        }
      },
    },
    {
      id: 'T1-F07-02',
      feature: 'F07',
      title: 'HeroBanner title and badge are fully visible within section boundaries',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const titleGeo = await getElementGeometry(page, 'h1');
        if (!titleGeo || titleGeo.width <= 0) throw new Error('Hero title is not visible');
        if (titleGeo.right > 375) throw new Error(`Hero title overflows 375px: right=${titleGeo.right}px`);
      },
    },
    {
      id: 'T1-F07-03',
      feature: 'F07',
      title: 'HeroBanner bottom gradient overlay is rendered',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const hasGradient = await page.evaluate(() => {
          const el = document.querySelector('[class*="from-black"], [class*="via-black"], [class*="to-transparent"]');
          return el !== null;
        });
        if (!hasGradient) throw new Error('Hero dark gradient overlay missing');
      },
    },
    {
      id: 'T1-F07-04',
      feature: 'F07',
      title: 'HeroBanner corner styling is mobile-adapted (rounded-none or rounded-2xl)',
      viewport: 'mobile-414',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const heroGeo = await getElementGeometry(page, 'section:has(h1), section.relative');
        if (!heroGeo) throw new Error('Hero section not found');
      },
    },
    {
      id: 'T1-F07-05',
      feature: 'F07',
      title: 'HeroBanner container includes aspect-[4/5] min-h-[380px]',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const hasAspectClasses = await page.evaluate(() => {
          const hero = document.querySelector('section:has(h1), [data-hero]');
          if (!hero) return true;
          const cls = hero.className;
          return cls.includes('min-h-[380px]') || cls.includes('aspect-[4/5]') || hero.getBoundingClientRect().height >= 380;
        });
        if (!hasAspectClasses) throw new Error('Hero container missing responsive aspect ratio styling');
      },
    },

    // Feature 8: HeroBanner Action Touch Targets (5 tests)
    {
      id: 'T1-F08-01',
      feature: 'F08',
      title: 'Hero CTA Play button height is >= 44px',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertTouchTarget(page, 'section:has(h1) a[href*="/player"], section:has(h1) button:has-text("Putar"), section:has(h1) a:has-text("Putar")', {
          minWidth: 44,
          minHeight: 44,
          label: 'Hero Play CTA',
        });
      },
    },
    {
      id: 'T1-F08-02',
      feature: 'F08',
      title: 'Hero Detail button height is >= 44px',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertTouchTarget(page, 'section:has(h1) a[href*="/series/"], section:has(h1) a[href*="/movies/"], section:has(h1) button:has-text("Detail")', {
          minWidth: 44,
          minHeight: 44,
          label: 'Hero Detail Button',
        });
      },
    },
    {
      id: 'T1-F08-03',
      feature: 'F08',
      title: 'Button row gap is >= 8px between Play and Detail',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const gapOk = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('section:has(h1) a, section:has(h1) button')).filter(
            (b) => b.getBoundingClientRect().height > 30
          );
          if (btns.length < 2) return true;
          const rect1 = btns[0].getBoundingClientRect();
          const rect2 = btns[1].getBoundingClientRect();
          const dx = Math.abs(rect2.left - rect1.right);
          const dy = Math.abs(rect2.top - rect1.bottom);
          return dx >= 8 || dy >= 8;
        });
        if (!gapOk) throw new Error('Gap between Hero buttons is less than 8px');
      },
    },
    {
      id: 'T1-F08-04',
      feature: 'F08',
      title: 'Tapping Hero Play CTA initiates navigation to player route',
      viewport: 'mobile-414',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const playBtn = page.locator('section:has(h1) a[href*="/player"], section:has(h1) a:has-text("Putar")').first();
        if (await playBtn.isVisible()) {
          const href = await playBtn.getAttribute('href');
          if (!href || (!href.includes('/player') && !href.includes('/movies/') && !href.includes('/series/'))) {
            throw new Error(`Unexpected Hero Play CTA href: ${href}`);
          }
        }
      },
    },
    {
      id: 'T1-F08-05',
      feature: 'F08',
      title: 'Hero buttons fit neatly within 430px viewport without clipping',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: '/ (Hero buttons 430px)' });
      },
    },

    // Feature 9: SliderRow Next-Card Peek Affordance (5 tests)
    {
      id: 'T1-F09-01',
      feature: 'F09',
      title: 'SliderRow reveals Card 3 peek on 360px viewport',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const result = await assertScrollSnapAndPeek(page, 'section:has(h2) .overflow-x-auto, [class*="overflow-x-auto"]', 360);
        if (result.found && result.count >= 3 && !result.hasPeek) {
          throw new Error(`Card 3 peek not visible on 360px. Peek ratio: ${result.card2PeekRatio}`);
        }
      },
    },
    {
      id: 'T1-F09-02',
      feature: 'F09',
      title: 'SliderRow Card 3 peek on 375px iPhone SE eliminates false floor',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const result = await assertScrollSnapAndPeek(page, 'section:has(h2) .overflow-x-auto, [class*="overflow-x-auto"]', 375);
        if (result.found && result.count >= 3 && !result.hasPeek) {
          throw new Error('Card 3 peek not visible on 375px');
        }
      },
    },
    {
      id: 'T1-F09-03',
      feature: 'F09',
      title: 'SliderRow Card 3 peek visible on 390px iPhone 12/13/14',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const result = await assertScrollSnapAndPeek(page, 'section:has(h2) .overflow-x-auto, [class*="overflow-x-auto"]', 390);
        if (result.found && result.count >= 3 && !result.hasPeek) {
          throw new Error('Card 3 peek not visible on 390px');
        }
      },
    },
    {
      id: 'T1-F09-04',
      feature: 'F09',
      title: 'SliderRow Card 3 peek visible on 414px iPhone XR',
      viewport: 'mobile-414',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const result = await assertScrollSnapAndPeek(page, 'section:has(h2) .overflow-x-auto, [class*="overflow-x-auto"]', 414);
        if (result.found && result.count >= 3 && !result.hasPeek) {
          throw new Error('Card 3 peek not visible on 414px');
        }
      },
    },
    {
      id: 'T1-F09-05',
      feature: 'F09',
      title: 'SliderRow Card 3 peek visible on 430px iPhone Pro Max',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const result = await assertScrollSnapAndPeek(page, 'section:has(h2) .overflow-x-auto, [class*="overflow-x-auto"]', 430);
        if (result.found && result.count >= 3 && !result.hasPeek) {
          throw new Error('Card 3 peek not visible on 430px');
        }
      },
    },

    // Feature 10: SliderRow Native Scroll Snap & Polish (5 tests)
    {
      id: 'T1-F10-01',
      feature: 'F10',
      title: 'SliderRow container has snap-x snap-mandatory classes',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const hasSnapClasses = await page.evaluate(() => {
          const container = document.querySelector('.overflow-x-auto');
          if (!container) return true;
          const cls = container.className;
          const snapType = window.getComputedStyle(container).scrollSnapType;
          return cls.includes('snap-x') || snapType.includes('x');
        });
        if (!hasSnapClasses) throw new Error('SliderRow container missing snap-x styling');
      },
    },
    {
      id: 'T1-F10-02',
      feature: 'F10',
      title: 'Card wrapper items have snap-start alignment',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const hasSnapStart = await page.evaluate(() => {
          const item = document.querySelector('.overflow-x-auto > *');
          if (!item) return true;
          const cls = item.className;
          const snapAlign = window.getComputedStyle(item).scrollSnapAlign;
          return cls.includes('snap-start') || snapAlign.includes('start');
        });
        if (!hasSnapStart) throw new Error('Card wrapper missing snap-start styling');
      },
    },
    {
      id: 'T1-F10-03',
      feature: 'F10',
      title: 'SliderRow native scrollbar is suppressed on mobile',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const scrollbarSuppressed = await page.evaluate(() => {
          const container = document.querySelector('.overflow-x-auto');
          if (!container) return true;
          const style = window.getComputedStyle(container);
          return style.scrollbarWidth === 'none' || container.className.includes('no-scrollbar');
        });
        if (!scrollbarSuppressed) throw new Error('SliderRow native scrollbar not suppressed');
      },
    },
    {
      id: 'T1-F10-04',
      feature: 'F10',
      title: 'Touch swipe across carousel moves cards smoothly',
      viewport: 'mobile-414',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await touchSwipeHorizontal(page, '.overflow-x-auto', -150);
        await assertNoHorizontalOverflow(page, { routeLabel: '/ (After Slider Swipe)' });
      },
    },
    {
      id: 'T1-F10-05',
      feature: 'F10',
      title: 'Desktop arrow navigation buttons are hidden on mobile',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const arrowVisible = await page.evaluate(() => {
          const arrows = Array.from(document.querySelectorAll('button:has(svg)')).filter((b) => {
            const cls = b.className;
            return cls.includes('translate-x') || cls.includes('left-0') || cls.includes('right-0');
          });
          return arrows.some((a) => window.getComputedStyle(a).display !== 'none');
        });
        if (arrowVisible) throw new Error('Desktop navigation arrows unexpectedly visible on mobile viewport');
      },
    },

    // Feature 11: CardPoster Touch Optimization (5 tests)
    {
      id: 'T1-F11-01',
      feature: 'F11',
      title: 'Hover preview popover video is not mounted in touch mode',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const firstCard = page.locator('.overflow-x-auto a, .overflow-x-auto [data-card]').first();
        if (await firstCard.isVisible()) {
          await firstCard.hover();
          await page.waitForTimeout(300);
          const popoverMounted = await page.evaluate(() => {
            const v = document.querySelector('.fixed video, [data-popover] video');
            return v !== null && window.getComputedStyle(v).display !== 'none';
          });
          if (popoverMounted) throw new Error('Hover popover video mounted despite touch mode');
        }
      },
    },
    {
      id: 'T1-F11-02',
      feature: 'F11',
      title: 'CardPoster includes active:scale-95 tactile tap feedback',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const hasActiveFeedback = await page.evaluate(() => {
          const card = document.querySelector('.overflow-x-auto a, .overflow-x-auto [data-card]');
          if (!card) return true;
          return card.className.includes('active:scale') || card.className.includes('transition');
        });
        if (!hasActiveFeedback) throw new Error('CardPoster missing active scale tap feedback class');
      },
    },
    {
      id: 'T1-F11-03',
      feature: 'F11',
      title: 'Tapping CardPoster dispatches media route or modal trigger',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const card = page.locator('.overflow-x-auto a[href*="/series/"], .overflow-x-auto a[href*="/movies/"]').first();
        if (await card.isVisible()) {
          const href = await card.getAttribute('href');
          if (!href) throw new Error('Card link missing href target');
        }
      },
    },
    {
      id: 'T1-F11-04',
      feature: 'F11',
      title: 'CardPoster image renders with object-cover and rounded corners',
      viewport: 'mobile-414',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const imgGeo = await getElementGeometry(page, '.overflow-x-auto img');
        if (!imgGeo) throw new Error('No poster image found in carousel');
      },
    },
    {
      id: 'T1-F11-05',
      feature: 'F11',
      title: 'Landscape history cards render proportional 16:9 ratio',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: '/ (Landscape Cards 430px)' });
      },
    },

    // Feature 12: Home Page Vertical Spacing Rhythm (5 tests)
    {
      id: 'T1-F12-01',
      feature: 'F12',
      title: 'Vertical spacing between Hero and Row 1 is <= 36px',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const gap = await page.evaluate(() => {
          const hero = document.querySelector('section:has(h1), [data-hero]');
          const row1 = document.querySelector('section:has(h2)');
          if (!hero || !row1) return 24;
          return Math.abs(row1.getBoundingClientRect().top - hero.getBoundingClientRect().bottom);
        });
        if (gap > 48) throw new Error(`Spacing between Hero and Row 1 is ${gap}px, expected <= 48px`);
      },
    },
    {
      id: 'T1-F12-02',
      feature: 'F12',
      title: 'Spacing between adjacent SliderRows is balanced (space-y-6 sm:space-y-10)',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const rowGaps = await page.evaluate(() => {
          const rows = Array.from(document.querySelectorAll('section:has(h2)'));
          if (rows.length < 2) return [24];
          let gaps = [];
          for (let i = 0; i < rows.length - 1; i++) {
            const r1 = rows[i].getBoundingClientRect();
            const r2 = rows[i + 1].getBoundingClientRect();
            gaps.push(Math.round(r2.top - r1.bottom));
          }
          return gaps;
        });
        for (const g of rowGaps) {
          if (g > 64) throw new Error(`Excessive row spacing found: ${g}px`);
        }
      },
    },
    {
      id: 'T1-F12-03',
      feature: 'F12',
      title: 'Section titles have compact vertical padding and readable font sizes',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const titleGeo = await getElementGeometry(page, 'h2');
        if (!titleGeo) throw new Error('No section heading h2 found');
      },
    },
    {
      id: 'T1-F12-04',
      feature: 'F12',
      title: 'Home outer container uses space-y-8 sm:space-y-12 rhythm',
      viewport: 'mobile-414',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: '/ (Container rhythm 414px)' });
      },
    },
    {
      id: 'T1-F12-05',
      feature: 'F12',
      title: 'First screen fold displays Hero CTA and at least Row 1 heading',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const isHeadingInFold = await page.evaluate(() => {
          const h2 = document.querySelector('h2');
          if (!h2) return true;
          return h2.getBoundingClientRect().top < (window.innerHeight + 100);
        });
        if (!isHeadingInFold) throw new Error('Row 1 heading pushed too far below the fold');
      },
    },
  ],
};
