import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import LiveRideTracker from "../components/ride/LiveRideTracker";
import { useRideSearch } from "../context/RideSearchContext";
import { apiClient } from "../services/api/apiClient";
import {
    DriverLocationUpdate,
    subscribeToRideLocation,
    TrackingStatus,
} from "../services/location/trackingService";

export default function LiveTrackerPage() {
    const params = useLocalSearchParams();
    const { resetTrip } = useRideSearch();
    const initialRideData = params.rideData ? JSON.parse(params.rideData as string) : null;
    const [rideData, setRideData] = useState(initialRideData);
    const rideId = Number(rideData?.id || 0);

    const [driverLocation, setDriverLocation] = useState<DriverLocationUpdate | null>(null);
    const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>({
        connected: false,
        stale: true,
    });
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [rating, setRating] = useState(5);
    const [review, setReview] = useState("");
    const [isSubmittingRating, setIsSubmittingRating] = useState(false);
    const [ratingSubmitted, setRatingSubmitted] = useState(false);
    const lastAlertedStatusRef = useRef<string | null>(null);

    useEffect(() => {
        if (!rideId) return;

        let unsubscribe: (() => void) | undefined;

        const handleRideUpdate = (ride: any) => {
            setRideData(ride);

            const status = String(ride?.status || "").toUpperCase();
            if (status && lastAlertedStatusRef.current !== status) {
                lastAlertedStatusRef.current = status;
                if (status === "ARRIVED") {
                    Alert.alert("Driver arrived", "Your driver is at the pickup location.");
                } else if (status === "STARTED") {
                    Alert.alert("Trip started", "Passenger on board. Heading to drop-off.");
                } else if (status === "COMPLETED") {
                    Alert.alert("Trip completed", "Please check your fare and payment details.");
                }
            }

            const paymentStatus = String(ride?.payment?.payment_status || "").toUpperCase();
            if (paymentStatus === "COMPLETED" && !ratingSubmitted) {
                setShowRatingModal(true);
            }
        };

        subscribeToRideLocation(
            rideId,
            setDriverLocation,
            setTrackingStatus,
            handleRideUpdate,
        )
            .then((cleanup) => {
                unsubscribe = cleanup;
            })
            .catch((error) => console.error("Live tracking setup failed:", error));

        return () => unsubscribe?.();
    }, [rideId, ratingSubmitted]);

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
                router.replace("/(drawer)/(tabs)/home");
                return;
            }

            Alert.alert("Rating failed", response.message || "Please try again.");
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
                        backgroundColor: "#FFFFFF",
                        borderRadius: 24,
                        padding: 22,
                    }}>
                        <Text style={{ fontSize: 22, fontWeight: "900", color: "#0F172A", textAlign: "center" }}>
                            Rate your trip
                        </Text>
                        <Text style={{ color: "#64748B", textAlign: "center", marginTop: 6 }}>
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
                            multiline
                            style={{
                                minHeight: 88,
                                borderWidth: 1,
                                borderColor: "#E2E8F0",
                                borderRadius: 14,
                                padding: 12,
                                color: "#0F172A",
                                textAlignVertical: "top",
                            }}
                        />

                        <TouchableOpacity
                            onPress={submitRating}
                            disabled={isSubmittingRating}
                            style={{
                                height: 52,
                                borderRadius: 16,
                                backgroundColor: "#FBBF24",
                                alignItems: "center",
                                justifyContent: "center",
                                marginTop: 16,
                            }}
                        >
                            {isSubmittingRating ? (
                                <ActivityIndicator color="#0F172A" />
                            ) : (
                                <Text style={{ fontWeight: "900", color: "#0F172A" }}>Submit rating</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}
