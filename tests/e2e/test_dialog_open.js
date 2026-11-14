const { launchBrowser, createContext } = require('./helpers/browser');

async function main() {
  const browser = await launchBrowser({ headless: true });
  const context = await createContext(browser, {
    name: 'mobile-360',
    width: 360,
    height: 640,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3008/...');
  await page.goto('http://localhost:3008/', { waitUntil: 'networkidle' });

  const cards = await page.$$('[data-card="true"]');
  console.log('Found cards:', cards.length);

  if (cards.length > 0) {
    console.log('Clicking first card...');
    await cards[0].click();
    await page.waitForTimeout(1000);

    const dialog = await page.$('[role="dialog"]');
    console.log('Dialog visible:', !!dialog);

    if (dialog) {
      const box = await dialog.boundingBox();
      console.log('Dialog bounding box:', box);
      const computed = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"]');
        const s = window.getComputedStyle(d);
        const closeBtn = document.querySelector('[role="dialog"] button[aria-label*="tutup" i]');
        const closeBox = closeBtn ? closeBtn.getBoundingClientRect() : null;
        return {
          height: s.height,
          borderRadius: s.borderRadius,
          bodyOverflow: document.body.style.overflow,
          closeBox: closeBox ? { width: closeBox.width, height: closeBox.height, top: closeBox.top } : null,
        };
      });
      console.log('Dialog computed:', computed);
    }
  }

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
