import { useEffect, useRef } from "react";
import { View, Text, ActivityIndicator, Alert } from "react-native";
import HomeHeader from "../../components/home/HomeHeader";
import { useRideSearch } from "../../context/RideSearchContext";
import { apiClient } from "../../services/api/apiClient";

export default function ActivitiesScreen() {
  const {
    isSearchingForDriver,
    activeRideId,
    activeRideStatus,
    setIsSearchingForDriver,
    setActiveRide,
  } = useRideSearch();
  const approvalAlertShownRef = useRef(false);

  useEffect(() => {
    if (!isSearchingForDriver || !activeRideId) {
      return;
    }

    let cancelled = false;

    const pollRideStatus = async () => {
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
    };

    pollRideStatus();
    const intervalId = setInterval(pollRideStatus, 5000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [activeRideId, isSearchingForDriver, setActiveRide, setIsSearchingForDriver]);

  const waiting = isSearchingForDriver && activeRideStatus !== "ACCEPTED";

  return (
    <View className="flex-1 bg-white pt-14 px-5">
      {/* HEADER */}
      <HomeHeader />

      {/* CONTENT */}
      <View className="flex-1">
        {waiting ? (
          <View className="mt-6 rounded-3xl bg-slate-900 px-5 py-6">
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
          </View>
        ) : activeRideStatus === "ACCEPTED" ? (
          <View className="mt-6 rounded-3xl bg-emerald-950 px-5 py-6">
            <Text className="text-lg font-bold text-white">Driver approved</Text>
            <Text className="mt-1 text-sm text-emerald-200">
              Your driver is on the way.
            </Text>
          </View>
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text>Activities Screen</Text>
          </View>
        )}
      </View>
    </View>
  );
}
