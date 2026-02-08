import type { NextConfig } from "next";

// Content Security Policy directives
const cspDirectives = [
  // Default: only allow same-origin
  "default-src 'self'",

  // Scripts: self + Google Analytics + Google AdSense ecosystem + Ko-fi
  [
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "https://www.googletagmanager.com",
    "https://pagead2.googlesyndication.com",
    "https://*.googlesyndication.com",
    "https://www.google-analytics.com",
    "https://*.googleadservices.com",
    "https://*.google.com",
    "https://*.doubleclick.net",
    "https://*.adtrafficquality.google",
    "https://www.googletagservices.com",
    "https://*.gstatic.com",
    "https://storage.ko-fi.com",
  ].join(" "),

  // Styles: self + unsafe-inline (React inline styles + AdSense + Ko-fi)
  "style-src 'self' 'unsafe-inline' https://storage.ko-fi.com",

  // Images: self + data URIs + Google services + Ko-fi
  [
    "img-src 'self' data: blob:",
    "https://*.google.com",
    "https://*.googlesyndication.com",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://*.doubleclick.net",
    "https://*.gstatic.com",
    "https://*.adtrafficquality.google",
    "https://storage.ko-fi.com",
    "https://ko-fi.com",
  ].join(" "),

  // Fonts: self + data URIs (Next.js self-hosts Google Fonts)
  "font-src 'self' data:",

  // API connections: self + Supabase (REST + Realtime) + Google services
  [
    "connect-src 'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://www.google-analytics.com",
    "https://*.doubleclick.net",
    "https://*.googlesyndication.com",
    "https://www.googletagmanager.com",
    "https://*.google.com",
    "https://*.adtrafficquality.google",
    "https://*.googleadservices.com",
  ].join(" "),

  // Frames: AdSense ad iframes + Google
  [
    "frame-src 'self'",
    "https://*.doubleclick.net",
    "https://*.googlesyndication.com",
    "https://*.google.com",
    "https://*.adtrafficquality.google",
  ].join(" "),

  // Workers: self (Next.js service workers)
  "worker-src 'self' blob:",

  // Media: self
  "media-src 'self'",

  // Prevent embedding by other sites
  "frame-ancestors 'self'",

  // Block <object>, <embed>, <applet>
  "object-src 'none'",

  // Restrict <base> tag
  "base-uri 'self'",

  // Restrict form submissions
  "form-action 'self'",

  // Upgrade HTTP to HTTPS
  "upgrade-insecure-requests",
];

const ContentSecurityPolicy = cspDirectives.join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: ContentSecurityPolicy,
  },
  {
    // Prevent MIME type sniffing
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Control referrer information
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Restrict browser features
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    // Enforce HTTPS (1 year)
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
    // Prevent clickjacking (backup for CSP frame-ancestors)
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    // Enable DNS prefetching for performance
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
