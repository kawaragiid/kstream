const { launchBrowser } = require('./e2e/helpers/browser');

async function main() {
  const browser = await launchBrowser({ headless: true });
  const page = await browser.newPage();
  
  // Try fetching API search
  const res = await page.goto('http://localhost:3008/api/search?q=a');
  if (res) {
    const json = await res.json().catch(() => null);
    console.log('SEARCH_ITEMS:', JSON.stringify(json?.items?.map(r => ({ id: r.id, slug: r.slug, type: r.type, title: r.title }))));
  }
  await browser.close();
}

main().catch(console.error);
