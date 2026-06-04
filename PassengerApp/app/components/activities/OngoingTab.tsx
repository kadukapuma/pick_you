import React, { useEffect, useRef } from "react";
import { View, Text, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import { useRideSearch } from "../../context/RideSearchContext";
import { apiClient } from "../../services/api/apiClient";
import EmptyState from "./EmptyState";

export default function OngoingTab() {
    const {
        isSearchingForDriver,
        activeRideId,
        activeRideStatus,
        setIsSearchingForDriver,
        setActiveRide,
        resetTrip,
    } = useRideSearch();

    const approvalAlertShownRef = useRef(false);

    useEffect(() => {
        if (!isSearchingForDriver || !activeRideId) {
            return;
        }

        let cancelled = false;

        const pollRideStatus = async () => {
            try {
                const response = await apiClient.get<any>(`/rides/${activeRideId}`);

                if (cancelled || !response.success || !response.data) {
                    return;
                }

                const rideStatus = String(response.data.status || "").toUpperCase();
                setActiveRide(activeRideId, rideStatus);

                if (rideStatus === "ACCEPTED" && !approvalAlertShownRef.current) {
                    approvalAlertShownRef.current = true;
                    setIsSearchingForDriver(false);
                    Alert.alert(
                        "Driver approved",
                        "A driver has accepted your ride request.",
                    );
                }
            } catch (error) {
                console.error("Polling error:", error);
            }
        };

        pollRideStatus();
        const intervalId = setInterval(pollRideStatus, 5000);

        return () => {
            cancelled = true;
            clearInterval(intervalId);
        };
    }, [activeRideId, isSearchingForDriver, setActiveRide, setIsSearchingForDriver]);

    const handleCancel = async () => {
        if (!activeRideId) return;

        Alert.alert(
            "Cancel Ride",
            "Are you sure you want to cancel this ride request?",
            [
                { text: "No", style: "cancel" },
                {
                    text: "Yes, Cancel",
                    style: "destructive",
                    onPress: async () => {
                        const response = await apiClient.delete(`/rides/${activeRideId}`);
                        if (response.success) {
                            resetTrip();
                            Alert.alert("Cancelled", "Your ride has been cancelled.");
                        } else {
                            Alert.alert("Error", response.message || "Failed to cancel ride.");
                        }
                    },
                },
            ],
        );
    };

    const waiting = isSearchingForDriver && activeRideStatus !== "ACCEPTED";
    const hasActiveRide = isSearchingForDriver || activeRideStatus === "ACCEPTED";

    if (!hasActiveRide) {
        return <EmptyState message="You don't have any ongoing trips" />;
    }

    return (
        <View className="flex-1">
            {waiting ? (
                <View className="mt-2 rounded-3xl bg-slate-900 px-5 py-6 shadow-lg">
                    <View className="flex-row items-center gap-4">
                        <ActivityIndicator size="large" color="#FBBF24" />
                        <View className="flex-1">
                            <Text className="text-lg font-bold text-white">
                                Waiting for drivers
                            </Text>
                            <Text className="mt-1 text-sm text-slate-300">
                                Your ride request is live. We are finding the nearest driver.
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={handleCancel}
                        className="mt-6 rounded-xl bg-white/10 py-3 items-center border border-white/20"
                    >
                        <Text className="font-bold text-white uppercase tracking-wider">
                            Cancel Ride
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : activeRideStatus === "ACCEPTED" ? (
                <View className="mt-2 rounded-3xl bg-emerald-950 px-5 py-6 shadow-lg">
                    <Text className="text-lg font-bold text-white">Driver approved</Text>
                    <Text className="mt-1 text-sm text-emerald-200">
                        Your driver is on the way.
                    </Text>
                    <TouchableOpacity
                        onPress={handleCancel}
                        className="mt-6 rounded-xl bg-white/10 py-3 items-center border border-emerald-400/20"
                    >
                        <Text className="font-bold text-white uppercase tracking-wider">
                            Cancel Ride
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : null}
        </View>
    );
}
