// @ts-check
/**
 * Viewport Presets for Mobile and Desktop Testing
 */

const VIEWPORT_PRESETS = {
  'mobile-360': {
    name: 'mobile-360',
    width: 360,
    height: 640,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    description: 'Canonical Android 16:9 Mobile Baseline (360x640)',
  },
  'mobile-360-640': {
    name: 'mobile-360-640',
    width: 360,
    height: 640,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    description: 'Canonical Android 16:9 Mobile Baseline (360x640)',
  },
  'mobile-360-740': {
    name: 'mobile-360-740',
    width: 360,
    height: 740,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    description: 'Samsung Galaxy S8/S20 Tall Mobile (360x740)',
  },
  'mobile-375': {
    name: 'mobile-375',
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    description: 'iPhone SE / Legacy Mobile',
  },
  'mobile-390': {
    name: 'mobile-390',
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    description: 'iPhone 12/13/14 Standard Mobile',
  },
  'mobile-414': {
    name: 'mobile-414',
    width: 414,
    height: 896,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    description: 'iPhone XR / 11 Plus Mobile',
  },
  'mobile-430': {
    name: 'mobile-430',
    width: 430,
    height: 932,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    description: 'iPhone 14/15/16 Pro Max Large Mobile',
  },
  'desktop-1024': {
    name: 'desktop-1024',
    width: 1024,
    height: 768,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    description: 'iPad Landscape / Small Desktop',
  },
  'desktop-1440': {
    name: 'desktop-1440',
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    description: 'Standard Desktop Monitor (1440x900)',
  },
};

function getViewport(presetOrWidth) {
  if (typeof presetOrWidth === 'string' && VIEWPORT_PRESETS[presetOrWidth]) {
    return VIEWPORT_PRESETS[presetOrWidth];
  }
  if (typeof presetOrWidth === 'number') {
    const matchedPreset = Object.values(VIEWPORT_PRESETS).find((p) => p.width === presetOrWidth);
    if (matchedPreset) {
      return matchedPreset;
    }
    const isMob = presetOrWidth < 1024;
    return {
      name: `custom-${presetOrWidth}`,
      width: presetOrWidth,
      height: isMob ? 640 : 768,
      deviceScaleFactor: isMob ? (presetOrWidth <= 375 ? 2 : 3) : 1,
      isMobile: isMob,
      hasTouch: isMob,
      description: `Custom ${presetOrWidth}px Viewport`,
    };
  }
  return VIEWPORT_PRESETS['mobile-360'];
}

module.exports = {
  VIEWPORT_PRESETS,
  getViewport,
};
