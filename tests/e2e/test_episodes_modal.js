const { launchBrowser, createContext } = require('./helpers/browser');

async function testEpisodes() {
  const browser = await launchBrowser({ headless: true });
  const context = await createContext(browser, {
    name: 'mobile-360',
    width: 360,
    height: 640,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto('http://localhost:3008/', { waitUntil: 'networkidle' });

  // Find Card 0 (Tengu no Daidokoro)
  const card = await page.$('[data-card="true"]');
  console.log('Clicking card 0...');
  await card.click();

  // Wait for dialog and episode section
  await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
  console.log('Dialog visible, waiting for Episode Tersedia...');
  await page.waitForSelector('text=Episode Tersedia', { timeout: 5000 });
  console.log('Episode Tersedia rendered!');

  // Measure episode list items inside dialog
  const episodeButtons = await page.$$('[role="dialog"] .space-y-4 .flex.flex-col.gap-3 > button');
  console.log('Found episode buttons:', episodeButtons.length);

  for (let i = 0; i < episodeButtons.length; i++) {
    const box = await episodeButtons[i].boundingBox();
    console.log(`Episode ${i} box:`, box);
    const textInfo = await episodeButtons[i].evaluate(el => {
      const titleEl = el.querySelector('.truncate, [class*="line-clamp"]');
      const thumbEl = el.querySelector('img');
      const badgeEl = el.querySelector('span');
      return {
        title: titleEl?.textContent?.trim(),
        titleWidth: titleEl?.getBoundingClientRect().width,
        thumbWidth: thumbEl?.getBoundingClientRect().width,
        badgeText: badgeEl?.textContent?.trim(),
      };
    });
    console.log(`Episode ${i} info:`, textInfo);
  }

  // Check scroll container
  const scrollInfo = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const scrollContainers = Array.from(dialog.querySelectorAll('*')).filter(el => {
      const s = window.getComputedStyle(el);
      return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
    });

    const epContainer = dialog.querySelector('.flex.flex-col.gap-3');
    const epStyle = window.getComputedStyle(epContainer);

    return {
      totalScrollContainers: scrollContainers.length,
      mainScrollOverscroll: window.getComputedStyle(dialog.querySelector('.overflow-y-auto')).overscrollBehaviorY,
      epOverflowY: epStyle.overflowY,
      epMaxHeight: epStyle.maxHeight,
    };
  });

  console.log('Scroll Architecture info:', scrollInfo);

  await browser.close();
}

testEpisodes().catch(console.error);
