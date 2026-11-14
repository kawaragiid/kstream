# Project: Kstream Mobile Responsiveness & Netflix Mirror UI/UX Stabilization

## Architecture
- **Framework**: Next.js 15.5.4 (App Router), React 19.1.0, Tailwind CSS 3.4.15
- **Design Philosophy**: Mobile-first responsive adaptation for viewports 360px to 430px while preserving 100% visual parity and zero regressions on desktop (>= 1024px).
- **Module Boundaries**:
  - `Global / Nav`: `app/layout.js`, `styles/globals.css`, `components/Navbar.js`, `components/Footer.js`
  - `Home / Carousel`: `components/HeroBanner.js`, `components/SliderRow.js`, `components/CardPoster.js`, `components/HomeHistoryRow.js`, `app/page.js`
  - `Detail / Overlay`: `app/(series)/series/[id]/page.js`, `app/(movies)/movies/[id]/page.js`, `components/EpisodeList.js`, `components/MediaOverlayRoot.js`, `components/FavoriteButton.js`
  - `Video Player`: `app/player/page.js`, `components/VideoPlayer.js`, `components/WatchPlayer.js`

## Feature Inventory
Every identified requirement and survey finding is inventoried and assigned below:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Next.js 15 Viewport Configuration | Add dedicated `export const viewport` (`viewportFit: 'cover'`, `themeColor: '#000000'`) in `app/layout.js` | M1 | Survey 2 |
| 2 | Global Overflow-X Suppression & Utilities | Enforce `overflow-x: hidden`, `-webkit-tap-highlight-color: transparent`, and `.no-scrollbar` in `globals.css` | M1 | Survey 2 |
| 3 | Navbar 360px Overflow Elimination | Rebalance top navbar elements so combined width fits within 340px (< 360px) without horizontal leak | M1 | Survey 2 |
| 4 | Navbar & Footer Touch Target Compliance | Enforce minimum 44x44px touch targets on hamburger, search, auth/profile buttons, and footer links | M1 | Survey 2 |
| 5 | Mobile Slide-over Navigation Drawer | Replace in-flow sticky accordion with fixed slide-over drawer, backdrop blur, click-outside dismiss, and body scroll lock | M1 | Survey 2 |
| 6 | Menu Mutual Exclusivity | Ensure opening hamburger closes profile menu and vice versa | M1 | Survey 2 |
| 7 | HeroBanner Mobile Aspect Ratio & Gradient | Replace `aspect-[16/9]` with `aspect-[4/5] min-h-[380px] sm:min-h-0 sm:aspect-[21/9]` and readable gradient | M2 | Survey 1 |
| 8 | HeroBanner Action Touch Targets | Increase button heights to `py-3 sm:py-2.5 min-h-[44px]` with proper flex stacking on mobile | M2 | Survey 1 |
| 9 | SliderRow Next-Card Peek Affordance | Change mobile card width to `w-[36vw]` (revealing ~30% Card 3 peek on 360-430px) to eliminate false floor | M2 | Survey 1 |
| 10 | SliderRow Native Scroll Snap & Polish | Add `snap-x snap-mandatory` and `snap-start`, suppress native scrollbars on Android/iOS | M2 | Survey 1 |
| 11 | CardPoster Touch Optimization | Guard synthetic hover popover with `(hover: hover)`, add `active:scale-95` tap feedback | M2 | Survey 1 |
| 12 | Home Page Vertical Spacing Rhythm | Reduce mobile section spacing from 48-72px to 24-32px (`space-y-8 sm:space-y-12`) | M2 | Survey 1 |
| 13 | Detail Pages Edge-to-Edge Hero Banner | Change `rounded-3xl` to `rounded-none sm:rounded-3xl` and adjust padding to `px-4 sm:px-6` | M3 | Survey 3 |
| 14 | Detail Pages Action Buttons Hierarchy | Primary Play button full-width on mobile (`w-full sm:w-auto min-h-[44px]`), clean alignment with FavoriteButton | M3 | Survey 3 |
| 15 | FavoriteButton Style Harmonization | Update to `rounded-full`, `min-h-[44px]`, matching Netflix Mirror pill standards | M3 | Survey 3 |
| 16 | EpisodeCard Text Squashing Elimination | Scale thumbnail to `w-28 sm:w-40`, adjust flex flow so title, runtime, and overview render cleanly on 360px | M3 | Survey 3 |
| 17 | EpisodeList Season Selector Swipe Scroll | Wrap season pills in horizontal swipe scroll (`no-scrollbar`) with >= 38px touch targets | M3 | Survey 3 |
| 18 | MediaOverlayRoot Full-Screen Modal & Scroll Fix | Use `h-[100dvh] rounded-none sm:rounded-3xl`, eliminate inner scroll trap, scale thumbnail and truncate episode title | M3 | Survey 3 |
| 19 | VideoPlayer iOS Safari Back Button Fix | Ensure Back button is visible on iOS Safari (`isIOS || showOverlay`), un-trapping iOS users | M4 | Survey 3 |
| 20 | VideoPlayer Tap-to-Toggle Controls | Add tap/click toggle on mobile touch devices during video playback | M4 | Survey 3 |
| 21 | VideoPlayer Control Button Touch Targets | Increase control button targets to `h-10 w-10 min-h-[40px] md:h-auto` with accessible hit areas | M4 | Survey 3 |
| 22 | Full E2E Mobile Responsiveness Pass | Pass 100% of automated and visual verification E2E test suite across 360px-430px and desktop | M5 | Acceptance Criteria |
| 23 | Adversarial Coverage Hardening | White-box stress-testing and edge-case verification (Tier 5) | M5 | Project Pattern |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Global Layout, Viewport & Navigation Foundation | `app/layout.js`, `styles/globals.css`, `components/Navbar.js`, `components/Footer.js` | none | IN_PROGRESS (82215dc9) |
| M2 | Home Page & Carousel Interaction Stabilization | `components/HeroBanner.js`, `components/SliderRow.js`, `components/CardPoster.js`, `components/HomeHistoryRow.js`, `app/page.js` | M1 | PLANNED |
| M3 | Detail Pages & Modal Overlay Responsiveness | `app/(series)/series/[id]/page.js`, `app/(movies)/movies/[id]/page.js`, `components/EpisodeList.js`, `components/MediaOverlayRoot.js`, `components/FavoriteButton.js` | M1 | PLANNED |
| M4 | Media Player Mobile Experience & iOS Fixes | `app/player/page.js`, `components/VideoPlayer.js`, `components/WatchPlayer.js` | M1 | PLANNED |
| M5 | Final E2E Test Suite Pass & Adversarial Hardening | Full application, E2E test suite (Tiers 1-5) across viewports | M1, M2, M3, M4, TEST_READY | PLANNED |

## Interface Contracts
### Navbar ↔ Page Content
- Fixed/sticky header height: 60px on mobile (`py-3.5`), 68px on desktop (`py-4`).
- Mobile slide-over drawer: `fixed inset-0 z-50`, locks body scroll via `document.body.style.overflow = 'hidden'`.
- Desktop links: encapsulated in `hidden lg:flex`, untouched by mobile changes.

### SliderRow ↔ CardPoster
- Card width contract on mobile: `w-[36vw] flex-shrink-0 snap-start`. Desktop retains `sm:w-[28vw] md:w-[20vw] lg:w-[16vw] xl:w-[14vw]`.
- Hover preview contract: `handleMouseEnter` only mounts popover video when `window.matchMedia('(hover: hover)').matches`.

### Detail Page ↔ EpisodeList / FavoriteButton
- Detail page passes `series`/`video` object to `FavoriteButton` with `rounded-full` and `min-h-[44px]`.
- EpisodeList accepts `episodes` array, formats season/episode codes `S{season}E{episode}`, thumbnail `aspect-video w-28 sm:w-40`.

### VideoPlayer ↔ App Router
- Route: `/player?id={id}&type={movie|series}&ep={epId}`.
- Back button navigates back or to `/series/{id}` / `/movies/{id}`. Must render with full opacity when `isIOS || showOverlay`.

## Code Layout
- `app/layout.js` — Root layout, metadata, viewport export
- `styles/globals.css` — Global CSS, reset, utility classes
- `components/Navbar.js` — Main navigation, brand, mobile drawer, search, auth/profile
- `components/Footer.js` — Global footer
- `components/HeroBanner.js` — Hero banner component
- `components/SliderRow.js` — Horizontal carousel slider
- `components/CardPoster.js` — Poster card with hover preview
- `components/HomeHistoryRow.js` — Watch history slider row
- `app/page.js` — Home page
- `app/(series)/series/[id]/page.js` — Series detail page
- `app/(movies)/movies/[id]/page.js` — Movie detail page
- `components/EpisodeList.js` — Season tabs & Episode cards
- `components/MediaOverlayRoot.js` — Media detail modal preview overlay
- `components/FavoriteButton.js` — Favorite toggle button
- `app/player/page.js` — Player route wrapper
- `components/VideoPlayer.js` — Video player core component
- `components/WatchPlayer.js` — Watch player wrapper
- `tests/e2e/` — Opaque-box E2E test suite
