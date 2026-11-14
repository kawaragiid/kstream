const { chromium } = require('@playwright/test');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });

  const viewports = [
    { name: '1024_baseline', width: 1024, proposed: false },
    { name: '1024_proposed', width: 1024, proposed: true },
    { name: '1280_proposed', width: 1280, proposed: true },
    { name: '1440_proposed', width: 1440, proposed: true },
  ];

  for (const v of viewports) {
    const page = await browser.newPage({ viewport: { width: v.width, height: 768 } });
    await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);

    if (v.proposed) {
      await page.evaluate((width) => {
        const nav = document.querySelector('div.lg\\:flex');
        if (nav) {
          if (width >= 1024 && width < 1280) {
            nav.style.gap = '16px'; // gap-4
          } else {
            nav.style.gap = '24px'; // xl:gap-6
          }
        }
      }, v.width);
    }

    const header = await page.$('header');
    const outPath = path.join(__dirname, `screenshot_${v.name}.png`);
    await header.screenshot({ path: outPath });
    console.log(`Captured ${outPath}`);
    await page.close();
  }

  await browser.close();
})();
