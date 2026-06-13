import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";

// ─── Types ────────────────────────────────────────────────────────────────────
type Address = {
  id: string;
  label: string;
  isMain?: boolean;
  contactName: string;
  phone: string;
  fullAddress: string;
  pinpointed: boolean;
};

// ─── Mock Data ────────────────────────────────────────────────────────────────
const addresses: Address[] = [
  {
    id: "1",
    label: "Home",
    isMain: true,
    contactName: "Leans Bow",
    phone: "+61 817 0270 2004",
    fullAddress: "123 4th Nue, Jakarta, NY 20002, Indonesia",
    pinpointed: true,
  },
  {
    id: "2",
    label: "My Apartment",
    isMain: false,
    contactName: "Leans Bow",
    phone: "+61 817 0270 2004",
    fullAddress: "321 4th Nue, Jakarta, NY 80009, Indonesia",
    pinpointed: true,
  },
  {
    id: "3",
    label: "GF's Apartment",
    isMain: false,
    contactName: "Abriella Gatha",
    phone: "+61 817 0280 2005",
    fullAddress: "456 7th Nue, Jakarta, NY 20003, Indonesia",
    pinpointed: true,
  },
];

// ─── Address Card ─────────────────────────────────────────────────────────────
function AddressCard({ item }: { item: Address }) {
  return (
    <View style={styles.card}>
      {/* Card header row */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardLabel}>{item.label}</Text>
          {item.isMain && (
            <View style={styles.mainBadge}>
              <Text style={styles.mainBadgeText}>Main Address</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.editBtn} activeOpacity={0.7}>
          <Text style={styles.editText}>Edit</Text>
          <Feather name="edit-2" size={13} color="#22B36A" />
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Contact + phone */}
      <View style={styles.contactRow}>
        <Text style={styles.contactName}>{item.contactName}</Text>
        <View style={styles.phoneRow}>
          <MaterialCommunityIcons
            name="phone-outline"
            size={14}
            color="#6B7280"
          />
          <Text style={styles.phoneText}>{item.phone}</Text>
        </View>
      </View>

      {/* Address line */}
      <Text style={styles.addressText}>{item.fullAddress}</Text>

      {/* Pinpoint row */}
      {item.pinpointed && (
        <View style={styles.pinRow}>
          <Ionicons name="location-outline" size={13} color="#9CA3AF" />
          <Text style={styles.pinText}>Pinpoint already</Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SaveAddressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Saved Address</Text>

        <TouchableOpacity
          style={styles.addIconBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="add" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* ── SCROLL CONTENT ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {addresses.map((item) => (
          <AddressCard key={item.id} item={item} />
        ))}
      </ScrollView>

      {/* ── ADD NEW ADDRESS BUTTON (floating above bottom) ── */}
      <View
        style={[styles.footerContainer, { paddingBottom: insets.bottom + 16 }]}
      >
        <TouchableOpacity style={styles.addButton} activeOpacity={0.85}>
          <Text style={styles.addButtonText}>Add New Address</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F6F9",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: "#F4F6F9",
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.2,
  },
  addIconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    gap: 12,
  },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.2,
  },
  mainBadge: {
    borderWidth: 1.5,
    borderColor: "#22B36A",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  mainBadgeText: {
    fontSize: 11,
    color: "#22B36A",
    fontWeight: "600",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  editText: {
    fontSize: 13,
    color: "#22B36A",
    fontWeight: "600",
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginBottom: 12,
  },

  // Contact row
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  contactName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  phoneText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "400",
  },

  // Address
  addressText: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 19,
    marginBottom: 8,
  },

  // Pinpoint
  pinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pinText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "400",
  },

  // Footer button
  footerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#F4F6F9",
  },
  addButton: {
    backgroundColor: "#E8F8F1",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#22B36A",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#22B36A",
    letterSpacing: -0.1,
  },
});
