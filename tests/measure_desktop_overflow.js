const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const viewports = [1024, 1040, 1060, 1080, 1100, 1280];

  console.log('DESKTOP HEADER OVERFLOW MEASUREMENT:');
  for (const w of viewports) {
    const page = await browser.newPage({ viewport: { width: w, height: 768 } });
    await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(200);

    const m = await page.evaluate((width) => {
      const header = document.querySelector('header');
      const body = document.body;
      const doc = document.documentElement;
      return {
        width,
        headerScrollWidth: header.scrollWidth,
        headerClientWidth: header.clientWidth,
        bodyScrollWidth: body.scrollWidth,
        bodyClientWidth: body.clientWidth,
        docScrollWidth: doc.scrollWidth,
        docClientWidth: doc.clientWidth,
        overflow: header.scrollWidth - width,
      };
    }, w);

    console.log(`Width ${w}px: headerScroll=${m.headerScrollWidth}px, bodyScroll=${m.bodyScrollWidth}px, overflow=${m.overflow > 0 ? `+${m.overflow}px` : '0px (NONE)'}`);
    await page.close();
  }

  await browser.close();
})();
