// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure env vars are validated at build time
  env: {
    // Expose only safe public vars to the client
    NEXT_PUBLIC_PUSHER_KEY: process.env.PUSHER_KEY,
    NEXT_PUBLIC_PUSHER_CLUSTER: process.env.PUSHER_CLUSTER,
  },
  // API routes that receive raw bodies (webhooks) need bodyParser disabled
  // This is handled per-route via the exported `config` object in each webhook file
  async headers() {
    return [
      {
        // Telnyx webhook endpoints must allow POST from any origin
        source: '/api/webhooks/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, telnyx-signature-ed25519, telnyx-timestamp' },
        ],
      },
    ]
  },
}

module.exports = nextConfig