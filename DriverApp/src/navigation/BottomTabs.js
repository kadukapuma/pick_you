import { Feather } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  Platform,
} from "react-native";

import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback } from "react";

import ActivityScreen from "../screens/Main Screen/ActivityScreen";
import EarningsScreen from "../screens/Main Screen/EarningScreen";
import HomeScreen from "../screens/Main Screen/HomeScreen";
import ProfileScreen from "../screens/Main Screen/ProfileScreen";

const Tab = createBottomTabNavigator();

/* =========================
   ANIMATED TAB ICON
========================= */
const AnimatedTabIcon = ({ focused, iconName, label }) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: withSpring(focused ? -2 : 0, {
            damping: 12,
            stiffness: 120,
          }),
        },
        {
          scale: withSpring(focused ? 1.08 : 1, {
            damping: 12,
            stiffness: 120,
          }),
        },
      ],
      opacity: withSpring(focused ? 1 : 0.7),
    };
  });

  return (
    <Animated.View style={[animatedStyle, styles.iconWrapper]}>
      {focused && (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(180)}
          style={styles.activeBackground}
        />
      )}

      <Feather
        name={iconName}
        size={20}
        color={focused ? "#00D26A" : "#8E9BAE"}
        style={{ zIndex: 2 }}
      />

      {focused && (
        <Text style={styles.activeLabel}>
          {label}
        </Text>
      )}
    </Animated.View>
  );
};

/* =========================
   CUSTOM TAB BAR
========================= */
const CustomTabBar = ({ state, navigation }) => {
  return (
    <View style={styles.wrapper}>
      <BlurView intensity={90} tint="dark" style={styles.tabBar}>
        {/* PREMIUM TOP SHINE */}
        <View style={styles.topGlow} />

        {state.routes.map((route, index) => {
          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          let iconName =
            route.name === "Home"
              ? "home"
              : route.name === "Earnings"
              ? "dollar-sign"
              : route.name === "Activity"
              ? "clock"
              : "user";

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.8}
              style={styles.tabItem}
            >
              <AnimatedTabIcon
                focused={focused}
                iconName={iconName}
                label={route.name}
              />
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </View>
  );
};

/* =========================
   NAVIGATION
========================= */
const BottomTabs = ({
  setIsLoggedIn,
  setIsNewUser,
  setDriverStatus,
  maintenanceMode,
  driverStatus,
}) => {
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      if (maintenanceMode && driverStatus?.toLowerCase() === "approved") {
        navigation.replace("ComingSoon");
      }
    }, [maintenanceMode, driverStatus, navigation])
  );

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={styles.safeAreaContainer}
    >
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          animation: "shift",

          tabBarStyle: {
            display: "none",
          },
        }}
        tabBar={(props) => <CustomTabBar {...props} />}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
        />

        <Tab.Screen
          name="Earnings"
          component={EarningsScreen}
        />

        <Tab.Screen
          name="Activity"
          component={ActivityScreen}
        />

        <Tab.Screen name="Profile">
          {(props) => (
            <ProfileScreen
              {...props}
              setIsLoggedIn={setIsLoggedIn}
              setIsNewUser={setIsNewUser}
              setDriverStatus={setDriverStatus}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </SafeAreaView>
  );
};

export default BottomTabs;

/* =========================
   STYLES
========================= */
const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: "#000",
  },

  wrapper: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 22 : 18,
    left: 0,
    right: 0,
    alignItems: "center",
  },

  tabBar: {
    width: "92%",
    height: 74,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",

    borderRadius: 34,

    backgroundColor: "rgba(10,10,10,0.92)",

    overflow: "hidden",

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",

    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 10,
        },
        shadowOpacity: 0.25,
        shadowRadius: 18,
      },
      android: {
        elevation: 18,
      },
    }),
  },

  topGlow: {
    position: "absolute",
    top: 0,
    width: "100%",
    height: 1,

    backgroundColor: "rgba(255,255,255,0.18)",
  },

  tabItem: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  iconWrapper: {
  minWidth: 90,
  height: 48,

  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: 18,
  position: "relative",
},

  activeBackground: {
    position: "absolute",

    width: 58,
    height: 44,

    borderRadius: 16,

    backgroundColor: "rgba(0,210,106,0.14)",

    borderWidth: 1,
    borderColor: "rgba(0,210,106,0.25)",

    shadowColor: "#00D26A",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 0,
    },
  },

  activeLabel: {
    position: "absolute",
    bottom: -6,

    fontSize: 10,
    fontWeight: "700",

    color: "#00D26A",
  },
});