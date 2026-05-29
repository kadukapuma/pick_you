import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  TextInput,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import HomeHeader from "../../components/home/HomeHeader";
import { useAuth } from "../../hooks/useAuth";
import {
  PassengerProfile,
  ProfileService,
} from "../../services/auth/profileService";

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function AccountScreen() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<PassengerProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await ProfileService.getProfile();
      if (result.success && result.data) {
        setProfile(result.data);
        setFirstName(result.data.firstName || "");
        setLastName(result.data.lastName || "");
        setEmail(result.data.email || "");
      } else {
        setError(result.message || "Failed to load profile");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Validation", "First name and last name are required.");
      return;
    }

    try {
      setIsSaving(true);
      const result = await ProfileService.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || null,
      });

      if (result.success && result.data) {
        setProfile(result.data);
        setFirstName(result.data.firstName || "");
        setLastName(result.data.lastName || "");
        setEmail(result.data.email || "");
        Alert.alert(
          "Success",
          result.message || "Profile updated successfully",
        );
      } else {
        Alert.alert("Error", result.message || "Failed to update profile");
      }
    } catch (saveError: any) {
      Alert.alert("Error", saveError?.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickAndUploadImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission",
          "Please allow gallery access to upload photo.",
        );
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (pickerResult.canceled || !pickerResult.assets?.length) {
        return;
      }

      const imageUri = pickerResult.assets[0].uri;
      setIsUploadingImage(true);

      const result = await ProfileService.uploadProfilePicture(imageUri);

      if (result.success && result.data) {
        setProfile(result.data);
        Alert.alert("Success", result.message || "Profile image updated");
      } else {
        Alert.alert(
          "Error",
          result.message || "Failed to upload profile image",
        );
      }
    } catch (imageError: any) {
      Alert.alert(
        "Error",
        imageError?.message || "Failed to upload profile image",
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            router.replace("/(auth)/signin");
          } catch (e) {
            Alert.alert("Error", "Failed to logout. Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-[#F4FBFF] px-5 pt-12">
      <HomeHeader />

      <View className="flex-1 justify-center">
        <View style={styles.card}>
          <Text style={styles.title}>Passenger Profile</Text>
          <Text style={styles.subtitle}>Your basic account information</Text>

          {isLoading ? (
            <View style={styles.centerBlock}>
              <ActivityIndicator size="small" color="#0EA5E9" />
              <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerBlock}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={loadProfile}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.profileBlock}>
              <View style={styles.avatarWrap}>
                {profile?.profileImage ? (
                  <Image
                    source={{ uri: profile.profileImage }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={30} color="#9CA3AF" />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={handlePickAndUploadImage}
                  disabled={isUploadingImage}
                >
                  <Text style={styles.imageButtonText}>
                    {isUploadingImage ? "Uploading..." : "Change Photo"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name</Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  style={styles.input}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  style={styles.input}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email (Optional)</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                />
              </View>

              <ProfileRow label="Phone Number" value={profile?.phone || "-"} />

              {profile?.walletBalance !== null &&
              profile?.walletBalance !== undefined ? (
                <ProfileRow
                  label="Wallet Balance"
                  value={`LKR ${Number(profile.walletBalance).toFixed(2)}`}
                />
              ) : null}

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSaveProfile}
                style={styles.saveButton}
                disabled={isSaving}
              >
                <Text style={styles.saveText}>
                  {isSaving ? "Saving..." : "Save Profile"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 22,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  title: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "800",
  },
  subtitle: {
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 16,
  },
  profileBlock: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#F9FAFB",
  },
  avatarWrap: {
    alignItems: "center",
    marginBottom: 14,
    paddingTop: 8,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 10,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
  },
  imageButton: {
    backgroundColor: "#0EA5E9",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  imageButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#111827",
    fontSize: 14,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: "#10B981",
    borderRadius: 14,
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: 12,
  },
  saveText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  rowLabel: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },
  rowValue: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "700",
    maxWidth: "58%",
    textAlign: "right",
  },
  centerBlock: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    color: "#6B7280",
    fontSize: 13,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: "#0EA5E9",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  logoutButton: {
    alignItems: "center",
    backgroundColor: "#EF4444",
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 18,
    paddingVertical: 14,
  },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginLeft: 8,
  },
});
