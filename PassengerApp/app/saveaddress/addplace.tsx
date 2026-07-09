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
import { useSavedPlaces, PlaceType } from "../../hooks/useSavedPlaces";

export default function AddPlace() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* ── HEADER ── */}
      <View
        style={[
          styles.header,
          { paddingTop: (insets.top || statusBarH) + 10 },
        ]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? "Edit Address" : "Add Saved Address"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ flex: 1, backgroundColor: "#F4F6F9" }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── MAP ── */}
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFill}
              initialRegion={region}
              showsUserLocation={false}
              showsMyLocationButton={false}
              showsCompass={false}
              onRegionChange={handleRegionChange}
            />

            {/* Fixed center pin */}
            <View style={styles.markerWrap} pointerEvents="none">
              <Image
                source={require("../../assets/images/vehicles/Umarker.png")}
                style={styles.markerImg}
                contentFit="contain"
              />
              <View style={styles.markerShadow} />
            </View>

            {/* Move pin hint */}
            <View style={styles.hintBadge} pointerEvents="none">
              <Ionicons name="move" size={13} color="#FFFFFF" />
              <Text style={styles.hintText}>Move pin</Text>
            </View>

            {/* Recenter */}
            <TouchableOpacity
              style={styles.recenterBtn}
              onPress={async () => {
                try {
                  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                  mapRef.current?.animateToRegion({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    latitudeDelta: 0.008,
                    longitudeDelta: 0.008,
                  }, 500);
                } catch { /* ignore */ }
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="locate" size={18} color="#0b9e54" />
            </TouchableOpacity>
          </View>

          {/* ── FORM CARD ── */}
          <View style={styles.formCard}>
            {/* Fetched address row */}
            <View style={styles.addressRow}>
              <View style={styles.addressIconWrap}>
                <Ionicons name="location" size={18} color="#F97316" />
              </View>
              <View style={{ flex: 1 }}>
                {isGeocoding || isLoadingLocation ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <ActivityIndicator size="small" color="#0b9e54" />
                    <Text style={styles.addressLoadingText}>Fetching location…</Text>
                  </View>
                ) : (
                  <Text style={styles.addressText} numberOfLines={2}>
                    {fetchedAddress || "Pan the map to select location"}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.formDivider} />

            {/* Save As */}
            <Text style={styles.fieldLabel}>Save Address as *</Text>
            <TextInput
              style={styles.textInput}
              value={saveAs}
              onChangeText={setSaveAs}
              placeholder="Eg: Home / Work"
              placeholderTextColor="#BBC0CA"
              returnKeyType="done"
            />

            {/* Address Type */}
            <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Address Type</Text>
            <TouchableOpacity
              style={[
                styles.dropdownTrigger,
                showTypePicker && styles.dropdownTriggerOpen,
              ]}
              onPress={() => toggleDropdown(!showTypePicker)}
              activeOpacity={0.85}
            >
              <Ionicons
                name={selectedCfg.icon}
                size={16}
                color={selectedCfg.color}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.dropdownTriggerText}>{selectedCfg.label}</Text>
              <Animated.View
                style={{
                  transform: [{
                    rotate: dropdownAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "180deg"],
                    }),
                  }],
                }}
              >
                <Ionicons name="chevron-down" size={18} color="#6B7280" />
              </Animated.View>
            </TouchableOpacity>

            {showTypePicker && (
              <View style={styles.dropdown}>
                {TYPE_OPTIONS.map((opt, i) => {
                  const blocked = isTypeBlocked(opt.value);
                  const isActive = selectedType === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.dropdownItem,
                        i < TYPE_OPTIONS.length - 1 && styles.dropdownItemBorder,
                        isActive && styles.dropdownItemActive,
                        blocked && styles.dropdownItemBlocked,
                      ]}
                      onPress={() => {
                        if (blocked) return;
                        setSelectedType(opt.value);
                        toggleDropdown(false);
                      }}
                      activeOpacity={blocked ? 1 : 0.7}
                    >
                      <Ionicons name={opt.icon} size={16} color={blocked ? "#C0C5CF" : opt.color} />
                      <Text
                        style={[
                          styles.dropdownItemText,
                          isActive && styles.dropdownItemTextActive,
                          blocked && styles.dropdownItemTextBlocked,
                        ]}
                      >
                        {opt.label}
                        {blocked ? "  (already saved)" : ""}
                      </Text>
                      {isActive && !blocked && (
                        <Ionicons name="checkmark-circle" size={18} color="#0b9e54" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── SAVE BUTTON ── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          activeOpacity={0.88}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>
            {saving ? "Saving…" : isEditing ? "Update Address" : "Save"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const MAP_HEIGHT = 230;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F4F6F9",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.2,
  },

  // Map
  mapContainer: {
    height: MAP_HEIGHT,
    backgroundColor: "#D1D5DB",
  },
  markerWrap: {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: [{ translateX: -24 }, { translateY: -56 }],
    alignItems: "center",
  },
  markerImg: { width: 48, height: 56 },
  markerShadow: {
    width: 12,
    height: 5,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.18)",
    marginTop: -2,
  },
  hintBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(20,20,20,0.72)",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  hintText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  recenterBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  // Form Card
  formCard: {
    margin: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },

  // Address row
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  addressIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF1E8",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  addressText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 20,
  },
  addressLoadingText: {
    fontSize: 13,
    color: "#9CA3AF",
    fontStyle: "italic",
  },

  formDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 18,
  },

  // Fields
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#FAFAFA",
    fontWeight: "500",
  },

  // Dropdown
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: "#FAFAFA",
  },
  dropdownTriggerOpen: {
    borderColor: "#22B36A",
    backgroundColor: "#F0FDF6",
  },
  dropdownTriggerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
  },
  dropdown: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  dropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownItemActive: {
    backgroundColor: "#F0FDF6",
  },
  dropdownItemBlocked: {
    opacity: 0.45,
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  dropdownItemTextActive: {
    fontWeight: "700",
    color: "#0b9e54",
  },
  dropdownItemTextBlocked: {
    color: "#9CA3AF",
    fontStyle: "italic",
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  saveBtn: {
    backgroundColor: "#111827",
    borderRadius: 34,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
});
