const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(150);

  const res = await page.evaluate(() => {
    const header = document.querySelector('header');
    const container = header.querySelector('.container');
    const linksDiv = container.querySelector('.hidden.lg\\:flex, .lg\\:flex');
    const rightChild = container.querySelector('.ml-auto');

    container.style.paddingLeft = '32px';
    container.style.paddingRight = '32px';
    container.style.gap = '32px';
    linksDiv.style.gap = '24px';
    void header.offsetHeight;

    return {
      headerScroll: header.scrollWidth,
      rightChildRight: rightChild.getBoundingClientRect().right,
      rightChildLeft: rightChild.getBoundingClientRect().left,
      linksRight: linksDiv.getBoundingClientRect().right,
      linksLeft: linksDiv.getBoundingClientRect().left,
      containerLeft: container.getBoundingClientRect().left,
      containerRight: container.getBoundingClientRect().right,
      containerWidth: container.getBoundingClientRect().width,
    };
  });

  console.log('EVAL AT 1024:', res);
  await browser.close();
})();
