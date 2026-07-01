/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 避免 antd barrel import 在 dev 下生成易失真的 server vendor-chunks
  experimental: {
    optimizePackageImports: ['antd', '@ant-design/charts'],
  },
};

export default nextConfig;
