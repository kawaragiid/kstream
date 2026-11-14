const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });

  // Test proposals
  const proposals = [
    {
      name: 'Baseline (Current Navbar.js)',
      fn: (w) => ({
        paddingX: w >= 1024 ? 32 : (w >= 768 ? 24 : (w >= 640 ? 16 : 12)),
        containerGap: w >= 768 ? 32 : (w >= 640 ? 16 : 10),
        linksGap: 24, // gap-6
      }),
    },
    {
      name: 'Proposal 1 (Dispatch Item 5: lg:px-5 xl:px-8, gap-2.5 sm:gap-4 md:gap-6 lg:gap-4 xl:gap-8, links gap-6)',
      fn: (w) => ({
        paddingX: w >= 1280 ? 32 : (w >= 1024 ? 20 : (w >= 768 ? 24 : (w >= 640 ? 16 : 12))),
        containerGap: w >= 1280 ? 32 : (w >= 1024 ? 16 : (w >= 768 ? 24 : (w >= 640 ? 16 : 10))),
        linksGap: 24, // gap-6 unchanged
      }),
    },
    {
      name: 'Proposal 2 (Challenger 5.2: lg:px-5 xl:px-8, lg:gap-5 xl:gap-8, links gap-4 xl:gap-6)',
      fn: (w) => ({
        paddingX: w >= 1280 ? 32 : (w >= 1024 ? 20 : (w >= 768 ? 24 : (w >= 640 ? 16 : 12))),
        containerGap: w >= 1280 ? 32 : (w >= 1024 ? 20 : (w >= 768 ? 24 : (w >= 640 ? 16 : 10))),
        linksGap: w >= 1280 ? 24 : (w >= 1024 ? 16 : 24),
      }),
    },
    {
      name: 'Proposal 3 (Optimal Hybrid: lg:px-5 xl:px-8, lg:gap-4 xl:gap-8, links gap-4 xl:gap-6)',
      fn: (w) => ({
        paddingX: w >= 1280 ? 32 : (w >= 1024 ? 20 : (w >= 768 ? 24 : (w >= 640 ? 16 : 12))),
        containerGap: w >= 1280 ? 32 : (w >= 1024 ? 16 : (w >= 768 ? 24 : (w >= 640 ? 16 : 10))),
        linksGap: w >= 1280 ? 24 : (w >= 1024 ? 16 : 24),
      }),
    },
  ];

  const viewports = [360, 375, 390, 414, 430, 768, 1024, 1040, 1060, 1080, 1100, 1200, 1280, 1440];

  for (const p of proposals) {
    console.log(`\n======================================================`);
    console.log(`PROPOSAL: ${p.name}`);
    console.log(`======================================================`);

    for (const w of viewports) {
      const page = await browser.newPage({ viewport: { width: w, height: 768 } });
      await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });

      // Wait until desktop links or mobile drawer button is fully ready
      await page.waitForFunction(() => {
        const header = document.querySelector('header');
        return header && header.querySelector('.container');
      });
      await page.waitForTimeout(100);

      const styles = p.fn(w);

      const res = await page.evaluate(({ styles, width }) => {
        const header = document.querySelector('header');
        const container = header.querySelector('.container');
        const linksDiv = container.querySelector('.hidden.lg\\:flex, .lg\\:flex');
        const rightChild = container.querySelector('.ml-auto');
        const logo = container.querySelector('a');

        container.style.paddingLeft = `${styles.paddingX}px`;
        container.style.paddingRight = `${styles.paddingX}px`;
        container.style.gap = `${styles.containerGap}px`;

        if (linksDiv) {
          linksDiv.style.gap = `${styles.linksGap}px`;
        }

        void header.offsetHeight;

        const body = document.body;
        const rightRect = rightChild ? rightChild.getBoundingClientRect() : null;
        const linksRect = linksDiv ? linksDiv.getBoundingClientRect() : null;
        const logoRect = logo ? logo.getBoundingClientRect() : null;

        return {
          width,
          headerScroll: header.scrollWidth,
          bodyScroll: body.scrollWidth,
          overflow: header.scrollWidth - width,
          rightEdge: rightRect ? rightRect.right : 0,
          rightWidth: rightRect ? rightRect.width : 0,
          linksWidth: linksRect ? linksRect.width : 0,
          logoWidth: logoRect ? logoRect.width : 0,
          middleGap: (rightRect && linksRect) ? rightRect.left - linksRect.right : 0,
        };
      }, { styles, width: w });

      const pass = res.headerScroll <= w && res.bodyScroll <= w;
      const overStr = res.overflow > 0 ? `+${res.overflow}px` : '0px';

      console.log(`  W=${w}px | pad=${styles.paddingX} gap=${styles.containerGap} lGap=${styles.linksGap} | headerScroll=${res.headerScroll} rightEdge=${res.rightEdge.toFixed(1)} midGap=${res.middleGap.toFixed(1)} over=${overStr} [${pass ? 'PASS' : 'FAIL'}]`);

      await page.close();
    }
  }

  await browser.close();
})();
