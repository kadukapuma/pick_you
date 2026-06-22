import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { MotiText, MotiView } from "moti";
import { useState } from "react";
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import ExitButton from "../components/ExitButton";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";
import LottieView from "lottie-react-native"; // <-- Step 2: Imported Lottie

const DocumentVerifyScreen = ({ navigation, onExit, setDriverStatus }) => {
  const [uploads, setUploads] = useState({
    license_front: null,
    license_back: null,
    registration: null,
    insurance: null,
    front: null,
    back: null,
    interior: null,
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Step 3: Processing & Text States Added
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingText, setProcessingText] = useState("Preparing your documents...");

  // PickU Brand Colors
  const BRAND_GREEN = "#00A859";
  const DARK_BG = "#0B1220";

  const handleUpload = async (docKey) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
      });

      if (
        result.type === "success" ||
        (result.assets && result.assets.length > 0)
      ) {
        setUploads((prev) => ({ ...prev, [docKey]: result.assets ? result.assets[0] : result }));
      }
    } catch (err) {
      console.log("Upload error:", err);
    }
  };

  const allDocsUploaded = Object.values(uploads).every(
    (status) => status !== null,
  );

  const handleSubmit = async () => {
    if (!allDocsUploaded) return;
    
    // Step 4: Show Animation & Initial Text Before Upload
    setIsSubmitted(true);
    setIsProcessing(true);
    setProcessingText("Preparing your documents...");

    try {
      const profileStr = await AsyncStorage.getItem("profileFormData");
      const vehicleStr = await AsyncStorage.getItem("vehicleFormData");

      const profile = profileStr ? JSON.parse(profileStr) : {};
      const vehicle = vehicleStr ? JSON.parse(vehicleStr) : {};

      const formData = new FormData();

      if (profile.dob) {
        if (profile.dob.includes("/")) {
          const [d, m, y] = profile.dob.split("/");
          formData.append("dob", `${y}-${m}-${d}`);
        } else {
          formData.append("dob", profile.dob);
        }
      }
      if (profile.address) formData.append("address", profile.address);
      if (profile.nic) formData.append("nic", profile.nic);

      if (vehicle.formData?.make) formData.append("make", vehicle.formData.make);
      if (vehicle.formData?.model) formData.append("model", vehicle.formData.model);
      if (vehicle.formData?.year) formData.append("year", vehicle.formData.year);
      if (vehicle.formData?.color) formData.append("color", vehicle.formData.color);
      if (vehicle.formData?.plate) formData.append("plate", vehicle.formData.plate);
      if (vehicle.formData?.seat_capacity) formData.append("seat_capacity", vehicle.formData.seat_capacity);
      if (vehicle.vehicleType) formData.append("vehicleType", vehicle.vehicleType);
      if (vehicle.vehicle_type_id) formData.append("vehicle_type_id", vehicle.vehicle_type_id);

      // Step 3 (Premium): Updating state before appending files
      setProcessingText("Uploading driver documents...");

      Object.keys(uploads).forEach((key) => {
        if (uploads[key]) {
          formData.append(key, {
            uri: uploads[key].uri,
            name: uploads[key].name || `${key}.jpg`,
            type: uploads[key].mimeType || "image/jpeg",
          });
        }
      });

      // Step 3 (Premium): Updating state right before API validation call
      setProcessingText("Verifying vehicle information...");

      await api.post('/driver/complete-profile', formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      // Step 3 (Premium): Finalizing profile updates
      setProcessingText("Finalizing your profile...");

      // Update global context status so app instantly reflects 'pending'
      if (setDriverStatus) {
        setDriverStatus("pending");
      }

      // Step 5: Clear Processing Overlay right before leaving screen
      setIsProcessing(false);

      // After a successful upload/re-upload, update the local status directly to pending so the Verification screen adapts properly
      if (navigation.getState?.().routes[0]?.name === "Verification") {
        navigation.goBack(); 
      } else {
        // Reset stack to Verification for onboarding flow
        navigation.reset({
          index: 0,
          routes: [{ name: "Verification" }],
        });
      }
    } catch (error) {
      console.error("Submit error:", error);
      Alert.alert("Error", "Could not submit your profile. Please try again.");
      
      // Step 5: Reset state on exception blocks
      setIsSubmitted(false);
      setIsProcessing(false);
    }
  };

  const renderSteps = () => {
    return [1, 2, 3].map((step) => (
      <View key={step} style={styles.stepWrapper}>
        <View style={[styles.stepCircle, step <= 2 && styles.stepCompleted]}>
          {step <= 2 ? (
            <Feather name="check" size={14} color={BRAND_GREEN} />
          ) : (
            <Text style={[styles.stepText, { color: "rgba(255,255,255,0.6)" }]}>
              {step}
            </Text>
          )}
        </View>
        {step < 3 && (
          <View
            style={[
              styles.stepLine,
              step < 2
                ? { backgroundColor: "#FFF" }
                : { backgroundColor: "rgba(255,255,255,0.2)" },
            ]}
          />
        )}
      </View>
    ));
  };

  const DocumentCard = ({ title, subtitle, icon, docKey, index }) => (
    <MotiView
      from={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 100 + index * 50 }}
      style={styles.docCard}
    >
      <View style={styles.docInfo}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons
            name={icon}
            size={24}
            color={uploads[docKey] ? BRAND_GREEN : "#94A3B8"}
          />
        </View>
        <View style={styles.textColumn}>
          <Text style={styles.docTitle}>{title}</Text>
          <Text style={styles.docSubtitle}>{subtitle}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.uploadBtn,
          uploads[docKey] && {
            backgroundColor: "rgba(0, 168, 89, 0.1)",
            borderColor: BRAND_GREEN,
          },
        ]}
        onPress={() => handleUpload(docKey)}
      >
        <Feather
          name={uploads[docKey] ? "check" : "upload"}
          size={16}
          color={uploads[docKey] ? BRAND_GREEN : "#FFF"}
        />
        <Text
          style={[
            styles.uploadBtnText,
            uploads[docKey] && { color: BRAND_GREEN },
          ]}
        >
          {uploads[docKey] ? "Done" : "Upload"}
        </Text>
      </TouchableOpacity>
    </MotiView>
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButtonCircle}
          >
            <Feather name="arrow-left" size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.progressRow}>{renderSteps()}</View>
          <ExitButton onPress={onExit} style={styles.exitButton} />
        </View>

        <MotiText
          from={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.headerTitle}
        >
          Verify Details
        </MotiText>
        <Text style={styles.headerSubtitle}>
          Upload documents to verify your account
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Official Documents</Text>

        <DocumentCard
          index={0}
          title="Driving License Front"
          subtitle="Front side of your license (JPEG, PNG)"
          icon="card-account-details-outline"
          docKey="license_front"
        />
        <DocumentCard
          index={1}
          title="Driving License Back"
          subtitle="Back side of your license (JPEG, PNG)"
          icon="card-account-details-outline"
          docKey="license_back"
        />
        <DocumentCard
          index={2}
          title="Vehicle Registration"
          subtitle="Latest logbook copy (PDF/JPEG)"
          icon="car-info"
          docKey="registration"
        />
        <DocumentCard
          index={3}
          title="Insurance Certificate"
          subtitle="Valid up-to-date policy (PDF/JPEG)"
          icon="file-certificate-outline"
          docKey="insurance"
        />

        <Text style={[styles.sectionLabel, { marginTop: 25 }]}>
          Vehicle Photos
        </Text>

        <DocumentCard
          index={4}
          title="Front View"
          subtitle="Clear view including plate"
          icon="car-convertible"
          docKey="front"
        />
        <DocumentCard
          index={5}
          title="Back View"
          subtitle="Including plate and model"
          icon="car-back"
          docKey="back"
        />
        <DocumentCard
          index={6}
          title="Side View"
          subtitle="Dashboard and seating condition"
          icon="car-seat"
          docKey="interior"
        />

        <TouchableOpacity
          style={[
            styles.submitBtn,
            allDocsUploaded && !isSubmitted && { backgroundColor: DARK_BG },
            isSubmitted && { backgroundColor: "#F1F5F9" },
          ]}
          onPress={handleSubmit}
          disabled={!allDocsUploaded || isSubmitted}
        >
          {isSubmitted ? (
            <View style={styles.pendingRow}>
              <Feather
                name="clock"
                size={20}
                color="#64748B"
                style={{ marginRight: 10 }}
              />
              <Text style={[styles.submitText, { color: "#64748B" }]}>
                Pending Review
              </Text>
            </View>
          ) : (
            <Text
              style={[
                styles.submitText,
                !allDocsUploaded && { color: "rgba(255,255,255,0.3)" },
              ]}
            >
              Submit for Review
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Step 5: Full Screen Processing Overlay UI Component */}
      {isProcessing && (
        <View style={styles.processingContainer}>
          <StatusBar
            backgroundColor="#0B1220"
            barStyle="light-content"
          />

          <LottieView
            source={require("../../src/assets/Car Animation.json")}
            autoPlay
            loop
            style={styles.processingAnimation}
          />

          <Text style={styles.processingTitle}>
            Processing Documents
          </Text>

          <Text style={styles.processingSubtitle}>
            Please wait while we upload and verify your information.
          </Text>

          <Text style={styles.processingStatus}>
            {processingText}
          </Text>

          <View style={styles.processingDots}>
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>
      )}

      <SafeAreaView edges={["bottom"]} style={styles.bottomSafe} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: {
    backgroundColor: "#00A859", 
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 10 : 60,
    paddingHorizontal: 25,
    paddingBottom: 35,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  exitButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepWrapper: { flexDirection: "row", alignItems: "center" },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  stepCompleted: { backgroundColor: "#FFF" },
  stepText: { fontSize: 11, fontWeight: "800" },
  stepLine: { width: 30, height: 2, marginHorizontal: 5, borderRadius: 1 },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
  },
  scrollContent: { paddingHorizontal: 25, paddingBottom: 40, paddingTop: 25 },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 15,
  },
  docCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  docInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  textColumn: { flex: 1 },
  docTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  docSubtitle: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  uploadBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 6,
  },
  submitBtn: {
    backgroundColor: "#CBD5E1",
    height: 58,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  pendingRow: { flexDirection: "row", alignItems: "center" },
  submitText: { color: "#FFF", fontSize: 16, fontWeight: "900" },
  bottomSafe: { backgroundColor: "#000" },
  
  // Step 7: Premium Full-Screen Processing Styles Included
  processingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#0B1220",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  processingAnimation: {
    width: 320,
    height: 320,
  },
  processingTitle: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "900",
    marginTop: -20,
  },
  processingSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 40,
    marginTop: 12,
    lineHeight: 22,
  },
  processingStatus: {
    color: "#00A859",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 25,
  },
  processingDots: {
    flexDirection: "row",
    marginTop: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#00A859",
    marginHorizontal: 5,
  },
});

export default DocumentVerifyScreen;