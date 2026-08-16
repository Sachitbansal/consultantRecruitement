/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Docker: produces a minimal self-contained server bundle
  // (.next/standalone) that doesn't need node_modules copied wholesale
  // into the runtime image.
  output: 'standalone',
};

export default nextConfig;
