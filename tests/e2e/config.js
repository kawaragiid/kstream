// @ts-check
/**
 * Global E2E Test Suite Configuration
 */

const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const VIEWPORTS = {
  'mobile-360': { width: 360, height: 640, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
  'mobile-360-740': { width: 360, height: 740, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
  'mobile-375': { width: 375, height: 667, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  'mobile-390': { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
  'mobile-414': { width: 414, height: 896, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
  'mobile-430': { width: 430, height: 932, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
  'desktop-1024': { width: 1024, height: 768, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
  'desktop-1440': { width: 1440, height: 900, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
};

const THRESHOLDS = {
  TOUCH_TARGET_STANDARD: 44, // px
  TOUCH_TARGET_PLAYER: 40,   // px
  TOUCH_TARGET_PILL: 38,     // px
  OVERFLOW_TOLERANCE: 0,     // px
  HERO_MIN_HEIGHT: 380,      // px
  CARD_PEEK_RATIO_MIN: 0.20, // 20%
  SUBPIXEL_EPSILON: 0.1,     // 43.9px threshold for 44px
};

const TIMEOUTS = {
  ACTION_DEFAULT: 3000,      // ms: click, fill, locator actions
  NAVIGATION_DEFAULT: 10000, // ms: page.goto and cold compilation
  SERVER_PROBE: 3000,        // ms: pre-flight health & identity check
};

const TEST_TIERS = {
  1: { name: 'Tier 1: Feature Coverage (Happy Path)', targetCount: 115 },
  2: { name: 'Tier 2: Boundary & Corner Cases', targetCount: 115 },
  3: { name: 'Tier 3: Pairwise Combinations', targetCount: 26 },
  4: { name: 'Tier 4: Real-World Mobile User Scenarios', targetCount: 12 },
};

module.exports = {
  BASE_URL,
  VIEWPORTS,
  THRESHOLDS,
  TIMEOUTS,
  TEST_TIERS,
};
