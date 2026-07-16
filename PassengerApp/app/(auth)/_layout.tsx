import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="splash"
    >
      <Stack.Screen name="splash" />
      <Stack.Screen name="get-started" />
      <Stack.Screen name="select-language" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="complete-profile" />
      <Stack.Screen name="verify-phone" />
    </Stack>
  );
}
