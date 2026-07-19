const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Drizzle's Expo migration bundle imports raw .sql files; let Metro resolve them.
config.resolver.sourceExts.push('sql');

// expo-sqlite's web worker imports the SQLite WASM binary as an asset.
// Metro does not include `.wasm` in its default asset extensions.
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

// expo-sqlite's synchronous web API requires cross-origin isolation.
const existingEnhanceMiddleware = config.server?.enhanceMiddleware;
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, metroServer) => {
    const enhanced = existingEnhanceMiddleware
      ? existingEnhanceMiddleware(middleware, metroServer)
      : middleware;

    return (req, res, next) => {
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      return enhanced(req, res, next);
    };
  },
};

module.exports = config;
