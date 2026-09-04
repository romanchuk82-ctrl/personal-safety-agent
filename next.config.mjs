/** @type {import('next').NextConfig} */
const isGithubPages = process.env.GITHUB_ACTIONS === 'true' || process.env.STATIC_EXPORT === 'true';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? (isGithubPages ? '/personal-safety-agent' : '');

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  ...(isGithubPages ? {
    output: 'export',
    images: { unoptimized: true }
  } : {})
};

export default nextConfig;

