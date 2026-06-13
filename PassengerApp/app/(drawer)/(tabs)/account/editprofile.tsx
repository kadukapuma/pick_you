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
  StatusBar,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../../../src/hooks/useAuth";
import {
  PassengerProfile,
  ProfileService,
} from "../../../../src/services/auth/profileService";

const ProfileRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const STICKY_HEADER_HEIGHT = 56;
const COLLAPSE_THRESHOLD = 50;
const GAP_BETWEEN_HEADER_AND_FIRST_FIELD = 28; // 👈 desired space

export default function EditProfileScreen() {
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
      if (pickerResult.canceled || !pickerResult.assets?.length) return;
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
    scrollY.setValue(event.nativeEvent.contentOffset.y);
  };

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Animated Avatar */}
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
          // 👇 CRITICAL: Guaranteed gap below header
          paddingTop:
            insets.top +
            STICKY_HEADER_HEIGHT +
            GAP_BETWEEN_HEADER_AND_FIRST_FIELD +
            (isShortScreen ? 20 : 12),
          paddingBottom: contentBottomSpacing + 40,
          paddingHorizontal: 20,
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={40}
        enableAutomaticScroll={true}
        keyboardOpeningTime={0}
        viewIsInsideTabBar={false}
        resetScrollToCoords={{ x: 0, y: 0 }}
        bounces={false} // prevents overscroll on iOS
        overScrollMode="never" // prevents overscroll on Android
      >
        {isLoading ? (
          <View style={styles.centerBlock}>
            <ActivityIndicator size="small" color="#10B981" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerBlock}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Spacer to avoid absolute avatar overlapping the fields */}
            <View style={{ height: 120 }} />

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>First Name</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Enter your first name"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Enter your last name"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email (Optional)</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </View>

            <View style={styles.divider} />

            <ProfileRow
              label="Phone Number"
              value={profile?.phone || "Not provided"}
            />
            {profile?.walletBalance != null && (
              <ProfileRow
                label="Wallet Balance"
                value={`LKR ${Number(profile.walletBalance).toFixed(2)}`}
              />
            )}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSaveProfile}
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              disabled={isSaving}
            >
              <Text style={styles.saveText}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleLogout}
              style={styles.logoutButton}
            >
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F4FBFF",
  },
  stickyHeader: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 20,
    height: STICKY_HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stickyTitle: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  floatingAvatar: {
    position: "absolute",
    zIndex: 30,
    borderRadius: 999,
    overflow: "visible",
  },
  avatarRing: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: "#10B981",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  editBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  editBadgeButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#6B7280",
  },
  rowValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    maxWidth: "60%",
    textAlign: "right",
  },
  saveButton: {
    backgroundColor: "#10B981",
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.7,
    shadowOpacity: 0,
  },
  saveText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 28,
    paddingVertical: 14,
    borderRadius: 30,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  logoutText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "600",
  },
  centerBlock: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    color: "#6B7280",
    fontSize: 14,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
