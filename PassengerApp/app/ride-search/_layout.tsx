import { Stack } from "expo-router";

export default function RideSearchLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: "fade_from_bottom",
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="searching" />
            <Stack.Screen name="select-ride" />
            <Stack.Screen name="confirmation" />
            <Stack.Screen name="select-ride-return" />
            <Stack.Screen name="return-trip-location" />
            <Stack.Screen name="saved-addresses" />
            <Stack.Screen name="set-location-map" />
        </Stack>
    );
}
