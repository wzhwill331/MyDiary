const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

// Don't add web extensions with high priority - let React Native handle platform-specific files naturally
// Platform-specific files like database.web.ts are resolved by RN's built-in platform resolution

module.exports = config;
