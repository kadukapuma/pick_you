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
import { clearTripStartCoordinate } from "../../services/rides/rideLocationSession";
import { getRebookLocationsFromRide, saveRebookDraft } from "../../services/rides/rebookDraft";

// The realtime channel's own polling fallback only re-fetches driver GPS
// location (see rideRealtime.ts), never ride/payment status - so if the
// single "RideStatusUpdated" broadcast that flips payment to COMPLETED is
// ever missed (dropped socket, Reverb hiccup), the rating modal has no other
// way to appear. This is the safety net for that.
const RIDE_STATUS_POLL_MS = 6000;

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
    const { paymentMethod, resetTrip, selectedPaymentCard, setActiveRide, setIsSearchingForDriver, setOutboundPickup, setOutboundDropoff } = useRideSearch();
    const initialRideData = params.rideData ? JSON.parse(params.rideData as string) : null;
    const initialEventStatus = Array.isArray(params.eventStatus)
        ? params.eventStatus[0]
        : params.eventStatus;
    const [rideData, setRideData] = useState(initialRideData);
    const rideId = Number(rideData?.id || 0);
    const selectedPaymentMethod = String(
        rideData?.selected_payment_method ||
        initialRideData?.selected_payment_method ||
        paymentMethod ||
        "cash",
    ).toLowerCase();
    const initialStatus = String(initialRideData?.status || "").toUpperCase();
    const initialPaymentStatus = String(initialRideData?.payment?.payment_status || "").toUpperCase();
    const isInitiallyPaid = initialStatus === "COMPLETED" && initialPaymentStatus === "COMPLETED";
    const shouldUseActiveRideMap = ["ACCEPTED", "ARRIVED", "STARTED"].includes(
        initialStatus,
    );

    const [driverLocation, setDriverLocation] = useState<DriverLocationUpdate | null>(null);
    const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>({
        connected: false,
        stale: true,
    });
    const [showRatingModal, setShowRatingModal] = useState(isInitiallyPaid);
    const [eventStatus, setEventStatus] = useState<string | null>(
        initialEventStatus && !isInitiallyPaid && !["ACCEPTED", "ARRIVED", "STARTED", "PAID"].includes(String(initialEventStatus).toUpperCase())
            ? String(initialEventStatus).toUpperCase()
            : null,
    );
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
        if (!shouldUseActiveRideMap || !initialRideData) return;
        router.replace({
            pathname: "/ride-booking/matching",
            params: { rideData: JSON.stringify(initialRideData) },
        });
    }, [initialRideData, shouldUseActiveRideMap]);

    useEffect(() => {
        if (initialStatus === "COMPLETED" && rideId) {
            void clearTripStartCoordinate(rideId);
        }
    }, [initialStatus, rideId]);

    useEffect(() => {
        if (!rideId || shouldUseActiveRideMap) return;

        let unsubscribe: (() => void) | undefined;
        let cancelled = false;
        let statusPollTimer: ReturnType<typeof setInterval> | null = null;
        // Nothing left to discover once the rating modal is up or the ride
        // ended without payment (cancelled) - stop polling at that point.
        // Seeded from isInitiallyPaid: landing here already paid (e.g. card
        // payment redirects straight back with a completed/paid ride) means
        // the change-detection refs below already match on the first fetch
        // and never flip resolved on their own.
        let resolved = isInitiallyPaid;

        const stopStatusPolling = () => {
            if (statusPollTimer) clearInterval(statusPollTimer);
            statusPollTimer = null;
        };

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
            // Card rides used to jump straight to /payments/processing here with
            // no passenger interaction. Falling through to the block below
            // instead surfaces the normal "Trip completed" prompt, whose
            // primary button is relabelled "Pay now" for card rides further
            // down - the passenger has to press it to start the charge.
            if (status && lastAlertedStatusRef.current !== status) {
                lastAlertedStatusRef.current = status;
                if (["COMPLETED", "CANCELLED", "CANCELED"].includes(status)) {
                    setEventStatus(status);
                    setEventPaymentStatus(paymentStatus);
                }
                if (["CANCELLED", "CANCELED"].includes(status)) {
                    resolved = true;
                    stopStatusPolling();
                }
            }

            if (paymentStatus && lastPaymentStatusRef.current !== paymentStatus) {
                lastPaymentStatusRef.current = paymentStatus;
                if (paymentStatus === "COMPLETED" && !ratingSubmitted) {
                    setEventStatus("PAID");
                    setEventPaymentStatus(paymentStatus);
                    setShowRatingModal(true);
                    resolved = true;
                    stopStatusPolling();
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

        // Belt-and-braces alongside the WebSocket push: cheap, and it is the
        // only thing that catches a payment confirmation whose broadcast
        // never arrived.
        statusPollTimer = setInterval(() => {
            if (resolved) {
                stopStatusPolling();
                return;
            }
            fetchRideDetails();
        }, RIDE_STATUS_POLL_MS);

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
            stopStatusPolling();
            unsubscribe?.();
        };
    }, [rideId, ratingSubmitted, selectedPaymentMethod, setActiveRide, setIsSearchingForDriver, shouldUseActiveRideMap, isInitiallyPaid]);

    if (shouldUseActiveRideMap) {
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F2FBF8" }}>
                <ActivityIndicator size="large" color="#20B768" />
            </View>
        );
    }

    if (!rideData) return null;

    const awaitingCardPayment =
        eventStatus === "COMPLETED" &&
        selectedPaymentMethod === "card" &&
        eventPaymentStatus !== "COMPLETED";

    const handleBookAgain = async () => {
        const { pickup, destination } = getRebookLocationsFromRide(rideData);
        if (pickup && destination) {
            await saveRebookDraft(pickup, destination);
            setOutboundPickup(pickup);
            setOutboundDropoff(destination);
            setActiveRide(null, null);
            setIsSearchingForDriver(false);
            router.replace({
                pathname: "/ride-booking/select-vehicle",
                params: {
                    pickup: JSON.stringify(pickup),
                    destination: JSON.stringify(destination),
                    rebook: "1",
                },
            });
            return;
        }

        resetTrip();
        router.replace("/ride-booking");
    };

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
                cancelledBy={rideData?.cancelled_by}
                onClose={() => setEventStatus(null)}
                primaryLabel={
                    rideData?.cancelled_by === "driver"
                        ? "Book again"
                        : awaitingCardPayment
                            ? "Pay now"
                            : undefined
                }
                onPrimary={() => {
                    if (eventStatus && ["CANCELLED", "CANCELED"].includes(String(eventStatus).toUpperCase()) && rideData?.cancelled_by === "driver") {
                        void handleBookAgain();
                        return;
                    }
                    // The passenger must press this - nothing charges the card
                    // automatically. See processing.tsx for what happens after.
                    if (awaitingCardPayment) {
                        setEventStatus(null);

                        if (!selectedPaymentCard) {
                            router.push({
                                pathname: "/payments/cards",
                                params: {
                                    mode: "retry",
                                    rideId: String(rideId),
                                    amount: String(rideData?.final_fare || rideData?.estimated_fare || 0),
                                },
                            });
                            return;
                        }

                        router.push({
                            pathname: "/payments/processing",
                            params: {
                                rideId: String(rideId),
                                amount: String(rideData?.final_fare || rideData?.estimated_fare || 0),
                            },
                        });
                        return;
                    }
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
                            Payment confirmed. How was your driver?
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





