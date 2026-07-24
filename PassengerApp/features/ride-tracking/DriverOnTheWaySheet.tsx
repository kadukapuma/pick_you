import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getVehicleMapIcon } from "../../utils/vehicleMapIcons";
import { getDriverProfilePicture } from "../ride-support/rideUtils";

const GREEN = "#0B9E54";
const DARK_GREEN = "#063D31";
const SCREEN_H = Dimensions.get("window").height;
const COLLAPSED_H = 300;
const EXPANDED_H = SCREEN_H * 0.9;
const TIP_AMOUNTS = [0, 50, 100, 150, 200];

type DriverOnTheWaySheetProps = {
  rideData: any;
  statusLabel: string;
  eta: string;
  driverName: string;
  driverRating: string;
  plateNumber: string;
  vehicleDesc: string;
  vehicleType?: string | null;
  pickupAddress: string;
  dropoffAddress: string;
  paymentMethod?: string;
  promoCode?: string | null;
  fareAmount?: number | string | null;
  distanceText?: string | null;
  durationText?: string | null;
  bottomInset?: number;
  rideStatus?: string;
  trackingConnected?: boolean;
  trackingStale?: boolean;
  mapFocused?: boolean;
  onViewMap?: () => void;
  onShowDetails: () => void;
  onCancelTrip: () => void;
};

const formatPayment = (value?: string) => {
  if (!value) return "Cash";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const formatFare = (value: DriverOnTheWaySheetProps["fareAmount"]) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "Calculating";
  return `LKR ${number.toFixed(2)}`;
};

export default function DriverOnTheWaySheet({
  rideData,
  statusLabel,
  eta,
  driverName,
  driverRating,
  plateNumber,
  vehicleDesc,
  vehicleType,
  pickupAddress,
  dropoffAddress,
  paymentMethod = "cash",
  promoCode,
  fareAmount,
  distanceText,
  durationText,
  bottomInset = 0,
  rideStatus,
  trackingConnected = false,
  trackingStale = false,
  mapFocused = false,
  onViewMap,
  onShowDetails,
  onCancelTrip,
}: DriverOnTheWaySheetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTip, setSelectedTip] = useState(0);
  const sheetHeight = useRef(new Animated.Value(COLLAPSED_H)).current;
  const translateY = useRef(new Animated.Value(COLLAPSED_H + 40)).current;
  const sheetGestureStart = useRef(COLLAPSED_H);

  const fareText = useMemo(() => formatFare(fareAmount), [fareAmount]);
  const paymentText = useMemo(() => formatPayment(paymentMethod), [paymentMethod]);
  const normalizedStatus = String(rideStatus || "ACCEPTED").toUpperCase();
  const isOnTrip = normalizedStatus === "STARTED";
  const isArrived = normalizedStatus === "ARRIVED";
  const secondaryStatusText = isArrived ? "" : eta;
  const vehiclePreviewIcon = useMemo(() => getVehicleMapIcon(vehicleType || vehicleDesc), [vehicleDesc, vehicleType]);
  const driverProfilePicture = useMemo(() => getDriverProfilePicture(rideData), [rideData]);

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [translateY]);

  const expandSheet = useCallback(() => {
    setIsExpanded(true);
    Animated.spring(sheetHeight, {
      toValue: EXPANDED_H,
      damping: 22,
      stiffness: 160,
      useNativeDriver: false,
    }).start();
  }, [sheetHeight]);

  const collapseSheet = useCallback(() => {
    Animated.spring(sheetHeight, {
      toValue: COLLAPSED_H,
      damping: 22,
      stiffness: 160,
      useNativeDriver: false,
    }).start(() => setIsExpanded(false));
  }, [sheetHeight]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
      onPanResponderGrant: () => {
        sheetHeight.stopAnimation((value) => {
          sheetGestureStart.current = value;
        });
      },
      onPanResponderMove: (_, gesture) => {
        const nextHeight = sheetGestureStart.current - gesture.dy;
        sheetHeight.setValue(
          Math.max(COLLAPSED_H, Math.min(EXPANDED_H, nextHeight)),
        );
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -42) expandSheet();
        else if (gesture.dy > 42) collapseSheet();
        else if (sheetGestureStart.current > (COLLAPSED_H + EXPANDED_H) / 2) expandSheet();
        else collapseSheet();
      },
      onPanResponderTerminate: collapseSheet,
    }),
  ).current;

  const openContact = () => {
    router.push({
      pathname: "/ride-tracking/contact-driver",
      params: { rideData: JSON.stringify(rideData) },
    });
  };

  const openDriverProfile = () => {
    router.push({
      pathname: "/ride-tracking/driver-profile",
      params: { rideData: JSON.stringify(rideData) },
    });
  };

  useEffect(() => {
    if (mapFocused) collapseSheet();
  }, [collapseSheet, mapFocused]);

  if (mapFocused) {
    return (
      <View style={[styles.mapFocusBar, { paddingBottom: bottomInset + 10 }]}>
        <View style={styles.mapFocusHandle} />
        <TouchableOpacity activeOpacity={0.88} onPress={onShowDetails} style={styles.mapFocusContent}>
          <View style={styles.mapFocusIcon}>
            <Ionicons name="car-sport" size={21} color={GREEN} />
          </View>
          <View style={styles.mapFocusTextWrap}>
            <Text style={styles.mapFocusTitle}>{statusLabel}</Text>
            {secondaryStatusText ? (
              <Text style={styles.mapFocusSubtitle}>{secondaryStatusText}</Text>
            ) : null}
          </View>
          <View style={styles.mapFocusAction}>
            <Ionicons name="chevron-up" size={18} color={GREEN} />
            <Text style={styles.mapFocusActionText}>Trip details</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          height: sheetHeight,
          paddingBottom: bottomInset + 10,
          transform: [{ translateY }],
        },
      ]}
    >
      <View {...panResponder.panHandlers} style={styles.handleArea}>
        <View style={styles.handle} />
      </View>

      <View {...panResponder.panHandlers} style={styles.collapsedContent}>
        <TouchableOpacity activeOpacity={0.88} onPress={expandSheet} style={styles.statusHeader}>
          <Text style={styles.statusLabel} numberOfLines={1}>
            {statusLabel}
          </Text>
          {secondaryStatusText ? (
            <Text style={styles.etaText} numberOfLines={1}>
              {secondaryStatusText}
            </Text>
          ) : null}
          <View style={styles.swipeHint}>
            <Ionicons name="chevron-up" size={14} color={GREEN} />
            <Text style={styles.swipeHintText}>Swipe up for trip details</Text>
          </View>
        </TouchableOpacity>

        <View {...panResponder.panHandlers} style={styles.driverCard}>
          <TouchableOpacity activeOpacity={0.86} onPress={openDriverProfile} style={styles.driverVisualBlock}>
            <View style={styles.avatarCircle}>
              {driverProfilePicture ? (
                <Image source={{ uri: driverProfilePicture }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={42} color="#A3ADB8" />
              )}
            </View>
            <View style={styles.ratingPill}>
              <Text style={styles.ratingText}>{driverRating}</Text>
              <Ionicons name="star" size={13} color="#27B06E" />
            </View>
          </TouchableOpacity>

          <View style={styles.vehiclePreview}>
            <Image source={vehiclePreviewIcon} style={styles.vehiclePreviewImage} resizeMode="contain" />
          </View>

          <View style={styles.vehicleInfo}>
            <Text style={styles.plateText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {plateNumber || "Vehicle"}
            </Text>
            <Text style={styles.vehicleDesc} numberOfLines={1}>
              {vehicleDesc}
            </Text>
            <Text style={styles.driverName} numberOfLines={1}>
              {driverName}
            </Text>
          </View>

          <View style={styles.contactColumn}>
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.82} onPress={openContact}>
              <Ionicons name="chatbubble-outline" size={20} color={GREEN} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.82} onPress={openContact}>
              <Ionicons name="call-outline" size={20} color={GREEN} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {isExpanded ? (
        <ScrollView
          style={styles.expandedScroll}
          contentContainerStyle={styles.expandedContent}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(event) => {
            if (event.nativeEvent.contentOffset.y < -18) collapseSheet();
          }}
        >
          <View style={styles.expandedStatusCard}>
            <View style={styles.statusPillsRow}>
              <StatusPill active label="Accepted" />
              <StatusPill active={isArrived || isOnTrip} label="Arrived" />
              <StatusPill active={isOnTrip} label="Started" />
            </View>
            <Text style={[styles.liveSyncText, trackingStale && styles.liveSyncTextStale]} numberOfLines={1}>
              {trackingStale ? "Driver location reconnecting" : trackingConnected ? "Live driver sync active" : "Using backup driver updates"}
            </Text>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.locationRow}>
              <View style={styles.routeRail}>
                <View style={styles.pickupDot} />
                <View style={styles.dashedLine} />
                <View style={styles.dropDot} />
              </View>
              <View style={styles.locationContent}>
                <TripLocation label="Pickup" value={pickupAddress} />
                <TripLocation label="Drop-off" value={dropoffAddress} muted />
              </View>
              <View style={styles.locationChevronColumn}>
                <Ionicons name="chevron-forward" size={22} color="#8A9A94" />
                <Ionicons name="chevron-forward" size={22} color="#8A9A94" />
              </View>
            </View>

            <Divider />

            <OptionRow
              icon="wallet-outline"
              title={paymentText}
              action="Change"
              onPress={() => router.push("/ride-booking/payment-method")}
            />
            <Divider />
            <OptionRow
              icon="ticket-outline"
              title={promoCode ? promoCode : "Promo Code"}
              action={promoCode ? "Applied" : "Add"}
              onPress={() => router.push("/ride-booking/promos")}
            />
          </View>

          <View style={styles.fareCard}>
            <View style={styles.fareHeader}>
              <View style={styles.fareIconCircle}>
                <Ionicons name="receipt-outline" size={24} color={GREEN} />
              </View>
              <Text style={styles.fareTitle}>Fare Estimation</Text>
            </View>

            <FareRow label="Total trip fare" value={fareText} />
            <FareRow label="Distance" value={distanceText || "Calculating"} />
            <FareRow label="Duration" value={durationText || "Calculating"} />

            <View style={styles.fareNoteRow}>
              <Ionicons name="information-circle-outline" size={18} color={GREEN} />
              <Text style={styles.fareNoteText}>
                Final trip fare will be calculated based on actual distance, duration and applicable charges.
              </Text>
            </View>
          </View>

          <View style={styles.slimInfoRow}>
            <View style={styles.slimInfoLeft}>
              <Ionicons name="people-outline" size={22} color={GREEN} />
              <Text style={styles.slimInfoText}>1 Passenger</Text>
            </View>
            <Text style={styles.languageText}>Sinhala / English / Tamil</Text>
          </View>

          <View style={styles.tipSection}>
            <Text style={styles.tipTitle}>Add a tip</Text>
            <Text style={styles.tipSub}>100% of your tip goes to the driver</Text>
            <View style={styles.tipRow}>
              {TIP_AMOUNTS.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  activeOpacity={0.82}
                  onPress={() => setSelectedTip(amount)}
                  style={[styles.tipChip, selectedTip === amount && styles.tipChipActive]}
                >
                  <Text style={[styles.tipChipText, selectedTip === amount && styles.tipChipTextActive]}>
                    {amount === 0 ? "No tip" : `LKR ${amount}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.bottomActions}>
            {onViewMap ? (
              <TouchableOpacity style={styles.mapButton} activeOpacity={0.88} onPress={onViewMap}>
                <Ionicons name="map-outline" size={18} color="#FFFFFF" />
                <Text style={styles.mapButtonText}>View on Map</Text>
              </TouchableOpacity>
            ) : null}
            {!isOnTrip ? (
              <TouchableOpacity style={styles.cancelButton} activeOpacity={0.82} onPress={onCancelTrip}>
                <Text style={styles.cancelButtonText}>Cancel Trip</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </ScrollView>
      ) : null}
    </Animated.View>
  );
}

function TripLocation({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={styles.tripLocationBlock}>
      <Text style={[styles.tripLabel, muted && styles.tripLabelMuted]}>{label}</Text>
      <Text style={styles.tripAddress} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function OptionRow({ icon, title, action, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; action: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.optionRow} activeOpacity={0.82} onPress={onPress}>
      <View style={styles.optionLeft}>
        <Ionicons name={icon} size={24} color={GREEN} />
        <Text style={styles.optionTitle}>{title}</Text>
      </View>
      <Text style={styles.optionAction}>{action}</Text>
    </TouchableOpacity>
  );
}

function StatusPill({ label, active }: { label: string; active: boolean }) {
  return (
    <View style={[styles.statusPill, active && styles.statusPillActive]}>
      <Text style={[styles.statusPillText, active && styles.statusPillTextActive]}>{label}</Text>
    </View>
  );
}

function FareRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fareRow}>
      <Text style={styles.fareLabel}>{label}</Text>
      <Text style={styles.fareValue}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  mapFocusBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#FBFEFD", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 9, elevation: 24, shadowColor: "#000",
    shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: -6 },
  },
  mapFocusHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: "#D7E2DE",
    alignSelf: "center", marginBottom: 8,
  },
  mapFocusContent: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 11 },
  mapFocusIcon: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: "#EAF8F1",
    alignItems: "center", justifyContent: "center",
  },
  mapFocusTextWrap: { flex: 1 },
  mapFocusTitle: { color: DARK_GREEN, fontSize: 15, fontWeight: "900" },
  mapFocusSubtitle: { color: "#64748B", fontSize: 12, fontWeight: "700", marginTop: 2 },
  mapFocusAction: { flexDirection: "row", alignItems: "center", gap: 4 },
  mapFocusActionText: { color: GREEN, fontSize: 12, fontWeight: "900" },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FBFEFD",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    elevation: 24,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: -8 },
    overflow: "hidden",
  },
  handleArea: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 5,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 3,
    backgroundColor: "#D7E2DE",
  },
  collapsedContent: {
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  statusHeader: {
    alignItems: "center",
    paddingBottom: 12,
  },
  statusLabel: {
    color: GREEN,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0,
    textAlign: "center",
  },
  etaText: {
    color: "#13885E",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 3,
    textAlign: "center",
  },
  swipeHint: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  swipeHintText: {
    color: "#789089",
    fontSize: 11,
    fontWeight: "700",
  },
  statusPillsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 7,
  },
  statusPill: {
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2F0",
  },
  statusPillActive: {
    backgroundColor: "#E5F8EF",
    borderWidth: 1,
    borderColor: "rgba(11,158,84,0.22)",
  },
  statusPillText: {
    color: "#8A9A94",
    fontSize: 10,
    fontWeight: "900",
  },
  statusPillTextActive: {
    color: GREEN,
  },
  liveSyncText: {
    color: "#5F756D",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 7,
    textAlign: "center",
  },
  liveSyncTextStale: {
    color: "#B45309",
  },
  driverCard: {
    minHeight: 136,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(153,177,169,0.28)",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0B3D2E",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  driverVisualBlock: {
    width: 74,
    alignItems: "center",
  },
  avatarCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECF7F2",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  ratingPill: {
    minWidth: 58,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2EBE7",
    marginTop: -10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  ratingText: {
    color: "#101827",
    fontSize: 13,
    fontWeight: "800",
  },
  vehiclePreview: {
    width: 72,
    height: 62,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0FAF6",
    marginLeft: 4,
    overflow: "hidden",
  },
  vehiclePreviewImage: {
    width: 58,
    height: 44,
  },
  vehicleInfo: {
    flex: 1,
    paddingLeft: 12,
    minWidth: 0,
  },
  plateText: {
    color: "#111827",
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  vehicleDesc: {
    color: "#7C8580",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  driverName: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 14,
  },
  contactColumn: {
    gap: 10,
    marginLeft: 10,
  },
  actionButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F7F5",
  },
  expandedScroll: {
    flex: 1,
  },
  expandedContent: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 32,
  },
  expandedStatusCard: {
    borderRadius: 18,
    backgroundColor: "#F1FAF6",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  sectionCard: {
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(153,177,169,0.22)",
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#0B3D2E",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  locationRow: {
    flexDirection: "row",
    padding: 18,
    paddingBottom: 16,
  },
  routeRail: {
    width: 28,
    alignItems: "center",
    paddingTop: 5,
  },
  pickupDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: GREEN,
  },
  dashedLine: {
    width: 1.5,
    height: 45,
    marginVertical: 6,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#B8C2BD",
  },
  dropDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#9CA3AF",
    backgroundColor: "#FFFFFF",
  },
  locationContent: {
    flex: 1,
    gap: 18,
  },
  tripLocationBlock: {
    minHeight: 52,
  },
  tripLabel: {
    color: GREEN,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 5,
  },
  tripLabelMuted: {
    color: "#8A8F8C",
  },
  tripAddress: {
    color: "#171A1F",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  locationChevronColumn: {
    width: 24,
    justifyContent: "space-around",
    alignItems: "flex-end",
  },
  divider: {
    height: 1,
    backgroundColor: "#EEF2F0",
  },
  optionRow: {
    minHeight: 64,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  optionTitle: {
    color: "#1F2428",
    fontSize: 16,
    fontWeight: "800",
  },
  optionAction: {
    color: GREEN,
    fontSize: 15,
    fontWeight: "800",
  },
  fareCard: {
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(153,177,169,0.22)",
    padding: 18,
    marginBottom: 14,
    shadowColor: "#0B3D2E",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  fareHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
  },
  fareIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EAF8F1",
    alignItems: "center",
    justifyContent: "center",
  },
  fareTitle: {
    color: "#111827",
    fontSize: 19,
    fontWeight: "900",
  },
  fareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    marginBottom: 10,
  },
  fareLabel: {
    flex: 1,
    color: "#2C3135",
    fontSize: 14,
    fontWeight: "700",
  },
  fareValue: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "right",
  },
  fareNoteRow: {
    flexDirection: "row",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEF2F0",
    paddingTop: 12,
    marginTop: 2,
  },
  fareNoteText: {
    flex: 1,
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  slimInfoRow: {
    minHeight: 58,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(153,177,169,0.18)",
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  slimInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  slimInfoText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "800",
  },
  languageText: {
    flex: 1,
    color: "#111827",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
  },
  tipSection: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(153,177,169,0.18)",
    padding: 16,
    marginBottom: 14,
  },
  tipTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
  },
  tipSub: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
    marginBottom: 12,
  },
  tipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tipChip: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DAE4DF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  tipChipActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  tipChipText: {
    color: "#43514B",
    fontSize: 12,
    fontWeight: "800",
  },
  tipChipTextActive: {
    color: "#FFFFFF",
  },
  bottomActions: {
    gap: 10,
  },
  mapButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  mapButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  cancelButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F8FBFA",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5EDE9",
  },
  cancelButtonText: {
    color: "#DC2626",
    fontSize: 15,
    fontWeight: "800",
  },
});




