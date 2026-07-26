const fs = require("fs");
const path = require("path");

function readEnvValue(name) {
  const direct = process.env[name];
  if (direct) return direct.trim();

  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return undefined;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    if (key !== name) continue;
    return trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
  }

  return undefined;
}

module.exports = ({ config }) => {
  const androidMapsKey = readEnvValue("GOOGLE_MAPS_ANDROID_API_KEY_PASSENGER");
  const iosMapsKey = readEnvValue("GOOGLE_MAPS_IOS_API_KEY_PASSENGER") || androidMapsKey;

  return {
    ...config,
    ios: {
      ...config.ios,
      config: {
        ...(config.ios?.config || {}),
        googleMapsApiKey: iosMapsKey,
      },
    },
    android: {
      ...config.android,
      config: {
        ...(config.android?.config || {}),
        googleMaps: {
          ...(config.android?.config?.googleMaps || {}),
          apiKey: androidMapsKey,
        },
      },
    },
  };
};
