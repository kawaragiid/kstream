// @ts-check
/**
 * Browser & Page Lifecycle Management with Multi-Viewport Emulation
 */

const { chromium } = require('@playwright/test');
const { VIEWPORT_PRESETS, getViewport } = require('../fixtures/viewports');

/**
 * Verifies whether a URL points to a genuine Kstream application instance.
 * @param {string} url
 * @param {number} timeoutMs
 * @returns {Promise<{ reachable: boolean, isKstream: boolean, details?: string, title?: string, server?: string }>}
 */
async function verifyServerIdentity(url, timeoutMs = 15000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(timer);

    if (res.status < 200 || res.status >= 400) {
      return { reachable: false, isKstream: false, details: `HTTP status ${res.status}` };
    }

    const html = await res.text();
    const poweredBy = res.headers.get('x-powered-by') || '';
    const serverHeader = res.headers.get('server') || '';

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    const hasKstreamTitle = /kstream/i.test(title);
    const hasKstreamBrand = html.includes('Kstream');
    const hasNextJs = poweredBy.toLowerCase().includes('next.js') || html.includes('/_next/') || html.includes('__NEXT_DATA__');

    const isKstream = (hasKstreamTitle || hasKstreamBrand) && hasNextJs;

    return {
      reachable: true,
      isKstream,
      title,
      server: poweredBy || serverHeader || 'unknown',
      details: isKstream
        ? `Verified Kstream Next.js instance (title: "${title}")`
        : `Foreign server detected (title: "${title || 'none'}", server: "${poweredBy || serverHeader || 'unknown'}")`,
    };
  } catch (err) {
    return { reachable: false, isKstream: false, details: err.message };
  }
}

/**
 * Probes and resolves an active Kstream application server.
 * Supports auto-discovery across candidate ports if the default URL is occupied by a foreign server.
 * @param {string} targetUrl
 * @param {boolean} isExplicit
 * @returns {Promise<{ success: boolean, url?: string, autoDiscovered?: boolean, details?: string, error?: string }>}
 */
async function resolveKstreamServer(targetUrl = 'http://localhost:3000', isExplicit = false) {
  if (isExplicit) {
    const res = await verifyServerIdentity(targetUrl);
    if (!res.reachable) {
      return { success: false, error: `Target server unreachable at ${targetUrl}: ${res.details}` };
    }
    if (!res.isKstream) {
      return { success: false, error: `Target ${targetUrl} is reachable but NOT Kstream (${res.details})` };
    }
    return { success: true, url: targetUrl, details: res.details, autoDiscovered: false };
  }

  // 1. Probe default target
  const defaultCheck = await verifyServerIdentity(targetUrl);
  if (defaultCheck.reachable && defaultCheck.isKstream) {
    return { success: true, url: targetUrl, details: defaultCheck.details, autoDiscovered: false };
  }

  // 2. Candidate port discovery
  const CANDIDATE_PORTS = [3005, 3001, 3002, 3003, 3004];
  for (const port of CANDIDATE_PORTS) {
    const candidateUrl = `http://localhost:${port}`;
    const candCheck = await verifyServerIdentity(candidateUrl, 1500);
    if (candCheck.reachable && candCheck.isKstream) {
      return {
        success: true,
        url: candidateUrl,
        details: `Auto-discovered genuine Kstream instance on port ${port} (default ${targetUrl} rejected: ${defaultCheck.details})`,
        autoDiscovered: true,
      };
    }
  }

  return {
    success: false,
    error: `No genuine Kstream server found on ${targetUrl} (${defaultCheck.details}) or candidate ports (${CANDIDATE_PORTS.join(', ')}).`,
  };
}

/**
 * Legacy compatibility wrapper for checkServerReachable
 * @param {string} baseUrl
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
async function checkServerReachable(baseUrl = 'http://localhost:3000', timeoutMs = 3000) {
  const res = await verifyServerIdentity(baseUrl, timeoutMs);
  return res.reachable && res.isKstream;
}

/**
 * Launches Chromium with system channel fallback (Chrome -> Edge -> default Chromium)
 * @param {object} options
 */
async function launchBrowser(options = {}) {
  const headless = options.headless !== false;
  const preferredChannel = process.env.BROWSER_CHANNEL || options.channel;

  const channelsToTry = preferredChannel
    ? [preferredChannel, 'chrome', 'msedge', undefined]
    : ['chrome', 'msedge', undefined];

  let lastError = null;

  for (const channel of channelsToTry) {
    try {
      const launchOpts = {
        headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
        ],
      };
      if (channel) {
        launchOpts.channel = channel;
      }
      const browser = await chromium.launch(launchOpts);
      return browser;
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(`Failed to launch browser across channels (${channelsToTry.join(', ')}): ${lastError?.message}`);
}

/**
 * Creates a browser context emulating a specific viewport preset with strict default action timeouts
 * @param {import('@playwright/test').Browser} browser
 * @param {string|number|object} viewportPreset
 * @param {object} options
 */
async function createContext(browser, viewportPreset = 'mobile-360', options = {}) {
  const vp = typeof viewportPreset === 'object' ? viewportPreset : getViewport(viewportPreset);

  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.deviceScaleFactor || 1,
    isMobile: !!vp.isMobile,
    hasTouch: !!vp.hasTouch,
    userAgent: vp.isMobile
      ? 'Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const defaultTimeout = options.defaultTimeout ?? 3000;
  const navigationTimeout = options.navigationTimeout ?? 10000;

  context.setDefaultTimeout(defaultTimeout);
  context.setDefaultNavigationTimeout(navigationTimeout);

  return context;
}

/**
 * Resizes the viewport of an existing page
 * @param {import('@playwright/test').Page} page
 * @param {string|number} presetOrWidth
 */
async function setViewport(page, presetOrWidth) {
  const vp = getViewport(presetOrWidth);
  await page.setViewportSize({ width: vp.width, height: vp.height });
  return vp;
}

module.exports = {
  verifyServerIdentity,
  resolveKstreamServer,
  checkServerReachable,
  launchBrowser,
  createContext,
  setViewport,
};
