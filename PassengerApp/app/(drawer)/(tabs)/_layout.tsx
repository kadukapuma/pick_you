import { Tabs } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

// ─── Animated tab icon wrapper ──────────────────────────────────────────────
type TabIconProps = {
  focused: boolean;
  children: React.ReactNode;
};

function TabIcon({ focused, children }: TabIconProps) {
  const scale = useRef(new Animated.Value(focused ? 1 : 0.88)).current;
  const bgOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1 : 0.88,
        useNativeDriver: true,
        damping: 14,
        stiffness: 180,
      }),
      Animated.timing(bgOpacity, {
        toValue: focused ? 1 : 0,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  return (
    <Animated.View style={[styles.tabIconOuter, { transform: [{ scale }] }]}>
      {/* Pill background */}
      <Animated.View style={[styles.tabIconPill, { opacity: bgOpacity }]} />
      {children}
    </Animated.View>
  );
}

// ─── Animated centre scan button ────────────────────────────────────────────
function ScanButton() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Gentle repeating pulse to draw attention
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[styles.scanButtonOuter, { transform: [{ scale: pulse }] }]}
    >
      {/* White ring */}
      <View style={styles.scanButtonRing} />
      {/* Green disc */}
      <View style={styles.scanButtonInner}>
        <MaterialIcons name="qr-code-scanner" size={26} color="#FFFFFF" />
      </View>
    </Animated.View>
  );
}

// ─── Tab bar entrance animation ─────────────────────────────────────────────
function useTabBarEntrance() {
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 520,
        delay: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return { translateY, opacity };
}

export default function TabsLayout() {
  // We animate a wrapper view placed over the tab bar for the slide-up entrance.
  // The tab bar itself is hidden (transparent/height-0) and we render a custom
  // floating bar below using tabBarBackground.
  const { translateY, opacity } = useTabBarEntrance();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,

        tabBarActiveTintColor: "#20B768",
        tabBarInactiveTintColor: "#9CA3AF",

        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: 1,
        },

        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: 18,
          height: 72,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          borderRadius: 28,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 0 : 8,
          ...Platform.select({
            ios: {
              shadowColor: "#0B3D2E",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.14,
              shadowRadius: 20,
            },
            android: {
              elevation: 18,
            },
          }),
        },

        tabBarItemStyle: {
          height: 58,
          alignItems: "center",
          justifyContent: "center",
        },
      }}
    >
      {/* HOME */}
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={21}
                color={color}
              />
            </TabIcon>
          ),
        }}
      />

      {/* ACTIVITIES */}
      <Tabs.Screen
        name="activities"
        options={{
          title: "Activities",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <Ionicons
                name={focused ? "calendar" : "calendar-outline"}
                size={21}
                color={color}
              />
            </TabIcon>
          ),
        }}
      />

      {/* SCAN – centre FAB */}
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan & Pay",
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "600",
            marginTop: 8,
          },
          tabBarIcon: () => <ScanButton />,
        }}
      />

      {/* NOTIFICATIONS */}
      <Tabs.Screen
        name="notification"
        options={{
          title: "Notifications",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <Ionicons
                name={focused ? "notifications" : "notifications-outline"}
                size={21}
                color={color}
              />
            </TabIcon>
          ),
        }}
      />

      {/* WALLET */}
      <Tabs.Screen
        name="wallet"
        options={{
          title: "Wallet",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <Ionicons
                name={focused ? "wallet" : "wallet-outline"}
                size={21}
                color={color}
              />
            </TabIcon>
          ),
        }}
      />

      {/* HIDDEN SCREENS */}
      <Tabs.Screen name="account" options={{ href: null }} />
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="saveaddress" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  // ── Tab icon ──────────────────────────────────────────────────────────────
  tabIconOuter: {
    width: 42,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  tabIconPill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#E8F8F0",
    borderRadius: 16,
  },

  // ── Scan button ───────────────────────────────────────────────────────────
  scanButtonOuter: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -22,
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.16,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },

  scanButtonRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 31,
    backgroundColor: "#FFFFFF",
  },

  scanButtonInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#20B768",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#20B768",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.42,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});
