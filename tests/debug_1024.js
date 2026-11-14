const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(150);

  const debug = await page.evaluate(() => {
    const header = document.querySelector('header');
    const container = header.querySelector('.container');
    const linksDiv = container.querySelector('.hidden.lg\\:flex, .lg\\:flex');
    const rightChild = container.querySelector('.ml-auto');

    const linksComputedBefore = window.getComputedStyle(linksDiv);

    // Apply baseline styles
    container.style.paddingLeft = '32px';
    container.style.paddingRight = '32px';
    container.style.gap = '32px';
    linksDiv.style.gap = '24px';

    void header.offsetHeight;

    const linksComputedAfter = window.getComputedStyle(linksDiv);

    return {
      linksDisplayBefore: linksComputedBefore.display,
      linksWidthBefore: linksDiv.getBoundingClientRect().width,
      linksDisplayAfter: linksComputedAfter.display,
      linksWidthAfter: linksDiv.getBoundingClientRect().width,
      rightEdgeBefore: rightChild.getBoundingClientRect().right,
      headerScrollBefore: header.scrollWidth,
    };
  });

  console.log('DEBUG 1024px:', debug);
  await browser.close();
})();
