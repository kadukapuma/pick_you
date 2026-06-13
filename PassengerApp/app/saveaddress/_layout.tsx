import { Stack } from "expo-router";

export default function SaveAddressLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="addplace"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
