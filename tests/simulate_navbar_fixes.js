const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });

  // Test matrix of potential fixes:
  const configurations = [
    {
      name: 'Baseline (Current)',
      containerClass: 'container mx-auto flex items-center gap-2.5 sm:gap-4 md:gap-8 px-3 sm:px-4 md:px-6 lg:px-8 py-2.5 sm:py-3.5 md:py-4 text-text-secondary',
      linksClass: 'hidden lg:flex items-center gap-6 text-sm font-medium',
    },
    {
      name: 'Option A (Dispatch proposal: lg:px-5 xl:px-8, gap-2.5 sm:gap-4 md:gap-6 lg:gap-4 xl:gap-8, links gap-6)',
      containerClass: 'container mx-auto flex items-center gap-2.5 sm:gap-4 md:gap-6 lg:gap-4 xl:gap-8 px-3 sm:px-4 md:px-6 lg:px-5 xl:px-8 py-2.5 sm:py-3.5 md:py-4 text-text-secondary',
      linksClass: 'hidden lg:flex items-center gap-6 text-sm font-medium',
    },
    {
      name: 'Option B (Dispatch proposal with lg:px-4: lg:px-4 xl:px-8, gap-2.5 sm:gap-4 md:gap-6 lg:gap-4 xl:gap-8, links gap-6)',
      containerClass: 'container mx-auto flex items-center gap-2.5 sm:gap-4 md:gap-6 lg:gap-4 xl:gap-8 px-3 sm:px-4 md:px-6 lg:px-4 xl:px-8 py-2.5 sm:py-3.5 md:py-4 text-text-secondary',
      linksClass: 'hidden lg:flex items-center gap-6 text-sm font-medium',
    },
    {
      name: 'Option C (Challenger recommendation: lg:px-5 xl:px-8, lg:gap-5 xl:gap-8, links gap-4 xl:gap-6)',
      containerClass: 'container mx-auto flex items-center gap-2.5 sm:gap-4 md:gap-6 lg:gap-5 xl:gap-8 px-3 sm:px-4 md:px-6 lg:px-5 xl:px-8 py-2.5 sm:py-3.5 md:py-4 text-text-secondary',
      linksClass: 'hidden lg:flex items-center gap-4 xl:gap-6 text-sm font-medium',
    },
    {
      name: 'Option D (Comprehensive scaling: lg:px-5 xl:px-8, lg:gap-4 xl:gap-8, links gap-4 xl:gap-6)',
      containerClass: 'container mx-auto flex items-center gap-2.5 sm:gap-4 md:gap-6 lg:gap-4 xl:gap-8 px-3 sm:px-4 md:px-6 lg:px-5 xl:px-8 py-2.5 sm:py-3.5 md:py-4 text-text-secondary',
      linksClass: 'hidden lg:flex items-center gap-4 xl:gap-6 text-sm font-medium',
    },
  ];

  const viewports = [360, 375, 390, 430, 768, 1024, 1040, 1080, 1280, 1440];

  for (const config of configurations) {
    console.log(`\n=== Testing Configuration: ${config.name} ===`);
    for (const w of viewports) {
      const page = await browser.newPage({ viewport: { width: w, height: 768 } });
      await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(100);

      const result = await page.evaluate(({ containerClass, linksClass, width }) => {
        const header = document.querySelector('header');
        const container = header.querySelector('.container');
        const linksDiv = container.querySelector('.hidden.lg\\:flex, .lg\\:flex');

        if (containerClass) container.className = containerClass;
        if (linksClass && linksDiv) linksDiv.className = linksClass;

        // Force relayout
        void header.offsetHeight;

        const body = document.body;
        const doc = document.documentElement;
        const rightChild = container.querySelector('.ml-auto');
        const rightRect = rightChild ? rightChild.getBoundingClientRect() : null;

        return {
          width,
          headerScroll: header.scrollWidth,
          bodyScroll: body.scrollWidth,
          docScroll: doc.scrollWidth,
          rightEdge: rightRect ? rightRect.right : 0,
          overflow: header.scrollWidth - width,
          bodyOverflow: body.scrollWidth - width,
        };
      }, { containerClass: config.containerClass, linksClass: config.linksClass, width: w });

      const pass = result.overflow <= 0 && result.bodyOverflow <= 0;
      console.log(`  Width ${w}px: headerScroll=${result.headerScroll}px, bodyScroll=${result.bodyScroll}px, rightEdge=${result.rightEdge.toFixed(1)}px, overflow=${result.overflow}px -> ${pass ? 'PASS' : 'FAIL'}`);
      await page.close();
    }
  }

  await browser.close();
})();
