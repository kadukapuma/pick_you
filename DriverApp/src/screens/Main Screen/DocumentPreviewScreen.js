import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";

const DocumentPreviewScreen = ({ navigation, route }) => {
  const {
    title = "Driving License Front",
    status = "verified",
    image = null,
  } = route.params || {};

  const [selectedImage, setSelectedImage] = useState(image);

  /* ---------------- STATUS UI ---------------- */

  const getStatusUI = () => {
    switch (status) {
      case "verified":
        return {
          bg: "#DCFCE7",
          text: "#00A859",
          label: "Verified",
          icon: "check-circle",
        };

      case "pending":
        return {
          bg: "#FEF3C7",
          text: "#B45309",
          label: "Pending Review",
          icon: "clock",
        };

      default:
        return {
          bg: "#FEE2E2",
          text: "#DC2626",
          label: "Missing",
          icon: "alert-circle",
        };
    }
  };

  const statusUI = getStatusUI();

  /* ---------------- IMAGE PICKER ---------------- */

  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow gallery access."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: true,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.log(error);
    }
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
        <SafeAreaView edges={["top"]}>
          <View style={styles.navRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
            >
              <Feather name="arrow-left" size={24} color="#FFF" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>
              Document Details
            </Text>

            <View style={{ width: 44 }} />
          </View>

          {/* DOCUMENT TITLE */}
          <View style={styles.headerContent}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons
                name="file-document-outline"
                size={34}
                color="#FFF"
              />
            </View>

            <Text style={styles.documentTitle}>
              {title}
            </Text>

            {/* STATUS */}
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusUI.bg },
              ]}
            >
              <Feather
                name={statusUI.icon}
                size={14}
                color={statusUI.text}
              />

              <Text
                style={[
                  styles.statusText,
                  { color: statusUI.text },
                ]}
              >
                {statusUI.label}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* IMAGE CARD */}
        <View style={styles.previewCard}>
          {selectedImage ? (
            <Image
              source={{ uri: selectedImage }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="image-outline"
                size={70}
                color="#CBD5E1"
              />

              <Text style={styles.emptyTitle}>
                No Document Uploaded
              </Text>

              <Text style={styles.emptySub}>
                Upload a clear image for verification
              </Text>
            </View>
          )}
        </View>

        {/* DETAILS CARD */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>
            Verification Details
          </Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              Status
            </Text>

            <Text
              style={[
                styles.detailValue,
                { color: statusUI.text },
              ]}
            >
              {statusUI.label}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              Uploaded Date
            </Text>

            <Text style={styles.detailValue}>
              15 Aug 2026
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              Last Updated
            </Text>

            <Text style={styles.detailValue}>
              18 Aug 2026
            </Text>
          </View>
        </View>

        {/* INFO BOX */}
        <View style={styles.infoBox}>
          <Feather
            name="info"
            size={18}
            color="#64748B"
          />

          <Text style={styles.infoText}>
            Make sure your document is clearly visible
            and all corners are readable.
          </Text>
        </View>
      </ScrollView>

      {/* BOTTOM ACTIONS */}
      <SafeAreaView edges={["bottom"]} style={styles.bottomArea}>
        <View style={styles.bottomButtons}>
          {/* UPLOAD / REPLACE */}
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={pickImage}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#00A859", "#007A41"]}
              style={styles.gradientBtn}
            >
              <Feather
                name={selectedImage ? "refresh-cw" : "upload"}
                size={18}
                color="#FFF"
              />

              <Text style={styles.uploadBtnText}>
                {selectedImage
                  ? "Replace Image"
                  : "Upload Image"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  header: {
    paddingHorizontal: 18,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    marginTop:
      Platform.OS === "android" ? 10 : 0,
  },

  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,

    backgroundColor: "rgba(255,255,255,0.15)",

    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "800",
  },

  headerContent: {
    alignItems: "center",
    marginTop: 25,
  },

  iconCircle: {
    width: 78,
    height: 78,
    borderRadius: 24,

    backgroundColor: "rgba(255,255,255,0.18)",

    justifyContent: "center",
    alignItems: "center",

    marginBottom: 14,
  },

  documentTitle: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 14,
    paddingVertical: 7,

    borderRadius: 50,

    marginTop: 14,
    gap: 6,
  },

  statusText: {
    fontWeight: "800",
    fontSize: 13,
  },

  scrollContent: {
    padding: 18,
    paddingBottom: 120,
  },

  previewCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,

    overflow: "hidden",

    minHeight: 300,

    justifyContent: "center",
    alignItems: "center",

    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },

  previewImage: {
    width: "100%",
    height: 350,
  },

  emptyContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
  },

  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },

  emptySub: {
    marginTop: 6,
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },

  detailsCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,

    padding: 18,
    marginTop: 18,

    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 18,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",

    marginBottom: 16,
  },

  detailLabel: {
    color: "#64748B",
    fontSize: 14,
  },

  detailValue: {
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 14,
  },

  infoBox: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#FFF",

    padding: 16,
    borderRadius: 18,

    marginTop: 18,

    gap: 10,
  },

  infoText: {
    flex: 1,
    color: "#64748B",
    fontSize: 13,
    lineHeight: 20,
  },

  bottomArea: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,

    backgroundColor: "#FFF",

    paddingHorizontal: 18,
    paddingTop: 12,
  },

  bottomButtons: {
    marginBottom: 10,
  },

  uploadBtn: {
    borderRadius: 18,
    overflow: "hidden",
  },

  gradientBtn: {
    height: 58,

    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",

    gap: 10,
  },

  uploadBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
  },
});

export default DocumentPreviewScreen;