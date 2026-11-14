// @ts-check
/**
 * Mobile Touch Gesture Emulation (Tap, Swipe, Flick, Scroll)
 */

/**
 * Dispatches a genuine touch tap at the center of an element
 * @param {import('@playwright/test').Page} page
 * @param {string|import('@playwright/test').Locator} selectorOrLocator
 */
async function touchTap(page, selectorOrLocator) {
  let box = null;
  try {
    const locator = typeof selectorOrLocator === 'string' ? page.locator(selectorOrLocator).first() : selectorOrLocator;
    box = await locator.boundingBox({ timeout: 2000 });
  } catch (err) {
    box = null;
  }
  if (!box) {
    return;
  }

  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  // Use touch events if supported, fallback to click
  await page.touchscreen.tap(x, y).catch(async () => {
    await page.mouse.click(x, y);
  });
}

/**
 * Emulates a horizontal touch swipe across a target element or coordinate
 * @param {import('@playwright/test').Page} page
 * @param {string} containerSelector
 * @param {number} distancePx Negative for swipe left (scroll right), positive for swipe right
 * @param {number} steps
 */
async function touchSwipeHorizontal(page, containerSelector, distancePx = -200, steps = 10) {
  let box = null;
  try {
    const loc = page.locator(containerSelector).first();
    box = await loc.boundingBox({ timeout: 2000 });
  } catch (err) {
    box = null;
  }
  if (!box) return;

  const startX = box.x + box.width * 0.7;
  const startY = box.y + box.height / 2;
  const endX = startX + distancePx;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    const currentX = startX + (distancePx * i) / steps;
    await page.mouse.move(currentX, startY);
    await page.waitForTimeout(20);
  }
  await page.mouse.up();
  await page.waitForTimeout(100);
}

/**
 * Emulates a vertical swipe (fling scroll)
 * @param {import('@playwright/test').Page} page
 * @param {number} distancePx
 */
async function touchFlingVertical(page, distancePx = 500) {
  await page.mouse.wheel(0, distancePx);
  await page.waitForTimeout(100);
}

module.exports = {
  touchTap,
  touchSwipeHorizontal,
  touchFlingVertical,
};
