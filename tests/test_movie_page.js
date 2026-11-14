// @ts-check
const { launchBrowser, createContext } = require('./e2e/helpers/browser');

const VIEWPORTS = [
  { name: 'mobile-360', width: 360, height: 640, isMobile: true, hasTouch: true },
  { name: 'mobile-375', width: 375, height: 667, isMobile: true, hasTouch: true },
  { name: 'mobile-390', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'mobile-414', width: 414, height: 896, isMobile: true, hasTouch: true },
  { name: 'mobile-430', width: 430, height: 932, isMobile: true, hasTouch: true },
  { name: 'desktop-1024', width: 1024, height: 768, isMobile: false, hasTouch: false },
  { name: 'desktop-1280', width: 1280, height: 800, isMobile: false, hasTouch: false },
];

async function main() {
  const browser = await launchBrowser({ headless: true });
  console.log('=== TESTING MOVIE DETAIL PAGE: /movies/bishu ===\n');

  for (const vp of VIEWPORTS) {
    const context = await createContext(browser, vp);
    const page = await context.newPage();
    await page.goto('http://localhost:3008/movies/bishu', { waitUntil: 'networkidle' });

    const data = await page.evaluate(({ width, isMobile }) => {
      const docEl = document.documentElement;
      const scrollWidth = Math.max(docEl.scrollWidth, document.body.scrollWidth);
      const overflow = scrollWidth - window.innerWidth;

      // Hero section & wrapper
      const heroSection = document.querySelector('section');
      const heroCs = heroSection ? window.getComputedStyle(heroSection) : null;
      const heroRadius = heroCs ? parseFloat(heroCs.borderRadius) : null;
      const heroWrapper = heroSection?.parentElement;
      const heroWrapperCs = heroWrapper ? window.getComputedStyle(heroWrapper) : null;
      const heroPadLeft = heroWrapperCs ? parseFloat(heroWrapperCs.paddingLeft) : null;

      // Play button
      const playBtn = document.querySelector('a[href*="/player"]');
      const playRect = playBtn ? playBtn.getBoundingClientRect() : null;

      // Favorite button
      const favBtn = document.querySelector('button[aria-label*="Favorit"]');
      const favRect = favBtn ? favBtn.getBoundingClientRect() : null;
      const favCs = favBtn ? window.getComputedStyle(favBtn) : null;

      // Trailer button
      const allLinks = Array.from(document.querySelectorAll('a'));
      const trailerBtn = allLinks.find(a => a.textContent?.includes('Trailer') || a.href.includes('trailer'));
      const trailerRect = trailerBtn ? trailerBtn.getBoundingClientRect() : null;

      return {
        innerWidth: window.innerWidth,
        scrollWidth,
        overflow,
        heroRadius,
        heroPadLeft,
        playBox: playRect ? { width: playRect.width, height: playRect.height } : null,
        favBox: favRect ? { width: favRect.width, height: favRect.height, radius: favCs?.borderRadius } : null,
        trailerBox: trailerRect ? { width: trailerRect.width, height: trailerRect.height } : null,
      };
    }, { width: vp.width, isMobile: vp.isMobile });

    console.log(`[${vp.name}]
  - Overflow: ${data.overflow}px (scrollWidth: ${data.scrollWidth}px vs innerWidth: ${data.innerWidth}px)
  - Hero Radius: ${data.heroRadius}px | Hero Pad Left: ${data.heroPadLeft}px
  - Play Button: ${data.playBox ? `${data.playBox.width.toFixed(1)}x${data.playBox.height.toFixed(1)}px` : 'Not Found'}
  - Favorite Button: ${data.favBox ? `${data.favBox.width.toFixed(1)}x${data.favBox.height.toFixed(1)}px (radius: ${data.favBox.radius})` : 'Not Found'}
  - Trailer Button: ${data.trailerBox ? `${data.trailerBox.width.toFixed(1)}x${data.trailerBox.height.toFixed(1)}px` : 'None'}`);

    await context.close();
  }

  await browser.close();
}

main().catch(console.error);
