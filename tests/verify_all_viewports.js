const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const viewports = [360, 375, 390, 414, 430, 768, 1024, 1040, 1060, 1080, 1100, 1280, 1440];

  console.log('ALL VIEWPORT OVERFLOW AUDIT:');
  let failures = 0;

  for (const w of viewports) {
    const page = await browser.newPage({ viewport: { width: w, height: 768 } });
    await page.goto('http://localhost:3005', { waitUntil: 'networkidle' });

    const m = await page.evaluate((width) => {
      const header = document.querySelector('header');
      const body = document.body;
      const doc = document.documentElement;
      return {
        width,
        headerScroll: header ? header.scrollWidth : 0,
        bodyScroll: body ? body.scrollWidth : 0,
        docScroll: doc ? doc.scrollWidth : 0,
      };
    }, w);

    const headerOverflow = Math.max(0, m.headerScroll - w);
    const bodyOverflow = Math.max(0, m.bodyScroll - w);
    const docOverflow = Math.max(0, m.docScroll - w);
    const hasOverflow = headerOverflow > 0 || bodyOverflow > 0 || docOverflow > 0;

    if (hasOverflow) {
      failures++;
      console.log(`Width ${w}px: FAIL (header=${m.headerScroll}px, body=${m.bodyScroll}px, doc=${m.docScroll}px)`);
    } else {
      console.log(`Width ${w}px: PASS (header=${m.headerScroll}px, body=${m.bodyScroll}px, doc=${m.docScroll}px, overflow=0px)`);
    }

    await page.close();
  }

  console.log(`\nAUDIT RESULT: ${failures === 0 ? 'ALL VIEWPORTS PASS (0px overflow)' : `${failures} viewports failed`}`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
