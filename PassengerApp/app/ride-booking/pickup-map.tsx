import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import MapView, { PROVIDER_GOOGLE, Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { SavedPlace, getPlaceConfig, useSavedPlaces } from "../../hooks/useSavedPlaces";
import { useRideSearch, LocationSuggestion } from "../../state/booking/RideBookingContext";
import { getFreshCurrentLocationSuggestion } from "../../services/maps/currentLocation";
import { logExpectedError } from "../../services/errors/userMessages";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Default region fallback

const DEFAULT_REGION: Region = {
  latitude: 7.2906,
  longitude: 80.6337,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

export default function FindRideScreen() {
  const mapRef = useRef<MapView | null>(null);
  const { homePlace, officePlace, otherPlaces } = useSavedPlaces();
  const { setOutboundPickup, setOutboundDropoff, setTripType } = useRideSearch();

  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [pickupAddress, setPickupAddress] = useState<string>("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLoadingInitialLocation, setIsLoadingInitialLocation] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ask for location and center map
  useEffect(() => {
    (async () => {
      try {
        const current = await getFreshCurrentLocationSuggestion();
        const newRegion: Region = {
          latitude: current.latitude,
          longitude: current.longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        };
        setRegion(newRegion);
        setPickupAddress(current.details?.split(" • ")[0] || current.address);
        mapRef.current?.animateToRegion(newRegion, 600);
      } catch {
        // fallback default region already set
        reverseGeocode(DEFAULT_REGION.latitude, DEFAULT_REGION.longitude);
      } finally {
        setIsLoadingInitialLocation(false);
      }
    })();
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });
      if (results && results.length > 0) {
        const r = results[0];
        const parts = [r.name, r.street, r.district, r.city]
          .filter(Boolean)
          .join(", ");
        setPickupAddress(parts || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      } else {
        setPickupAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch {
      setPickupAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  const handleRegionChange = useCallback((r: Region) => {
    setRegion(r);
    // Debounce geocoding until user stops dragging
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(() => {
      reverseGeocode(r.latitude, r.longitude);
    }, 650);
  }, [reverseGeocode]);

  const handleDropPress = () => {
    router.push({
      pathname: "/ride-booking",
      params: {
        pickupAddress,
        pickupLat: String(region.latitude),
        pickupLng: String(region.longitude),
        tripType: "one-way",
      },
    });
  };

  const handleSavedPlacePress = async (place: SavedPlace) => {
    if (resolvingId) return;
    setResolvingId(place.id);
    try {
      const pickupSuggestion: LocationSuggestion = {
        id: "current",
        address: pickupAddress || "Your Location",
        details: "Pickup location",
        latitude: region.latitude,
        longitude: region.longitude,
        placeType: "address",
      };

      let destLat = place.latitude;
      let destLng = place.longitude;

      if (!destLat || !destLng) {
        const geocoded = await Location.geocodeAsync(place.address);
        if (geocoded && geocoded.length > 0) {
          destLat = geocoded[0].latitude;
          destLng = geocoded[0].longitude;
        } else {
          destLat = 7.2906;
          destLng = 80.6337;
        }
      }

      const destinationSuggestion: LocationSuggestion = {
        id: place.id,
        address: place.address,
        details: place.label,
        latitude: destLat,
        longitude: destLng,
        placeType: "address",
      };

      setOutboundPickup(pickupSuggestion);
      setOutboundDropoff(destinationSuggestion);
      setTripType("oneway");

      router.push({
        pathname: "/ride-booking/select-vehicle",
        params: {
          pickup: JSON.stringify(pickupSuggestion),
          destination: JSON.stringify(destinationSuggestion),
          bookForFriend: "false",
        },
      });
    } catch (e) {
      logExpectedError("Saved place route failed", e);
      Alert.alert("Could not prepare trip", "Please check this saved place and try again.");
    } finally {
      setResolvingId(null);
    }
  };

  const statusBarHeight = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

        {/* ─── MAP ─────────────────────────────────────── */}
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={DEFAULT_REGION}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          onRegionChange={handleRegionChange}
        />

        {/* ─── FIXED CENTER MARKER ───────────────────── */}
        <View style={styles.markerContainer} pointerEvents="none">
          <Image
            source={require("../../assets/images/vehicles/Umarker.png")}
            style={styles.markerImage}
            contentFit="contain"
          />
          {/* Subtle shadow dot under marker */}
          <View style={styles.markerShadow} />
        </View>

        {/* ─── TOP HEADER BAR ─────────────────────────── */}
        <View style={[styles.header, { paddingTop: statusBarHeight + 12 }]}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#0F2E23" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Find a Ride</Text>
          {/* Recenter button */}
          <TouchableOpacity
            style={styles.recenterBtn}
            onPress={async () => {
              try {
                const current = await getFreshCurrentLocationSuggestion();
                const r: Region = {
                  latitude: current.latitude,
                  longitude: current.longitude,
                  latitudeDelta: 0.008,
                  longitudeDelta: 0.008,
                };
                setRegion(r);
                setPickupAddress(current.details?.split(" • ")[0] || current.address);
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
                } catch { /* ignore */ }
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="locate" size={20} color="#0b9e54" />
          </TouchableOpacity>
        </View>

        {/* ─── BOTTOM OVERLAY CONTAINER ─────────────────── */}
        <View style={styles.bottomOverlayContainer}>
          
          {/* FORM CARD */}
          <View style={styles.formCard}>
            
            {/* TABS HEADER ROW (Single "One way" tab to align left, matching the image tab architecture) */}
            <View style={styles.tabsHeader}>
              <View style={[styles.tabOption, styles.tabOptionLeft, styles.tabActive]}>
                <View style={[styles.checkCircle, styles.checkCircleActive]}>
                  <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                </View>
                <Text style={[styles.tabText, styles.tabTextActive]}>
                  One way
                </Text>
              </View>
              <View style={styles.tabsEmptySpace} />
            </View>

            {/* CARD CONTENT */}
            <View style={styles.cardContent}>
              
              {/* PICKUP Row */}
              <View style={styles.locationRow}>
                <Text style={styles.labelPickup}>PICKUP</Text>
                <View style={styles.locationTextWrap}>
                  {isGeocoding || isLoadingInitialLocation ? (
                    <View style={styles.geocodeLoading}>
                      <ActivityIndicator size="small" color="#0B7BDC" />
                      <Text style={styles.fetchingText}>Fetching location…</Text>
                    </View>
                  ) : (
                    <Text style={styles.locationText} numberOfLines={1}>
                      {pickupAddress || "Drag map to set pickup"}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    if (!pickupAddress) return;
                    router.push({
                      pathname: "/saved-places/form",
                      params: {
                        editAddress: pickupAddress,
                        editLat: String(region.latitude),
                        editLng: String(region.longitude),
                      },
                    });
                  }}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="heart-outline" size={22} color="#0b9e54" />
                </TouchableOpacity>
              </View>

              {/* Connecting Vertical Dotted Line */}
              <View style={styles.dividerRow}>
                <View style={styles.verticalDottedLine}>
                  <View style={styles.dotMini} />
                  <View style={styles.dotMini} />
                  <View style={styles.dotMini} />
                </View>
              </View>

              {/* DROP Row */}
              <TouchableOpacity
                style={styles.locationRow}
                activeOpacity={0.7}
                onPress={handleDropPress}
              >
                <Text style={styles.labelDrop}>DROP</Text>
                <Text style={[styles.locationText, styles.placeholder]} numberOfLines={1}>
                  Where are you going?
                </Text>
                <Ionicons name="add" size={24} color="#0F2E23" />
              </TouchableOpacity>
            </View>

          </View>

          {/* FLOATING SAVED PLACES STRIP — Layout mirrors SavedPlaces.tsx in home.tsx */}
          <View style={styles.savedStrip}>
            {(() => {
              const cards: (SavedPlace | "add")[] = [];
              if (homePlace) cards.push(homePlace);
              if (officePlace) cards.push(officePlace);
              if (otherPlaces.length > 0) cards.push(otherPlaces[0]);
              if (cards.length < 4) cards.push("add");

              return cards.map((place, index) => {
                if (place === "add") {
                  return (
                    <TouchableOpacity
                      key={`add-${index}`}
                      style={styles.savedCard}
                      onPress={() => router.push("/saved-places/form" as any)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.savedIconBg, { backgroundColor: "#F3F4F6" }]}>
                        <Ionicons name="add-circle" size={16} color="#9CA3AF" />
                      </View>
                      <Text style={styles.savedCardTitle} numberOfLines={1}>
                        Add
                      </Text>
                      <Text style={styles.savedCardSub} numberOfLines={1}>
                        New place
                      </Text>
                    </TouchableOpacity>
                  );
                }

                const cfg = getPlaceConfig(place.type);
                const isResolving = resolvingId === place.id;

                return (
                  <TouchableOpacity
                    key={place.id}
                    disabled={isResolving}
                    style={[styles.savedCard, isResolving && { opacity: 0.6 }]}
                    onPress={() => handleSavedPlacePress(place)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.savedIconBg, { backgroundColor: cfg.bg }]}>
                      {isResolving ? (
                        <ActivityIndicator size="small" color={cfg.color} />
                      ) : (
                        <Ionicons name={cfg.icon as any} size={16} color={cfg.color} />
                      )}
                    </View>
                    <Text style={styles.savedCardTitle} numberOfLines={1}>
                      {place.label}
                    </Text>
                    <Text style={styles.savedCardSub} numberOfLines={1}>
                      {place.address}
                    </Text>
                  </TouchableOpacity>
                );
              });
            })()}
          </View>

        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000000",
  },
  container: {
    flex: 1,
    backgroundColor: "#F4FBFF",
  },

  // ── MAP CENTER MARKER ───────────────────
  markerContainer: {
    position: "absolute",
    left: "50%",
    top: "50%",
    // Shift left by half-width, shift up by full height
    transform: [{ translateX: -24 }, { translateY: -56 }],
    alignItems: "center",
  },
  markerImage: {
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

  // ── HEADER ──────────────────────────────
  header: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F2E23",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.10,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  recenterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  // ── BOTTOM OVERLAY CONTAINER ────────────
  bottomOverlayContainer: {
    position: "absolute",
    bottom: 12,
    left: 16,
    right: 16,
    zIndex: 10,
  },

  // ── FORM CARD ───────────────────────────
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  // TABS
  tabsHeader: {
    flexDirection: "row",
    height: 52,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  tabOption: {
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  tabOptionLeft: {
    borderTopLeftRadius: 24,
  },
  tabActive: {
    backgroundColor: "#F3F4F6",
  },
  tabsEmptySpace: {
    width: "50%",
    backgroundColor: "#FFFFFF",
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  checkCircleActive: {
    backgroundColor: "#1A1A1A",
  },
  tabText: {
    fontSize: 14,
  },
  tabTextActive: {
    fontWeight: "700",
    color: "#1A1A1A",
  },

  // CONTENT
  cardContent: {
    paddingTop: 18,
    paddingBottom: 22,
    paddingHorizontal: 20,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 40,
  },
  labelPickup: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0B7BDC",
    width: 54,
    letterSpacing: 0.5,
  },
  labelDrop: {
    fontSize: 11,
    fontWeight: "800",
    color: "#F97316",
    width: 54,
    letterSpacing: 0.5,
  },
  locationTextWrap: {
    flex: 1,
  },
  locationText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#0F2E23",
  },
  placeholder: {
    color: "#9CA3AF",
    fontWeight: "400",
  },
  geocodeLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fetchingText: {
    fontSize: 13,
    color: "#9CA3AF",
    fontStyle: "italic",
  },

  // Divider (3 mini dots)
  dividerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingLeft: 64,
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

  // ── FLOATING SAVED PLACES STRIP ─────────
  savedStrip: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },
  savedCard: {
    flex: 1,
    maxWidth: "23%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  savedIconBg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  savedCardTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111827",
  },
  savedCardSub: {
    fontSize: 8.5,
    color: "#9CA3AF",
    marginTop: 2,
    fontWeight: "400",
  },
});

