const { launchBrowser, createContext } = require('./helpers/browser');

async function debugHome() {
  const browser = await launchBrowser({ headless: true });
  const context = await createContext(browser, { width: 360, height: 640 });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3008/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const title = await page.title();
  const html = await page.content();
  const hasCard = html.includes('data-card');
  const hasHero = html.includes('data-hero');
  console.log('Title:', title, 'Has card:', hasCard, 'Has hero:', hasHero, 'HTML snippet:', html.slice(0, 400));
  await browser.close();
}

debugHome().catch(console.error);
