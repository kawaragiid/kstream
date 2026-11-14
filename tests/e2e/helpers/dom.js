// @ts-check
/**
 * Accessible DOM Inspection & Element Geometry Utilities
 */

/**
 * Retrieves the bounding client rect and computed style properties of an element
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 */
async function getElementGeometry(page, selector) {
  return await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      right: rect.right,
      bottom: rect.bottom,
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      position: style.position,
      zIndex: style.zIndex,
      overflow: style.overflow,
      overflowX: style.overflowX,
      overflowY: style.overflowY,
      borderRadius: style.borderRadius,
      aspectRatio: style.aspectRatio,
    };
  }, selector);
}

/**
 * Retrieves content attribute of a meta tag
 * @param {import('@playwright/test').Page} page
 * @param {string} nameOrProperty
 */
async function getMetaTag(page, nameOrProperty) {
  return await page.evaluate((name) => {
    const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    return meta ? meta.getAttribute('content') : null;
  }, nameOrProperty);
}

/**
 * Checks if an element is present and visible in the viewport
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 */
async function isElementVisible(page, selector) {
  return await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }, selector);
}

/**
 * Wait for Next.js page hydration to settle
 * @param {import('@playwright/test').Page} page
 * @param {number} timeoutMs
 */
async function waitForHydration(page, timeoutMs = 3000) {
  try {
    await page.waitForLoadState('domcontentloaded', { timeout: timeoutMs });
    await page.waitForTimeout(200); // small tick for React 19 hydration
  } catch (e) {
    // proceed even if timeout occurs
  }
}

module.exports = {
  getElementGeometry,
  getMetaTag,
  isElementVisible,
  waitForHydration,
};
