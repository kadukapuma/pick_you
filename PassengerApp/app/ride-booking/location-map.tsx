import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { PROVIDER_GOOGLE, Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRideSearch, LocationSuggestion } from "../../state/booking/RideBookingContext";
import { getFreshCurrentLocationSuggestion } from "../../services/maps/currentLocation";
import { logExpectedError } from "../../services/errors/userMessages";

const { width } = Dimensions.get("window");

export default function SetLocationMapScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    pickupAddress?: string;
    pickupLat?: string;
    pickupLng?: string;
  }>();

  const { setOutboundPickup, setOutboundDropoff, setTripType } = useRideSearch();

  const initialLat = params.pickupLat ? parseFloat(params.pickupLat) : 7.2906;
  const initialLng = params.pickupLng ? parseFloat(params.pickupLng) : 80.6337;

  const mapRef = useRef<MapView | null>(null);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [region, setRegion] = useState<Region>({
    latitude: initialLat,
    longitude: initialLng,
    latitudeDelta: 0.008,
    longitudeDelta: 0.008,
  });

  const [dropAddress, setDropAddress] = useState("Location Fetched");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [activeTab, setActiveTab] = useState<"oneway" | "return">("oneway");
  const [confirming, setConfirming] = useState(false);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results && results.length > 0) {
        const r = results[0];
        const parts = [r.name, r.street, r.district, r.city].filter(Boolean).join(", ");
        setDropAddress(parts || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      } else {
        setDropAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch {
      setDropAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  useEffect(() => {
    // Initial geocode of mapping target coordinate
    reverseGeocode(initialLat, initialLng);
  }, []);

  const handleRegionChange = useCallback((r: Region) => {
    setRegion(r);
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(() => reverseGeocode(r.latitude, r.longitude), 650);
  }, [reverseGeocode]);

  const handleRecenter = async () => {
    try {
      const current = await getFreshCurrentLocationSuggestion();
      const r: Region = {
        latitude: current.latitude,
        longitude: current.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      };
      setRegion(r);
      setDropAddress(current.details?.split(" • ")[0] || current.address);
      mapRef.current?.animateToRegion(r, 500);
    } catch {
      try {
        const lastPos = await Location.getLastKnownPositionAsync();
        if (lastPos) {
          const fallbackRegion: Region = {
            latitude: lastPos.coords.latitude,
            longitude: lastPos.coords.longitude,
            latitudeDelta: 0.008,
            longitudeDelta: 0.008,
          };
          setRegion(fallbackRegion);
          reverseGeocode(fallbackRegion.latitude, fallbackRegion.longitude);
          mapRef.current?.animateToRegion(fallbackRegion, 500);
        }
      } catch {}
    }
  };

  const handleConfirmDrop = () => {
    if (!dropAddress || isGeocoding) {
      Alert.alert("Please Wait", "We are resolving the address of the selected pin location...");
      return;
    }

    setConfirming(true);
    try {
      const pickupSuggestion: LocationSuggestion = {
        id: "pickup_map",
        address: params.pickupAddress || "Your Location",
        details: "Pickup Point",
        latitude: initialLat,
        longitude: initialLng,
        placeType: "address",
      };

      const destinationSuggestion: LocationSuggestion = {
        id: "drop_map",
        address: dropAddress,
        details: "Selected Destination",
        latitude: region.latitude,
        longitude: region.longitude,
        placeType: "address",
      };

      setOutboundPickup(pickupSuggestion);
      // For a return trip, `destinationSuggestion` is the destination (B) —
      // select-vehicle.tsx and confirm.tsx price/derive the round trip from
      // pickup + this single dropoff value; there's no separate return address.
      setOutboundDropoff(destinationSuggestion);
      setTripType(activeTab);

      router.push({
        pathname: "/ride-booking/select-vehicle" as any,
        params: {
          pickup: JSON.stringify(pickupSuggestion),
          destination: JSON.stringify(destinationSuggestion),
          bookForFriend: "false",
        },
      });
    } catch (e) {
      logExpectedError("Map drop location selection failed", e);
      Alert.alert("Could not select location", "Please move the map pin slightly and try again.");
    } finally {
      setConfirming(false);
    }
  };

  const statusBarHeight = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* ─── MAP INTERFACE ─── */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={region}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        onRegionChange={handleRegionChange}
      />

      {/* Fixed Center Pin */}
      <View style={styles.markerWrap} pointerEvents="none">
        <Image
          source={require("../../assets/images/vehicles/Umarker.png")}
          style={styles.markerImg}
          resizeMode="contain"
        />
        <View style={styles.markerShadow} />
      </View>

      {/* ─── TOP INFO BOARD CARD ─── */}
      <View style={[styles.headerCard, { top: insets.top + 12 }]} pointerEvents="box-none">
        <View style={styles.cardInner}>
          {/* Tabs row */}
          <View style={styles.tabsHeader}>
            <TouchableOpacity
              onPress={() => setActiveTab("oneway")}
              style={[styles.tabOption, activeTab === "oneway" && styles.tabActive]}
            >
              <View style={[styles.checkCircle, activeTab === "oneway" && styles.checkCircleActive]}>
                {activeTab === "oneway" && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
              </View>
              <Text style={[styles.tabText, activeTab === "oneway" && styles.tabTextActive]}>
                One way
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab("return")}
              style={[styles.tabOption, activeTab === "return" && styles.tabActive]}
            >
              <View style={[styles.checkCircle, activeTab === "return" && styles.checkCircleActive]}>
                {activeTab === "return" && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
              </View>
              <Text style={[styles.tabText, activeTab === "return" && styles.tabTextActive]}>
                Return trip*
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form details */}
          <View style={styles.fieldSection}>
            <View style={styles.fieldRow}>
              <Text style={styles.labelPickup}>PICKUP</Text>
              <Text style={styles.addressText} numberOfLines={1}>
                {params.pickupAddress || "Your Location"}
              </Text>
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.verticalDottedLine}>
                <View style={styles.dotMini} />
                <View style={styles.dotMini} />
                <View style={styles.dotMini} />
              </View>
            </View>

            <View style={styles.fieldRow}>
              <Text style={styles.labelDrop}>DROP</Text>
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
                {isGeocoding ? (
                  <ActivityIndicator size="small" color="#0b9e54" style={{ marginRight: 8 }} />
                ) : null}
                <Text style={styles.addressText} numberOfLines={1}>
                  {dropAddress}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ─── BOTTOM FLOATS ─── */}
      <View style={[styles.bottomFloats, { bottom: insets.bottom + 84 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.circleBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color="#000000" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleRecenter}
          style={styles.circleBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="locate" size={22} color="#000000" />
        </TouchableOpacity>
      </View>

      {/* ─── SET DROP BUTTON ─── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          onPress={handleConfirmDrop}
          style={[styles.confirmButton, confirming && { opacity: 0.6 }]}
          disabled={confirming}
          activeOpacity={0.88}
        >
          {confirming ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmButtonText}>SET DROP LOCATION</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4FBFF",
  },
  // Fixed pin
  markerWrap: {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: [{ translateX: -24 }, { translateY: -56 }],
    alignItems: "center",
  },
  markerImg: {
    width: 48,
    height: 56,
  },
  markerShadow: {
    width: 12,
    height: 5,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.18)",
    marginTop: -2,
  },

  // Floating Header Card
  headerCard: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 10,
  },
  cardInner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  // Tabs Header
  tabsHeader: {
    flexDirection: "row",
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  tabOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  tabActive: {
    backgroundColor: "#F9FAFB",
  },
  checkCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  checkCircleActive: {
    borderColor: "#0b9e54",
    backgroundColor: "#0b9e54",
  },
  tabText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#111827",
    fontWeight: "700",
  },

  // Field sections
  fieldSection: {
    padding: 18,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  labelPickup: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0b9e54",
    width: 50,
    letterSpacing: 0.5,
  },
  labelDrop: {
    fontSize: 10,
    fontWeight: "800",
    color: "#F97316",
    width: 50,
    letterSpacing: 0.5,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },

  // Dotted vertical line
  dividerRow: {
    flexDirection: "row",
    paddingLeft: 60,
    marginVertical: 4,
  },
  verticalDottedLine: {
    alignItems: "center",
    gap: 3,
  },
  dotMini: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#CCCCCC",
  },

  // Bottom circular float buttons
  bottomFloats: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 10,
  },
  circleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },

  // Footer / SET DROP location button
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  confirmButton: {
    backgroundColor: "#000000",
    borderRadius: 34,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
});

