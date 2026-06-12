import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  StyleSheet,
  TextInput,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../../src/hooks/useAuth";
import {
  PassengerProfile,
  ProfileService,
} from "../../../src/services/auth/profileService";

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const STICKY_HEADER_HEIGHT = 56;
const COLLAPSE_THRESHOLD = 50;

export default function AccountScreen() {
  const { logout } = useAuth();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const [profile, setProfile] = useState<PassengerProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await ProfileService.getProfile();

      console.log("=== PROFILE API RESPONSE ===");
      console.log("Success:", result.success);
      console.log("Full result:", JSON.stringify(result, null, 2));

      if (result.success && result.data) {
        console.log("=== PROFILE IMAGE DEBUG ===");
        console.log("profileImage value:", result.data.profileImage);
        console.log("profileImage type:", typeof result.data.profileImage);

        if (
          result.data.profileImage &&
          !result.data.profileImage.startsWith("http")
        ) {
          console.warn("⚠️ Relative URL detected:", result.data.profileImage);
        } else if (!result.data.profileImage) {
          console.warn("⚠️ No profileImage in response");
        }

        setProfile(result.data);
        setFirstName(result.data.firstName || "");
        setLastName(result.data.lastName || "");
        setEmail(result.data.email || "");
      } else {
        setError(result.message || "Failed to load profile");
      }
    } catch (err: any) {
      console.error("Load profile error:", err);
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

  const isShortScreen = height < 760;
  const contentBottomSpacing = tabBarHeight + insets.bottom + 20;
  const avatarSize = 110;
  const compactAvatarSize = 34;
  const expandedLeft = (width - avatarSize) / 2;
  const expandedTop = insets.top + STICKY_HEADER_HEIGHT + 52;
  const compactLeft = width - 20 - compactAvatarSize;
  const compactTop = insets.top + 11;
  const avatarProgress = scrollY.interpolate({
    inputRange: [0, COLLAPSE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const floatingAvatarTranslateX = avatarProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [
      0,
      compactLeft - expandedLeft - (avatarSize - compactAvatarSize) / 2,
    ],
    extrapolate: "clamp",
  });
  const floatingAvatarTranslateY = avatarProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [
      0,
      compactTop - expandedTop - (avatarSize - compactAvatarSize) / 2,
    ],
    extrapolate: "clamp",
  });
  const floatingAvatarScale = avatarProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, compactAvatarSize / avatarSize],
    extrapolate: "clamp",
  });

  const handleScroll = (event: any) => {
    const offsetY = event?.nativeEvent?.contentOffset?.y ?? 0;
    scrollY.setValue(offsetY);
  };

  return (
    <View className="flex-1 bg-[#F4FBFF] px-5">
      <View
        style={[
          styles.stickyHeader,
          {
            top: insets.top + 2,
          },
        ]}
      >
        <Text style={styles.stickyTitle}>Profile</Text>
      </View>

      {/* Avatar with edit button - ALWAYS VISIBLE */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.floatingAvatar,
          {
            width: avatarSize,
            height: avatarSize,
            top: expandedTop,
            left: expandedLeft,
            transform: [
              { translateX: floatingAvatarTranslateX },
              { translateY: floatingAvatarTranslateY },
              { scale: floatingAvatarScale },
            ],
          },
        ]}
      >
        <View style={styles.avatarRing}>
          {profile?.profileImage ? (
            <Image
              source={{ uri: profile.profileImage }}
              style={styles.avatar}
              onLoad={() =>
                console.log(
                  "✅ IMAGE LOADED SUCCESSFULLY:",
                  profile.profileImage,
                )
              }
              onError={(e) =>
                console.log(
                  "❌ IMAGE FAILED TO LOAD:",
                  profile.profileImage,
                  e.nativeEvent,
                )
              }
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={50} color="#9CA3AF" />
            </View>
          )}
        </View>
        <View style={styles.editBadge}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handlePickAndUploadImage}
            disabled={isUploadingImage}
            style={styles.editBadgeButton}
          >
            <Ionicons name="pencil" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "flex-start",
          paddingTop:
            insets.top + STICKY_HEADER_HEIGHT + (isShortScreen ? 20 : 12),
          paddingBottom: contentBottomSpacing,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={24}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.pageContent}>
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
            <View>
              <View style={styles.avatarSpacer} />

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
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pageContent: {
    paddingHorizontal: 2,
    paddingBottom: 8,
  },
  stickyHeader: {
    position: "absolute",
    left: 2,
    right: 2,
    zIndex: 20,
    height: STICKY_HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stickyTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "800",
  },
  topAvatarWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  topAvatar: {
    width: "100%",
    height: "100%",
  },
  topAvatarPlaceholder: {
    flex: 1,
    backgroundColor: "#D1D5DB",
  },
  floatingAvatar: {
    position: "absolute",
    zIndex: 30,
    borderRadius: 45,
    overflow: "visible",
  },
  avatarSpacer: {
    height: 170,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 55,
  },
  avatarRing: {
    flex: 1,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: "#10B981",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: "#10B981",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
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
  editBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  editBadgeButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
