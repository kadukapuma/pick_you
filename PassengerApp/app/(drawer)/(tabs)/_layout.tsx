import { Tabs } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { View } from "react-native";

type TabIconProps = {
  focused: boolean;
  children: React.ReactNode;
};

function TabIcon({ focused, children }: TabIconProps) {
  return (
    <View
      style={{
        width: 40,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? "#E9F8F0" : "transparent",
      }}
    >
      {children}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,

        tabBarActiveTintColor: "#20B768",
        tabBarInactiveTintColor: "#4B5563",

        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: 0,
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
          paddingBottom: 8,

          elevation: 15,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
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
                size={22}
                color={color}
              />
            </TabIcon>
          ),
        }}
      />

      {/* Activities */}
      <Tabs.Screen
        name="activities"
        options={{
          title: "Activities",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <Ionicons
                name={focused ? "calendar" : "calendar-outline"}
                size={22}
                color={color}
              />
            </TabIcon>
          ),
        }}
      />

      {/* SCAN */}
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan & Pay",

          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "600",

            marginTop: 8,
          },

          tabBarIcon: () => (
            <View
              style={{
                width: 62,
                height: 62,
                borderRadius: 31,

                backgroundColor: "#FFFFFF",

                alignItems: "center",
                justifyContent: "center",

                marginTop: -22,

                elevation: 10,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
              }}
            >
              {/* GREEN INNER CIRCLE */}
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,

                  backgroundColor: "#20B768",

                  alignItems: "center",
                  justifyContent: "center",

                  elevation: 8,
                  shadowColor: "#20B768",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35,
                  shadowRadius: 8,
                }}
              >
                <MaterialIcons
                  name="qr-code-scanner"
                  size={26}
                  color="#FFFFFF"
                />
              </View>
            </View>
          ),
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
                name={focused ? "time" : "time-outline"}
                size={22}
                color={color}
              />
            </TabIcon>
          ),
        }}
      />

      {/* ACCOUNT */}
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <Ionicons
                name={focused ? "person" : "person-outline"}
                size={22}
                color={color}
              />
            </TabIcon>
          ),
        }}
      />

      {/* HIDDEN */}
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
