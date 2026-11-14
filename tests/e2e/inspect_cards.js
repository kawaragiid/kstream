const { launchBrowser, createContext } = require('./helpers/browser');

async function checkMedia() {
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

  const cards = await page.$$('[data-card="true"]');
  console.log(`Total cards found: ${cards.length}`);

  for (let i = 0; i < cards.length; i++) {
    const href = await cards[i].getAttribute('data-href');
    const label = await cards[i].getAttribute('aria-label');
    console.log(`Card ${i}: href=${href}, label=${label}`);
  }

  // Also check if any card is a series with episodes
  for (let i = 0; i < cards.length; i++) {
    await cards[i].click();
    await page.waitForTimeout(500);
    const dialog = await page.$('[role="dialog"]');
    if (dialog) {
      const title = await dialog.$eval('h2', el => el.textContent).catch(() => 'no h2');
      const episodes = await dialog.$$('[role="dialog"] button:has([sizes])');
      const seasonPills = await dialog.$$('[role="dialog"] button:has-text("Season")');
      console.log(`Dialog for Card ${i} ("${title}"): episodes=${episodes.length}, seasonPills=${seasonPills.length}`);
      const closeBtn = await page.$('[role="dialog"] button[aria-label*="tutup" i]');
      if (closeBtn) await closeBtn.click();
      await page.waitForTimeout(300);
    }
  }

  await browser.close();
}

checkMedia().catch(console.error);
