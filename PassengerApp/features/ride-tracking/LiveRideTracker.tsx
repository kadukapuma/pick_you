import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import RideMap from "../ride-booking/map/RideMap";
import { getCachedDirections_withCache } from "../../services/maps/directionsApi";
import {
    getBackendRideDistanceText,
    getRideDropoffCoordinate,
    getRidePickupCoordinate,
} from "../ride-support/rideUtils";
import { getVehicleMapIcon } from "../../utils/vehicleMapIcons";
import { getPassengerRideStatusUI } from "./passengerRideStatus";

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
    const vehicleType =
        rideData.vehicle?.vehicle_type ||
        rideData.vehicle?.vehicleType?.name ||
        rideData.driver?.vehicle?.vehicle_type ||
        rideData.driver?.vehicle?.vehicleType?.name ||
        driverLocation?.vehicle_type ||
        rideData.vehicle_type ||
        rideData.fare_config?.vehicle_type ||
        rideData.fareConfig?.vehicle_type;
    const rideStatus = String(rideData.status || "").toUpperCase();
    const isOnTrip = rideStatus === "STARTED";
    const paymentStatus = String(rideData.payment?.payment_status || "").toUpperCase();
    const statusUi = getPassengerRideStatusUI(rideStatus, paymentStatus);
    const estimatedFare = toNumber(rideData.estimated_fare);
    const finalFare = toNumber(rideData.final_fare);
    const fareAmount = finalFare || estimatedFare || toNumber(rideData.payment?.amount);
    const extraDistanceKm = toNumber(rideData.extra_distance_km);
    const extraDistanceFare = toNumber(rideData.extra_distance_fare);
    const waitingMinutes = toNumber(rideData.waiting_minutes);
    const chargeableWaitingMinutes = toNumber(rideData.chargeable_waiting_minutes);
    const waitingFare = toNumber(rideData.waiting_fare);
    const showPaymentDetails = rideStatus === "COMPLETED";
    const showDestinationRoute = ["STARTED", "COMPLETED", "PAID"].includes(rideStatus);
    const hasFareExtras = extraDistanceFare > 0 || waitingFare > 0;
    const pickupCoordinate = getRidePickupCoordinate(rideData);
    const dropoffCoordinate = getRideDropoffCoordinate(rideData);
    const [routeDistanceText, setRouteDistanceText] = React.useState<string | null>(() =>
        getBackendRideDistanceText(rideData),
    );

    React.useEffect(() => {
        let cancelled = false;
        const backendDistance = getBackendRideDistanceText(rideData);
        if (backendDistance) {
            setRouteDistanceText(backendDistance);
            return;
        }
        if (!pickupCoordinate || !dropoffCoordinate) {
            setRouteDistanceText(null);
            return;
        }
        getCachedDirections_withCache(
            pickupCoordinate.latitude,
            pickupCoordinate.longitude,
            dropoffCoordinate.latitude,
            dropoffCoordinate.longitude,
        ).then((directions) => {
            if (!cancelled) setRouteDistanceText(directions?.distanceText || null);
        });
        return () => {
            cancelled = true;
        };
    }, [
        rideData,
        pickupCoordinate?.latitude,
        pickupCoordinate?.longitude,
        dropoffCoordinate?.latitude,
        dropoffCoordinate?.longitude,
    ]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
            {isOnTrip ? (
                <View
                    pointerEvents="box-none"
                    style={{
                        position: "absolute",
                        top: 44,
                        left: 14,
                        right: 14,
                        zIndex: 20,
                    }}
                >
                    <View
                        style={{
                            backgroundColor: "#20B768",
                            borderRadius: 18,
                            paddingHorizontal: 14,
                            paddingVertical: 13,
                            flexDirection: "row",
                            alignItems: "center",
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.18,
                            shadowRadius: 8,
                            elevation: 8,
                        }}
                    >
                        <TouchableOpacity
                            onPress={() => router.replace("/(app)/(tabs)/trips")}
                            style={{
                                width: 42,
                                height: 42,
                                borderRadius: 21,
                                backgroundColor: "rgba(255,255,255,0.18)",
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: 12,
                            }}
                        >
                            <Ionicons name="arrow-back" size={23} color="#FFFFFF" />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: "#FFFFFF", fontSize: 21, fontWeight: "900" }}>
                                On trip
                            </Text>
                            <Text style={{ color: "rgba(255,255,255,0.86)", fontSize: 13, fontWeight: "700", marginTop: 2 }} numberOfLines={1}>
                                Heading to {rideData.drop_address || rideData.dropoff_address || "your destination"}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => router.push({ pathname: "/ride-tracking/contact-driver", params: { rideData: JSON.stringify(rideData) } })}
                            style={{
                                width: 42,
                                height: 42,
                                borderRadius: 21,
                                backgroundColor: "rgba(255,255,255,0.18)",
                                alignItems: "center",
                                justifyContent: "center",
                                marginLeft: 10,
                            }}
                        >
                            <Ionicons name="call" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                    <View
                        style={{
                            alignSelf: "flex-start",
                            marginTop: 10,
                            marginLeft: 8,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 7,
                            backgroundColor: "#0F172A",
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 18,
                        }}
                    >
                        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#20B768" }} />
                        <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "900", letterSpacing: 0.5 }}>
                            ON TRIP
                        </Text>
                    </View>
                </View>
            ) : (
                <TouchableOpacity
                    onPress={() => router.replace("/(app)/(tabs)/trips")}
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
            )}
            {/* Full screen map */}
            <View style={{ flex: 1 }}>
                <RideMap
                    location={pickupCoordinate || { latitude: 0, longitude: 0 }}
                    destination={showDestinationRoute ? dropoffCoordinate : null}
                    driverLocation={driverLocation}
                    rideStatus={rideStatus}
                    followVehicle={followVehicle && !!driverLocation}
                    onFollowStateChange={setFollowVehicle}
                    vehicleImage={getVehicleMapIcon(vehicleType)}
                    routeColor="#20B768"
                    showPickupMarker={!isOnTrip}
                    dropoffLabel={isOnTrip ? "Drop" : undefined}
                    fitEdgePadding={isOnTrip ? { top: 170, right: 60, bottom: 250, left: 60 } : { top: 130, right: 70, bottom: 260, left: 70 }}
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
                    <View style={{ backgroundColor: "#20B768", padding: 10, borderRadius: 40 }}>
                        <Ionicons name={statusUi.icon} size={24} color="white" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "900", fontSize: 17, color: "#0B3D2E" }}>
                            {statusUi.sheetTitle}
                        </Text>
                        <Text style={{ color: "#64748B", fontSize: 13, fontWeight: "700", marginTop: 2 }}>
                            {statusUi.sheetSubtitle}
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
                    <TouchableOpacity onPress={() => router.push({ pathname: "/ride-tracking/contact-driver", params: { rideData: JSON.stringify(rideData) } })} style={{ backgroundColor: "#E8F8F0", paddingHorizontal: 15, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: "rgba(32,183,104,0.22)" }}>
                        <Text style={{ fontWeight: "900", color: "#0B3D2E" }}>Contact</Text>
                    </TouchableOpacity>
                </View>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                    <TouchableOpacity onPress={() => router.push("/ride-tracking/safety")} style={{ flex: 1, height: 42, borderRadius: 14, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}>
                        <Ionicons name="shield-checkmark-outline" size={16} color="#DC2626" />
                        <Text style={{ color: "#DC2626", fontWeight: "800", fontSize: 12 }}>Safety</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push({ pathname: "/ride-tracking/driver-profile", params: { rideData: JSON.stringify(rideData) } })} style={{ flex: 1, height: 42, borderRadius: 14, backgroundColor: "#E8F8F0", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}>
                        <Ionicons name="person-circle-outline" size={16} color="#20B768" />
                        <Text style={{ color: "#0F172A", fontWeight: "800", fontSize: 12 }}>Driver</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push({ pathname: "/ride-details/[rideId]", params: { rideId: String(rideData.id || "") } })} style={{ flex: 1, height: 42, borderRadius: 14, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}>
                        <Ionicons name="receipt-outline" size={16} color="#0F172A" />
                        <Text style={{ color: "#0F172A", fontWeight: "800", fontSize: 12 }}>Details</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}






