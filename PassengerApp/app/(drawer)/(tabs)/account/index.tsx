import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProfileService, PassengerProfile } from "../../../../src/services/auth/profileService";

// ----- Reusable Components -----
const MenuItem = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <TouchableOpacity style={styles.menuItem}>
    <View style={styles.menuLeft}>
      {icon}
      <Text style={styles.menuText}>{title}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
  </TouchableOpacity>
);

const ProgressCard = () => (
  <View style={styles.card}>
    <View style={styles.rowBetween}>
      <Text style={styles.progressText}>6 of 10 complete</Text>
      <Text style={styles.completeNow}>Complete now</Text>
    </View>
    <View style={styles.progressBarBackground}>
      <View style={[styles.progressBarFill, { width: "60%" }]} />
    </View>
    <Text style={styles.cardDescription}>
      Additional information you give will help us provide you with a more
      personalised experience.
    </Text>
  </View>
);

const PromotionCard = () => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>Don't miss out your valuable promotions</Text>
    <Text style={styles.promotionCount}>You have 101 ongoing promotions</Text>
    <TouchableOpacity style={styles.claimButton}>
      <Text style={styles.claimText}>Claim now</Text>
    </TouchableOpacity>
  </View>
);

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<PassengerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const result = await ProfileService.getProfile();
      if (result.success && result.data) {
        setProfile(result.data);
      } else {
        console.warn("Failed to load profile", result.message);
      }
    } catch (error) {
      console.error("Error loading profile", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Reload when screen comes into focus (after returning from edit profile)
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const goToEditProfile = () => {
    router.push("/(drawer)/(tabs)/account/editprofile");
  };

  const fullName = profile
    ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim()
    : "Piuminda Jayaweera";

  const avatarUrl = profile?.profileImage
    ? profile.profileImage
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=10B981&color=fff&rounded=true&size=120`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 30,
        }}
      >
        {/* Centered Profile Section */}
        <View style={[styles.profileContainer, { marginTop: insets.top + 10 }]}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#10B981" style={styles.loader} />
          ) : (
            <>
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              <TouchableOpacity style={styles.nameRow} onPress={goToEditProfile} activeOpacity={0.7}>
                <Text style={styles.name}>{fullName || "User"}</Text>
                <Ionicons name="chevron-forward" size={20} color="#10B981" />
              </TouchableOpacity>
            </>
          )}
          <View style={styles.memberBadge}>
            <Text style={styles.memberText}>BLUE MEMBER</Text>
          </View>
        </View>

        <ProgressCard />
        <PromotionCard />

        <MenuItem
          icon={<MaterialCommunityIcons name="account-star-outline" size={24} color="#10B981" />}
          title="Membership"
        />
        <MenuItem icon={<Feather name="help-circle" size={24} color="#10B981" />} title="Help and Support" />
        <MenuItem icon={<Feather name="heart" size={24} color="#10B981" />} title="Saved Addresses" />
        <MenuItem icon={<Ionicons name="car-outline" size={24} color="#10B981" />} title="Earn with PickMe" />
        <MenuItem icon={<Feather name="credit-card" size={24} color="#10B981" />} title="Payment" />
        <MenuItem icon={<Ionicons name="information-circle-outline" size={24} color="#10B981" />} title="About Us" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4FBFF",
  },
  profileContainer: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#10B981",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  memberBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 30,
    alignSelf: "center",
  },
  memberText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  loader: {
    marginVertical: 30,
  },
  // --- Card styles (same as before) ---
  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  completeNow: {
    color: "#10B981",
    fontWeight: "600",
    fontSize: 14,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    marginTop: 16,
  },
  progressBarFill: {
    height: 8,
    backgroundColor: "#10B981",
    borderRadius: 10,
  },
  cardDescription: {
    marginTop: 16,
    color: "#6B7280",
    lineHeight: 20,
    fontSize: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  promotionCount: {
    marginTop: 12,
    color: "#10B981",
    fontSize: 15,
    fontWeight: "600",
  },
  claimButton: {
    marginTop: 16,
    alignSelf: "flex-end",
    backgroundColor: "#10B981",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
  },
  claimText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  menuItem: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 18,
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuText: {
    marginLeft: 14,
    fontSize: 17,
    fontWeight: "500",
    color: "#1F2937",
  },
});