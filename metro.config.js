// Metro configuration for Expo/React Native
// Force tslib -> CJS file using a custom resolveRequest and prefer CJS mains.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const realResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'tslib') {
    return { type: 'sourceFile', filePath: require.resolve('tslib/tslib.js') };
  }
  return realResolve
    ? realResolve(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

// Prefer CJS over ESM when present
config.resolver.resolverMainFields = ['react-native', 'main', 'module'];

module.exports = config;
