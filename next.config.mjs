/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/avatars/**',
      },
    ],
  },
  async headers() {
    const developmentScriptSources = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '';
    const developmentConnectSources = process.env.NODE_ENV === 'development'
      ? ' ws://localhost:* http://localhost:*'
      : '';
    const contentSecurityPolicy = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:${developmentScriptSources}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://res.cloudinary.com",
      "media-src 'self' blob: https://res.cloudinary.com",
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://unpkg.com blob:${developmentConnectSources}`,
      "worker-src 'self' blob:",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ');

    const securityHeaders = [
      { key: 'Content-Security-Policy', value: contentSecurityPolicy },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(), payment=()' },
      { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
      { key: 'X-XSS-Protection', value: '0' },
    ];

    if (process.env.NODE_ENV === 'production') {
      securityHeaders.push({ key: 'Strict-Transport-Security', value: 'max-age=31536000' });
    }

    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
