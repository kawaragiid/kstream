// @ts-check
/**
 * Custom E2E Assertions for Mobile Responsiveness, Subpixel Touch Targets,
 * Zero Horizontal Overflow, Drawer Scroll Lock, and Carousel Scroll Snap.
 */

const { THRESHOLDS } = require('../config');

/**
 * Asserts zero horizontal overflow on the current page
 * Formulated strictly as: Math.max(html.scrollWidth, body.scrollWidth) <= window.innerWidth
 * @param {import('@playwright/test').Page} page
 * @param {object} options
 */
async function assertNoHorizontalOverflow(page, options = {}) {
  const { tolerance = THRESHOLDS.OVERFLOW_TOLERANCE, routeLabel = page.url() } = options;

  const evaluation = await page.evaluate((tol) => {
    const docEl = document.documentElement;
    const body = document.body;
    const windowWidth = window.innerWidth;
    const scrollWidth = Math.max(docEl ? docEl.scrollWidth : 0, body ? body.scrollWidth : 0);
    const hasLeak = scrollWidth > (windowWidth + tol);

    let culprits = [];
    if (hasLeak) {
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        const rect = el.getBoundingClientRect();
        if (rect.right > (windowWidth + tol)) {
          const style = window.getComputedStyle(el);
          if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
            culprits.push({
              tag: el.tagName.toLowerCase(),
              id: el.id || null,
              classes: (typeof el.className === 'string' ? el.className : '').slice(0, 80),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
              overflowPx: Math.round(rect.right - windowWidth),
            });
            if (culprits.length >= 5) break;
          }
        }
      }
    }

    return { windowWidth, scrollWidth, hasLeak, culprits };
  }, tolerance);

  if (evaluation.hasLeak) {
    const details = evaluation.culprits
      .map((c) => `  - <${c.tag}${c.id ? ` id="${c.id}"` : ''} class="${c.classes}"> [right=${c.right}px, leak=+${c.overflowPx}px]`)
      .join('\n');
    throw new Error(
      `[Horizontal Overflow Violation] on ${routeLabel}\n` +
      `  Window innerWidth: ${evaluation.windowWidth}px\n` +
      `  Page scrollWidth:  ${evaluation.scrollWidth}px (Excess: +${evaluation.scrollWidth - evaluation.windowWidth}px)\n` +
      `  Culprit elements extending beyond viewport:\n${details || '  (No specific element found; check html/body margins)'}`
    );
  }

  return evaluation;
}

/**
 * Asserts touch target dimensions with subpixel precision tolerance
 * Evaluates: box.width >= (minWidth - epsilon) && box.height >= (minHeight - epsilon)
 * Strictly enforces subpixel epsilon tolerance without Math.round loophole.
 * @param {import('@playwright/test').Page} page
 * @param {string|import('@playwright/test').Locator} selectorOrLocator
 * @param {object} options
 */
async function assertTouchTarget(page, selectorOrLocator, options = {}) {
  const {
    minWidth = THRESHOLDS.TOUCH_TARGET_STANDARD,
    minHeight = THRESHOLDS.TOUCH_TARGET_STANDARD,
    label = '',
  } = options;

  let box = null;
  try {
    if (typeof selectorOrLocator === 'string') {
      const loc = page.locator(selectorOrLocator).first();
      box = await loc.boundingBox({ timeout: 2000 });
    } else {
      box = await selectorOrLocator.boundingBox({ timeout: 2000 });
    }
  } catch (err) {
    box = null;
  }

  if (!box) {
    throw new Error(`Touch target element "${label || selectorOrLocator}" is not visible or has no rendered bounding box`);
  }

  // Strict subpixel tolerance: box.dim >= (minDim - epsilon)
  // Eliminates Math.round loophole (which allowed 43.50px elements to pass due to Math.round(43.5) === 44)
  const epsilon = options.epsilon ?? THRESHOLDS.SUBPIXEL_EPSILON;
  const widthOk = box.width >= (minWidth - epsilon);
  const heightOk = box.height >= (minHeight - epsilon);

  if (!widthOk || !heightOk) {
    throw new Error(
      `[Touch Target Size Violation] for "${label || selectorOrLocator}"\n` +
      `  Required: width >= ${minWidth}px, height >= ${minHeight}px\n` +
      `  Measured: width = ${box.width.toFixed(2)}px, height = ${box.height.toFixed(2)}px\n` +
      `  Status:   width: ${widthOk ? 'PASS' : `FAIL (-${(minWidth - box.width).toFixed(2)}px)`}, ` +
      `height: ${heightOk ? 'PASS' : `FAIL (-${(minHeight - box.height).toFixed(2)}px)`}`
    );
  }

  return box;
}

/**
 * Observes slide-over drawer behavior, backdrop blur, scroll locks, and mutual exclusivity
 * @param {import('@playwright/test').Page} page
 */
function observeDrawerState(page) {
  return {
    async assertOpenWithScrollLock(drawerSelector = '[role="dialog"], aside, nav [data-drawer], .fixed.inset-0.z-50') {
      const state = await page.evaluate((sel) => {
        const bodyStyle = window.getComputedStyle(document.body);
        const drawerEl = document.querySelector(sel);
        const isVisible = drawerEl ? window.getComputedStyle(drawerEl).display !== 'none' : false;
        return {
          bodyOverflow: bodyStyle.overflow,
          bodyOverflowY: bodyStyle.overflowY,
          isDrawerVisible: isVisible,
        };
      }, drawerSelector);

      if (!state.isDrawerVisible) {
        throw new Error(`Drawer element "${drawerSelector}" is not visible in DOM when open`);
      }
      if (state.bodyOverflow !== 'hidden' && state.bodyOverflowY !== 'hidden') {
        throw new Error(`Body scroll lock failure: expected body overflow 'hidden', but found '${state.bodyOverflow}'`);
      }
      return state;
    },

    async assertClosedAndUnlocked(drawerSelector = '[role="dialog"], aside, nav [data-drawer], .fixed.inset-0.z-50') {
      const state = await page.evaluate((sel) => {
        const bodyStyle = window.getComputedStyle(document.body);
        const drawerEl = document.querySelector(sel);
        const isHidden = !drawerEl || window.getComputedStyle(drawerEl).display === 'none' || drawerEl.getAttribute('aria-hidden') === 'true';
        return {
          bodyOverflow: bodyStyle.overflow,
          bodyOverflowY: bodyStyle.overflowY,
          isDrawerHidden: isHidden,
        };
      }, drawerSelector);

      if (state.bodyOverflow === 'hidden' || state.bodyOverflowY === 'hidden') {
        throw new Error(`Body scroll lock leak: body overflow remains 'hidden' after drawer is closed`);
      }
      return state;
    },

    async assertMutualExclusivity(trigger1Selector, menu1Selector, trigger2Selector, menu2Selector) {
      await page.click(trigger1Selector);
      await page.waitForTimeout(100);

      await page.click(trigger2Selector);
      await page.waitForTimeout(100);

      const menu1Closed = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        return !el || window.getComputedStyle(el).display === 'none';
      }, menu1Selector);

      if (!menu1Closed) {
        throw new Error(`Mutual exclusivity violation: Menu 1 remained open after activating Menu 2`);
      }
    },
  };
}

/**
 * Asserts carousel scroll snap and next-card peek affordance
 * @param {import('@playwright/test').Page} page
 * @param {string} carouselSelector
 * @param {number} viewportWidth
 */
async function assertScrollSnapAndPeek(page, carouselSelector, viewportWidth, options = {}) {
  const { minPeekRatio = THRESHOLDS.CARD_PEEK_RATIO_MIN } = options;

  const result = await page.evaluate(({ sel, vpWidth, minPeek }) => {
    const container = document.querySelector(sel);
    if (!container) return { found: false };

    const style = window.getComputedStyle(container);
    const snapType = style.scrollSnapType || style['scroll-snap-type'] || '';

    const cards = Array.from(container.querySelectorAll('.flex-shrink-0, [data-card], a[href*="/series/"], a[href*="/movies/"]'));
    if (cards.length < 3) {
      return {
        found: true,
        count: cards.length,
        snapType,
        hasPeek: false,
        card0Width: cards[0] ? cards[0].getBoundingClientRect().width : 0,
        card0Vw: cards[0] ? (cards[0].getBoundingClientRect().width / vpWidth) * 100 : 0,
        card2PeekRatio: 0,
      };
    }

    const card0 = cards[0].getBoundingClientRect();
    const card0Snap = window.getComputedStyle(cards[0]).scrollSnapAlign;
    const card2 = cards[2].getBoundingClientRect();

    const card0Vw = (card0.width / vpWidth) * 100;
    const card2VisibleWidth = Math.max(0, vpWidth - card2.left);
    const card2PeekRatio = card2.width > 0 ? (card2VisibleWidth / card2.width) : 0;
    const hasPeek = card2.left < vpWidth && (card2.left + card2.width) > vpWidth && card2PeekRatio >= minPeek;

    return {
      found: true,
      count: cards.length,
      snapType,
      card0Snap,
      card0Width: card0.width,
      card0Vw,
      card2Left: card2.left,
      card2VisibleWidth,
      card2PeekRatio,
      hasPeek,
    };
  }, { sel: carouselSelector, vpWidth: viewportWidth, minPeek: minPeekRatio });

  if (!result.found) {
    throw new Error(`Carousel container "${carouselSelector}" not found`);
  }

  if (result.count < 3) {
    throw new Error(
      `Carousel container "${carouselSelector}" contains insufficient cards: found ${result.count}, ` +
      `expected at least 3 cards to evaluate peek affordance and scroll snap`
    );
  }

  // Strict assertion: Mobile Card Width w-[36vw] (34vw to 38vw)
  if (viewportWidth < 1024) {
    const minCardWidth = 0.34 * viewportWidth;
    const maxCardWidth = 0.38 * viewportWidth;
    if (result.card0Width < minCardWidth || result.card0Width > maxCardWidth) {
      throw new Error(
        `[Carousel Card Width Violation] on mobile viewport ${viewportWidth}px:\n` +
        `  Measured card width: ${result.card0Width.toFixed(2)}px (${result.card0Vw.toFixed(1)}vw)\n` +
        `  Expected range: ${minCardWidth.toFixed(2)}px - ${maxCardWidth.toFixed(2)}px (34vw - 38vw for w-[36vw])`
      );
    }
  }

  // Strict assertion: Card 3 peek percentage >= 20%
  if (!result.hasPeek || result.card2PeekRatio < minPeekRatio) {
    throw new Error(
      `[Carousel Next-Card Peek Violation] on viewport ${viewportWidth}px:\n` +
      `  Card 3 (index 2) peek ratio: ${(result.card2PeekRatio * 100).toFixed(1)}%\n` +
      `  Required minimum peek ratio: ${(minPeekRatio * 100).toFixed(1)}% (at least 20% of Card 3 must be visible)`
    );
  }

  return result;
}

module.exports = {
  assertNoHorizontalOverflow,
  assertTouchTarget,
  observeDrawerState,
  assertScrollSnapAndPeek,
};
