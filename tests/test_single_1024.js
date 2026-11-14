const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  await page.goto('http://localhost:3005', { waitUntil: 'networkidle' });

  const result = await page.evaluate(() => {
    const header = document.querySelector('header');
    const container = header.querySelector('.container');
    const linksDiv = container.querySelector('.hidden.lg\\:flex, .lg\\:flex');
    const linksDisplay = linksDiv ? window.getComputedStyle(linksDiv).display : 'none';
    const right = container.querySelector('.ml-auto');
    return {
      windowWidth: window.innerWidth,
      headerScroll: header.scrollWidth,
      rightEdge: right.getBoundingClientRect().right,
      linksDisplay,
      linksWidth: linksDiv ? linksDiv.getBoundingClientRect().width : 0,
    };
  });
  console.log('1024px WITH networkidle:', result);

  await browser.close();
})();
