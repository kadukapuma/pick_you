import { router } from "expo-router";
import { Image, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const GREEN = "#34C759";
const DARK = "#202124";

export default function GetStartedScreen() {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isShortScreen = height < 720;
  const heroHeight = Math.min(height * (isShortScreen ? 0.42 : 0.46), 390);
  const logoSize = Math.min(Math.max(width * 0.34, 126), 158);

  return (
    <View style={styles.screen}>
      <View style={[styles.hero, { height: heroHeight }]}> 
        <Image
          source={require("../../assets/images/getstarted.png")}
          style={styles.heroImage}
          resizeMode="cover"
        />
      </View>

      <View style={[styles.content, { paddingBottom: Math.max(insets.bottom + 18, 28) }]}> 
        <View style={[styles.logoWrap, { width: logoSize, height: logoSize * 0.62 }]}> 
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={[styles.title, isShortScreen && styles.titleShort]}>
          Fast delivery for a{"\n"}better life
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/sign-in")}
          activeOpacity={0.86}
          style={[styles.button, { width: Math.min(width - 96, 430) }]}
        >
          <Text style={styles.buttonText}>Get started</Text>
        </TouchableOpacity>

        <Text style={styles.driverText}>
          Want to earn? <Text style={styles.driverLink}>Download driver app</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  hero: {
    width: "100%",
    backgroundColor: "#EEF8F2",
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  content: {
    flex: 1,
    marginTop: -34,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 34,
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 38,
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  title: {
    color: DARK,
    fontSize: 34,
    lineHeight: 42,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: "auto",
  },
  titleShort: {
    fontSize: 30,
    lineHeight: 37,
  },
  button: {
    height: 64,
    borderRadius: 32,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: GREEN,
    shadowOpacity: 0.26,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
    marginBottom: 26,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  driverText: {
    color: "#222222",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  driverLink: {
    color: GREEN,
    fontWeight: "900",
  },
});
