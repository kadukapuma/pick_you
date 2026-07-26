import { Stack } from "expo-router";

export default function AccountLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        animationDuration: 180,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="promotions" />
      <Stack.Screen name="membership" />
      <Stack.Screen name="saved-addresses" />
      <Stack.Screen name="payments" />
      <Stack.Screen name="vouchers" />
      <Stack.Screen name="help-support" />
      <Stack.Screen name="about" />
    </Stack>
  );
}

