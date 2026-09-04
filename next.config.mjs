/** @type {import('next').NextConfig} */
const isGithubPages = process.env.GITHUB_ACTIONS === 'true' || process.env.STATIC_EXPORT === 'true';

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(isGithubPages ? {
    output: 'export',
    basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
    images: { unoptimized: true }
  } : {})
};

export default nextConfig;
