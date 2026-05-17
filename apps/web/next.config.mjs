/** @type {import('next').NextConfig} */
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  poweredByHeader: false,
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? 'tradezen',
  project: process.env.SENTRY_PROJECT ?? 'web',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
});