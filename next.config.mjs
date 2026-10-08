/** @type {import('next').NextConfig} */
const nextConfig = {
  // Crawlers and older browsers still ask for /favicon.ico; the app's
  // icon is src/app/icon.png (served at /icon.png).
  async redirects() {
    return [{ source: '/favicon.ico', destination: '/icon.png', permanent: true }];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' }
    ]
  }
};

export default nextConfig;
