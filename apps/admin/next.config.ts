import type { NextConfig } from 'next';

const config: NextConfig = {
  // Shared package ships TypeScript source.
  transpilePackages: ['@food-rescue/shared'],
};

export default config;
