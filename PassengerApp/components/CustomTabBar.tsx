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
        <Ionicons name={name} size={19} color={color} />
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

            const color = isFocused ? "#20B768" : "#7F8E9C";

            let iconName: keyof typeof Ionicons.glyphMap = "home-outline";
            let label = options.title !== undefined ? options.title : route.name;

            if (route.name === "home") {
              iconName = isFocused ? "home" : "home-outline";
              label = "Home";
            } else if (route.name === "activities") {
              iconName = isFocused ? "calendar" : "calendar-outline";
              label = "Activities";
            } else if (route.name === "scan") {
              iconName = isFocused ? "qr-code" : "qr-code-outline";
              label = "Scan & Pay";
            } else if (route.name === "notification") {
              iconName = isFocused ? "notifications" : "notifications-outline";
              label = "Notifications";
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
    left: 24,
    right: 24,
    // Provide a transparent background to hold the shadow
    backgroundColor: "transparent",
    alignItems: "center",
  },
  tabBar: {
    flexDirection: "row",
    height: 66,
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 33,
    paddingHorizontal: 18,
    paddingTop: 5,
    paddingBottom: Platform.OS === "ios" ? 2 : 6,
    borderWidth: 1.5,
    borderColor: "rgba(32, 183, 104, 0.12)",
    ...Platform.select({
      ios: {
        shadowColor: "#20B768",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
      },
      android: {
        elevation: 8,
        shadowColor: "#20B768",
      },
    }),
  },
  tabItem: {
    flex: 1,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconOuterContainer: {
    height: 34,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  tabIconOuter: {
    width: 48,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconPill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#E8F8F0",
    borderRadius: 15,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
    marginBottom: 4,
  },
  tabLabelFocused: {
    fontWeight: "600",
  },
});
