/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The skill scanner uses Node's fs / child_process at request time.
  // Keep pages dynamic so a rescan happens on every load.
  experimental: {},
};

export default nextConfig;
