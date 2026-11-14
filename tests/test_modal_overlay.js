// @ts-check
const { launchBrowser, createContext } = require('./e2e/helpers/browser');

async function main() {
  const browser = await launchBrowser({ headless: true });
  console.log('=== TESTING MEDIA OVERLAY MODAL: 360px vs 1024px ===\n');

  for (const vp of [
    { name: 'mobile-360', width: 360, height: 640, isMobile: true, hasTouch: true },
    { name: 'desktop-1024', width: 1024, height: 768, isMobile: false, hasTouch: false },
  ]) {
    const context = await createContext(browser, vp);
    const page = await context.newPage();
    await page.goto('http://localhost:3008/', { waitUntil: 'networkidle' });

    // Click first poster card to open modal
    const card = page.locator('[data-card="true"]').first();
    await card.click();
    await page.waitForTimeout(600);

    const data = await page.evaluate(({ isMobile }) => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (!dialog) return { found: false };

      const rect = dialog.getBoundingClientRect();
      const cs = window.getComputedStyle(dialog);
      const closeBtn = dialog.querySelector('button[aria-label*="Tutup"]');
      const closeRect = closeBtn ? closeBtn.getBoundingClientRect() : null;
      const allBtns = Array.from(dialog.querySelectorAll('button'));
      const playBtn = allBtns.find(b => b.textContent?.includes('Tonton'));
      const playRect = playBtn ? playBtn.getBoundingClientRect() : null;
      const favBtn = dialog.querySelector('button[aria-label*="Favorit"]');
      const favRect = favBtn ? favBtn.getBoundingClientRect() : null;

      const docEl = document.documentElement;
      const scrollWidth = Math.max(docEl.scrollWidth, document.body.scrollWidth);
      const overflow = scrollWidth - window.innerWidth;

      return {
        found: true,
        dialogWidth: rect.width,
        dialogHeight: rect.height,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        borderRadius: cs.borderRadius,
        closeBox: closeRect ? { width: closeRect.width, height: closeRect.height } : null,
        playBox: playRect ? { width: playRect.width, height: playRect.height } : null,
        favBox: favRect ? { width: favRect.width, height: favRect.height } : null,
        overflow,
        bodyOverflow: document.body.style.overflow,
      };
    }, { isMobile: vp.isMobile });

    console.log(`[${vp.name}]
  - Modal Found: ${data.found}
  - Dialog Dimensions: ${data.dialogWidth}x${data.dialogHeight}px (Window: ${data.windowWidth}x${data.windowHeight}px)
  - Dialog Border Radius: ${data.borderRadius}
  - Close Button: ${data.closeBox ? `${data.closeBox.width.toFixed(1)}x${data.closeBox.height.toFixed(1)}px` : 'None'}
  - Play Button in Modal: ${data.playBox ? `${data.playBox.width.toFixed(1)}x${data.playBox.height.toFixed(1)}px` : 'None'}
  - Fav Button in Modal: ${data.favBox ? `${data.favBox.width.toFixed(1)}x${data.favBox.height.toFixed(1)}px` : 'None'}
  - Horizontal Overflow: ${data.overflow}px
  - Body Scroll Lock: ${data.bodyOverflow}`);

    await context.close();
  }

  await browser.close();
}

main().catch(console.error);
