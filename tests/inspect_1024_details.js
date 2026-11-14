const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);

  const report = await page.evaluate(() => {
    const header = document.querySelector('header');
    const container = header.querySelector('.container');
    const cStyle = window.getComputedStyle(container);
    const children = Array.from(container.children).map((c, i) => {
      const s = window.getComputedStyle(c);
      const r = c.getBoundingClientRect();
      return {
        idx: i,
        tag: c.tagName,
        cls: c.className,
        display: s.display,
        width: r.width,
        height: r.height,
        left: r.left,
        right: r.right,
        marginLeft: s.marginLeft,
        marginRight: s.marginRight,
      };
    });

    const linksDiv = container.querySelector('.hidden.lg\\:flex');
    const linkItems = linksDiv ? Array.from(linksDiv.children).map((l, i) => {
      const r = l.getBoundingClientRect();
      const s = window.getComputedStyle(l);
      return {
        idx: i,
        text: l.textContent.trim(),
        width: r.width,
        left: r.left,
        right: r.right,
        marginRight: s.marginRight,
      };
    }) : [];

    const rightDiv = container.querySelector('.ml-auto');
    const rightItems = rightDiv ? Array.from(rightDiv.children).map((ri, i) => {
      const r = ri.getBoundingClientRect();
      const s = window.getComputedStyle(ri);
      return {
        idx: i,
        tag: ri.tagName,
        cls: ri.className,
        width: r.width,
        left: r.left,
        right: r.right,
      };
    }) : [];

    return {
      windowWidth: window.innerWidth,
      containerComputed: {
        paddingLeft: cStyle.paddingLeft,
        paddingRight: cStyle.paddingRight,
        gap: cStyle.gap,
        rowGap: cStyle.rowGap,
        columnGap: cStyle.columnGap,
        width: cStyle.width,
        maxWidth: cStyle.maxWidth,
      },
      headerScrollWidth: header.scrollWidth,
      headerClientWidth: header.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      children,
      linkItems,
      rightItems,
    };
  });

  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})();
