import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import DelayedLoader from "../../components/ui/DelayedLoader";
import ScreenTransition from "../../components/ui/ScreenTransition";
import ThemeButton from "../../components/ui/ThemeButton";
import {
  SavedPlace,
  getPlaceConfig,
  useSavedPlaces,
} from "../../hooks/useSavedPlaces";

const BG = "#F2FBF8";
const DARK = "#18231F";
const DEEP = "#063D31";
const GREEN = "#0B8F62";
const MUTED = "#697872";
const LINE = "rgba(153,177,169,0.38)";

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
  const typeLabel = item.type === "home" ? "Home" : item.type === "office" ? "Office" : "Saved place";

  return (
    <View style={styles.card}>
      <View style={styles.cardMainRow}>
        <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}> 
          <Ionicons name={cfg.icon as any} size={21} color={cfg.color} />
        </View>
        <View style={styles.cardCopy}>
          <View style={styles.titleRow}>
            <Text style={styles.cardLabel} numberOfLines={1}>{item.label}</Text>
            {isSingleton ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Main</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.addressText} numberOfLines={2}>{item.address}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color={cfg.color} />
            <Text style={[styles.metaText, { color: cfg.color }]}>{typeLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionButton} onPress={() => onEdit(item)} activeOpacity={0.82}>
          <Feather name="edit-2" size={15} color={DEEP} />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.deleteAction]} onPress={() => onDelete(item.id)} activeOpacity={0.82}>
          <Ionicons name="trash-outline" size={16} color="#DC2626" />
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function SaveAddressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { homePlace, officePlace, otherPlaces, loading, deletePlace } = useSavedPlaces();

  const handleEdit = (item: SavedPlace) => {
    router.push({
      pathname: "/saved-places/form",
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
    Alert.alert("Delete address", "Remove this saved address from your account?", [
      { text: "Keep", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deletePlace(id) },
    ]);
  };

  const orderedPlaces: SavedPlace[] = [
    ...(homePlace ? [homePlace] : []),
    ...(officePlace ? [officePlace] : []),
    ...otherPlaces,
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.84}>
          <Ionicons name="arrow-back" size={22} color={DEEP} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved addresses</Text>
        <TouchableOpacity style={styles.headerAddBtn} onPress={() => router.push("/saved-places/form" as any)} activeOpacity={0.84}>
          <Ionicons name="add" size={23} color={DEEP} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 118 }]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTransition>
          <View style={styles.heroRow}>
            <View style={styles.heroIcon}>
              <Ionicons name="map-outline" size={30} color={DEEP} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Your places</Text>
              <Text style={styles.heroSubtitle}>Keep pickup and drop-off places ready for faster ride booking.</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{homePlace ? "Saved" : "Add"}</Text>
              <Text style={styles.statLabel}>Home</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{officePlace ? "Saved" : "Add"}</Text>
              <Text style={styles.statLabel}>Work</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{otherPlaces.length}</Text>
              <Text style={styles.statLabel}>Other</Text>
            </View>
          </View>

          {loading ? (
            <DelayedLoader label="Loading saved addresses" delayMs={220} />
          ) : orderedPlaces.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="location-outline" size={30} color={DEEP} />
              </View>
              <Text style={styles.emptyTitle}>No saved addresses</Text>
              <Text style={styles.emptySubText}>Add home, work or frequent places for quicker booking.</Text>
            </View>
          ) : (
            <View style={styles.listStack}>
              {orderedPlaces.map((item) => (
                <AddressCard key={item.id} item={item} onEdit={handleEdit} onDelete={handleDelete} />
              ))}
            </View>
          )}
        </ScreenTransition>
      </ScrollView>

      <View style={[styles.footerContainer, { paddingBottom: insets.bottom + 14 }]}> 
        <ThemeButton
          label="Add new address"
          icon="add-circle-outline"
          onPress={() => router.push("/saved-places/form" as any)}
          variant="primary"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  header: { height: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.72)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(221,235,229,0.82)" },
  headerTitle: { color: DARK, fontSize: 18, fontWeight: "900" },
  headerAddBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.72)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(221,235,229,0.82)" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 12 },
  heroRow: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  heroIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: "#DDF7ED", alignItems: "center", justifyContent: "center", marginRight: 17 },
  heroCopy: { flex: 1, minWidth: 0 },
  heroTitle: { color: DARK, fontSize: 25, fontWeight: "900" },
  heroSubtitle: { color: MUTED, fontSize: 13, fontWeight: "600", lineHeight: 19, marginTop: 5 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 22 },
  statTile: { flex: 1, minHeight: 74, borderRadius: 18, backgroundColor: "transparent", borderWidth: 1.2, borderColor: LINE, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  statValue: { color: DARK, fontSize: 17, fontWeight: "900" },
  statLabel: { color: MUTED, fontSize: 12, fontWeight: "700", marginTop: 6 },
  listStack: { gap: 12 },
  card: { borderRadius: 22, borderWidth: 1.2, borderColor: LINE, backgroundColor: "transparent", padding: 15 },
  cardMainRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  cardCopy: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardLabel: { flex: 1, color: DARK, fontSize: 16, fontWeight: "900" },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "rgba(11,143,98,0.10)" },
  badgeText: { color: GREEN, fontSize: 10, fontWeight: "900" },
  addressText: { color: MUTED, fontSize: 13, fontWeight: "700", lineHeight: 19, marginTop: 5 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  metaText: { fontSize: 11, fontWeight: "900" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  actionButton: { flex: 1, height: 42, borderRadius: 21, borderWidth: 1, borderColor: LINE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  actionText: { color: DEEP, fontSize: 14, fontWeight: "900" },
  deleteAction: { borderColor: "rgba(220,38,38,0.20)" },
  deleteText: { color: "#DC2626", fontSize: 14, fontWeight: "900" },
  emptyState: { borderRadius: 24, borderWidth: 1.2, borderColor: LINE, alignItems: "center", paddingVertical: 34, paddingHorizontal: 20 },
  emptyIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: "#DDF7ED", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyTitle: { color: DARK, fontSize: 18, fontWeight: "900" },
  emptySubText: { color: MUTED, fontSize: 13, fontWeight: "700", lineHeight: 19, textAlign: "center", marginTop: 6 },
  footerContainer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 12, backgroundColor: BG },
});