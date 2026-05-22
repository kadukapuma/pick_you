const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Add path alias support for @ imports
config.resolver.extraNodeModules = {
  "@": __dirname + "/app",
};

module.exports = withNativeWind(config, {
  input: "./global.css",
});
