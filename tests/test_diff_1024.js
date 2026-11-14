const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);

  const initial = await page.evaluate(() => {
    const header = document.querySelector('header');
    const container = header.querySelector('.container');
    const linksDiv = container.querySelector('.hidden.lg\\:flex, .lg\\:flex');
    const right = container.querySelector('.ml-auto');
    return {
      step: 'initial loaded without mutation',
      headerScroll: header.scrollWidth,
      rightEdge: right.getBoundingClientRect().right,
      categoriesCount: linksDiv ? linksDiv.children.length : 0,
      linksText: linksDiv ? Array.from(linksDiv.children).map(c => c.textContent.trim()) : [],
    };
  });
  console.log('INITIAL:', initial);

  const afterClassReassign = await page.evaluate(() => {
    const header = document.querySelector('header');
    const container = header.querySelector('.container');
    container.className = 'container mx-auto flex items-center gap-2.5 sm:gap-4 md:gap-8 px-3 sm:px-4 md:px-6 lg:px-8 py-2.5 sm:py-3.5 md:py-4 text-text-secondary';
    void header.offsetHeight;
    const right = container.querySelector('.ml-auto');
    return {
      step: 'after container.className = same string',
      headerScroll: header.scrollWidth,
      rightEdge: right.getBoundingClientRect().right,
    };
  });
  console.log('AFTER REASSIGN:', afterClassReassign);

  await browser.close();
})();
