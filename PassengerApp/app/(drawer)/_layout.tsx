// app/(drawer)/_layout.tsx

import { Stack } from "expo-router";

export default function DrawerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ animation: "none" }} />
    </Stack>
  );
}
