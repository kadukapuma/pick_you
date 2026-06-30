import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import RideMap from "./RideMap";

const toNumber = (value: any): number => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
};

const money = (value: any): string => toNumber(value).toFixed(2);

const km = (value: any): string => toNumber(value).toFixed(2);

export default function LiveRideTracker({ rideData, driverLocation, trackingStatus }: any) {
    const [followVehicle, setFollowVehicle] = React.useState(true);
    const driverName = [
        rideData.driver?.user?.first_name,
        rideData.driver?.user?.last_name,
    ].filter(Boolean).join(" ") || "Finding driver";
    const vehicleNumber =
        rideData.vehicle?.vehicle_number ||
        rideData.vehicle?.plate_number ||
        "Vehicle";
    const rideStatus = String(rideData.status || "").toUpperCase();
    const paymentStatus = String(rideData.payment?.payment_status || "").toUpperCase();
    const estimatedFare = toNumber(rideData.estimated_fare);
    const finalFare = toNumber(rideData.final_fare);
    const fareAmount = finalFare || estimatedFare || toNumber(rideData.payment?.amount);
    const extraDistanceKm = toNumber(rideData.extra_distance_km);
    const extraDistanceFare = toNumber(rideData.extra_distance_fare);
    const waitingMinutes = toNumber(rideData.waiting_minutes);
    const chargeableWaitingMinutes = toNumber(rideData.chargeable_waiting_minutes);
    const waitingFare = toNumber(rideData.waiting_fare);
    const showPaymentDetails = rideStatus === "COMPLETED";
    const hasFareExtras = extraDistanceFare > 0 || waitingFare > 0;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
            {/* Back button */}
            <TouchableOpacity
                onPress={() => router.replace("/(drawer)/(tabs)/activities")}
                style={{
                    position: "absolute",
                    top: 50,
                    left: 20,
                    zIndex: 10,
                    backgroundColor: "rgba(0,0,0,0.6)",
                    padding: 10,
                    borderRadius: 30,
                }}
            >
                <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>

            {/* Full screen map */}
            <View style={{ flex: 1 }}>
                <RideMap
                    location={{
                        latitude: parseFloat(rideData.pickup_latitude),
                        longitude: parseFloat(rideData.pickup_longitude)
                    }}
                    destination={{
                        latitude: parseFloat(rideData.drop_latitude),
                        longitude: parseFloat(rideData.drop_longitude)
                    }}
                    driverLocation={driverLocation}
                    rideStatus={rideStatus}
                    followVehicle={followVehicle && !!driverLocation}
                    onFollowStateChange={setFollowVehicle}
                />
            </View>

            {!followVehicle && driverLocation ? (
                <TouchableOpacity
                    onPress={() => setFollowVehicle(true)}
                    activeOpacity={0.8}
                    style={{
                        position: "absolute",
                        right: 18,
                        top: 110,
                        zIndex: 12,
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: "#FFFFFF",
                        alignItems: "center",
                        justifyContent: "center",
                        elevation: 6,
                        shadowColor: "#000",
                        shadowOpacity: 0.18,
                        shadowRadius: 5,
                    }}
                >
                    <Ionicons name="locate" size={24} color="#0F172A" />
                </TouchableOpacity>
            ) : null}

            {/* Bottom popup - SMALL */}
            <View
                style={{
                    position: "absolute",
                    bottom: 20,
                    left: 16,
                    right: 16,
                    backgroundColor: "white",
                    borderRadius: 20,
                    padding: 16,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 5,
                }}
            >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ backgroundColor: "#0B7BDC", padding: 10, borderRadius: 40 }}>
                        <Ionicons name="car" size={24} color="white" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "700", fontSize: 16 }}>
                            {driverName} • {vehicleNumber}
                        </Text>
                        <Text style={{ color: "#6B7280", fontSize: 12 }}>
                            {rideStatus === "REQUESTED"
                                ? "Waiting for a driver to accept"
                                : rideStatus === "ARRIVED"
                                  ? "Driver has arrived at pickup"
                                  : rideStatus === "STARTED"
                                    ? "Passenger on board • Heading to drop-off"
                                    : rideStatus === "COMPLETED"
                                      ? paymentStatus === "COMPLETED"
                                        ? "Payment confirmed • Please rate your trip"
                                        : "Trip completed • Waiting for cash confirmation"
                                : `${rideData.distance_km} km • ETA: 5-8 min`}
                        </Text>
                        {showPaymentDetails ? (
                            <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#E2E8F0" }}>
                                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                                    <Text style={{ fontWeight: "700", color: "#64748B", fontSize: 12 }}>
                                        Estimated fare
                                    </Text>
                                    <Text style={{ fontWeight: "800", color: "#0F172A", fontSize: 12 }}>
                                        Rs. {money(estimatedFare)}
                                    </Text>
                                </View>
                                {extraDistanceFare > 0 ? (
                                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 4 }}>
                                        <Text style={{ fontWeight: "700", color: "#64748B", fontSize: 12 }}>
                                            Extra distance ({km(extraDistanceKm)} km)
                                        </Text>
                                        <Text style={{ fontWeight: "800", color: "#0F172A", fontSize: 12 }}>
                                            Rs. {money(extraDistanceFare)}
                                        </Text>
                                    </View>
                                ) : null}
                                {waitingFare > 0 ? (
                                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 4 }}>
                                        <Text style={{ fontWeight: "700", color: "#64748B", fontSize: 12 }}>
                                            Waiting ({chargeableWaitingMinutes.toFixed(0)} min)
                                        </Text>
                                        <Text style={{ fontWeight: "800", color: "#0F172A", fontSize: 12 }}>
                                            Rs. {money(waitingFare)}
                                        </Text>
                                    </View>
                                ) : null}
                                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 6, paddingTop: 6, borderTopWidth: hasFareExtras ? 1 : 0, borderTopColor: "#E2E8F0" }}>
                                    <Text style={{ fontWeight: "900", color: "#0F172A", fontSize: 13 }}>
                                        Final fare
                                    </Text>
                                    <Text style={{ fontWeight: "900", color: "#0F172A", fontSize: 13 }}>
                                        Rs. {money(fareAmount)}
                                    </Text>
                                </View>
                                {waitingMinutes > 0 && waitingFare === 0 ? (
                                    <Text style={{ color: "#64748B", fontSize: 11, marginTop: 3 }}>
                                        Waiting time was within the free allowance.
                                    </Text>
                                ) : null}
                                <Text style={{ color: "#64748B", fontSize: 12, marginTop: 6 }}>
                                    Payment: Cash • {paymentStatus === "COMPLETED" ? "Collected" : "Pending collection"}
                                </Text>
                            </View>
                        ) : null}
                        <Text style={{ color: trackingStatus?.stale ? "#DC2626" : "#059669", fontSize: 11, marginTop: 3 }}>
                            {trackingStatus?.stale
                                ? "Driver location is temporarily stale"
                                : trackingStatus?.connected
                                  ? "Live location connected"
                                  : "Using backup location updates"}
                        </Text>
                    </View>
                    <TouchableOpacity style={{ backgroundColor: "#FBBF24", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
                        <Text style={{ fontWeight: "600" }}>Contact</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}
