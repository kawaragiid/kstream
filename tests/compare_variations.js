const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);

  const results = await page.evaluate(() => {
    const header = document.querySelector('header');
    const container = header.querySelector('.container');
    const navLinks = header.querySelector('div.lg\\:flex');
    const rightGroup = header.querySelector('.ml-auto');
    const logo = container.querySelector('a');

    // Case 1: gap-4 alone (current wrapped text)
    navLinks.style.gap = '16px';
    const c1 = {
      name: 'gap-4 alone (text wraps allowed)',
      headerScroll: header.scrollWidth,
      bodyScroll: document.body.scrollWidth,
      overflow: header.scrollWidth - 1024,
      navWidth: navLinks.getBoundingClientRect().width,
      rightEdge: rightGroup.getBoundingClientRect().right,
      baruRilisHeight: navLinks.querySelectorAll('a')[2].getBoundingClientRect().height,
    };

    // Case 2: gap-4 + whitespace-nowrap on navLinks
    navLinks.style.whiteSpace = 'nowrap';
    const c2 = {
      name: 'gap-4 + whitespace-nowrap (container gap-8, px-8)',
      headerScroll: header.scrollWidth,
      bodyScroll: document.body.scrollWidth,
      overflow: header.scrollWidth - 1024,
      navWidth: navLinks.getBoundingClientRect().width,
      rightEdge: rightGroup.getBoundingClientRect().right,
      baruRilisHeight: navLinks.querySelectorAll('a')[2].getBoundingClientRect().height,
    };

    // Case 3: gap-4 + whitespace-nowrap + container lg:gap-6 (24px)
    container.style.gap = '24px';
    const c3 = {
      name: 'gap-4 + nowrap + container gap-6 (px-8)',
      headerScroll: header.scrollWidth,
      bodyScroll: document.body.scrollWidth,
      overflow: header.scrollWidth - 1024,
      navWidth: navLinks.getBoundingClientRect().width,
      rightEdge: rightGroup.getBoundingClientRect().right,
    };

    // Case 4: gap-4 + nowrap + container lg:gap-5 (20px)
    container.style.gap = '20px';
    const c4 = {
      name: 'gap-4 + nowrap + container gap-5 (px-8)',
      headerScroll: header.scrollWidth,
      bodyScroll: document.body.scrollWidth,
      overflow: header.scrollWidth - 1024,
      navWidth: navLinks.getBoundingClientRect().width,
      rightEdge: rightGroup.getBoundingClientRect().right,
    };

    // Case 5: gap-4 + nowrap + container lg:px-6 (24px padding) + container gap-6 (24px)
    container.style.paddingLeft = '24px';
    container.style.paddingRight = '24px';
    container.style.gap = '24px';
    const c5 = {
      name: 'gap-4 + nowrap + container px-6 + gap-6',
      headerScroll: header.scrollWidth,
      bodyScroll: document.body.scrollWidth,
      overflow: header.scrollWidth - 1024,
      navWidth: navLinks.getBoundingClientRect().width,
      rightEdge: rightGroup.getBoundingClientRect().right,
    };

    return [c1, c2, c3, c4, c5];
  });

  console.log('=== COMPARISON OF VARIATIONS AT 1024px ===');
  console.log(JSON.stringify(results, null, 2));

  await page.close();
  await browser.close();
})();
