const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });

  // Breakpoints in Tailwind:
  // sm: 640px
  // md: 768px
  // lg: 1024px
  // xl: 1280px
  // 2xl: 1536px

  const testCases = [
    {
      name: 'Baseline (Current Navbar.js)',
      getStyles: (w) => {
        // Current: px-3 sm:px-4 md:px-6 lg:px-8
        // gap-2.5 sm:gap-4 md:gap-8
        // links: gap-6
        let paddingX = 12; // px-3
        if (w >= 640) paddingX = 16; // sm:px-4
        if (w >= 768) paddingX = 24; // md:px-6
        if (w >= 1024) paddingX = 32; // lg:px-8

        let containerGap = 10; // gap-2.5
        if (w >= 640) containerGap = 16; // sm:gap-4
        if (w >= 768) containerGap = 32; // md:gap-8

        let linksGap = 24; // gap-6
        return { paddingX, containerGap, linksGap };
      }
    },
    {
      name: 'Proposal 1: Dispatch Item 5 (lg:px-5 xl:px-8, gap-2.5 sm:gap-4 md:gap-6 lg:gap-4 xl:gap-8, links gap-6)',
      getStyles: (w) => {
        // px-3 sm:px-4 md:px-6 lg:px-5 xl:px-8
        let paddingX = 12;
        if (w >= 640) paddingX = 16;
        if (w >= 768) paddingX = 24;
        if (w >= 1024) paddingX = 20; // lg:px-5
        if (w >= 1280) paddingX = 32; // xl:px-8

        // gap-2.5 sm:gap-4 md:gap-6 lg:gap-4 xl:gap-8
        let containerGap = 10;
        if (w >= 640) containerGap = 16;
        if (w >= 768) containerGap = 24;
        if (w >= 1024) containerGap = 16; // lg:gap-4
        if (w >= 1280) containerGap = 32; // xl:gap-8

        let linksGap = 24; // gap-6 unchanged
        return { paddingX, containerGap, linksGap };
      }
    },
    {
      name: 'Proposal 2: Challenger Section 5.2 (lg:px-5 xl:px-8, lg:gap-5 xl:gap-8, links gap-4 xl:gap-6)',
      getStyles: (w) => {
        let paddingX = 12;
        if (w >= 640) paddingX = 16;
        if (w >= 768) paddingX = 24;
        if (w >= 1024) paddingX = 20; // lg:px-5
        if (w >= 1280) paddingX = 32; // xl:px-8

        let containerGap = 10;
        if (w >= 640) containerGap = 16;
        if (w >= 768) containerGap = 24;
        if (w >= 1024) containerGap = 20; // lg:gap-5
        if (w >= 1280) containerGap = 32; // xl:gap-8

        // links: gap-4 xl:gap-6
        let linksGap = 16; // lg:gap-4
        if (w >= 1280) linksGap = 24; // xl:gap-6
        return { paddingX, containerGap, linksGap };
      }
    },
    {
      name: 'Proposal 3: Robust Hybrid (lg:px-5 xl:px-8, lg:gap-4 xl:gap-8, links gap-4 xl:gap-6)',
      getStyles: (w) => {
        let paddingX = 12;
        if (w >= 640) paddingX = 16;
        if (w >= 768) paddingX = 24;
        if (w >= 1024) paddingX = 20; // lg:px-5
        if (w >= 1280) paddingX = 32; // xl:px-8

        let containerGap = 10;
        if (w >= 640) containerGap = 16;
        if (w >= 768) containerGap = 24;
        if (w >= 1024) containerGap = 16; // lg:gap-4
        if (w >= 1280) containerGap = 32; // xl:gap-8

        let linksGap = 16; // gap-4 on lg
        if (w >= 1280) linksGap = 24; // xl:gap-6
        return { paddingX, containerGap, linksGap };
      }
    },
  ];

  const viewports = [360, 375, 390, 414, 430, 768, 1024, 1040, 1060, 1080, 1100, 1200, 1280, 1440];

  for (const tc of testCases) {
    console.log(`\n======================================================`);
    console.log(`TESTING: ${tc.name}`);
    console.log(`======================================================`);

    let allPass = true;

    for (const w of viewports) {
      const page = await browser.newPage({ viewport: { width: w, height: 768 } });
      await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(150);

      const styles = tc.getStyles(w);

      const m = await page.evaluate(({ styles, width }) => {
        const header = document.querySelector('header');
        const container = header.querySelector('.container');
        const linksDiv = container.querySelector('.hidden.lg\\:flex, .lg\\:flex');
        const rightChild = container.querySelector('.ml-auto');

        // Apply styles to container
        container.style.paddingLeft = `${styles.paddingX}px`;
        container.style.paddingRight = `${styles.paddingX}px`;
        container.style.gap = `${styles.containerGap}px`;

        // Apply styles to desktop links
        if (linksDiv) {
          linksDiv.style.gap = `${styles.linksGap}px`;
        }

        // Force reflow
        void header.offsetHeight;

        const body = document.body;
        const doc = document.documentElement;
        const rightRect = rightChild ? rightChild.getBoundingClientRect() : null;

        const headerScroll = header.scrollWidth;
        const bodyScroll = body.scrollWidth;
        const docScroll = doc.scrollWidth;
        const overflow = headerScroll - width;
        const rightEdge = rightRect ? rightRect.right : 0;
        const containerRect = container.getBoundingClientRect();

        return {
          width,
          paddingX: styles.paddingX,
          containerGap: styles.containerGap,
          linksGap: styles.linksGap,
          headerScroll,
          bodyScroll,
          docScroll,
          overflow,
          rightEdge,
          containerRight: containerRect.right,
          middleGap: rightRect && linksDiv ? rightRect.left - linksDiv.getBoundingClientRect().right : 0,
        };
      }, { styles, width: w });

      const pass = m.headerScroll <= w && m.bodyScroll <= w;
      if (!pass) allPass = false;

      const overStr = m.overflow > 0 ? `+${m.overflow}px` : '0px';
      console.log(`  W=${w}px | pad=${m.paddingX} gap=${m.containerGap} lGap=${m.linksGap} | headerScroll=${m.headerScroll} bodyScroll=${m.bodyScroll} rightEdge=${m.rightEdge.toFixed(1)} over=${overStr} [${pass ? 'PASS' : 'FAIL'}]`);

      await page.close();
    }

    console.log(`Result: ${allPass ? 'ALL VIEWPORTS PASS' : 'FAILURES DETECTED'}`);
  }

  await browser.close();
})();
