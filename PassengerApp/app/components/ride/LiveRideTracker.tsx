import React from "react";
import { View, Text, TouchableOpacity, Dimensions, } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import RideMap from "./RideMap";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function LiveRideTracker({ rideData, driverLocation }: any) {
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
                />
            </View>

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
                            {rideData.driver?.user?.first_name || "Driver"} • {rideData.vehicle?.plate_number || "Vehicle"}
                        </Text>
                        <Text style={{ color: "#6B7280", fontSize: 12 }}>
                            {rideData.distance_km} km • ETA: 5-8 min
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