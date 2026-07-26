import { Stack } from "expo-router";

export default function RideBookingLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: "fade_from_bottom",
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="matching" />
            <Stack.Screen name="select-vehicle" />
            <Stack.Screen name="confirm" />
            <Stack.Screen name="select-return-vehicle" />
            <Stack.Screen name="return-location" />
            <Stack.Screen name="saved-places" />
            <Stack.Screen name="location-map" />
            <Stack.Screen name="pickup-map" />
            <Stack.Screen name="payment-method" />
            <Stack.Screen name="promos" />
            <Stack.Screen name="schedule" />
            <Stack.Screen name="cancel-reason" />
        </Stack>
    );
}
