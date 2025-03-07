module.exports = {
  reactStrictMode: true,
  webpack(config) {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false
    }
    // needed for tiny-secp256k1 package
    config.experiments.asyncWebAssembly = true
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async'
    })
    return config
  },
  images: {
    domains: ['s2.coinmarketcap.com'],
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          }
        ]
      }
    ]
  }
}
