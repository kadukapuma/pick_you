import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { MotiView } from "moti";
import { MaterialCommunityIcons, Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Audio } from "expo-av";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const IncomingRideModal = ({ visible, onAccept, onReject, rideData }) => {
  const [countdown, setCountdown] = useState(15);
  const soundRef = useRef(null);

  // Sound Handler
  useEffect(() => {
    if (visible) {
      playSound();
      setCountdown(15); // Reset timer whenever modal becomes visible
    } else {
      stopSound();
    }

    return () => {
      stopSound();
    };
  }, [visible]);

  // Precise 15s Countdown & Automatic Job Rejection Loop
  useEffect(() => {
    if (!visible) return;

    if (countdown === 0) {
      onReject(); // Fire parent automatic denial update block
      return;
    }

    const intervalId = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [countdown, visible]);

  const playSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require("../assets/Ride-ringtone.mp3"),
        {
          shouldPlay: true,
          isLooping: true,
        }
      );
      soundRef.current = sound;
      await sound.playAsync();
    } catch (error) {
      console.log("Audio play error:", error);
    }
  };

  const stopSound = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (e) {
        console.log("Audio stop error:", e);
      }
      soundRef.current = null;
    }
  };

  return (
    <Modal transparent visible={visible} animationType="slide">
      <View style={styles.overlay}>
        <MotiView
          from={{ translateY: SCREEN_HEIGHT * 0.6 }}
          animate={{ translateY: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 110 }}
          style={styles.container}
        >
          {/* --- TOP GRADIENT HEADER SECTION --- */}
          <LinearGradient
            colors={["#0A2E2B", "#0F1E21"]} // Elegant dark-teal gradient pairing
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.darkHeaderSection}
          >
            {/* Top Notch Sheet Handle placed inside gradient wrapper */}
            <View style={styles.handle} />

            <View style={styles.headerMainRow}>
              <View>
                <Text style={styles.badgeText}>NEW RIDE REQUEST</Text>
                <Text style={styles.mainTitleText}>Incoming Ride</Text>
                <Text style={styles.subTitleText}>You have a new trip request</Text>
              </View>

              {/* Premium Countdown Ring UI Elements */}
              <View style={styles.timerCircleContainer}>
                <View style={styles.timerContent}>
                  <Text style={styles.timerNumber}>{countdown}</Text>
                  <Text style={styles.timerUnit}>SEC</Text>
                </View>
                {/* Outer static neon perimeter glow line wrapper */}
                <View style={styles.timerRingTrack} />
              </View>
            </View>

            <View style={styles.timerFooterBadge}>
              <Text style={styles.timerFooterText}>
                Auto reject in <Text style={{ fontWeight: "800" }}>{countdown} seconds</Text>
              </Text>
            </View>
          </LinearGradient>

          {/* --- BOTTOM BODY WRAPPER (LIGHT PANEL METRICS) --- */}
          <View style={styles.whiteBodySection}>
            
            {/* Route Timeline & Fare Panel split */}
            <View style={styles.upperMetricsRow}>
              {/* Connected Route Graphics */}
              <View style={styles.routeContainer}>
                <View style={styles.timelineVisualColumn}>
                  <View style={[styles.nodeCircle, { backgroundColor: "#00A859" }]} />
                  <View style={styles.dashedLinkLine} />
                  <View style={[styles.nodeCircle, { backgroundColor: "#EF4444", borderRadius: 2 }]} />
                </View>

                <View style={styles.addressLabelBlock}>
                  <View style={styles.addressItem}>
                    <Text style={styles.addressTag}>PICKUP</Text>
                    <Text style={styles.addressMainText} numberOfLines={1}>
                      {rideData?.pickup || "Kandy City Center"}
                    </Text>
                    <Text style={styles.addressSubText}>Kandy, Sri Lanka</Text>
                  </View>

                  <View style={[styles.addressItem, { marginBottom: 0 }]}>
                    <Text style={styles.addressTag}>DROPOFF</Text>
                    <Text style={styles.addressMainText} numberOfLines={1}>
                      {rideData?.drop || "Peradeniya Junction"}
                    </Text>
                    <Text style={styles.addressSubText}>Peradeniya, Sri Lanka</Text>
                  </View>
                </View>
              </View>

              {/* Vertical Separator */}
              <View style={styles.verticalDivider} />

              {/* Estimated Cash Value Split */}
              <View style={styles.fareContainer}>
                <Text style={styles.fareLabel}>EST. FARE</Text>
                <Text style={styles.farePriceText}>Rs. {rideData?.price || "850"}</Text>
                <View style={styles.cashBadge}>
                  <MaterialCommunityIcons name="cash" size={14} color="#00A859" />
                  <Text style={styles.cashBadgeText}>Cash</Text>
                </View>
              </View>
            </View>

            {/* Tri-Metric Row (Distance, Time, Profile) */}
            <View style={styles.triMetricsContainer}>
              <View style={styles.triMetricCell}>
                <Feather name="map-pin" size={16} color="#64748B" style={styles.metricIcon} />
                <View>
                  <Text style={styles.triLabel}>DISTANCE</Text>
                  <Text style={styles.triValue}>{rideData?.distance || "4.8 km"}</Text>
                </View>
              </View>

              <View style={styles.triMetricCell}>
                <Feather name="clock" size={16} color="#64748B" style={styles.metricIcon} />
                <View>
                  <Text style={styles.triLabel}>EST. TIME</Text>
                  <Text style={styles.triValue}>18 min</Text>
                </View>
              </View>

              {/* UPDATED LABEL FROM RIDER TO CUSTOMER */}
              <View style={[styles.triMetricCell, { borderRightWidth: 0 }]}>
                <Feather name="user" size={16} color="#64748B" style={styles.metricIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.triLabel}>CUSTOMER</Text> 
                  <Text style={styles.triValue} numberOfLines={1}>
                    {rideData?.customerName || "John David"}
                  </Text>
                  <View style={styles.ratingSubRow}>
                    <Ionicons name="star" size={10} color="#F59E0B" />
                    <Text style={styles.ratingText}>4.9</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonActionRow}>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={onReject}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle-outline" size={20} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={styles.rejectBtnText}>Reject</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.acceptButton}
                onPress={onAccept}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.acceptBtnText}>Accept Ride</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom Dynamic Alert Disclaimer */}
            <View style={styles.warningDisclaimerBox}>
              <Feather name="alert-circle" size={14} color="#EF4444" style={{ marginRight: 6 }} />
              <Text style={styles.warningDisclaimerText}>
                If no action is taken, this request will be{" "}
                <Text style={{ fontWeight: "700" }}>automatically rejected.</Text>
              </Text>
            </View>

          </View>
        </MotiView>
      </View>
    </Modal>
  );
};

export default IncomingRideModal;

/* ================= COMPONENT INTERFACE STYLES ================= */

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#0F1E21", 
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "center",
    top: 12,
    position: "absolute",
  },
  darkHeaderSection: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
  },
  headerMainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#00A859",
    letterSpacing: 1,
    marginBottom: 4,
  },
  mainTitleText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  subTitleText: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 2,
  },
  timerCircleContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  timerRingTrack: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 32,
    borderWidth: 3,
    borderColor: "#00A859",
    opacity: 0.85,
  },
  timerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  timerNumber: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 22,
  },
  timerUnit: {
    fontSize: 8,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  timerFooterBadge: {
    alignSelf: "flex-end",
    marginTop: 12,
    backgroundColor: "rgba(0, 168, 89, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timerFooterText: {
    fontSize: 10,
    color: "#00A859",
    letterSpacing: 0.2,
  },
  whiteBodySection: {
    backgroundColor: "#FFFFFF", 
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: SCREEN_HEIGHT < 700 ? 16 : 30,
    marginTop: -12, // Pulls body nicely up slightly into the gradient flow
  },
  upperMetricsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  routeContainer: {
    flex: 1.4,
    flexDirection: "row",
  },
  timelineVisualColumn: {
    width: 16,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    marginRight: 10,
  },
  nodeCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dashedLinkLine: {
    flex: 1,
    width: 1.5,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    marginVertical: 4,
  },
  addressLabelBlock: {
    flex: 1,
  },
  addressItem: {
    marginBottom: 16,
  },
  addressTag: {
    fontSize: 9,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  addressMainText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 1,
  },
  addressSubText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 0.5,
  },
  verticalDivider: {
    width: 1,
    height: 70,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 12,
  },
  fareContainer: {
    flex: 0.8,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  fareLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  farePriceText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#00A859",
    marginVertical: 2,
  },
  cashBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cashBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#00A859",
    marginLeft: 4,
  },
  triMetricsContainer: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  triMetricCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderColor: "#E2E8F0",
  },
  metricIcon: {
    marginRight: 6,
  },
  triLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.3,
  },
  triValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 1,
  },
  ratingSubRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 1,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    marginLeft: 2,
  },
  buttonActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  rejectButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  rejectBtnText: {
    color: "#EF4444",
    fontWeight: "800",
    fontSize: 15,
  },
  acceptButton: {
    flex: 1.4,
    flexDirection: "row",
    backgroundColor: "#00A859",
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00A859",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  acceptBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  warningDisclaimerBox: {
    flexDirection: "row",
    backgroundColor: "#FFF5F5",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  warningDisclaimerText: {
    fontSize: 11,
    color: "#EF4444",
    textAlign: "center",
  },
});