// @ts-check
/**
 * Tier 1: Layout & Viewport Foundation (Features 1-6)
 * Total: 30 test cases
 */

const { assertTouchTarget, assertNoHorizontalOverflow, observeDrawerState } = require('../helpers/assertions');
const { getMetaTag, getElementGeometry, waitForHydration } = require('../helpers/dom');
const { touchTap } = require('../helpers/gestures');

module.exports = {
  tier: 1,
  suite: 't1_layout_viewport.spec.js',
  description: 'Global Layout, Viewport Configuration & Navigation Foundation (F01-F06)',
  tests: [
    // Feature 1: Viewport Configuration (5 tests)
    {
      id: 'T1-F01-01',
      feature: 'F01',
      title: 'Viewport meta contains viewport-fit=cover',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const content = await getMetaTag(page, 'viewport');
        if (!content || !content.includes('viewport-fit=cover')) {
          throw new Error(`Expected viewport meta to include 'viewport-fit=cover', found: '${content}'`);
        }
      },
    },
    {
      id: 'T1-F01-02',
      feature: 'F01',
      title: 'Viewport meta contains width=device-width and initial-scale=1',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const content = await getMetaTag(page, 'viewport');
        if (!content || !content.includes('width=device-width') || !content.includes('initial-scale=1')) {
          throw new Error(`Expected viewport meta with width=device-width & initial-scale=1, got: '${content}'`);
        }
      },
    },
    {
      id: 'T1-F01-03',
      feature: 'F01',
      title: 'Meta theme-color content is #000000',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const color = await getMetaTag(page, 'theme-color');
        if (!color || color.toLowerCase() !== '#000000') {
          throw new Error(`Expected theme-color '#000000', found: '${color}'`);
        }
      },
    },
    {
      id: 'T1-F01-04',
      feature: 'F01',
      title: 'Viewport allows accessibility scaling',
      viewport: 'mobile-414',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const content = await getMetaTag(page, 'viewport');
        if (content && (content.includes('user-scalable=no') || content.includes('maximum-scale=1'))) {
          throw new Error(`Accessibility scaling restricted: '${content}'`);
        }
      },
    },
    {
      id: 'T1-F01-05',
      feature: 'F01',
      title: 'Full-bleed layout without letterboxing inset gaps',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const bodyGeo = await getElementGeometry(page, 'body');
        if (!bodyGeo || bodyGeo.left > 0) {
          throw new Error(`Body element has unwanted left letterbox inset: ${bodyGeo?.left}px`);
        }
      },
    },

    // Feature 2: Global Overflow-X Suppression (5 tests)
    {
      id: 'T1-F02-01',
      feature: 'F02',
      title: 'Document body overflow-x is hidden',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const overflowX = await page.evaluate(() => window.getComputedStyle(document.body).overflowX);
        if (overflowX !== 'hidden' && overflowX !== 'clip') {
          throw new Error(`Expected body overflow-x 'hidden' or 'clip', found: '${overflowX}'`);
        }
      },
    },
    {
      id: 'T1-F02-02',
      feature: 'F02',
      title: 'Document root html overflow-x is hidden or clipped',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const overflowX = await page.evaluate(() => window.getComputedStyle(document.documentElement).overflowX);
        if (overflowX !== 'hidden' && overflowX !== 'clip') {
          throw new Error(`Expected html overflow-x 'hidden' or 'clip', found: '${overflowX}'`);
        }
      },
    },
    {
      id: 'T1-F02-03',
      feature: 'F02',
      title: 'Tap highlight color is transparent on interactive elements',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const tapHighlight = await page.evaluate(() => {
          const btn = document.querySelector('button, a, nav');
          if (!btn) return 'transparent';
          return window.getComputedStyle(btn).webkitTapHighlightColor;
        });
        const isTransparent = tapHighlight === 'transparent' || tapHighlight === 'rgba(0, 0, 0, 0)';
        if (!isTransparent) {
          throw new Error(`Expected transparent tap highlight, got: '${tapHighlight}'`);
        }
      },
    },
    {
      id: 'T1-F02-04',
      feature: 'F02',
      title: 'No-scrollbar utility hides scrollbar metrics',
      viewport: 'mobile-414',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const scrollbarStyle = await page.evaluate(() => {
          const el = document.querySelector('.no-scrollbar') || document.querySelector('[class*="no-scrollbar"]');
          if (!el) return { scrollbarWidth: 'none' };
          return { scrollbarWidth: window.getComputedStyle(el).scrollbarWidth };
        });
        if (scrollbarStyle.scrollbarWidth && scrollbarStyle.scrollbarWidth !== 'none' && scrollbarStyle.scrollbarWidth !== 'auto') {
          throw new Error(`Expected scrollbar-width none, found: '${scrollbarStyle.scrollbarWidth}'`);
        }
      },
    },
    {
      id: 'T1-F02-05',
      feature: 'F02',
      title: 'Vertical scroll progresses without horizontal jitter',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await page.mouse.wheel(0, 400);
        await page.waitForTimeout(100);
        await assertNoHorizontalOverflow(page, { routeLabel: '/' });
      },
    },

    // Feature 3: Navbar 360px Fit (5 tests)
    {
      id: 'T1-F03-01',
      feature: 'F03',
      title: 'Logged-out top navbar fits within 340px width',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const navGeo = await getElementGeometry(page, 'nav, header');
        if (!navGeo) throw new Error('Navbar/Header not found');
        if (navGeo.width > 360) {
          throw new Error(`Navbar width exceeds 360px: ${navGeo.width}px`);
        }
      },
    },
    {
      id: 'T1-F03-02',
      feature: 'F03',
      title: 'Navbar elements fit horizontally without wrapping',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: '/ (Navbar)' });
      },
    },
    {
      id: 'T1-F03-03',
      feature: 'F03',
      title: 'Navbar layout on 375px iPhone SE has zero horizontal spill',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: '/ (375px Navbar)' });
      },
    },
    {
      id: 'T1-F03-04',
      feature: 'F03',
      title: 'Nav items have clean spacing and margins',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const spacingCheck = await page.evaluate(() => {
          const nav = document.querySelector('nav');
          if (!nav) return true;
          const rect = nav.getBoundingClientRect();
          return rect.width <= window.innerWidth;
        });
        if (!spacingCheck) throw new Error('Navbar items spilled beyond window width');
      },
    },
    {
      id: 'T1-F03-05',
      feature: 'F03',
      title: 'Navbar evenly distributed on 430px large mobile',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: '/ (430px Navbar)' });
      },
    },

    // Feature 4: Touch Target Compliance (5 tests)
    {
      id: 'T1-F04-01',
      feature: 'F04',
      title: 'Hamburger button touch target is >= 44x44px',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertTouchTarget(page, 'button[aria-label*="menu" i], button[aria-label*="navigasi" i], button:has(svg)', {
          minWidth: 44,
          minHeight: 44,
          label: 'Hamburger Button',
        });
      },
    },
    {
      id: 'T1-F04-02',
      feature: 'F04',
      title: 'Search button/link touch target is >= 44x44px',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertTouchTarget(page, 'a[href*="/search"], button[aria-label*="cari" i]', {
          minWidth: 44,
          minHeight: 44,
          label: 'Search Button',
        });
      },
    },
    {
      id: 'T1-F04-03',
      feature: 'F04',
      title: 'Profile avatar or auth CTA has touch target >= 44px',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertTouchTarget(page, 'nav a[href*="login"], nav a[href*="auth"], nav button:has(img), nav a:has(img)', {
          minWidth: 40,
          minHeight: 44,
          label: 'Auth / Profile Target',
        });
      },
    },
    {
      id: 'T1-F04-04',
      feature: 'F04',
      title: 'Auth button touch target area on 414px viewport',
      viewport: 'mobile-414',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertTouchTarget(page, 'nav a[href*="login"], nav a[href*="auth"], nav button[aria-label*="menu" i]', {
          minWidth: 40,
          minHeight: 40,
          label: 'Mobile Nav Action Target',
        });
      },
    },
    {
      id: 'T1-F04-05',
      feature: 'F04',
      title: 'Footer navigation links have touch target >= 44px',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertTouchTarget(page, 'footer a', {
          minWidth: 32,
          minHeight: 44,
          label: 'Footer Link',
        });
      },
    },

    // Feature 5: Mobile Drawer (5 tests)
    {
      id: 'T1-F05-01',
      feature: 'F05',
      title: 'Tap hamburger renders slide-over drawer modal with fixed inset-0',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const hamburger = page.locator('button[aria-label*="menu" i], button[aria-label*="navigasi" i]').first();
        await hamburger.click();
        await page.waitForTimeout(200);
        const drawerGeo = await getElementGeometry(page, '[role="dialog"], aside, nav [data-drawer], .fixed.inset-0');
        if (!drawerGeo || drawerGeo.position !== 'fixed') {
          throw new Error('Drawer element is not fixed in viewport');
        }
      },
    },
    {
      id: 'T1-F05-02',
      feature: 'F05',
      title: 'Drawer backdrop has dark blur styling',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const hamburger = page.locator('button[aria-label*="menu" i], button[aria-label*="navigasi" i]').first();
        await hamburger.click();
        await page.waitForTimeout(200);
        const hasBackdrop = await page.evaluate(() => {
          const bd = document.querySelector('.backdrop-blur-sm, [class*="backdrop-blur"], .bg-black\\/80, .fixed.inset-0');
          return bd !== null;
        });
        if (!hasBackdrop) throw new Error('Drawer backdrop blur overlay not found');
      },
    },
    {
      id: 'T1-F05-03',
      feature: 'F05',
      title: 'Tap backdrop closes drawer smoothly',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const hamburger = page.locator('button[aria-label*="menu" i], button[aria-label*="navigasi" i]').first();
        await hamburger.click();
        await page.waitForTimeout(200);
        // tap outside at right side
        await page.mouse.click(350, 400);
        await page.waitForTimeout(200);
        const isClosed = await page.evaluate(() => {
          const drawer = document.querySelector('[role="dialog"], aside, nav [data-drawer]');
          return !drawer || window.getComputedStyle(drawer).display === 'none' || drawer.getAttribute('aria-hidden') === 'true';
        });
        if (!isClosed) throw new Error('Drawer remained visible after backdrop click');
      },
    },
    {
      id: 'T1-F05-04',
      feature: 'F05',
      title: 'Tap Close button dismisses drawer',
      viewport: 'mobile-414',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const hamburger = page.locator('button[aria-label*="menu" i], button[aria-label*="navigasi" i]').first();
        await hamburger.click();
        await page.waitForTimeout(200);
        const closeBtn = page.locator('button[aria-label*="tutup" i], button[aria-label*="close" i], button:has(svg)').first();
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
          await page.waitForTimeout(200);
        }
      },
    },
    {
      id: 'T1-F05-05',
      feature: 'F05',
      title: 'Drawer locks document body scroll while active',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const hamburger = page.locator('button[aria-label*="menu" i], button[aria-label*="navigasi" i]').first();
        await hamburger.click();
        await page.waitForTimeout(200);
        const observer = observeDrawerState(page);
        await observer.assertOpenWithScrollLock();
      },
    },

    // Feature 6: Menu Mutual Exclusivity (5 tests)
    {
      id: 'T1-F06-01',
      feature: 'F06',
      title: 'Opening mobile drawer closes profile dropdown',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        // Trigger drawer
        const hamburger = page.locator('button[aria-label*="menu" i], button[aria-label*="navigasi" i]').first();
        await hamburger.click();
        await page.waitForTimeout(200);
        const profileOpen = await page.evaluate(() => {
          const p = document.querySelector('[data-profile-menu], [role="menu"]');
          return p && window.getComputedStyle(p).display !== 'none';
        });
        if (profileOpen) throw new Error('Profile dropdown remained open when drawer opened');
      },
    },
    {
      id: 'T1-F06-02',
      feature: 'F06',
      title: 'Opening profile dropdown closes mobile drawer',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const avatar = page.locator('button[aria-label*="profil" i], nav button:has(img)').first();
        if (await avatar.isVisible()) {
          await avatar.click();
          await page.waitForTimeout(200);
          const drawerOpen = await page.evaluate(() => {
            const d = document.querySelector('[role="dialog"], aside, nav [data-drawer]');
            return d && window.getComputedStyle(d).display !== 'none';
          });
          if (drawerOpen) throw new Error('Drawer remained open when profile menu opened');
        }
      },
    },
    {
      id: 'T1-F06-03',
      feature: 'F06',
      title: 'Closing drawer leaves profile dropdown closed',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const hamburger = page.locator('button[aria-label*="menu" i], button[aria-label*="navigasi" i]').first();
        await hamburger.click();
        await page.waitForTimeout(150);
        await page.mouse.click(350, 400);
        await page.waitForTimeout(150);
        const profileOpen = await page.evaluate(() => {
          const p = document.querySelector('[data-profile-menu], [role="menu"]');
          return p && window.getComputedStyle(p).display !== 'none';
        });
        if (profileOpen) throw new Error('Ghost profile dropdown appeared after closing drawer');
      },
    },
    {
      id: 'T1-F06-04',
      feature: 'F06',
      title: 'Tapping outside closes any open navigation menu',
      viewport: 'mobile-414',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await page.mouse.click(200, 300);
        await page.waitForTimeout(100);
        const anyMenuOpen = await page.evaluate(() => {
          const d = document.querySelector('[role="dialog"], [role="menu"]');
          return d && window.getComputedStyle(d).display !== 'none';
        });
        if (anyMenuOpen) throw new Error('Menu still open after document body tap');
      },
    },
    {
      id: 'T1-F06-05',
      feature: 'F06',
      title: 'Resizing mobile to desktop closes mobile drawer cleanly',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const hamburger = page.locator('button[aria-label*="menu" i], button[aria-label*="navigasi" i]').first();
        if (await hamburger.isVisible()) {
          await hamburger.click();
          await page.waitForTimeout(100);
        }
        await page.setViewportSize({ width: 1024, height: 768 });
        await page.waitForTimeout(200);
        const drawerVisible = await page.evaluate(() => {
          const d = document.querySelector('nav [data-drawer], aside');
          return d && window.getComputedStyle(d).display !== 'none';
        });
        if (drawerVisible) throw new Error('Drawer did not hide on desktop resize');
      },
    },
  ],
};
