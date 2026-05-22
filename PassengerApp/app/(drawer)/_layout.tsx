// app/(drawer)/_layout.tsx

import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import CustomDrawerContent from "../components/CustomDrawerContent";

export default function DrawerLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={() => <CustomDrawerContent />}
        screenOptions={{
          headerShown: false,
          drawerType: "front",
          swipeEnabled: true,
          swipeEdgeWidth: 80,
          overlayColor: "rgba(0,0,0,0.35)",
          drawerStyle: {
            width: "78%",
            borderTopRightRadius: 34,
            borderBottomRightRadius: 34,
            overflow: "hidden",
          },
        }}
      >
        <Drawer.Screen
          name="(tabs)"
          options={{
            drawerLabel: "Home",
            title: "Home",
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
