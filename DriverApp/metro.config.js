const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);
const defaultResolveRequest = config.resolver.resolveRequest;

// Moti ships a React Native entry, but its package exports point Metro at the
// web build, which imports framer-motion. Use legacy RN resolution so Android
// bundles the native Moti source instead.
config.resolver.unstable_enablePackageExports = false;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "framer-motion") {
    return {
      filePath: path.resolve(__dirname, "src/shims/framer-motion.js"),
      type: "sourceFile",
    };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
