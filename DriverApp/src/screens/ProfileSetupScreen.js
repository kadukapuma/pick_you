import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from '@react-native-community/datetimepicker';
import { MotiText, MotiView } from "moti";
import React, { useState, useEffect } from "react";
import {
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  TouchableWithoutFeedback,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import KeyboardAwareWrapper from "../components/KeyboardAwareWrapper";
import ExitButton from "../components/ExitButton";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";

const ProfileSetupScreen = ({ navigation, route, onExit }) => {
  const currentStep = route?.params?.step || 1;

  const [formData, setFormData] = useState({
    nic: "",
    dob: "",
    address: "",
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerValue, setDatePickerValue] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);

  // Custom photo picker UI states
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false); // NEW: Custom success modal visibility
  const [tempImage, setTempImage] = useState(null);

  const BRAND_GREEN = "#0B1220";
  const DARK_BG = "#00A859";

  const formatDobForForm = (value) => {
    if (!value) return "";
    const parts = String(value).split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return String(value);
  };

  useEffect(() => {
    loadFormData();
  }, []);

  const selectPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Gallery access is required.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets?.length) {
        setTempImage(result.assets[0].uri);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Camera access is required.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets?.length) {
        setTempImage(result.assets[0].uri);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const saveProfilePicture = async () => {
    if (!tempImage) return;
    try {
      setIsUploadingPhoto(true);
      setProfilePicture(tempImage);

      const data = new FormData();
      data.append("profile_picture", {
        uri: tempImage,
        name: `profile_${Date.now()}.jpg`,
        type: "image/jpeg",
      });

      const response = await api.post("/user/profile-picture", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data?.data?.profile_picture_path) {
        await AsyncStorage.setItem(
          "profilePicturePath",
          response.data.data.profile_picture_path
        );
      }
      setTempImage(null);
      setShowPhotoModal(false); 
      
      // NEW: Show custom UI success modal instead of system alert
      setShowSuccessModal(true);
    } catch (error) {
      console.log("Profile picture upload error:", error.response?.data || error.message);
      Alert.alert("Upload Failed", "Unable to upload profile picture.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const loadFormData = async () => {
    try {
      const savedData = await AsyncStorage.getItem("profileFormData");
      const response = await api.get("/user");
      const driver = response.data?.driver;

      const backendData = driver
        ? {
            nic: driver.license_number || "",
            dob: formatDobForForm(driver.dob),
            address: driver.address || "",
          }
        : {};

      const localData = savedData ? JSON.parse(savedData) : {};
      setFormData((current) => ({
        ...current,
        ...backendData,
        ...localData,
      }));
    } catch (error) {
      console.log("Error loading form data:", error);
    }
  };

  const saveFormData = async (updatedData) => {
    try {
      await AsyncStorage.setItem("profileFormData", JSON.stringify(updatedData));
    } catch (error) {
      console.log("Error saving form data:", error);
    }
  };

  const handleInputChange = (field, value) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    saveFormData(updatedData);
  };

  const openDatePicker = () => {
    if (formData.dob) {
      const [d, m, y] = formData.dob.split("/");
      const parsed = new Date(`${y}-${m}-${d}`);
      if (!isNaN(parsed.getTime())) {
        setDatePickerValue(parsed);
      }
    } else {
      setDatePickerValue(new Date());
    }
    setShowDatePicker(true);
  };

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event?.type === 'dismissed') return;
      
      if (selectedDate) {
        setDatePickerValue(selectedDate);
        const d = String(selectedDate.getDate()).padStart(2, '0');
        const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const y = String(selectedDate.getFullYear());
        handleInputChange('dob', `${d}/${m}/${y}`);
      }
    } else {
      if (selectedDate) setDatePickerValue(selectedDate);
    }
  };

  const handleIOSDateConfirm = () => {
    const d = String(datePickerValue.getDate()).padStart(2, '0');
    const m = String(datePickerValue.getMonth() + 1).padStart(2, '0');
    const y = String(datePickerValue.getFullYear());
    handleInputChange('dob', `${d}/${m}/${y}`);
    setShowDatePicker(false);
  };

  const handleContinue = async () => {
    if (!formData.nic || !formData.dob || !formData.address) {
      Alert.alert("Required Fields", "Please fill in all the details before continuing.");
      return;
    }

    try {
      setIsLoading(true);
      let apiDob = formData.dob;
      if (formData.dob.includes("/")) {
        const [d, m, y] = formData.dob.split("/");
        apiDob = `${y}-${m}-${d}`;
      }

      const response = await api.post("/driver/complete-profile", {
        nic: formData.nic,
        dob: apiDob,
        address: formData.address,
      });

      if (response.data) {
        navigation.navigate("VehicleDetails");
      }
    } catch (error) {
      console.log("Profile update error:", error.response?.data || error.message);
      Alert.alert(
        "Update Failed",
        error.response?.data?.message || "Something went wrong while saving your profile."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderSteps = () => {
    return [1, 2, 3].map((step) => (
      <View key={step} style={styles.stepWrapper}>
        <View
          style={[
            styles.stepCircle,
            currentStep >= step
              ? { backgroundColor: "#FFF" }
              : { backgroundColor: "rgba(255,255,255,0.2)" },
          ]}
        >
          <Text
            style={[
              styles.stepText,
              currentStep >= step ? { color: "#000" } : { color: "#FFF" },
            ]}
          >
            {step}
          </Text>
        </View>
        {step < 3 && <View style={styles.stepLine} />}
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DARK_BG} translucent />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: DARK_BG }]}>
        <ExitButton onPress={onExit} style={styles.exitButton} />
        <View style={styles.progressRow}>{renderSteps()}</View>

        <MotiText
          from={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.headerTitle}
        >
          {currentStep === 1 ? "Driver Profile" : currentStep === 2 ? "Vehicle Details" : "Documents"}
        </MotiText>

        <Text style={styles.headerSubtitle}>
          {currentStep === 1 ? "Let's set up your personal profile" : "Tell us about your vehicle"}
        </Text>
      </View>

      {/* Content */}
      <KeyboardAwareWrapper
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <MotiView
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          style={styles.avatarContainer}
        >
          <View style={styles.avatarCircle}>
            {profilePicture ? (
              <Image source={{ uri: profilePicture }} style={styles.avatarImage} />
            ) : (
              <Feather name="user" size={45} color="#CBD5E1" />
            )}
          </View>

          <TouchableOpacity
            style={[styles.cameraBtn, { backgroundColor: BRAND_GREEN }]}
            onPress={() => {
              setTempImage(null);
              setShowPhotoModal(true);
            }}
            disabled={isUploadingPhoto}
          >
            {isUploadingPhoto ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Feather name="camera" size={16} color="#FFF" />
            )}
          </TouchableOpacity>
        </MotiView>

        {/* Form Elements */}
        <View style={styles.form}>
          {/* NIC */}
          <MotiView from={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 200 }}>
            <Text style={styles.label}>National ID / License Number</Text>
            <View style={styles.inputWrapper}>
              <Feather name="credit-card" size={18} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="V-XXXXXXXXX"
                placeholderTextColor="#94A3B8"
                value={formData.nic}
                onChangeText={(val) => handleInputChange("nic", val)}
              />
            </View>
          </MotiView>

          {/* DOB */}
          <MotiView from={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 300 }}>
            <Text style={styles.label}>Date of Birth</Text>
            <TouchableOpacity style={styles.inputWrapper} onPress={openDatePicker}>
              <Feather name="calendar" size={18} color="#94A3B8" style={styles.inputIcon} />
              <Text
                style={[
                  styles.input,
                  {
                    color: formData.dob ? "#0F172A" : "#94A3B8",
                    lineHeight: Platform.OS === 'ios' ? 44 : 24,
                    textAlignVertical: "center",
                  },
                ]}
              >
                {formData.dob || "DD / MM / YYYY"}
              </Text>
            </TouchableOpacity>
          </MotiView>

          {/* Address */}
          <MotiView from={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 400 }}>
            <Text style={styles.label}>Address</Text>
            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="123 Main Street, City, State"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={formData.address}
                onChangeText={(val) => handleInputChange("address", val)}
              />
            </View>
          </MotiView>

          {/* Continue Action Button */}
          <MotiView from={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 500, type: "timing" }}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.continueBtn, { backgroundColor: BRAND_GREEN }]}
              onPress={handleContinue}
              disabled={isLoading}
            >
              {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.continueText}>Continue</Text>}
            </TouchableOpacity>
          </MotiView>
        </View>
      </KeyboardAwareWrapper>

      <SafeAreaView edges={["bottom"]} style={styles.bottomSafeArea} />

      {/* CUSTOM PHOTO CROPPER MODAL */}
      <Modal
        transparent
        animationType="fade"
        visible={showPhotoModal}
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View style={styles.cropperOverlay}>
          <View style={styles.cropperHeader}>
            <TouchableOpacity style={styles.cropperCloseBtn} onPress={() => setShowPhotoModal(false)}>
              <Feather name="arrow-left" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.cropperTitle}>Edit Profile Photo</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.viewfinderContainer}>
            <View style={styles.cropBoxSquare}>
              {tempImage || profilePicture ? (
                <Image source={{ uri: tempImage || profilePicture }} style={styles.cropperPreviewImage} />
              ) : (
                <Feather name="user" size={80} color="#334155" />
              )}
              <View style={styles.gridLineH1} />
              <View style={styles.gridLineH2} />
              <View style={styles.gridLineV1} />
              <View style={styles.gridLineV2} />
              <View style={[styles.cornerEdge, styles.topLeftEdge]} />
              <View style={[styles.cornerEdge, styles.topRightEdge]} />
              <View style={[styles.cornerEdge, styles.bottomLeftEdge]} />
              <View style={[styles.cornerEdge, styles.bottomRightEdge]} />
            </View>
          </View>

          <View style={styles.cropperBottomActions}>
            <View style={styles.sourceButtonsRow}>
              <TouchableOpacity style={styles.sourceActionItem} onPress={takePhoto}>
                <View style={styles.sourceIconCircle}>
                  <Feather name="camera" size={20} color="#FFF" />
                </View>
                <Text style={styles.sourceActionText}>Take New</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sourceActionItem} onPress={selectPhoto}>
                <View style={styles.sourceIconCircle}>
                  <Feather name="image" size={20} color="#FFF" />
                </View>
                <Text style={styles.sourceActionText}>From Gallery</Text>
              </TouchableOpacity>
            </View>

            {tempImage && (
              <TouchableOpacity 
                style={[styles.applyCropButton, { backgroundColor: DARK_BG }]} 
                onPress={saveProfilePicture}
                disabled={isUploadingPhoto}
              >
                {isUploadingPhoto ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Feather name="check" size={18} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.applyCropText}>Apply Photo Change</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* NEW: PREMIUM CUSTOM SUCCESS MODAL */}
      <Modal
        transparent
        animationType="fade"
        visible={showSuccessModal}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowSuccessModal(false)}>
            <View style={styles.modalDismissZone} />
          </TouchableWithoutFeedback>
          
          <MotiView 
            from={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            style={styles.modalCard}
          >
            <View style={[styles.modalIconCircle, { backgroundColor: `${DARK_BG}15` }]}>
              <Feather name="check" size={28} color={DARK_BG} />
            </View>
            
            <Text style={styles.modalTitle}>Success</Text>
            <Text style={styles.modalMessage}>Profile picture updated successfully.</Text>
            
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[styles.modalButton, { backgroundColor: BRAND_GREEN }]}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </MotiView>
        </View>
      </Modal>

      {/* SEAMLESS NATIVE STYLE DATE PICKER OVERLAY */}
      {showDatePicker && (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="slide" visible={showDatePicker}>
            <View style={styles.iosDateModalOverlay}>
              <View style={styles.iosDatePickerContainer}>
                <View style={styles.iosDatePickerHeader}>
                  <Text style={styles.iosDateTitle}>Select Birth Date</Text>
                  <TouchableOpacity onPress={handleIOSDateConfirm}>
                    <Text style={styles.iosDoneButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={datePickerValue}
                  mode="date"
                  display="spinner"
                  maximumDate={new Date()}
                  onChange={onDateChange}
                  textColor="#000000"
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={datePickerValue}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={onDateChange}
          />
        )
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: {
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 25 : 70,
    paddingHorizontal: 25,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    position: "relative",
  },
  exitButton: {
    position: "absolute",
    top: Platform.OS === "android" ? StatusBar.currentHeight + 18 : 24,
    right: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  progressRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  stepWrapper: { flexDirection: "row", alignItems: "center" },
  stepCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: "center", alignItems: "center" },
  stepText: { fontWeight: "800", fontSize: 14 },
  stepLine: { width: 42, height: 2, backgroundColor: "rgba(255,255,255,0.1)", marginHorizontal: 8 },
  headerTitle: { fontSize: 28, fontWeight: "900", color: "#FFF", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.6)", marginTop: 6 },
  scrollContent: { paddingHorizontal: 25, paddingTop: 28, paddingBottom: 40 },
  avatarContainer: { alignSelf: "center", marginBottom: 32, position: 'relative' },
  avatarCircle: {
    width: 115,
    height: 115,
    borderRadius: 57.5,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  cameraBtn: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFF",
    elevation: 3,
  },
  form: { width: "100%" },
  label: { fontSize: 14, fontWeight: "700", color: "#334155", marginBottom: 10, marginLeft: 4 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 18,
    paddingHorizontal: 18,
    height: 60,
    marginBottom: 22,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: "#0F172A", fontSize: 15, fontWeight: "600" },
  textAreaWrapper: { height: 110, alignItems: "flex-start", paddingTop: 16 },
  textArea: { textAlignVertical: "top" },
  continueBtn: {
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    elevation: 4,
  },
  continueText: { color: "#FFF", fontSize: 18, fontWeight: "900", letterSpacing: 0.5 },
  bottomSafeArea: { backgroundColor: "#000" },

  /* CAMERA CROPPER DESIGN STYLES */
  cropperOverlay: { flex: 1, backgroundColor: "#000" },
  cropperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight + 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cropperCloseBtn: { padding: 4 },
  cropperTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  viewfinderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  cropBoxSquare: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#1E293B',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cropperPreviewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  gridLineH1: { position: 'absolute', top: '33.33%', left: 0, right: 0, height: 0.5, backgroundColor: 'rgba(255,255,255,0.4)' },
  gridLineH2: { position: 'absolute', top: '66.66%', left: 0, right: 0, height: 0.5, backgroundColor: 'rgba(255,255,255,0.4)' },
  gridLineV1: { position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: 0.5, backgroundColor: 'rgba(255,255,255,0.4)' },
  gridLineV2: { position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: 0.5, backgroundColor: 'rgba(255,255,255,0.4)' },
  cornerEdge: { position: 'absolute', width: 20, height: 20, borderColor: '#FFF', borderWidth: 0 },
  topLeftEdge: { top: 12, left: 12, borderTopWidth: 2.5, borderLeftWidth: 2.5 },
  topRightEdge: { top: 12, right: 12, borderTopWidth: 2.5, borderRightWidth: 2.5 },
  bottomLeftEdge: { bottom: 12, left: 12, borderBottomWidth: 2.5, borderLeftWidth: 2.5 },
  bottomRightEdge: { bottom: 12, right: 12, borderBottomWidth: 2.5, borderRightWidth: 2.5 },
  cropperBottomActions: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 20 },
  sourceButtonsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
  sourceActionItem: { alignItems: 'center' },
  sourceIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  sourceActionText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  applyCropButton: { height: 54, borderRadius: 27, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginHorizontal: 16 },
  applyCropText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  /* NEW: ALIGNED MODERN DIALOG MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)", // Sleek dark slate tint backdrop
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  modalDismissZone: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 15,
    fontWeight: "500",
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButton: {
    width: "100%",
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  /* NATIVE IOS DATE MODAL STYLES */
  iosDateModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  iosDatePickerContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  iosDatePickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 0.5, borderColor: '#E2E8F0' },
  iosDateTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  iosDoneButtonText: { fontSize: 16, fontWeight: '700', color: '#00A859' },
});

export default ProfileSetupScreen;