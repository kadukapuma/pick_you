import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti"; // Make sure to: npx expo install moti react-native-reanimated
import {
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const GetStartedScreen = ({ navigation }) => {
  return (
    <LinearGradient colors={["#0B1220", "#000000"]} style={styles.container}>
      <StatusBar barStyle="light-content" />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Main Logo Circle Section */}
          <MotiView
            from={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", duration: 1000 }}
            style={styles.mainIconContainer}
          >
            <Image
              source={require("../../assets/logo.png")}
              style={styles.logoInsideCircle}
              resizeMode="contain"
            />
          </MotiView>

          {/* Title & Subtitle */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 300 }}
          >
            <Text style={styles.title}>Drive & Earn</Text>
            <Text style={styles.subtitle}>
              Your journey to flexible earning starts here
            </Text>
          </MotiView>

          {/* Features List */}
          <View style={styles.featuresContainer}>
            {[
              {
                icon: "map-pin",
                title: "Drive on your schedule",
                sub: "Go online whenever you want, wherever you are",
                type: "feather",
              },
              {
                icon: "currency-usd",
                title: "Earn more money",
                sub: "Get paid weekly with competitive rates",
                type: "material",
              },
              {
                icon: "shield",
                title: "Safety first",
                sub: "24/7 support and insurance coverage",
                type: "feather",
              },
            ].map((item, index) => (
              <MotiView
                key={index}
                from={{ opacity: 0, translateX: -20 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ delay: 500 + index * 100 }}
                style={styles.featureItem}
              >
                <View style={styles.featureIconContainer}>
                  {item.type === "feather" ? (
                    <Feather name={item.icon} size={22} color="#00A859" />
                  ) : (
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={24}
                      color="#00A859"
                    />
                  )}
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>{item.title}</Text>
                  <Text style={styles.featureSubtitle}>{item.sub}</Text>
                </View>
              </MotiView>
            ))}
          </View>
        </View>

        {/* Bottom Buttons */}
        <MotiView
          from={{ opacity: 0, translateY: 50 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 800 }}
          style={styles.bottomContainer}
        >
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={() => navigation.navigate("Register")}
            activeOpacity={0.8}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => navigation.navigate("Login")}
            activeOpacity={0.8}
          >
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
        </MotiView>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default GetStartedScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  mainIconContainer: {
    width: 130, // Slightly bigger circle
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgb(255, 255, 255)", // Soft glow effect
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 40,
    borderWidth: 1,
    borderColor: "rgba(255, 228, 92, 0.2)",
  },
  logoInsideCircle: {
    width: 110, // Larger logo inside
    height: 110,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 45,
    paddingHorizontal: 10,
  },
  featuresContainer: {
    gap: 24,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  featureIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 228, 92, 0.10)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
    paddingTop: 2,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  featureSubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    lineHeight: 20,
  },
  bottomContainer: {
    gap: 16,
  },
  getStartedButton: {
    backgroundColor: "#00A859",
    height: 58,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    // Shadow for iOS
    shadowColor: "#00A859",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    // Elevation for Android
    elevation: 8,
  },
  getStartedText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#ffffff",
  },
  signInButton: {
    height: 58,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(95, 255, 92, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  signInText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
