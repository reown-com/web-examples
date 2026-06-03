/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  webpack(config, { webpack }) {
    // WDK / TON / Solana libs reach for some Node built-ins that don't exist in the browser.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false
    }
    // WDK's "memory-safe" key handling pulls in `sodium-universal`, which uses the
    // native `sodium-native` addon under Node. In the browser we redirect it to the
    // pure-JS `sodium-javascript` implementation (used only for `sodium_memzero`).
    config.resolve.alias = {
      ...config.resolve.alias,
      'sodium-native': require.resolve('sodium-javascript')
    }
    // Several crypto libs expect a global `Buffer`.
    config.plugins.push(
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer']
      })
    )
    return config
  }
}
