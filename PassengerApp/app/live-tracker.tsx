import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import LiveRideTracker from "./components/ride/LiveRideTracker";
import {
    DriverLocationUpdate,
    subscribeToRideLocation,
    TrackingStatus,
} from "./services/location/trackingService";

export default function LiveTrackerPage() {
    const params = useLocalSearchParams();
    const rideData = params.rideData ? JSON.parse(params.rideData as string) : null;
    const rideId = Number(rideData?.id || 0);

    const [driverLocation, setDriverLocation] = useState<DriverLocationUpdate | null>(null);
    const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>({
        connected: false,
        stale: true,
    });

    useEffect(() => {
        if (!rideId) return;

        let unsubscribe: (() => void) | undefined;

        subscribeToRideLocation(rideId, setDriverLocation, setTrackingStatus)
            .then((cleanup) => {
                unsubscribe = cleanup;
            })
            .catch((error) => console.error("Live tracking setup failed:", error));

        return () => unsubscribe?.();
    }, [rideId]);

    if (!rideData) return null;

    return (
        <LiveRideTracker
            rideData={rideData}
            driverLocation={driverLocation}
            trackingStatus={trackingStatus}
        />
    );
}
