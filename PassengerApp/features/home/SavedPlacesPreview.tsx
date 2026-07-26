import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Location from "expo-location";
import { SavedPlace, getPlaceConfig, useSavedPlaces } from "../../hooks/useSavedPlaces";
import { useRideSearch, LocationSuggestion } from "../../state/booking/RideBookingContext";
import { logExpectedError } from "../../services/errors/userMessages";

// ─── PLACE CARD ───────────────────────────────────────────────────────────────
function PlaceCard({
  item,
  compact,
  onPress,
  resolving = false,
}: {
  item: SavedPlace;
  compact: boolean;
  onPress: () => void;
  resolving?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const cfg = getPlaceConfig(item.type);

  return (
    <Animated.View style={{ flex: 1, maxWidth: "23%", transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        disabled={resolving}
        onPressIn={() =>
          Animated.spring(scale, {
            toValue: 0.93,
            useNativeDriver: true,
            speed: 32,
            bounciness: 3,
          }).start()
        }
        onPressOut={() => {
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 22,
            bounciness: 8,
          }).start();
          onPress();
        }}
        style={[
          styles.card,
          {
            borderRadius: compact ? 16 : 20,
            paddingVertical: compact ? 8 : 12,
            paddingHorizontal: compact ? 7 : 10,
            opacity: resolving ? 0.8 : 1,
          },
        ]}
      >
        <View
          style={{
            width: compact ? 28 : 36,
            height: compact ? 28 : 36,
            borderRadius: compact ? 14 : 18,
            backgroundColor: cfg.bg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {resolving ? (
            <ActivityIndicator size={compact ? "small" : "small"} color={cfg.color} />
          ) : (
            <Ionicons name={cfg.icon as any} size={compact ? 14 : 18} color={cfg.color} />
          )}
        </View>
        <Text
          style={{
            color: "#111827",
            fontSize: compact ? 9.5 : 11,
            fontWeight: "700",
            marginTop: compact ? 6 : 9,
            letterSpacing: -0.1,
          }}
          numberOfLines={1}
        >
          {item.label}
        </Text>
        <Text
          style={{
            color: "#9CA3AF",
            fontSize: compact ? 7.5 : 9,
            marginTop: 2,
            fontWeight: "400",
          }}
          numberOfLines={1}
        >
          {item.address}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── ADD CARD ─────────────────────────────────────────────────────────────────
function AddCard({ compact, onPress }: { compact: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ flex: 1, maxWidth: "23%", transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() =>
          Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 32, bounciness: 3 }).start()
        }
        onPressOut={() => {
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 22, bounciness: 8 }).start();
          onPress();
        }}
        style={[styles.card, { borderRadius: compact ? 16 : 20, paddingVertical: compact ? 8 : 12, paddingHorizontal: compact ? 7 : 10 }]}
      >
        <View
          style={{
            width: compact ? 28 : 36,
            height: compact ? 28 : 36,
            borderRadius: compact ? 14 : 18,
            backgroundColor: "#F3F4F6",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="add-circle" size={compact ? 14 : 18} color="#9CA3AF" />
        </View>
        <Text
          style={{ color: "#111827", fontSize: compact ? 9.5 : 11, fontWeight: "700", marginTop: compact ? 6 : 9, letterSpacing: -0.1 }}
        >
          Add
        </Text>
        <Text
          style={{ color: "#9CA3AF", fontSize: compact ? 7.5 : 9, marginTop: 2, fontWeight: "400" }}
        >
          New place
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
type SavedPlacesProps = { compact?: boolean };

export default function SavedPlaces({ compact = false }: SavedPlacesProps) {
  const router = useRouter();
  const { homePlace, officePlace, otherPlaces } = useSavedPlaces();
  const { setOutboundPickup, setOutboundDropoff, setTripType } = useRideSearch();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // Build display cards: Home → Office → first Other → Add
  const cards: (SavedPlace | "add")[] = [];
  if (homePlace) cards.push(homePlace);
  if (officePlace) cards.push(officePlace);
  if (otherPlaces.length > 0) cards.push(otherPlaces[0]);
  if (cards.length < 4) cards.push("add");

  const handlePlacePress = async (item: SavedPlace) => {
    if (resolvingId) return;
    setResolvingId(item.id);
    try {
      // 1. Get current location (pickup)
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location Access Required",
          "Please grant location permission to fetch your current ride pickup location."
        );
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const pickupSuggestion: LocationSuggestion = {
        id: "current",
        address: "Your Location",
        details: "Current location",
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
        placeType: "address",
      };

      // 2. Resolve destination coordinates from saved place, with geocode fallback
      let destLat = item.latitude;
      let destLng = item.longitude;

      if (!destLat || !destLng) {
        const geocoded = await Location.geocodeAsync(item.address);
        if (geocoded && geocoded.length > 0) {
          destLat = geocoded[0].latitude;
          destLng = geocoded[0].longitude;
        } else {
          // Sri Lanka Kandy fallback coordinates
          destLat = 7.2906;
          destLng = 80.6337;
        }
      }

      const destinationSuggestion: LocationSuggestion = {
        id: item.id,
        address: item.address,
        details: item.label,
        latitude: destLat,
        longitude: destLng,
        placeType: "address",
      };

      // 3. Populate RideSearchContext with outbound details
      setOutboundPickup(pickupSuggestion);
      setOutboundDropoff(destinationSuggestion);
      setTripType("oneway");

      // 4. Route directly to select-ride screen
      router.push({
        pathname: "/ride-booking/select-vehicle",
        params: {
          pickup: JSON.stringify(pickupSuggestion),
          destination: JSON.stringify(destinationSuggestion),
          bookForFriend: "false",
        },
      });
    } catch (error) {
      logExpectedError("Saved place location lookup failed", error);
      Alert.alert(
        "Booking Error",
        "Could not detect your current location. Please verify that GPS location is enabled on your device."
      );
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <View>
      {/* HEADER */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: compact ? 8 : 12,
        }}
      >
        <Text
          style={{
            fontSize: compact ? 14 : 16,
            fontWeight: "800",
            color: "#111827",
            letterSpacing: -0.2,
          }}
        >
          Where to go again?
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: "#DDF5EC",
            borderRadius: 20,
            paddingHorizontal: compact ? 10 : 12,
            paddingVertical: compact ? 4 : 5,
          }}
          onPress={() => router.push("/saved-places" as any)}
        >
          <Text style={{ color: "#22B36A", fontWeight: "700", fontSize: compact ? 11 : 12 }}>
            View All
          </Text>
        </TouchableOpacity>
      </View>

      {/* CARDS ROW */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        {cards.slice(0, 4).map((item, index) =>
          item === "add" ? (
            <AddCard
              key={`add-${index}`}
              compact={compact}
              onPress={() => router.push("/saved-places/form" as any)}
            />
          ) : (
            <PlaceCard
              key={item.id}
              item={item}
              compact={compact}
              resolving={resolvingId === item.id}
              onPress={() => handlePlacePress(item)}
            />
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
});
