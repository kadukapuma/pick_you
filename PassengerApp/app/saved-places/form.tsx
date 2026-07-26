import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { PROVIDER_GOOGLE, Region } from "react-native-maps";
import ThemeButton from "../../components/ui/ThemeButton";
import { useSavedPlaces, PlaceType } from "../../hooks/useSavedPlaces";

const BG = "#F2FBF8";
const DARK = "#18231F";
const DEEP = "#063D31";
const GREEN = "#0B8F62";
const MUTED = "#697872";
const LINE = "rgba(153,177,169,0.38)";

const DEFAULT_REGION: Region = {
  latitude: 7.2906,
  longitude: 80.6337,
  latitudeDelta: 0.008,
  longitudeDelta: 0.008,
};

const TYPE_OPTIONS: { value: PlaceType; label: string; icon: any; color: string; bg: string }[] = [
  { value: "home", label: "Home", icon: "home", color: GREEN, bg: "#DDF7ED" },
  { value: "office", label: "Work", icon: "business", color: "#2563EB", bg: "#E6F0FF" },
  { value: "other", label: "Other place", icon: "location", color: "#B7791F", bg: "#FFF4D8" },
];

export default function AddPlaceScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    editId?: string;
    editType?: PlaceType;
    editLabel?: string;
    editAddress?: string;
    editLat?: string;
    editLng?: string;
  }>();

  const isEditing = !!params.editId;
  const mapRef = useRef<MapView | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [fetchedAddress, setFetchedAddress] = useState(params.editAddress ?? "");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(!isEditing);
  const [saveAs, setSaveAs] = useState(params.editLabel ?? "");
  const [selectedType, setSelectedType] = useState<PlaceType>(params.editType ?? "home");
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dropdownAnim] = useState(new Animated.Value(0));

  const { addPlace, updatePlace, places } = useSavedPlaces();

  const scrollToFormArea = (offset = 0) => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: MAP_HEIGHT + offset, animated: true });
    }, 120);
  };

  const toggleDropdown = (open: boolean) => {
    setShowTypePicker(open);
    if (open) scrollToFormArea(150);
    Animated.spring(dropdownAnim, {
      toValue: open ? 1 : 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 200,
    }).start();
  };

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results?.length > 0) {
        const r = results[0];
        const parts = [r.name, r.street, r.district, r.city].filter(Boolean).join(", ");
        setFetchedAddress(parts || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      } else {
        setFetchedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch {
      setFetchedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (params.editLat && params.editLng) {
        const lat = parseFloat(params.editLat);
        const lng = parseFloat(params.editLng);
        const r: Region = { latitude: lat, longitude: lng, latitudeDelta: 0.008, longitudeDelta: 0.008 };
        setRegion(r);
        setTimeout(() => mapRef.current?.animateToRegion(r, 100), 50);
        setIsLoadingLocation(false);
        if (!params.editAddress) reverseGeocode(lat, lng);
        return;
      }

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") { setIsLoadingLocation(false); return; }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const r: Region = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        };
        setRegion(r);
        mapRef.current?.animateToRegion(r, 600);
        reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      } catch {
        reverseGeocode(DEFAULT_REGION.latitude, DEFAULT_REGION.longitude);
      } finally {
        setIsLoadingLocation(false);
      }
    })();
  }, [params.editAddress, params.editLat, params.editLng, reverseGeocode]);

  const handleRegionChange = useCallback((r: Region) => {
    setRegion(r);
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(() => reverseGeocode(r.latitude, r.longitude), 650);
  }, [reverseGeocode]);

  const handleRecenter = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const lastPos = await Location.getLastKnownPositionAsync();
      if (lastPos) {
        const r = {
          latitude: lastPos.coords.latitude,
          longitude: lastPos.coords.longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        };
        setRegion(r);
        mapRef.current?.animateToRegion(r, 350);
        reverseGeocode(lastPos.coords.latitude, lastPos.coords.longitude);
      }

      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        .then((pos) => {
          const r = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            latitudeDelta: 0.008,
            longitudeDelta: 0.008,
          };
          setRegion(r);
          mapRef.current?.animateToRegion(r, 400);
          reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        })
        .catch(() => {});
    } catch {}
  };

  const handleSave = async () => {
    if (!fetchedAddress) {
      Alert.alert("No location", "Please move the pin to your location on the map.");
      return;
    }
    const label = saveAs.trim() || (selectedType === "home" ? "Home" : selectedType === "office" ? "Work" : "My Place");
    setSaving(true);
    try {
      let ok: boolean;
      if (isEditing && params.editId) {
        ok = await updatePlace(params.editId, {
          type: selectedType,
          label,
          address: fetchedAddress,
          latitude: region.latitude,
          longitude: region.longitude,
        });
      } else {
        ok = await addPlace({
          type: selectedType,
          label,
          address: fetchedAddress,
          latitude: region.latitude,
          longitude: region.longitude,
        });
      }
      if (!ok) {
        Alert.alert("Already saved", `You already have a ${selectedType === "home" ? "Home" : "Work"} address.`);
        return;
      }
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const existingTypes = places.map((p) => p.type);
  const isTypeBlocked = (t: PlaceType) => {
    if (t === "other") return false;
    if (isEditing && params.editType === t) return false;
    return existingTypes.includes(t);
  };

  const selectedCfg = TYPE_OPTIONS.find((o) => o.value === selectedType)!;

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.84}>
          <Ionicons name="arrow-back" size={22} color={DEEP} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? "Edit address" : "Add address"}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 104 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFill}
              initialRegion={region}
              showsUserLocation={false}
              showsMyLocationButton={false}
              showsCompass={false}
              onRegionChangeComplete={handleRegionChange}
            />

            <View style={styles.markerWrap} pointerEvents="none">
              <Image source={require("../../assets/images/vehicles/Umarker.png")} style={styles.markerImg} contentFit="contain" />
              <View style={styles.markerShadow} />
            </View>

            <View style={styles.hintBadge} pointerEvents="none">
              <Ionicons name="move" size={13} color="#FFFFFF" />
              <Text style={styles.hintText}>Move pin</Text>
            </View>

            <TouchableOpacity style={styles.recenterBtn} onPress={handleRecenter} activeOpacity={0.85}>
              <Ionicons name="locate" size={20} color={DEEP} />
            </TouchableOpacity>
          </View>

          <View style={styles.formWrap}>
            <View style={styles.addressPanel}>
              <View style={styles.addressIconWrap}>
                <Ionicons name="location" size={19} color={GREEN} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.panelLabel}>Selected location</Text>
                {isGeocoding || isLoadingLocation ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={GREEN} />
                    <Text style={styles.addressLoadingText}>Fetching location</Text>
                  </View>
                ) : (
                  <Text style={styles.addressText} numberOfLines={2}>{fetchedAddress || "Pan the map to select location"}</Text>
                )}
              </View>
            </View>

            <Text style={styles.fieldLabel}>Name</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="bookmark-outline" size={19} color={MUTED} />
              <TextInput
                style={styles.textInput}
                value={saveAs}
                onChangeText={setSaveAs}
                placeholder="Home, Work or My Place"
                placeholderTextColor="#9AA9A4"
                returnKeyType="done"
                onFocus={() => scrollToFormArea(72)}
              />
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Address type</Text>
            <TouchableOpacity style={[styles.dropdownTrigger, showTypePicker && styles.dropdownTriggerOpen]} onPress={() => toggleDropdown(!showTypePicker)} activeOpacity={0.85}>
              <View style={[styles.dropdownIcon, { backgroundColor: selectedCfg.bg }]}> 
                <Ionicons name={selectedCfg.icon} size={16} color={selectedCfg.color} />
              </View>
              <Text style={styles.dropdownTriggerText}>{selectedCfg.label}</Text>
              <Animated.View
                style={{
                  transform: [{
                    rotate: dropdownAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] }),
                  }],
                }}
              >
                <Ionicons name="chevron-down" size={18} color={MUTED} />
              </Animated.View>
            </TouchableOpacity>

            {showTypePicker ? (
              <View style={styles.dropdown}>
                {TYPE_OPTIONS.map((opt) => {
                  const blocked = isTypeBlocked(opt.value);
                  const isActive = selectedType === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.dropdownItem, isActive && styles.dropdownItemActive, blocked && styles.dropdownItemBlocked]}
                      onPress={() => {
                        if (blocked) return;
                        setSelectedType(opt.value);
                        toggleDropdown(false);
                      }}
                      activeOpacity={blocked ? 1 : 0.78}
                    >
                      <View style={[styles.dropdownIcon, { backgroundColor: opt.bg }]}> 
                        <Ionicons name={opt.icon} size={16} color={blocked ? "#9AA9A4" : opt.color} />
                      </View>
                      <Text style={[styles.dropdownItemText, isActive && styles.dropdownItemTextActive, blocked && styles.dropdownItemTextBlocked]}>
                        {opt.label}{blocked ? " already saved" : ""}
                      </Text>
                      {isActive && !blocked ? <Ionicons name="checkmark-circle" size={19} color={GREEN} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}> 
        <ThemeButton
          label={saving ? "Saving" : isEditing ? "Update address" : "Save address"}
          onPress={handleSave}
          disabled={saving}
          icon={saving ? undefined : "checkmark-circle-outline"}
          variant="primary"
        />
      </View>
    </View>
  );
}

const MAP_HEIGHT = 285;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { minHeight: 62, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, backgroundColor: BG },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.72)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(221,235,229,0.82)" },
  headerTitle: { color: DARK, fontSize: 18, fontWeight: "900" },
  headerSpacer: { width: 40 },
  scroll: { flex: 1, backgroundColor: BG },
  mapContainer: { height: MAP_HEIGHT, marginHorizontal: 18, marginTop: 10, borderRadius: 26, overflow: "hidden", backgroundColor: "#D1D5DB", borderWidth: 1.2, borderColor: LINE },
  markerWrap: { position: "absolute", left: "50%", top: "50%", transform: [{ translateX: -24 }, { translateY: -56 }], alignItems: "center" },
  markerImg: { width: 48, height: 56 },
  markerShadow: { width: 12, height: 5, borderRadius: 6, backgroundColor: "rgba(0,0,0,0.18)", marginTop: -2 },
  hintBadge: { position: "absolute", top: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(6,61,49,0.78)", borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7 },
  hintText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  recenterBtn: { position: "absolute", bottom: 12, right: 12, width: 42, height: 42, borderRadius: 21, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center", elevation: 4, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  formWrap: { marginHorizontal: 18, marginTop: 18 },
  addressPanel: { minHeight: 78, borderRadius: 22, borderWidth: 1.2, borderColor: LINE, backgroundColor: "transparent", flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 15, marginBottom: 18 },
  addressIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#DDF7ED", alignItems: "center", justifyContent: "center" },
  panelLabel: { color: MUTED, fontSize: 11, fontWeight: "900", textTransform: "uppercase", marginBottom: 4 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  addressText: { color: DARK, fontSize: 14, fontWeight: "800", lineHeight: 20 },
  addressLoadingText: { fontSize: 13, color: MUTED, fontWeight: "700" },
  fieldLabel: { color: DARK, fontSize: 14, fontWeight: "900", marginBottom: 8 },
  inputWrap: { minHeight: 58, borderRadius: 22, borderWidth: 1.2, borderColor: LINE, backgroundColor: "transparent", flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 15 },
  textInput: { flex: 1, color: DARK, fontSize: 15, fontWeight: "800", paddingVertical: 0 },
  dropdownTrigger: { minHeight: 58, borderRadius: 22, borderWidth: 1.2, borderColor: LINE, backgroundColor: "transparent", flexDirection: "row", alignItems: "center", paddingHorizontal: 12 },
  dropdownTriggerOpen: { borderColor: "rgba(11,143,98,0.50)", backgroundColor: "rgba(11,143,98,0.04)" },
  dropdownIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", marginRight: 10 },
  dropdownTriggerText: { flex: 1, color: DARK, fontSize: 15, fontWeight: "900" },
  dropdown: { marginTop: 8, borderWidth: 1.2, borderColor: LINE, borderRadius: 22, overflow: "hidden", backgroundColor: "transparent" },
  dropdownItem: { minHeight: 58, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "rgba(153,177,169,0.20)" },
  dropdownItemActive: { backgroundColor: "rgba(11,143,98,0.06)" },
  dropdownItemBlocked: { opacity: 0.46 },
  dropdownItemText: { flex: 1, color: DARK, fontSize: 14, fontWeight: "800" },
  dropdownItemTextActive: { color: DEEP, fontWeight: "900" },
  dropdownItemTextBlocked: { color: MUTED },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 12, backgroundColor: BG },
});