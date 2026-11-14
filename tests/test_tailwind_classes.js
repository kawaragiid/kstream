const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  await page.goto('http://localhost:3005', { waitUntil: 'networkidle' });

  const result = await page.evaluate(() => {
    const container = document.querySelector('header .container');
    container.className = 'container mx-auto flex items-center gap-2.5 sm:gap-4 md:gap-6 lg:gap-4 xl:gap-8 px-3 sm:px-4 md:px-6 lg:px-5 xl:px-8 py-2.5 sm:py-3.5 md:py-4 text-text-secondary';
    const computed = window.getComputedStyle(container);
    return {
      paddingLeft: computed.paddingLeft,
      paddingRight: computed.paddingRight,
      gap: computed.gap,
      columnGap: computed.columnGap,
    };
  });
  console.log('COMPUTED STYLES AFTER CLASS REASSIGNMENT:', result);

  await browser.close();
})();
