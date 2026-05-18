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
  const [dateParts, setDateParts] = useState({ day: "", month: "", year: "" });
  const [datePickerValue, setDatePickerValue] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);

  const BRAND_GREEN = "#0B1220";
  const DARK_BG = "#00A859";

  // Load data from local storage on mount
  useEffect(() => {
    loadFormData();
  }, []);

  const pickProfilePicture = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert("Permission required", "Please allow gallery access to select a profile picture.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      setProfilePicture(asset.uri);

      const formData = new FormData();
      formData.append("profile_picture", {
        uri: asset.uri,
        name: asset.fileName || `profile_${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
      });

      setIsUploadingPhoto(true);
      const response = await api.post("/user/profile-picture", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data?.data?.profile_picture_path) {
        await AsyncStorage.setItem(
          "profilePicturePath",
          response.data.data.profile_picture_path,
        );
      }

      Alert.alert("Success", "Profile picture updated successfully.");
    } catch (error) {
      console.log("Profile picture upload error:", error.response?.data || error.message);
      Alert.alert(
        "Upload Failed",
        error.response?.data?.message || "Could not upload profile picture. Please try again.",
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const loadFormData = async () => {
    try {
      const savedData = await AsyncStorage.getItem("profileFormData");
      if (savedData) {
        setFormData(JSON.parse(savedData));
      }
    } catch (error) {
      console.log("Error loading form data:", error);
    }
  };

  const saveFormData = async (updatedData) => {
    try {
      await AsyncStorage.setItem(
        "profileFormData",
        JSON.stringify(updatedData),
      );
    } catch (error) {
      console.log("Error saving form data:", error);
    }
  };

  const handleInputChange = (field, value) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    saveFormData(updatedData);
  };

  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDateSelect = () => {
    const { day, month, year } = dateParts;
    if (!day || !month || !year) {
      Alert.alert("Invalid Date", "Please enter a valid day, month, and year.");
      return;
    }

    const d = parseInt(day);
    const m = parseInt(month);
    const y = parseInt(year);

    if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > new Date().getFullYear()) {
      Alert.alert("Invalid Date", "Please enter a valid date.");
      return;
    }

    const formattedDate = `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
    handleInputChange("dob", formattedDate);
    setShowDatePicker(false);
  };

  const openDatePicker = () => {
    if (formData.dob) {
      const [d, m, y] = formData.dob.split("/");
      const parsed = new Date(`${y}-${m}-${d}`);
      if (!isNaN(parsed.getTime())) setDatePickerValue(parsed);
    } else {
      setDatePickerValue(new Date());
    }
    setShowDatePicker(true);
  };

  const handleContinue = async () => {
    if ( !formData.nic || !formData.dob || !formData.address) {
      Alert.alert("Required Fields", "Please fill in all the details before continuing.");
      return;
    }

    try {
      setIsLoading(true);

      // Convert DD/MM/YYYY to YYYY-MM-DD for the backend
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
        // Success - move to next step
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

  const onDateChange = (event, selectedDate) => {
    const current = selectedDate || datePickerValue;
    if (Platform.OS === 'android') {
      if (event?.type === 'dismissed') {
        setShowDatePicker(false);
        return;
      }

      setDatePickerValue(current);
      const d = String(current.getDate()).padStart(2, '0');
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const y = String(current.getFullYear());
      handleInputChange('dob', `${d}/${m}/${y}`);
      setShowDatePicker(false);
      return;
    }

    // iOS spinner: update value but keep modal open until user taps Done
    setDatePickerValue(current);
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
      <StatusBar
        barStyle="light-content"
        backgroundColor={DARK_BG}
        translucent
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: DARK_BG }]}>
        <ExitButton onPress={onExit} style={styles.exitButton} />
        {/* Progress */}
        <View style={styles.progressRow}>{renderSteps()}</View>

        <MotiText
          from={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.headerTitle}
        >
          {currentStep === 1
            ? "Driver Profile"
            : currentStep === 2
              ? "Vehicle Details"
              : "Documents"}
        </MotiText>

        <Text style={styles.headerSubtitle}>
          {currentStep === 1
            ? "Let's set up your personal profile"
            : "Tell us about your vehicle"}
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
            onPress={pickProfilePicture}
            disabled={isUploadingPhoto}
          >
            {isUploadingPhoto ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Feather name="camera" size={16} color="#FFF" />
            )}
          </TouchableOpacity>
        </MotiView>

        {/* Form */}
        <View style={styles.form}>
          {/* Name */}
          <MotiView
            from={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 100 }}
          >
            {/* <Text style={styles.label}>Full Name</Text>

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor="#94A3B8"
                value={formData.name}
                onChangeText={(val) => handleInputChange("name", val)}
              />
            </View> */}
          </MotiView>

          {/* NIC */}
          <MotiView
            from={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 200 }}
          >
            <Text style={styles.label}>National ID / License Number</Text>

            <View style={styles.inputWrapper}>
              <Feather
                name="credit-card"
                size={18}
                color="#94A3B8"
                style={styles.inputIcon}
              />

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
          <MotiView
            from={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 300 }}
          >
            <Text style={styles.label}>Date of Birth</Text>

            <TouchableOpacity
              style={styles.inputWrapper}
              onPress={openDatePicker}
            >
              <Feather
                name="calendar"
                size={18}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <Text
                style={[
                  styles.input,
                  {
                    color: formData.dob ? "#0F172A" : "#94A3B8",
                    paddingVertical: 0,
                  },
                ]}
              >
                {formData.dob || "DD / MM / YYYY"}
              </Text>
            </TouchableOpacity>
          </MotiView>

          {/* Address */}
          <MotiView
            from={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 400 }}
          >
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

          {/* Button */}
          <MotiView
            from={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 500,
              type: "timing",
            }}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.continueBtn, { backgroundColor: BRAND_GREEN }]}
              onPress={handleContinue}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.continueText}>Continue</Text>
              )}
            </TouchableOpacity>
          </MotiView>
        </View>
      </KeyboardAwareWrapper>

      {/* Bottom Safe Area */}
      <SafeAreaView edges={["bottom"]} style={styles.bottomSafeArea} />

      {/* Date Picker Modal */}
      <Modal
        transparent
        animationType="fade"
        visible={showDatePicker}
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
          <View style={styles.datePickerOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerHeader}>
                  <Text style={styles.datePickerTitle}>
                    Select Date of Birth
                  </Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Feather name="x" size={24} color="#0F172A" />
                  </TouchableOpacity>
                </View>

                <View style={styles.datePickerContent}>
                  <DateTimePicker
                    value={datePickerValue}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    maximumDate={new Date()}
                    onChange={onDateChange}
                    style={{ width: '100%' }}
                  />
                </View>

                <View style={styles.datePickerActions}>
                  <TouchableOpacity
                    style={styles.datePickerBtn}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.datePickerBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.datePickerBtn,
                      { backgroundColor: BRAND_GREEN },
                    ]}
                    onPress={() => {
                      const d = String(datePickerValue.getDate()).padStart(2, '0');
                      const m = String(datePickerValue.getMonth() + 1).padStart(2, '0');
                      const y = String(datePickerValue.getFullYear());
                      handleInputChange('dob', `${d}/${m}/${y}`);
                      setShowDatePicker(false);
                    }}
                  >
                    <Text style={[styles.datePickerBtnText, { color: "#FFF" }]}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },

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

  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    marginBottom: 24,
  },

  stepWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },

  stepCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,

    justifyContent: "center",
    alignItems: "center",
  },

  stepText: {
    fontWeight: "800",
    fontSize: 14,
  },

  stepLine: {
    width: 42,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 8,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -0.5,
  },

  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginTop: 6,
  },

  scrollContent: {
    paddingHorizontal: 25,
    paddingTop: 28,
    paddingBottom: 40,
  },

  avatarContainer: {
    alignSelf: "center",
    marginBottom: 32,
  },

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

  avatarImage: {
    width: "100%",
    height: "100%",
  },

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

  form: {
    width: "100%",
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",

    marginBottom: 10,
    marginLeft: 4,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#F1F5F9",

    borderRadius: 18,

    paddingHorizontal: 18,

    height: 60,

    marginBottom: 22,
  },

  inputIcon: {
    marginRight: 12,
  },

  input: {
    flex: 1,
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "600",
  },

  textAreaWrapper: {
    height: 110,
    alignItems: "flex-start",
    paddingTop: 16,
  },

  textArea: {
    textAlignVertical: "top",
  },

  continueBtn: {
    height: 64,
    borderRadius: 20,

    justifyContent: "center",
    alignItems: "center",

    marginTop: 10,

    shadowColor: "#00A859",
    shadowOffset: {
      width: 0,
      height: 8,
    },

    shadowOpacity: 0.3,
    shadowRadius: 12,

    elevation: 8,
  },

  continueText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  bottomSafeArea: {
    backgroundColor: "#000",
  },

  // Date Picker Styles
  datePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },

  datePickerContainer: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },

  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },

  datePickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },

  datePickerContent: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
  },

  dateInputGroup: {
    alignItems: "center",
    flex: 1,
  },

  dateLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 8,
  },

  dateNumberInput: {
    width: "90%",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },

  dateInput: {
    width: "100%",
    height: 50,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    color: "#0F172A",
  },

  datePickerActions: {
    flexDirection: "row",
    gap: 12,
  },

  datePickerBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },

  datePickerBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
});

export default ProfileSetupScreen;
