import React, { useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator, Alert, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import { useRideSearch } from "../../../src/context/RideSearchContext";
import { apiClient } from "../../../src/services/api/apiClient";
import EmptyState from "./EmptyState";
import RideMap from "../ride/RideMap";
import { router } from "expo-router";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function OngoingTab() {
    const {
        isSearchingForDriver,
        activeRideId,
        activeRideStatus,
        setIsSearchingForDriver,
        setActiveRide,
        resetTrip,
    } = useRideSearch();

    const [rideData, setRideData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const approvalAlertShownRef = useRef(false);

    useEffect(() => {
        if (!activeRideId) {
            setRideData(null);
            return;
        }

        let cancelled = false;

        const pollRideStatus = async () => {
            try {
                const response = await apiClient.get<any>(`/rides/${activeRideId}`);

                if (cancelled || !response.success || !response.data) {
                    return;
                }

                const ride = response.data;
                const rideStatus = String(ride.status || "").toUpperCase();

                setRideData(ride);
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
    }, [activeRideId, setActiveRide, setIsSearchingForDriver]);

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

    if (activeRideStatus === "ACCEPTED" && rideData) {
        const driver = rideData.driver;
        const vehicle = rideData.vehicle;
        const driverLocation = driver?.locations?.[0]; // Current location if backend changes, or null.

        return (
            <View className="flex-1 -mx-4 -mb-4">
                {/* LIVE TRACKING CARD - REPLACE LARGE MAP */}
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => router.push({
                        pathname: "/live-tracker",
                        params: { rideData: JSON.stringify(rideData) }
                    })}
                    className="mx-4 mt-4 bg-slate-900 rounded-2xl p-4 shadow-xl border border-slate-800"
                >
                    <View className="flex-row items-center justify-between mb-3">
                        <View className="flex-row items-center gap-3">
                            <View className="w-10 h-10 bg-emerald-500 rounded-full items-center justify-center">
                                <Ionicons name="car" size={24} color="white" />
                            </View>
                            <View>
                                <Text className="text-white font-bold text-lg">Ongoing Ride</Text>
                                <Text className="text-slate-400 text-xs">Tracking live session</Text>
                            </View>
                        </View>

                        {/* RED LIVE INDICATOR */}
                        <View className="bg-rose-500 flex-row items-center gap-1.5 px-3 py-1.5 rounded-full">
                            <View className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            <Text className="text-white font-black text-[10px] tracking-tighter">LIVE</Text>
                        </View>
                    </View>

                    <View className="bg-slate-800/50 rounded-xl p-3 flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                            <Ionicons name="map-outline" size={18} color="#94A3B8" />
                            <Text className="text-slate-300 text-sm font-medium">Click to view full map</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                    </View>
                </TouchableOpacity>

                {/* INFO CARD */}
                <View className="flex-1 bg-white rounded-t-[32px] mt-6 px-6 pt-8 shadow-2xl">
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View className="flex-row justify-between items-start mb-6">
                            <View>
                                <Text className="text-2xl font-black text-slate-900">
                                    Driver is on the way
                                </Text>
                                <Text className="text-slate-500 font-medium mt-1">
                                    Estimated arrival: 5-8 mins
                                </Text>
                            </View>
                            <View className="bg-emerald-100 px-3 py-1 rounded-full">
                                <Text className="text-emerald-700 font-bold text-xs">ON THE WAY</Text>
                            </View>
                        </View>

                        {/* DRIVER INFO */}
                        <View className="flex-row items-center bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100">
                            <View className="w-14 h-14 bg-emerald-500 rounded-full items-center justify-center">
                                <Ionicons name="person" size={28} color="white" />
                            </View>
                            <View className="flex-1 ml-4">
                                <Text className="text-lg font-bold text-slate-900">
                                    {driver?.user?.first_name || "John"} {driver?.user?.last_name || "Driver"}
                                </Text>
                                <View className="flex-row items-center mt-1">
                                    <Ionicons name="star" size={14} color="#F59E0B" />
                                    <Text className="text-slate-500 text-sm ml-1 font-medium">{driver?.rating || "4.9"} • {vehicle?.brand || "Toyota"} {vehicle?.model || "Aqua"}</Text>
                                </View>
                            </View>
                            <TouchableOpacity className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm border border-slate-100">
                                <Feather name="phone" size={20} color="#0F172A" />
                            </TouchableOpacity>
                        </View>

                        {/* TRIP DETAILS */}
                        <View className="space-y-4 mb-8">
                            <View className="flex-row items-center">
                                <View className="w-8 items-center">
                                    <View className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                </View>
                                <View className="flex-1 ml-2">
                                    <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pickup</Text>
                                    <Text className="text-slate-900 font-semibold truncate">{rideData.pickup_address}</Text>
                                </View>
                            </View>

                            <View className="flex-row items-center">
                                <View className="w-8 items-center">
                                    <View className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                                </View>
                                <View className="flex-1 ml-2">
                                    <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest">Drop-off</Text>
                                    <Text className="text-slate-900 font-semibold truncate">{rideData.drop_address}</Text>
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleCancel}
                            className="bg-rose-50 py-4 rounded-2xl items-center border border-rose-100 mb-8"
                        >
                            <Text className="font-bold text-rose-600 uppercase tracking-widest">
                                Cancel Ride
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View >
        );
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
            ) : null}
        </View>
    );
}
