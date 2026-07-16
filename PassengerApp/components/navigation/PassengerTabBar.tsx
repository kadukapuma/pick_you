import React, { useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Easing,
  Text,
} from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

type TabIconProps = {
  focused: boolean;
  name: keyof typeof Ionicons.glyphMap;
  color: string;
};

function TabIcon({ focused, name, color }: TabIconProps) {
  const scale = useRef(new Animated.Value(focused ? 1 : 0.9)).current;
  const bgOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1 : 0.9,
        useNativeDriver: true,
        damping: 15,
        stiffness: 200,
      }),
      Animated.timing(bgOpacity, {
        toValue: focused ? 1 : 0,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  return (
    <View style={styles.tabIconOuterContainer}>
      <Animated.View style={[styles.tabIconOuter, { transform: [{ scale }] }]}>
        <Animated.View style={[styles.tabIconPill, { opacity: bgOpacity }]} />
        <Ionicons name={name} size={22} color={color} />
      </Animated.View>
    </View>
  );
}

export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];

            // Skip routes that have href: null (Hidden screens like wallet, account, index)
            // Expo router passes a custom property sometimes, but we can also match by known names or options.tabBarButton
            if ((options as any).href === null || ["wallet", "account", "index"].includes(route.name)) {
              return null;
            }

            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                // The `merge: true` option makes sure that the params inside the tab screen are preserved
                navigation.navigate({ name: route.name, merge: true } as any);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: "tabLongPress",
                target: route.key,
              });
            };

            const color = isFocused ? "#FFFFFF" : "#B8D8CE";

            let iconName: keyof typeof Ionicons.glyphMap = "home-outline";
            let label = options.title !== undefined ? options.title : route.name;

            if (route.name === "home") {
              iconName = isFocused ? "home" : "home-outline";
              label = "Home";
            } else if (route.name === "trips") {
              iconName = isFocused ? "car-sport" : "car-sport-outline";
              label = "Trips";
            } else if (route.name === "scan-pay") {
              iconName = isFocused ? "qr-code" : "qr-code-outline";
              label = "Scan & Pay";
            } else if (route.name === "notifications") {
              iconName = isFocused ? "notifications" : "notifications-outline";
              label = "Alerts";
            }

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={(options as any).tabBarTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.tabItem}
                activeOpacity={0.8}
              >
                <TabIcon focused={isFocused} name={iconName} color={color} />
                <Text
                  style={[
                    styles.tabLabel,
                    { color },
                    isFocused && styles.tabLabelFocused,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 18,
    left: 16,
    right: 16,
    // Provide a transparent background to hold the shadow
    backgroundColor: "transparent",
    alignItems: "center",
  },
  tabBar: {
    flexDirection: "row",
    height: 74,
    width: "100%",
    backgroundColor: "#063D31",
    borderRadius: 37,
    paddingHorizontal: 12,
    paddingTop: 7,
    paddingBottom: Platform.OS === "ios" ? 4 : 8,
    borderWidth: 1.5,
    borderColor: "rgba(32, 183, 104, 0.42)",
    ...Platform.select({
      ios: {
        shadowColor: "#063D31",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.34,
        shadowRadius: 18,
      },
      android: {
        elevation: 8,
        shadowColor: "#063D31",
      },
    }),
  },
  tabItem: {
    flex: 1,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconOuterContainer: {
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  tabIconOuter: {
    width: 54,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconPill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(32, 183, 104, 0.95)",
    borderRadius: 17,
  },
  tabLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    marginTop: 1,
    marginBottom: 3,
  },
  tabLabelFocused: {
    fontWeight: "800",
  },
});






