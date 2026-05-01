/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow Supabase Storage URLs in <Image> if we ever use them
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};

module.exports = nextConfig;
