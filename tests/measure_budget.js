const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 360, height: 740 } });
  await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);

  const data = await page.evaluate(() => {
    const header = document.querySelector('header');
    const container = header.querySelector('.container');
    const hamburger = container.querySelector('button');
    const logo = container.querySelector('a');
    const search = container.querySelector('a[href="/search"]');
    const login = container.querySelector('a[href="/login"]');
    const authGroup = login ? login.parentElement : null;

    const hRect = hamburger ? hamburger.getBoundingClientRect() : { width: 0, left: 0, right: 0 };
    const lRect = logo ? logo.getBoundingClientRect() : { width: 0, left: 0, right: 0 };
    const sRect = search ? search.getBoundingClientRect() : { width: 0, left: 0, right: 0 };
    const aRect = authGroup ? authGroup.getBoundingClientRect() : { width: 0, left: 0, right: 0 };

    const cStyle = window.getComputedStyle(container);
    const pL = parseFloat(cStyle.paddingLeft);
    const pR = parseFloat(cStyle.paddingRight);

    const leftSpan = lRect.right - hRect.left;
    const rightSpan = aRect.right - sRect.left;
    const middleGap = sRect.left - lRect.right;
    const intrinsicSum = leftSpan + rightSpan + pL + pR;

    return {
      paddingTotal: pL + pR,
      hamburgerWidth: hRect.width,
      logoWidth: lRect.width,
      leftSpan,
      searchWidth: sRect.width,
      authGroupWidth: aRect.width,
      rightSpan,
      middleGap,
      intrinsicSum,
      headerScrollWidth: header.scrollWidth,
      headerClientWidth: header.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      docScrollWidth: document.documentElement.scrollWidth,
    };
  });

  console.log('MEASURED BUDGET AT 360px:');
  console.log(JSON.stringify(data, null, 2));

  await browser.close();
})();
