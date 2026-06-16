import { Tabs } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Animated,
  Easing,
  Platform,
  PixelRatio,
  StyleSheet,
  View,
  Dimensions,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const scale = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel((SCREEN_WIDTH / 375) * size));

// ─── Animated tab icon wrapper ──────────────────────────────────────────────
type TabIconProps = {
  focused: boolean;
  children: React.ReactNode;
};

function TabIcon({ focused, children }: TabIconProps) {
  const scaleAnim = useRef(new Animated.Value(focused ? 1 : 0.88)).current;
  const bgOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
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
    <Animated.View
      style={[styles.tabIconOuter, { transform: [{ scale: scaleAnim }] }]}
    >
      <Animated.View style={[styles.tabIconPill, { opacity: bgOpacity }]} />
      {children}
    </Animated.View>
  );
}

// ─── Animated centre scan button ────────────────────────────────────────────
function ScanButton() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
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
      <View style={styles.scanButtonRing} />
      <View style={styles.scanButtonInner}>
        <MaterialIcons
          name="qr-code-scanner"
          size={scale(24)}
          color="#FFFFFF"
        />
      </View>
    </Animated.View>
  );
}

// ─── Layout ──────────────────────────────────────────────────────────────────
export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  // Tab bar height: icon area + label + safe area bottom padding
  const TAB_BAR_HEIGHT =
    scale(52) + (insets.bottom > 0 ? insets.bottom : scale(8));

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,

        tabBarActiveTintColor: "#20B768",
        tabBarInactiveTintColor: "#9CA3AF",

        tabBarLabelStyle: {
          fontSize: scale(10),
          fontWeight: "600",
          marginTop: 2,
          includeFontPadding: false,
        },

        tabBarStyle: {
          // ✅ No `position: absolute`, no `left/right/bottom` offsets
          // Sits naturally at the bottom, system handles safe area
          height: TAB_BAR_HEIGHT,
          backgroundColor: "#FFFFFF",
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: "#E5E7EB",

          // Internal padding so content doesn't touch bottom edge
          paddingTop: scale(8),
          paddingBottom: insets.bottom > 0 ? insets.bottom : scale(8),

          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
            },
            android: {
              elevation: 8,
            },
          }),
        },

        tabBarItemStyle: {
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
                size={scale(21)}
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
                size={scale(21)}
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
            fontSize: scale(10),
            fontWeight: "600",
            marginTop: scale(6),
            includeFontPadding: false,
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
                size={scale(21)}
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
                size={scale(21)}
                color={color}
              />
            </TabIcon>
          ),
        }}
      />

      {/* HIDDEN SCREENS */}
      <Tabs.Screen name="account" options={{ href: null }} />
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  // ── Tab icon ──────────────────────────────────────────────────────────────
  tabIconOuter: {
    width: scale(44),
    height: scale(32),
    borderRadius: scale(16),
    alignItems: "center",
    justifyContent: "center",
  },

  tabIconPill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#E8F8F0",
    borderRadius: scale(16),
  },

  // ── Scan FAB ──────────────────────────────────────────────────────────────
  scanButtonOuter: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    alignItems: "center",
    justifyContent: "center",
    marginTop: scale(-16), // slight lift — subtle, not aggressive
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
    borderRadius: scale(28),
    backgroundColor: "#FFFFFF",
  },

  scanButtonInner: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
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
