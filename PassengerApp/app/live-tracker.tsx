import { useLocalSearchParams } from "expo-router";
import LiveRideTracker from "./components/ride/LiveRideTracker";

export default function LiveTrackerPage() {
    const params = useLocalSearchParams();
    const rideData = params.rideData ? JSON.parse(params.rideData as string) : null;

    if (!rideData) return null;

    // Extract driver location from rideData if present
    const driver = rideData.driver;
    const driverLocationRaw = driver?.locations?.[0];
    const driverLocation = driverLocationRaw ? {
        latitude: driverLocationRaw.latitude,
        longitude: driverLocationRaw.longitude,
        heading: driverLocationRaw.heading
    } : null;

    return (
        <LiveRideTracker
            rideData={rideData}
            driverLocation={driverLocation}
        />
    );
}
