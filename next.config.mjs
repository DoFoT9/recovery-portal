import withPWAInit from '@ducanh2912/next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  customWorkerDir: 'worker',
  register: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    runtimeCaching: [
      { urlPattern: /\/api\/media\/videos\/.*/i, handler: 'NetworkOnly' },
      { urlPattern: /\/api\/push\/.*/i, handler: 'NetworkOnly' },
      { urlPattern: /\/api\/activity\/.*/i, handler: 'NetworkOnly' },
      { urlPattern: /\/api\/health/i, handler: 'NetworkOnly' },
      { urlPattern: /\/api\/setup\/.*/i, handler: 'NetworkOnly' },
      { urlPattern: /\.(?:png|jpg|jpeg|svg|webp|gif)$/i, handler: 'StaleWhileRevalidate', options: { cacheName: 'images' } }
    ]
  }
})

export default withPWA({
  // Required for the Docker image (Next.js standalone bundling)
  output: 'standalone',
  experimental: { serverActions: { bodySizeLimit: '10mb' } },
  // Allow the better-sqlite3 native binding to load at runtime
  serverExternalPackages: ['better-sqlite3'],
})
