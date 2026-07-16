import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import RideMap from "../ride-booking/map/RideMap";
import { getCachedDirections_withCache } from "../../services/maps/directionsApi";
import {
    getRideDropoffCoordinate,
    getRidePickupCoordinate,
} from "../ride-support/rideUtils";
import { getVehicleMapIcon } from "../../utils/vehicleMapIcons";
import { getPassengerRideStatusUI } from "./passengerRideStatus";
import { useRideSearch } from "../../state/booking/RideBookingContext";

const toNumber = (value: any): number => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
};

const money = (value: any): string => toNumber(value).toFixed(2);

const km = (value: any): string => toNumber(value).toFixed(2);

export default function LiveRideTracker({ rideData, driverLocation, trackingStatus }: any) {
    const [followVehicle, setFollowVehicle] = React.useState(true);
    const { outboundTrip } = useRideSearch();
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
    const pickupCoordinate = getRidePickupCoordinate(rideData) || outboundTrip.pickup;
    const dropoffCoordinate = getRideDropoffCoordinate(rideData) || outboundTrip.dropoff;
    const dropoffAddress =
        rideData.drop_address ||
        rideData.dropoff_address ||
        outboundTrip.dropoff?.address ||
        "Your destination";
    const resolvedDriverLocation = React.useMemo(() => {
        if (driverLocation) return driverLocation;

        const latitude = Number(
            rideData.driver?.latitude ||
            rideData.driver?.current_location?.latitude ||
            rideData.driver_latitude,
        );
        const longitude = Number(
            rideData.driver?.longitude ||
            rideData.driver?.current_location?.longitude ||
            rideData.driver_longitude,
        );

        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            return {
                latitude,
                longitude,
                heading: Number(rideData.driver?.heading || rideData.driver_heading || 0),
            };
        }

        if (rideStatus === "COMPLETED") return dropoffCoordinate;
        return pickupCoordinate;
    }, [driverLocation, dropoffCoordinate, pickupCoordinate, rideData, rideStatus]);
    const activeDriverVehicle = React.useMemo(
        () =>
            resolvedDriverLocation
                ? [{
                    id: `live-driver-${rideData.id || "active"}`,
                    coordinate: resolvedDriverLocation,
                    vehicleType: vehicleType || "car",
                    heading: resolvedDriverLocation.heading ?? 0,
                }]
                : [],
        [resolvedDriverLocation, rideData.id, vehicleType],
    );
    const [remainingRoute, setRemainingRoute] = React.useState({
        distanceText: rideData.distance_text || rideData.distanceText || "Calculating",
        durationText: rideData.duration_text || rideData.durationText || "Calculating",
    });
    const hasRouteEstimate =
        remainingRoute.distanceText !== "Calculating" &&
        remainingRoute.durationText !== "Calculating";
    const remainingTimeHeading = hasRouteEstimate
        ? `${remainingRoute.durationText} remaining`
        : "Trip in progress";
    const activeDriverLatitude = resolvedDriverLocation?.latitude == null
        ? undefined
        : Number(resolvedDriverLocation.latitude.toFixed(3));
    const activeDriverLongitude = resolvedDriverLocation?.longitude == null
        ? undefined
        : Number(resolvedDriverLocation.longitude.toFixed(3));
    const destinationLatitude = dropoffCoordinate?.latitude;
    const destinationLongitude = dropoffCoordinate?.longitude;

    React.useEffect(() => {
        if (
            !isOnTrip ||
            activeDriverLatitude == null ||
            activeDriverLongitude == null ||
            destinationLatitude == null ||
            destinationLongitude == null
        ) return;
        let cancelled = false;

        getCachedDirections_withCache(
            activeDriverLatitude,
            activeDriverLongitude,
            destinationLatitude,
            destinationLongitude,
        ).then((directions) => {
            if (!cancelled && directions) {
                setRemainingRoute({
                    distanceText: directions.distanceText,
                    durationText: directions.durationText,
                });
            }
        });

        return () => {
            cancelled = true;
        };
    }, [
        isOnTrip,
        activeDriverLatitude,
        activeDriverLongitude,
        destinationLatitude,
        destinationLongitude,
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
                            backgroundColor: "#FFFFFF",
                            borderRadius: 22,
                            paddingHorizontal: 12,
                            paddingVertical: 11,
                            flexDirection: "row",
                            alignItems: "center",
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.14,
                            shadowRadius: 12,
                            elevation: 8,
                        }}
                    >
                        <TouchableOpacity
                            onPress={() => router.replace("/(app)/(tabs)/trips")}
                            style={{
                                width: 42,
                                height: 42,
                                borderRadius: 21,
                                backgroundColor: "#EAF8F1",
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: 12,
                            }}
                        >
                            <Ionicons name="arrow-back" size={23} color="#0B3D2E" />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: "#0B3D2E", fontSize: 19, fontWeight: "900" }}>
                                {remainingTimeHeading}
                            </Text>
                            <Text style={{ color: "#64748B", fontSize: 12, fontWeight: "700", marginTop: 2 }} numberOfLines={1}>
                                Heading to {dropoffAddress}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => router.push({ pathname: "/ride-tracking/contact-driver", params: { rideData: JSON.stringify(rideData) } })}
                            style={{
                                width: 42,
                                height: 42,
                                borderRadius: 21,
                                backgroundColor: "#EAF8F1",
                                alignItems: "center",
                                justifyContent: "center",
                                marginLeft: 10,
                            }}
                        >
                            <Ionicons name="call" size={20} color="#159A5B" />
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
                            backgroundColor: "#0B3D2E",
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 18,
                        }}
                    >
                        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#20B768" }} />
                        <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "900", letterSpacing: 0.5 }}>
                            LIVE · {hasRouteEstimate ? remainingRoute.distanceText : "Updating route"}
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
                    location={pickupCoordinate || resolvedDriverLocation || { latitude: 7.2906, longitude: 80.6337 }}
                    destination={showDestinationRoute ? dropoffCoordinate : null}
                    driverLocation={resolvedDriverLocation}
                    nearbyVehicles={activeDriverVehicle}
                    rideStatus={rideStatus}
                    followVehicle={followVehicle && !!resolvedDriverLocation}
                    onFollowStateChange={setFollowVehicle}
                    vehicleImage={getVehicleMapIcon(vehicleType)}
                    showDriverMarker={false}
                    routeColor="#20B768"
                    showPickupMarker={!isOnTrip}
                    dropoffLabel={isOnTrip ? "Drop" : undefined}
                    fitEdgePadding={isOnTrip ? { top: 170, right: 60, bottom: 250, left: 60 } : { top: 130, right: 70, bottom: 260, left: 70 }}
                />
            </View>

            {!followVehicle && resolvedDriverLocation ? (
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
                    bottom: 12,
                    left: 12,
                    right: 12,
                    backgroundColor: "white",
                    borderRadius: 24,
                    padding: 14,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.16,
                    shadowRadius: 12,
                    elevation: 8,
                }}
            >
                {isOnTrip ? (
                    <View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
                            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "#EAF8F1", alignItems: "center", justifyContent: "center" }}>
                                <Ionicons name="navigate" size={21} color="#159A5B" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: "#64748B", fontSize: 11, fontWeight: "800" }}>NEXT DESTINATION</Text>
                                <Text style={{ color: "#0F172A", fontSize: 15, fontWeight: "900", marginTop: 2 }} numberOfLines={1}>
                                    {dropoffAddress}
                                </Text>
                            </View>
                            <View style={{ alignItems: "flex-end" }}>
                                <Text style={{ color: "#159A5B", fontSize: 17, fontWeight: "900" }}>{hasRouteEstimate ? remainingRoute.durationText : "Updating"}</Text>
                                <Text style={{ color: "#64748B", fontSize: 12, fontWeight: "700", marginTop: 1 }}>{hasRouteEstimate ? remainingRoute.distanceText : "Live route"}</Text>
                            </View>
                        </View>
                        <View style={{ height: 1, backgroundColor: "#EEF2F4", marginTop: 12 }} />
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 9 }}>
                            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: trackingStatus?.stale ? "#F59E0B" : "#20B768" }} />
                            <Text style={{ color: "#64748B", fontSize: 11, fontWeight: "700" }}>
                                {trackingStatus?.stale ? "Reconnecting to live vehicle location" : "Vehicle and passenger travelling together"}
                            </Text>
                        </View>
                    </View>
                ) : (
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
                )}
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






