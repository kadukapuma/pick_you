const config = require("./app.json");

const withoutMapsPlugin = (plugin) =>
  !(Array.isArray(plugin) ? plugin[0] === "react-native-maps" : plugin === "react-native-maps");

module.exports = () => {
  const expo = config.expo;

  return {
    expo: {
      ...expo,
      plugins: [
        ...(expo.plugins || []).filter(withoutMapsPlugin),
        [
          "react-native-maps",
          {
            androidGoogleMapsApiKey:
              process.env.GOOGLE_MAPS_ANDROID_API_KEY_DRIVER || "",
            iosGoogleMapsApiKey:
              process.env.GOOGLE_MAPS_IOS_API_KEY_DRIVER || "",
          },
        ],
      ],
    },
  };
};
