const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });

  for (const ms of [0, 50, 100, 200, 300, 500]) {
    await page.waitForTimeout(ms);
    const count = await page.evaluate(() => {
      const linksDiv = document.querySelector('.hidden.lg\\:flex, .lg\\:flex');
      return linksDiv ? linksDiv.children.length : 0;
    });
    console.log(`At ${ms}ms: links count = ${count}`);
  }

  await browser.close();
})();
