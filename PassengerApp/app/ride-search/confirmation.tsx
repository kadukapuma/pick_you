import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useRideSearch } from "../context/RideSearchContext";

export default function ConfirmationScreen() {
  const { tripType, outboundTrip, returnTrip } = useRideSearch();

  if (
    !outboundTrip.pickup ||
    !outboundTrip.dropoff ||
    !outboundTrip.selectedRide
  ) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Booking data missing</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleConfirmBooking = () => {
    // This will later connect to your backend
    console.log("Booking confirmed:", {
      tripType,
      outbound: outboundTrip,
      return: tripType === "return" ? returnTrip : null,
    });
    router.push("/");
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Confirm Booking</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Outbound Trip */}
        <View style={styles.tripSection}>
          <View style={styles.tripHeader}>
            <Ionicons name="arrow-forward" size={20} color="#0B7BDC" />
            <Text style={styles.tripTitle}>Outbound Trip</Text>
          </View>

          {/* Pickup */}
          <View style={styles.locationBox}>
            <View style={styles.locationDot}>
              <View style={[styles.dot, styles.dotPickup]} />
            </View>
            <View style={styles.locationContent}>
              <Text style={styles.locationLabel}>Pickup</Text>
              <Text style={styles.locationAddress}>
                {outboundTrip.pickup.address}
              </Text>
              <Text style={styles.locationDetails}>
                {outboundTrip.pickup.details}
              </Text>
            </View>
          </View>

          {/* Line */}
          <View style={styles.line} />

          {/* Dropoff */}
          <View style={styles.locationBox}>
            <View style={styles.locationDot}>
              <View style={[styles.dot, styles.dotDropoff]} />
            </View>
            <View style={styles.locationContent}>
              <Text style={styles.locationLabel}>Drop-off</Text>
              <Text style={styles.locationAddress}>
                {outboundTrip.dropoff.address}
              </Text>
              <Text style={styles.locationDetails}>
                {outboundTrip.dropoff.details}
              </Text>
            </View>
          </View>

          {/* Ride Selection */}
          <View style={styles.rideBox}>
            <Ionicons
              name={outboundTrip.selectedRide.icon as any}
              size={24}
              color="#0B7BDC"
            />
            <View style={styles.rideContent}>
              <Text style={styles.rideName}>
                {outboundTrip.selectedRide.name}
              </Text>
              <Text style={styles.rideDetails}>
                {outboundTrip.selectedRide.eta}
              </Text>
            </View>
            <Text style={styles.ridePrice}>
              LKR {outboundTrip.selectedRide.price.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Return Trip (if applicable) */}
        {tripType === "return" &&
          returnTrip.pickup &&
          returnTrip.dropoff &&
          returnTrip.selectedRide && (
            <View style={styles.tripSection}>
              <View style={styles.tripHeader}>
                <Ionicons name="arrow-back" size={20} color="#10B981" />
                <Text style={styles.tripTitle}>Return Trip</Text>
              </View>

              {/* Pickup */}
              <View style={styles.locationBox}>
                <View style={styles.locationDot}>
                  <View style={[styles.dot, styles.dotPickup]} />
                </View>
                <View style={styles.locationContent}>
                  <Text style={styles.locationLabel}>Pickup</Text>
                  <Text style={styles.locationAddress}>
                    {returnTrip.pickup.address}
                  </Text>
                  <Text style={styles.locationDetails}>
                    {returnTrip.pickup.details}
                  </Text>
                </View>
              </View>

              {/* Line */}
              <View style={styles.line} />

              {/* Dropoff */}
              <View style={styles.locationBox}>
                <View style={styles.locationDot}>
                  <View style={[styles.dot, styles.dotDropoff]} />
                </View>
                <View style={styles.locationContent}>
                  <Text style={styles.locationLabel}>Drop-off</Text>
                  <Text style={styles.locationAddress}>
                    {returnTrip.dropoff.address}
                  </Text>
                  <Text style={styles.locationDetails}>
                    {returnTrip.dropoff.details}
                  </Text>
                </View>
              </View>

              {/* Ride Selection */}
              <View style={styles.rideBox}>
                <Ionicons
                  name={returnTrip.selectedRide.icon as any}
                  size={24}
                  color="#10B981"
                />
                <View style={styles.rideContent}>
                  <Text style={styles.rideName}>
                    {returnTrip.selectedRide.name}
                  </Text>
                  <Text style={styles.rideDetails}>
                    {returnTrip.selectedRide.eta}
                  </Text>
                </View>
                <Text style={styles.ridePrice}>
                  LKR {returnTrip.selectedRide.price.toFixed(2)}
                </Text>
              </View>
            </View>
          )}

        {/* Price Summary */}
        <View style={styles.priceSummary}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Outbound Trip</Text>
            <Text style={styles.priceValue}>
              LKR {outboundTrip.selectedRide.price.toFixed(2)}
            </Text>
          </View>
          {tripType === "return" && returnTrip.selectedRide && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Return Trip</Text>
              <Text style={styles.priceValue}>
                LKR {returnTrip.selectedRide.price.toFixed(2)}
              </Text>
            </View>
          )}
          <View style={styles.priceDivider} />
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              LKR{" "}
              {(
                outboundTrip.selectedRide.price +
                (returnTrip.selectedRide?.price || 0)
              ).toFixed(2)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Confirm Button */}
      <TouchableOpacity
        style={styles.confirmButton}
        onPress={handleConfirmBooking}
      >
        <Text style={styles.confirmButtonText}>Confirm & Pay</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4FBFF",
  },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4FBFF",
  },

  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: "#EF4444",
    fontWeight: "500",
  },

  backButton: {
    marginTop: 20,
    backgroundColor: "#0B7BDC",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },

  backButtonText: {
    color: "#fff",
    fontWeight: "600",
  },

  header: {
    marginTop: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 20,
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
    marginBottom: 100,
  },

  tripSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
  },

  tripHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  tripTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  locationBox: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },

  locationDot: {
    width: 24,
    justifyContent: "flex-start",
    paddingTop: 4,
  },

  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  dotPickup: {
    backgroundColor: "#2563EB",
  },

  dotDropoff: {
    backgroundColor: "#F97316",
  },

  locationContent: {
    flex: 1,
  },

  locationLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 2,
  },

  locationAddress: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },

  locationDetails: {
    fontSize: 12,
    color: "#9CA3AF",
  },

  line: {
    width: 1,
    height: 20,
    backgroundColor: "#E5E7EB",
    marginLeft: 6,
    marginBottom: 16,
  },

  rideBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },

  rideContent: {
    flex: 1,
  },

  rideName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },

  rideDetails: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  ridePrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  priceSummary: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
  },

  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  priceLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },

  priceValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },

  priceDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },

  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  totalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0B7BDC",
  },

  confirmButton: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#FBBF24",
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
    elevation: 2,
  },

  confirmButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
});
