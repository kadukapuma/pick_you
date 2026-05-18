import { useEffect, useState } from "react";
import {
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import KeyboardAwareWrapper from "../components/KeyboardAwareWrapper";
import ExitButton from "../components/ExitButton";

import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AnimatePresence, MotiText, MotiView } from "moti";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "../services/api";
import { Alert } from "react-native";

const VehicleDetailsScreen = ({ navigation, onExit }) => {
  const [vehicleType, setVehicleType] = useState("Car");
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const vehicleOptions = [
    { name: "Tuk", icon: "rickshaw" },
    { name: "Car", icon: "car" },
    { name: "Van", icon: "van-passenger" },
    { name: "Mini Van", icon: "van-passenger" },
    { name: "Flex", icon: "truck-fast" },
    { name: "Bike", icon: "motorbike" },
  ];

  const [formData, setFormData] = useState({
    make: "",
    model: "",
    year: "",
    color: "",
    plate: "",
    seat_capacity: "",
  });

  const BRAND_GREEN = "#0B1220";
  const HEADER_BG = "#00A859";

  useEffect(() => {
    loadVehicleData();
  }, []);

  useEffect(() => {
    saveVehicleData();
  }, [formData, vehicleType]);

  const loadVehicleData = async () => {
    try {
      const savedData = await AsyncStorage.getItem("vehicleFormData");
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setFormData(parsedData.formData);
        setVehicleType(parsedData.vehicleType);
      }
    } catch (error) {
      console.log("Error loading form data:", error);
    }
  };

  const saveVehicleData = async () => {
    try {
      const data = { formData, vehicleType };
      await AsyncStorage.setItem("vehicleFormData", JSON.stringify(data));
    } catch (error) {
      console.log("Error saving form data:", error);
    }
  };

  const handleContinue = async () => {
    if (!formData.make || !formData.model || !formData.year || !formData.color || !formData.plate || !formData.seat_capacity) {
      Alert.alert("Required Fields", "Please fill in all vehicle details including seat capacity.");
      return;
    }

    setIsSubmitting(true);
    try {
      // We save to AsyncStorage first as DocumentVerifyScreen might need it
      await saveVehicleData();

      // Optionally call API to persist step
      const response = await api.post("/driver/complete-profile", {
        make: formData.make,
        model: formData.model,
        year: formData.year,
        color: formData.color,
        plate: formData.plate,
        vehicleType: vehicleType,
        seat_capacity: formData.seat_capacity,
      });

      if (response.data) {
        navigation.navigate("Documentscreen");
      }
    } catch (error) {
      console.log("Vehicle update error:", error.response?.data || error.message);
      Alert.alert(
        "Update Failed",
        error.response?.data?.message || "Something went wrong while saving vehicle details."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSteps = () => {
    return [1, 2, 3].map((step) => {
      const isActive = step <= 2 || (step === 3 && isSubmitting);
      const isCompleted = step < 2 || (step === 2 && isSubmitting);

      return (
        <View key={step} style={styles.stepWrapper}>
          <MotiView
            animate={{
              backgroundColor: isActive ? "#FFF" : "rgba(255,255,255,0.3)",
              scale: isActive ? 1 : 0.9,
            }}
            transition={{ type: "timing", duration: 300 }}
            style={styles.stepCircle}
          >
            {isCompleted ? (
              <Feather name="check" size={14} color={HEADER_BG} />
            ) : (
              <Text
                style={[
                  styles.stepText,
                  { color: isActive ? HEADER_BG : "#FFF" },
                ]}
              >
                {step}
              </Text>
            )}
          </MotiView>

          {step < 3 && (
            <View style={styles.stepLineBackground}>
              <MotiView
                from={{ width: step < 2 ? "100%" : "0%" }}
                animate={{
                  width:
                    step < 2 || (step === 2 && isSubmitting) ? "100%" : "0%",
                }}
                transition={{ type: "timing", duration: 500 }}
                style={styles.stepLineFill}
              />
            </View>
          )}
        </View>
      );
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={HEADER_BG}
        translucent
      />

      <AnimatePresence>
        {showVehicleModal && (
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.modalOverlay}
          >
            <TouchableWithoutFeedback
              onPress={() => setShowVehicleModal(false)}
            >
              <View style={styles.modalOverlayInner}>
                <MotiView
                  from={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  style={styles.modalContent}
                >
                  {vehicleOptions.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.modalItem}
                      onPress={() => {
                        setVehicleType(item.name);
                        setShowVehicleModal(false);
                      }}
                    >
                      <MaterialCommunityIcons
                        name={item.icon}
                        size={22}
                        color="#0F172A"
                      />
                      <Text style={styles.modalText}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </MotiView>
              </View>
            </TouchableWithoutFeedback>
          </MotiView>
        )}
      </AnimatePresence>

      <View style={[styles.header, { backgroundColor: HEADER_BG }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.progressRow}>{renderSteps()}</View>
          <ExitButton onPress={onExit} style={styles.exitButton} />
        </View>

        <View style={styles.headerTitleContainer}>
          <MotiText
            from={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            style={styles.headerTitle}
          >
            Vehicle Details
          </MotiText>
          <Text style={styles.headerSubtitle}>Tell us about your vehicle</Text>
        </View>
      </View>

      <KeyboardAwareWrapper
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.label}>Vehicle Type</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.dropdownButton}
            onPress={() => setShowVehicleModal(true)}
          >
            <View style={styles.dropdownLeft}>
              <MaterialCommunityIcons
                name={
                  vehicleOptions.find((item) => item.name === vehicleType)
                    ?.icon || "car"
                }
                size={22}
                color="#0F172A"
              />
              <Text style={styles.dropdownText}>{vehicleType}</Text>
            </View>
            <Feather name="chevron-down" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Make</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                placeholder="Toyota"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={formData.make}
                onChangeText={(val) => setFormData({ ...formData, make: val })}
              />
            </View>
          </View>

          <View style={styles.half}>
            <Text style={styles.label}>Model</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                placeholder="Camry"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={formData.model}
                onChangeText={(val) => setFormData({ ...formData, model: val })}
              />
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Year</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                placeholder="2020"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={formData.year}
                keyboardType="number-pad"
                onChangeText={(val) => setFormData({ ...formData, year: val })}
              />
            </View>
          </View>

          <View style={styles.half}>
            <Text style={styles.label}>Color</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                placeholder="Black"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={formData.color}
                onChangeText={(val) => setFormData({ ...formData, color: val })}
              />
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>License Plate</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                placeholder="ABC-1234"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                autoCapitalize="characters"
                value={formData.plate}
                onChangeText={(val) => setFormData({ ...formData, plate: val })}
              />
            </View>
          </View>

          <View style={styles.half}>
            <Text style={styles.label}>Seat Capacity</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                placeholder="4"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                keyboardType="number-pad"
                value={formData.seat_capacity}
                onChangeText={(val) => setFormData({ ...formData, seat_capacity: val })}
              />
            </View>
          </View>
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoHeader}>
            <MaterialCommunityIcons
              name="car-outline"
              size={18}
              color="#2563EB"
            />
            <Text style={styles.infoTitle}>Vehicle Requirements</Text>
          </View>
          <Text style={styles.infoText}>• Model year 2010 or newer</Text>
          <Text style={styles.infoText}>
            • 4-door vehicle in good condition
          </Text>
          <Text style={styles.infoText}>
            • Valid registration and insurance
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.continueBtn, { backgroundColor: BRAND_GREEN }]}
          onPress={handleContinue}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <MotiView
              from={{ rotate: "0deg" }}
              animate={{ rotate: "360deg" }}
              transition={{ loop: true, type: "timing", duration: 1000 }}
            >
              <Feather name="loader" size={24} color="#FFF" />
            </MotiView>
          ) : (
            <Text style={styles.continueText}>Continue</Text>
          )}
        </TouchableOpacity>
      </KeyboardAwareWrapper>

      <SafeAreaView edges={["bottom"]} style={styles.bottomSafe} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: {
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 15 : 60,
    paddingHorizontal: 20,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerSpacer: { width: 42 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  stepText: { fontSize: 12, fontWeight: "800" },
  stepLineBackground: {
    width: 30,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginHorizontal: 5,
    borderRadius: 2,
    overflow: "hidden",
  },
  stepLineFill: {
    height: "100%",
    backgroundColor: "#FFF",
  },
  headerTitleContainer: { marginLeft: 5 },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginTop: 4,
  },
  scrollContent: { paddingHorizontal: 25, paddingTop: 20, paddingBottom: 40 },
  section: { marginBottom: 20 },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 15,
  },
  dropdownButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dropdownLeft: { flexDirection: "row", alignItems: "center" },
  dropdownText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 999,
  },
  modalOverlayInner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#FFF",
    borderRadius: 24,
    paddingVertical: 12,
    elevation: 10,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  modalText: {
    marginLeft: 14,
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  half: { width: "48%" },
  input: { flex: 1, fontSize: 15, fontWeight: "600", color: "#0F172A" },
  infoBox: {
    backgroundColor: "#F0F7FF",
    borderRadius: 16,
    padding: 16,
    marginTop: 5,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  infoHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  infoTitle: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "800",
    color: "#2563EB",
  },
  infoText: { color: "#3B82F6", fontSize: 13, marginBottom: 4, marginLeft: 4 },
  continueBtn: {
    height: 60,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
    elevation: 4,
  },
  continueText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 0.5,
  },
  bottomSafe: { backgroundColor: "#000" },
});

export default VehicleDetailsScreen;
