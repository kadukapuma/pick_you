import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import api from "../../services/api";

const DEFAULT_DOCUMENTS = {
  licenseFront: { status: "not_set", image: null },
  licenseBack: { status: "not_set", image: null },
  vehicleRegistration: { status: "not_set", image: null },
  insuranceCertificate: { status: "not_set", image: null },
  vehicleFront: { status: "not_set", image: null },
  vehicleBack: { status: "not_set", image: null },
  vehicleSide: { status: "not_set", image: null },
};

const normalizeDocument = (document) => {
  if (typeof document === "string") {
    return { status: document, image: null };
  }

  return {
    status: document?.status || "not_set",
    image: document?.image || null,
    uploadedAt: document?.uploaded_at || document?.created_at || null,
    updatedAt: document?.updated_at || null,
  };
};

const DocumentsScreen = ({ navigation }) => {
  const [documents, setDocuments] = useState(DEFAULT_DOCUMENTS);
  const [loading, setLoading] = useState(true);
  const [screenError, setScreenError] = useState(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await api.get("/driver/profile");
      const profile = response.data?.data ?? {};
      const nextDocuments = Object.keys(DEFAULT_DOCUMENTS).reduce((acc, key) => {
        acc[key] = normalizeDocument(profile.documents?.[key]);
        return acc;
      }, {});

      setDocuments(nextDocuments);
      setScreenError(null);
    } catch (error) {
      console.log("Error fetching driver documents:", error.response?.data || error);
      setScreenError("Failed to load document status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchDocuments();
    }, [fetchDocuments]),
  );

  const documentList = Object.values(documents);
  const totalCount = documentList.length;
  const verifiedCount = documentList.filter((doc) => doc.status === "verified").length;
  const pendingCount = documentList.filter((doc) => doc.status === "pending").length;

  const DocumentRow = ({
    title,
    subtitle,
    document,
    icon,
    imageType,
  }) => {
    const status = document?.status || "not_set";

    const renderBadge = () => {
      switch (status) {
        case "verified":
          return (
            <View style={[styles.badge, styles.badgeVerified]}>
              <Feather
                name="check"
                size={12}
                color="#00A859"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.badgeTextVerified}>
                Verified
              </Text>
            </View>
          );

        case "pending":
          return (
            <View style={[styles.badge, styles.badgePending]}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={12}
                color="#B45309"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.badgeTextPending}>
                Pending
              </Text>
            </View>
          );

        case "rejected":
          return (
            <View style={[styles.badge, styles.badgeRejected]}>
              <Feather
                name="x"
                size={12}
                color="#DC2626"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.badgeTextRejected}>
                Rejected
              </Text>
            </View>
          );

        default:
          return (
            <View style={[styles.badge, styles.badgeNotSet]}>
              <Text style={styles.badgeTextNotSet}>
                Missing
              </Text>
            </View>
          );
      }
    };

    return (
      <TouchableOpacity
        style={styles.rowCard}
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate("DocumentPreview", {
            title,
            subtitle,
            status,
            imageType,
            image: document?.image || null,
            uploadedAt: document?.uploadedAt || null,
            updatedAt: document?.updatedAt || null,
          })
        }
      >
        <View style={styles.rowLeft}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name={icon}
              size={24}
              color="#64748B"
            />
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.rowTitle}>{title}</Text>

            <Text style={styles.rowSubtitle}>
              {subtitle}
            </Text>
          </View>
        </View>

        <View style={styles.rowRight}>
          {renderBadge()}

          <Feather
            name="chevron-right"
            size={18}
            color="#94A3B8"
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#00A859"
      />

      {/* HEADER */}
      <LinearGradient
        colors={["#00A859", "#007A41"]}
        style={styles.header}
      >
        <SafeAreaView>
          {/* TOP NAV */}
          <View style={styles.navRow}>
            <TouchableOpacity
              onPress={() => navigation?.goBack()}
              style={styles.backBtn}
            >
              <Feather
                name="arrow-left"
                size={24}
                color="#FFF"
              />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>
              Documents
            </Text>

            <TouchableOpacity style={styles.uploadAllBtn}>

            </TouchableOpacity>
          </View>

          {/* STATS */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>
                Total
              </Text>

              <Text style={styles.statValue}>{totalCount}</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>
                Verified
              </Text>

              <Text
                style={[
                  styles.statValue,
                  { color: "#86EFAC" },
                ]}
              >
                {verifiedCount}
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>
                Pending
              </Text>

              <Text
                style={[
                  styles.statValue,
                  { color: "#FCD34D" },
                ]}
              >
                {pendingCount}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* BODY */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00A859" />
            <Text style={styles.loadingText}>Loading document status...</Text>
          </View>
        ) : screenError ? (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={18} color="#EF4444" />
            <Text style={styles.errorText}>{screenError}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchDocuments}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
        {/* OFFICIAL DOCUMENTS */}
        <Text style={styles.sectionHeading}>
          Official Documents
        </Text>

        <DocumentRow
          title="Driving License Front"
          subtitle="Front side clear image"
          document={documents.licenseFront}
          icon="card-account-details-outline"
          imageType="licenseFront"
        />

        <DocumentRow
          title="Driving License Back"
          subtitle="Back side clear image"
          document={documents.licenseBack}
          icon="card-account-details-outline"
          imageType="licenseBack"
        />

        <DocumentRow
          title="Vehicle Registration"
          subtitle="Vehicle ownership registration"
          document={documents.vehicleRegistration}
          icon="file-document-outline"
          imageType="vehicleRegistration"
        />

        <DocumentRow
          title="Insurance Certificate"
          subtitle="Valid insurance certificate"
          document={documents.insuranceCertificate}
          icon="shield-check-outline"
          imageType="insuranceCertificate"
        />

        {/* VEHICLE PHOTOS */}
        <Text style={styles.sectionHeading}>
          Vehicle Photos
        </Text>

        <DocumentRow
          title="Front View"
          subtitle="Front side vehicle photo"
          document={documents.vehicleFront}
          icon="car-outline"
          imageType="vehicleFront"
        />

        <DocumentRow
          title="Back View"
          subtitle="Rear side vehicle photo"
          document={documents.vehicleBack}
          icon="car-back"
          imageType="vehicleBack"
        />

        <DocumentRow
          title="Side View"
          subtitle="Side angle vehicle photo"
          document={documents.vehicleSide}
          icon="car-side"
          imageType="vehicleSide"
        />

        {/* INFO BOX */}
        <View style={styles.infoBox}>
          <Feather
            name="info"
            size={18}
            color="#64748B"
          />

          <Text style={styles.infoText}>
            Document verification usually takes less
            than 24 hours. Make sure all uploaded
            images are clear and readable.
          </Text>
        </View>
          </>
        )}
      </ScrollView>

      {/* BOTTOM SAFE AREA */}
      <SafeAreaView
        edges={["bottom"]}
        style={styles.bottomSafe}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  /* HEADER */
  header: {
    paddingHorizontal: 16,

    paddingTop:
      Platform.OS === "android"
        ? (StatusBar.currentHeight || 0) + 14
        : 18,

    paddingBottom: 26,

    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,

    shadowColor: "#00A859",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },

  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    marginTop: 6,
  },

  backBtn: {
    width: 46,
    height: 46,
    borderRadius: 15,

    backgroundColor: "rgba(255,255,255,0.15)",

    justifyContent: "center",
    alignItems: "center",
  },

  uploadAllBtn: {
    width: 46,
    height: 46,
    borderRadius: 15,

    backgroundColor: "rgba(255,255,255,0.15)",

    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  /* STATS */
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",

    marginTop: 24,
    gap: 12,
  },

  statBox: {
    flex: 1,

    backgroundColor: "rgba(255,255,255,0.14)",

    borderRadius: 20,
    paddingVertical: 16,

    alignItems: "center",
  },

  statLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontWeight: "700",

    textTransform: "uppercase",
    letterSpacing: 0.5,

    marginBottom: 5,
  },

  statValue: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
  },

  /* CONTENT */
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
  },

  loadingContainer: {
    minHeight: 260,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },

  errorText: {
    flex: 1,
    color: "#991B1B",
    fontSize: 13,
    fontWeight: "700",
  },

  retryBtn: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },

  retryText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
  },

  sectionHeading: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",

    marginBottom: 14,
    marginTop: 10,
  },

  /* ROW */
  rowCard: {
    backgroundColor: "#FFF",

    borderRadius: 22,
    padding: 16,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    marginBottom: 12,

    borderWidth: 1,
    borderColor: "#EEF2F7",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.03,
    shadowRadius: 10,

    elevation: 2,
  },

  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 15,

    backgroundColor: "#F1F5F9",

    justifyContent: "center",
    alignItems: "center",

    marginRight: 14,
  },

  textContainer: {
    flex: 1,
    paddingRight: 8,
  },

  rowTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },

  rowSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },

  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  /* BADGES */
  badge: {
    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 10,
    paddingVertical: 5,

    borderRadius: 12,
  },

  badgeVerified: {
    backgroundColor: "#F0FDF4",
  },

  badgePending: {
    backgroundColor: "#FEF3C7",
  },

  badgeRejected: {
    backgroundColor: "#FEE2E2",
  },

  badgeNotSet: {
    backgroundColor: "#FEF2F2",
  },

  badgeTextVerified: {
    color: "#00A859",
    fontSize: 12,
    fontWeight: "700",
  },

  badgeTextPending: {
    color: "#B45309",
    fontSize: 12,
    fontWeight: "700",
  },

  badgeTextRejected: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "700",
  },

  badgeTextNotSet: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "700",
  },

  /* INFO BOX */
  infoBox: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#FFFFFF",

    padding: 16,
    borderRadius: 18,

    marginTop: 24,

    gap: 12,

    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
  },

  bottomSafe: {
    backgroundColor: "#000",
  },
});

export default DocumentsScreen;
