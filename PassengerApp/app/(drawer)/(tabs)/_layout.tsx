import { Tabs } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  View,
} from "react-native";
import CustomTabBar from "../../../components/CustomTabBar";

// ─── Tab bar entrance animation ─────────────────────────────────────────────
function useTabBarEntrance() {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        delay: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return { translateY, opacity };
}

export default function TabsLayout() {
  const { translateY, opacity } = useTabBarEntrance();

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: "#000000" }}>
      <View style={{ flex: 1, backgroundColor: "#F4FBFF" }}>
        {/* Separate Container layer to cleanly handle animation profiles without breaking system shadows */}
        <Animated.View style={[styles.animatedContainer, { opacity, transform: [{ translateY }] }]}>
          <Tabs
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{
              headerShown: false,
            }}
          >
            {/* HOME */}
            <Tabs.Screen
              name="home"
              options={{ title: "Home" }}
            />

            {/* ACTIVITIES */}
            <Tabs.Screen
              name="activities"
              options={{ title: "Activities" }}
            />

            {/* SCAN & PAY */}
            <Tabs.Screen
              name="scan"
              options={{ title: "Scan & Pay" }}
            />

            {/* NOTIFICATIONS */}
            <Tabs.Screen
              name="notification"
              options={{ title: "Notifications" }}
            />

            {/* HIDDEN SCREENS */}
            <Tabs.Screen name="wallet" options={{ href: null }} />
            <Tabs.Screen name="account" options={{ href: null }} />
            <Tabs.Screen name="index" options={{ href: null }} />
          </Tabs>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  animatedContainer: {
    flex: 1,
  },
});