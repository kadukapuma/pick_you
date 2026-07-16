import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  SavedPlace,
  getPlaceConfig,
  useSavedPlaces,
} from "../../hooks/useSavedPlaces";

// ─── ADDRESS CARD ─────────────────────────────────────────────────────────────
function AddressCard({
  item,
  onEdit,
  onDelete,
}: {
  item: SavedPlace;
  onEdit: (item: SavedPlace) => void;
  onDelete: (id: string) => void;
}) {
  const cfg = getPlaceConfig(item.type);
  const isSingleton = item.type === "home" || item.type === "office";

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.cardIconBg, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
          </View>
          <View>
            <Text style={styles.cardLabel}>{item.label}</Text>
            {isSingleton && (
              <View style={styles.mainBadge}>
                <Text style={styles.mainBadgeText}>Main Address</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onEdit(item)}
            activeOpacity={0.7}
          >
            <Feather name="edit-2" size={14} color="#22B36A" />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => onDelete(item.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={14} color="#EF4444" />
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Address */}
      <Text style={styles.addressText}>{item.address}</Text>

      {/* Type badge */}
      <View style={styles.typeBadgeRow}>
        <Ionicons name="location-outline" size={12} color={cfg.color} />
        <Text style={[styles.typeBadgeText, { color: cfg.color }]}>
          {item.type === "home" ? "Home" : item.type === "office" ? "Office" : "Other Location"}
        </Text>
      </View>
    </View>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
export default function SaveAddressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { homePlace, officePlace, otherPlaces, loading, deletePlace } = useSavedPlaces();

  const handleEdit = (item: SavedPlace) => {
    router.push({
      pathname: "/saveaddress/addplace",
      params: {
        editId: item.id,
        editType: item.type,
        editLabel: item.label,
        editAddress: item.address,
        editLat: item.latitude ? String(item.latitude) : undefined,
        editLng: item.longitude ? String(item.longitude) : undefined,
      },
    } as any);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete Location",
      "Are you sure you want to remove this saved location?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deletePlace(id),
        },
      ]
    );
  };

  // Ordered: home first, then office, then others
  const orderedPlaces: SavedPlace[] = [
    ...(homePlace ? [homePlace] : []),
    ...(officePlace ? [officePlace] : []),
    ...otherPlaces,
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Saved Addresses</Text>

        <TouchableOpacity
          style={styles.addIconBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => router.push("/saveaddress/addplace" as any)}
        >
          <Ionicons name="add" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* LIST */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <Text style={styles.emptyText}>Loading...</Text>
        ) : orderedPlaces.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No saved locations yet</Text>
            <Text style={styles.emptySubText}>
              Tap "Add New Address" below to get started
            </Text>
          </View>
        ) : (
          orderedPlaces.map((item) => (
            <AddressCard
              key={item.id}
              item={item}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </ScrollView>

      {/* FOOTER ADD BUTTON */}
      <View style={[styles.footerContainer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.85}
          onPress={() => router.push("/saveaddress/addplace" as any)}
        >
          <Ionicons name="add-circle-outline" size={20} color="#22B36A" />
          <Text style={styles.addButtonText}>Add New Address</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4F6F9" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: "#F4F6F9",
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111827", letterSpacing: -0.2 },
  addIconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 6, gap: 12 },

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
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  cardIconBg: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  cardLabel: { fontSize: 16, fontWeight: "700", color: "#111827", letterSpacing: -0.2 },
  mainBadge: {
    borderWidth: 1.5,
    borderColor: "#22B36A",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  mainBadgeText: { fontSize: 10, color: "#22B36A", fontWeight: "600" },
  cardActions: { flexDirection: "row", gap: 8, marginTop: 2 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0FDF6",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editText: { fontSize: 12, color: "#22B36A", fontWeight: "600" },
  deleteBtn: { backgroundColor: "#FEF2F2" },
  deleteText: { fontSize: 12, color: "#EF4444", fontWeight: "600" },

  // Divider
  divider: { height: 1, backgroundColor: "#F1F5F9", marginBottom: 12 },

  // Address
  addressText: { fontSize: 13, color: "#6B7280", lineHeight: 19, marginBottom: 8 },
  typeBadgeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  typeBadgeText: { fontSize: 11, fontWeight: "600" },

  // Empty state
  emptyState: { alignItems: "center", paddingTop: 60, paddingBottom: 20 },
  emptyText: { fontSize: 15, color: "#9CA3AF", fontWeight: "500", marginTop: 12 },
  emptySubText: { fontSize: 13, color: "#D1D5DB", marginTop: 6, textAlign: "center" },

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
    flexDirection: "row",
    gap: 8,
    shadowColor: "#22B36A",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  addButtonText: { fontSize: 15, fontWeight: "700", color: "#22B36A", letterSpacing: -0.1 },
});
