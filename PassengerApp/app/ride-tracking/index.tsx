import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import LiveRideTracker from "../../features/ride-tracking/LiveRideTracker";
import RideEventModal from "../../features/ride-tracking/RideEventModal";
import { useRideSearch } from "../../state/booking/RideBookingContext";
import { apiClient } from "../../services/api/client";
import { logExpectedError } from "../../services/errors/userMessages";
import {
    DriverLocationUpdate,
    subscribeToRideLocation,
    TrackingStatus,
} from "../../services/rides/rideRealtime";

const mergeRideData = (previous: any, next: any) => ({
    ...(previous || {}),
    ...(next || {}),
    vehicle_type:
        next?.vehicle?.vehicle_type ||
        next?.vehicle?.vehicleType?.name ||
        next?.driver?.vehicle?.vehicle_type ||
        next?.driver?.vehicle?.vehicleType?.name ||
        next?.vehicle_type ||
        next?.fare_config?.vehicle_type ||
        next?.fareConfig?.vehicle_type ||
        previous?.vehicle_type,
});

export default function LiveTrackerPage() {
    const params = useLocalSearchParams();
    const { resetTrip, setActiveRide, setIsSearchingForDriver } = useRideSearch();
    const initialRideData = params.rideData ? JSON.parse(params.rideData as string) : null;
    const [rideData, setRideData] = useState(initialRideData);
    const rideId = Number(rideData?.id || 0);

    const [driverLocation, setDriverLocation] = useState<DriverLocationUpdate | null>(null);
    const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>({
        connected: false,
        stale: true,
    });
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [eventStatus, setEventStatus] = useState<string | null>(null);
    const [eventPaymentStatus, setEventPaymentStatus] = useState<string | null>(null);
    const [rating, setRating] = useState(5);
    const [review, setReview] = useState("");
    const [isSubmittingRating, setIsSubmittingRating] = useState(false);
    const [ratingSubmitted, setRatingSubmitted] = useState(false);
    const lastAlertedStatusRef = useRef<string | null>(
        initialRideData?.status ? String(initialRideData.status).toUpperCase() : null,
    );
    const lastPaymentStatusRef = useRef<string | null>(
        initialRideData?.payment?.payment_status ? String(initialRideData.payment.payment_status).toUpperCase() : null,
    );

    useEffect(() => {
        if (!rideId) return;

        let unsubscribe: (() => void) | undefined;
        let cancelled = false;

        const handleRideUpdate = (ride: any) => {
            setRideData((previous: any) => mergeRideData(previous, ride));

            const status = String(ride?.status || "").toUpperCase();
            const paymentStatus = String(ride?.payment?.payment_status || "").toUpperCase();
            if (status) {
                setActiveRide(rideId, status);
                if (["ACCEPTED", "ARRIVED", "STARTED", "COMPLETED"].includes(status)) {
                    setIsSearchingForDriver(false);
                }
            }
            if (status && lastAlertedStatusRef.current !== status) {
                lastAlertedStatusRef.current = status;
                if (["ACCEPTED", "ARRIVED", "STARTED", "COMPLETED", "CANCELLED", "CANCELED"].includes(status)) {
                    setEventStatus(status);
                    setEventPaymentStatus(paymentStatus);
                }
            }

            if (paymentStatus && lastPaymentStatusRef.current !== paymentStatus) {
                lastPaymentStatusRef.current = paymentStatus;
                if (paymentStatus === "COMPLETED" && !ratingSubmitted) {
                    setEventStatus("PAID");
                    setEventPaymentStatus(paymentStatus);
                    setShowRatingModal(true);
                }
            }
        };

        const fetchRideDetails = async () => {
            const response = await apiClient.get<any>(`/rides/${rideId}`, {
                suppressErrorLog: true,
            });
            if (!cancelled && response.success && response.data) {
                handleRideUpdate(response.data);
            }
        };

        fetchRideDetails();

        subscribeToRideLocation(
            rideId,
            setDriverLocation,
            setTrackingStatus,
            handleRideUpdate,
        )
            .then((cleanup) => {
                unsubscribe = cleanup;
            })
            .catch((error) => logExpectedError("Live tracking setup failed", error));

        return () => {
            cancelled = true;
            unsubscribe?.();
        };
    }, [rideId, ratingSubmitted, setActiveRide, setIsSearchingForDriver]);

    if (!rideData) return null;

    const submitRating = async () => {
        if (!rideId || isSubmittingRating) return;

        setIsSubmittingRating(true);
        try {
            const response = await apiClient.post("/ratings", {
                ride_id: rideId,
                rating,
                review: review.trim() || undefined,
            });

            if (response.success) {
                setRatingSubmitted(true);
                setShowRatingModal(false);
                resetTrip();
                router.replace("/(app)/(tabs)/home");
                return;
            }
        } finally {
            setIsSubmittingRating(false);
        }
    };

    return (
        <>
            <LiveRideTracker
                rideData={rideData}
                driverLocation={driverLocation}
                trackingStatus={trackingStatus}
            />

            <RideEventModal
                visible={!!eventStatus && !showRatingModal}
                status={eventStatus}
                paymentStatus={eventPaymentStatus}
                onClose={() => setEventStatus(null)}
                onPrimary={() => {
                    if (eventStatus === "COMPLETED") {
                        setEventStatus(null);
                        router.push({ pathname: "/ride-details/[rideId]", params: { rideId: String(rideId) } });
                        return;
                    }
                    setEventStatus(null);
                }}
            />

            <Modal
                visible={showRatingModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowRatingModal(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: "rgba(15,23,42,0.72)",
                    justifyContent: "center",
                    padding: 24,
                }}>
                    <View style={{
                        backgroundColor: "#F2FBF8",
                        borderRadius: 30,
                        borderWidth: 1,
                        borderColor: "rgba(153,177,169,0.35)",
                        padding: 22,
                    }}>
                        <Text style={{ fontSize: 24, fontWeight: "900", color: "#0B3D2E", textAlign: "center" }}>
                            Rate your trip
                        </Text>
                        <Text style={{ color: "#64748B", textAlign: "center", marginTop: 7, fontWeight: "700", lineHeight: 20 }}>
                            Cash collected. How was your driver?
                        </Text>

                        <View style={{ flexDirection: "row", justifyContent: "center", marginVertical: 22 }}>
                            {[1, 2, 3, 4, 5].map((value) => (
                                <TouchableOpacity
                                    key={value}
                                    onPress={() => setRating(value)}
                                    style={{ paddingHorizontal: 4 }}
                                    activeOpacity={0.8}
                                >
                                    <Text style={{
                                        fontSize: 38,
                                        color: value <= rating ? "#F59E0B" : "#CBD5E1",
                                    }}>
                                        ★
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TextInput
                            value={review}
                            onChangeText={setReview}
                            placeholder="Add a short review"
                            placeholderTextColor="#94A3B8"
                            multiline
                            style={{
                                minHeight: 88,
                                borderWidth: 1,
                                borderColor: "rgba(153,177,169,0.45)",
                                borderRadius: 18,
                                padding: 14,
                                color: "#0F172A",
                                textAlignVertical: "top",
                                backgroundColor: "transparent",
                                fontWeight: "700",
                            }}
                        />

                        <TouchableOpacity
                            onPress={submitRating}
                            disabled={isSubmittingRating}
                            style={{
                                height: 52,
                                borderRadius: 26,
                                backgroundColor: "#20B768",
                                alignItems: "center",
                                justifyContent: "center",
                                marginTop: 16,
                            }}
                        >
                            {isSubmittingRating ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={{ fontWeight: "900", color: "#FFFFFF" }}>Submit rating</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}


