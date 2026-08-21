import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenTransition from "../../../../components/ui/ScreenTransition";
import StudentAvatarRing from "../../../../components/ui/StudentAvatarRing";
import { useAuth } from "../../../../hooks/useAuth";
import { PassengerProfile, ProfileService } from "../../../../services/auth/profileApi";
import { StudentVerificationStatus } from "../../../../services/auth/studentVerificationApi";

type MenuItem = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  badge?: string;
  badgeColor?: string;
};

const studentRowByStatus: Record<StudentVerificationStatus, MenuItem> = {
  none: {
    title: "Apply for Student",
    subtitle: "Verify your student status to earn loyalty points",
    icon: "school-outline",
    route: "/(app)/(tabs)/account/student-verification",
  },
  pending: {
    title: "Student Verification",
    subtitle: "Your application is under review",
    icon: "school-outline",
    route: "/(app)/(tabs)/account/student-verification-pending",
    badge: "Pending",
    badgeColor: "#B7791F",
  },
  approved: {
    title: "Student Verification",
    subtitle: "You're a verified Student Passenger",
    icon: "school-outline",
    route: "/(app)/(tabs)/account/membership",
    badge: "You're a Student",
    badgeColor: "#0B8F62",
  },
  rejected: {
    title: "Student Verification",
    subtitle: "Not approved — tap to re-apply",
    icon: "school-outline",
    route: "/(app)/(tabs)/account/student-verification",
    badge: "Rejected",
    badgeColor: "#DC2626",
  },
};

const accountSections = (studentStatus: StudentVerificationStatus): { title: string; items: MenuItem[] }[] => [
  {
    title: "General",
    items: [
      { title: "Promotions", subtitle: "Offers and ride rewards", icon: "sparkles-outline", route: "/(app)/(tabs)/account/promotions" },
      { title: "Saved places", subtitle: "Home, work and favorite stops", icon: "location-outline", route: "/(app)/(tabs)/account/saved-addresses" },
      { title: "Membership", subtitle: "Level, points and benefits", icon: "ribbon-outline", route: "/(app)/(tabs)/account/membership" },
      studentRowByStatus[studentStatus],
    ],
  },
  {
    title: "Preferences",
    items: [
      { title: "Payments", subtitle: "Default method and payment security", icon: "card-outline", route: "/(app)/(tabs)/account/payments" },
      { title: "PickU credit", subtitle: "Balance, reserved credit and activity", icon: "wallet-outline", route: "/(app)/(tabs)/account/wallet" },
      { title: "Voucher redeem", subtitle: "Apply voucher and promo codes", icon: "ticket-outline", route: "/(app)/(tabs)/account/vouchers" },
      { title: "Help & support", subtitle: "Ride help and safety support", icon: "help-circle-outline", route: "/(app)/(tabs)/account/help-support" },
      { title: "About PickU", subtitle: "App information and terms", icon: "information-circle-outline", route: "/(app)/(tabs)/account/about" },
    ],
  },
];


export default function AccountMenuScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [loadedProfile, setLoadedProfile] = useState<PassengerProfile | null>(null);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      ProfileService.getProfile().then((result) => {
        if (mounted && result.success && result.data) {
          setLoadedProfile(result.data);
        }
      });
      return () => {
        mounted = false;
      };
    }, []),
  );

  const profile = loadedProfile || (user ? ProfileService.fromStoredUser(user) : null);
  const isVerifiedStudent = profile?.studentStatus === "approved";
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "PickU Passenger";
  const initials = fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}> 
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>Profile</Text>

        <ScreenTransition>
        <View style={styles.profileHeader}>
          <StudentAvatarRing active={isVerifiedStudent} size={58} ringWidth={3} style={styles.avatarOuterSpacing}>
            <TouchableOpacity
              style={styles.avatarOuter}
              onPress={() => router.push("/(app)/(tabs)/account/profile" as any)}
              activeOpacity={0.86}
            >
              {profile?.profileImage ? (
                <Image source={{ uri: profile.profileImage }} style={styles.avatarImage} resizeMode="cover" />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
              <View style={styles.editBadge}>
                <Ionicons name="pencil" size={13} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </StudentAvatarRing>

          <TouchableOpacity
            style={styles.profileCopy}
            onPress={() => router.push("/(app)/(tabs)/account/profile" as any)}
            activeOpacity={0.86}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.profileName} numberOfLines={1}>{fullName}</Text>
              {isVerifiedStudent && (
                <View style={styles.studentInlineBadge}>
                  <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                </View>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileEditButton}
            onPress={() => router.push("/(app)/(tabs)/account/profile" as any)}
            activeOpacity={0.84}
          >
            <Ionicons name="create-outline" size={19} color="#063D31" />
          </TouchableOpacity>
        </View>


        {accountSections(profile?.studentStatus || "none").map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item) => (
              <TouchableOpacity
                key={item.title}
                style={styles.menuItem}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.84}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name={item.icon} size={22} color="#063D31" />
                </View>
                <View style={styles.menuTextBlock}>
                  <Text style={styles.menuTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.menuSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                </View>
                {item.badge ? (
                  <View style={[styles.badge, { backgroundColor: `${item.badgeColor}1A` }]}>
                    <Text style={[styles.badgeText, { color: item.badgeColor }]} numberOfLines={1}>
                      {item.badge}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.chevronWrap}>
                    <Ionicons name="chevron-forward" size={19} color="#9AA9A4" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
        </ScreenTransition>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2FBF8" },
  content: { paddingHorizontal: 18, paddingBottom: 112 },
  screenTitle: { color: "#18231F", fontSize: 24, fontWeight: "900", marginTop: 4, marginBottom: 20 },
  profileHeader: {
    minHeight: 84,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.58)",
    borderWidth: 1,
    borderColor: "rgba(153,177,169,0.30)",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 14,
  },
  avatarOuter: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#DDF7ED",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  avatarOuterSpacing: {
    marginRight: 14,
  },
  avatarImage: { width: 58, height: 58, borderRadius: 29 },
  avatarFallback: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", backgroundColor: "#DDF7ED" },
  avatarText: { color: "#063D31", fontSize: 18, fontWeight: "900" },
  studentInlineBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#0B9E54",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  editBadge: {
    position: "absolute",
    right: -2,
    bottom: 0,
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: "#063D31",
    borderWidth: 2,
    borderColor: "#F2FBF8",
    alignItems: "center",
    justifyContent: "center",
  },
  profileCopy: { flex: 1, minWidth: 0 },
  profileName: { color: "#18231F", fontSize: 19, fontWeight: "900" },
  profileEditButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(153,177,169,0.42)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  section: { marginBottom: 24 },
  sectionTitle: { color: "#6A7772", fontSize: 13, fontWeight: "800", marginBottom: 10 },
  menuItem: {
    height: 72,
    borderRadius: 18,
    backgroundColor: "transparent",
    borderWidth: 1.2,
    borderColor: "rgba(153,177,169,0.38)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 10,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(11,158,84,0.08)", alignItems: "center", justifyContent: "center", marginRight: 14 },
  menuTextBlock: { flex: 1, minWidth: 0, justifyContent: "center" },
  menuTitle: { color: "#28342F", fontSize: 15, lineHeight: 20, fontWeight: "800" },
  menuSubtitle: { color: "#71817B", fontSize: 12, lineHeight: 16, fontWeight: "600", marginTop: 2 },
  chevronWrap: { width: 28, height: 40, marginLeft: 8, alignItems: "flex-end", justifyContent: "center" },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginLeft: 8, maxWidth: 110 },
  badgeText: { fontSize: 11, fontWeight: "800" },
});













