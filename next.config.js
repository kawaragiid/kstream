const isProd = process.env.NODE_ENV === "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"} https://apis.google.com https://*.gstatic.com https://www.gstatic.com https://*.firebaseapp.com https://*.web.app https://www.google.com https://www.recaptcha.net`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "media-src 'self' blob: https:",
  "connect-src 'self' https://*.mux.com https://*.fastly.net https://*.akamaized.net https://*.cloudfront.net https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://*.firebase.com https://*.web.app https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.google.com https://www.recaptcha.net https://*.vercel-storage.com wss://*.firebaseio.com",
  "frame-src 'self' https://*.firebaseapp.com https://*.web.app https://accounts.google.com https://www.google.com https://www.recaptcha.net",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
