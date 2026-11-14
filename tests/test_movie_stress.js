// @ts-check
const { launchBrowser, createContext } = require('./e2e/helpers/browser');

async function main() {
  const browser = await launchBrowser({ headless: true });
  console.log('=== ADVERSARIAL STRESS TEST: /movies/bishu on 360px ===\n');

  const context = await createContext(browser, {
    name: 'mobile-360',
    width: 360,
    height: 640,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto('http://localhost:3008/movies/bishu', { waitUntil: 'networkidle' });

  const result = await page.evaluate(() => {
    // 1. Initial measurement
    const initialOverflow = document.documentElement.scrollWidth - window.innerWidth;

    // 2. Inject extreme text
    const h1 = document.querySelector('h1');
    if (h1) {
      h1.textContent = 'SUPER_ULTRA_LONG_UNBROKEN_MOVIE_TITLE_WITHOUT_SPACES_THAT_WOULD_BREAK_ORDINARY_FLEX_CONTAINERS_ON_MOBILE_SCREENS_1234567890';
    }

    const overview = document.querySelector('p.break-words');
    if (overview) {
      overview.textContent = 'Adversarial_Stress_Unbroken_String_'.repeat(20) + ' ' + 'Normal words in overview '.repeat(30);
    }

    const postStressOverflow = document.documentElement.scrollWidth - window.innerWidth;
    const h1Box = h1 ? h1.getBoundingClientRect() : null;

    return {
      initialOverflow,
      postStressOverflow,
      h1Right: h1Box ? h1Box.right : 0,
      windowWidth: window.innerWidth,
      h1Overflows: h1Box ? (h1Box.right > window.innerWidth) : false,
    };
  });

  console.log(`Initial Overflow: ${result.initialOverflow}px`);
  console.log(`Post-Stress Overflow: ${result.postStressOverflow}px`);
  console.log(`H1 Right Edge: ${result.h1Right}px vs Window Width: ${result.windowWidth}px (H1 Overflows: ${result.h1Overflows})`);

  await context.close();
  await browser.close();
}

main().catch(console.error);
