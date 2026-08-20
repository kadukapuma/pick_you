import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
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
import DelayedLoader from "../../../../components/ui/DelayedLoader";
import ScreenTransition from "../../../../components/ui/ScreenTransition";
import ThemeButton from "../../../../components/ui/ThemeButton";
import { useAuth } from "../../../../hooks/useAuth";
import {
  PassengerProfile,
  ProfileService,
} from "../../../../services/auth/profileApi";

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
            router.replace("/(auth)/sign-in");
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
  const headerSurfaceHeight = insets.top + STICKY_HEADER_HEIGHT + 12;
  const expandedTop = headerSurfaceHeight + 46;
  const compactLeft = width - 20 - compactAvatarSize;
  const compactTop = insets.top + 15;
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
    <View style={styles.screen}>
      <View
        style={[
          styles.stickyHeader,
          {
            top: 0,
            height: headerSurfaceHeight,
            paddingTop: insets.top + 8,
            justifyContent: "flex-start",
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginRight: 16 }}
        >
          <Ionicons name="arrow-back" size={22} color="#063D31" />
        </TouchableOpacity>
        <Text style={styles.stickyTitle}>Edit profile</Text>
      </View>

      {!isLoading && !error ? (
        <>
          {/* Avatar with edit button - visible after profile loads */}
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
        {profile?.studentStatus === "approved" && (
          <LinearGradient
            colors={["#8FE3A6", "#0B9E54", "#04502B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.studentRingOverlay}
          />
        )}
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
        </>
      ) : null}

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "flex-start",
          paddingTop:
            headerSurfaceHeight + (isShortScreen ? 22 : 14),
          paddingBottom: contentBottomSpacing,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={24}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <ScreenTransition style={styles.pageContent}>
          {isLoading ? (
            <View style={[styles.centerBlock, styles.loadingBlock]}>
              <DelayedLoader label="Loading profile" delayMs={80} />
            </View>
          ) : error ? (
            <View style={styles.centerBlock}>
              <Text style={styles.errorText}>{error}</Text>
              <ThemeButton
                label="Retry"
                onPress={loadProfile}
                size="medium"
                variant="outline"
                style={styles.retryButton}
              />
            </View>
          ) : (
            <View>
              <View style={styles.avatarSpacer} />

              <View style={styles.formIntro}>
                <Text style={styles.formTitle}>Personal details</Text>
                <Text style={styles.formSubtitle}>Keep your passenger profile accurate for ride support and receipts.</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name</Text>
                <View style={styles.inputShell}>
                  <Ionicons name="person-outline" size={22} color="#063D31" />
                  <TextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="First name"
                    style={styles.input}
                    placeholderTextColor="#95A7A0"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <View style={styles.inputShell}>
                  <Ionicons name="person-circle-outline" size={22} color="#063D31" />
                  <TextInput
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Last name"
                    style={styles.input}
                    placeholderTextColor="#95A7A0"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email (Optional)</Text>
                <View style={styles.inputShell}>
                  <Ionicons name="mail-outline" size={22} color="#063D31" />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                    placeholderTextColor="#95A7A0"
                  />
                </View>
              </View>

              <ProfileRow label="Phone Number" value={profile?.phone || "-"} />

              {profile?.walletBalance !== null &&
                profile?.walletBalance !== undefined ? (
                <ProfileRow
                  label="Wallet Balance"
                  value={`LKR ${Number(profile.walletBalance).toFixed(2)}`}
                />
              ) : null}
              <ThemeButton
                label={isSaving ? "Saving..." : "Save Profile"}
                onPress={handleSaveProfile}
                loading={isSaving}
                variant="primary"
                style={styles.saveButton}
              />
            </View>
          )}

          {!isLoading && !error ? (
            <ThemeButton
              label="Logout"
              onPress={handleLogout}
              icon="log-out-outline"
              variant="danger"
              style={styles.logoutButton}
            />
          ) : null}
        </ScreenTransition>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3FAF7",
    paddingHorizontal: 20,
  },
  pageContent: {
    paddingHorizontal: 2,
    paddingBottom: 8,
  },
  stickyHeader: {
    position: "absolute",
    left: 2,
    right: 2,
    zIndex: 20,
    backgroundColor: "#F3FAF7",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(221,235,229,0.85)",
    height: STICKY_HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stickyTitle: {
    color: "#063D31",
    fontSize: 20,
    fontWeight: "900",
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
  studentRingOverlay: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 9999,
  },
  avatarSpacer: {
    height: 168,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    backgroundColor: "#E8F8F0",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 55,
  },
  avatarRing: {
    flex: 1,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: "#063D31",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  formIntro: {
    marginBottom: 20,
  },
  formTitle: {
    color: "#063D31",
    fontSize: 18,
    fontWeight: "900",
  },
  formSubtitle: {
    color: "#64746E",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 18,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: "#50665F",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 6,
  },
  inputShell: {
    minHeight: 72,
    borderWidth: 1.3,
    borderColor: "rgba(153,177,169,0.46)",
    borderRadius: 24,
    backgroundColor: "transparent",
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  input: {
    flex: 1,
    color: "#063D31",
    fontSize: 17,
    fontWeight: "800",
    paddingVertical: 0,
  },
  row: {
    minHeight: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(221,235,229,0.7)",
  },
  saveButton: {
    marginTop: 10,
  },
  rowLabel: {
    color: "#64746E",
    fontSize: 15,
    fontWeight: "600",
  },
  rowValue: {
    color: "#063D31",
    fontSize: 15,
    fontWeight: "700",
    maxWidth: "58%",
    textAlign: "right",
  },
  centerBlock: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  loadingBlock: {
    minHeight: 420,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 10,
  },
  retryButton: {
    minWidth: 124,
  },
  logoutButton: {
    marginTop: 14,
  },
  editBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0B8F62",
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

















