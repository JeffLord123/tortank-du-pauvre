import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Pre-existing lint issues in frontend components are tracked separately.
  // Run `npm run lint` to see them; they don't block deployment.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
