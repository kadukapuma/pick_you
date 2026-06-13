// app/(drawer)/(tabs)/account/_layout.tsx

import { Stack } from "expo-router";

export default function WalletLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ animation: "none" }} />
    </Stack>
  );
}
