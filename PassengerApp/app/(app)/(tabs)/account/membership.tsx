import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import AccountOptionScreen, { AccountNoticeCard } from "../../../../features/account/AccountOptionScreen";
import { PassengerProfile, ProfileService } from "../../../../services/auth/profileApi";

export default function MembershipScreen() {
  const [profile, setProfile] = useState<PassengerProfile | null>(null);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      ProfileService.getProfile().then((result) => {
        if (mounted && result.success && result.data) {
          setProfile(result.data);
        }
      });
      return () => {
        mounted = false;
      };
    }, []),
  );

  const isStudent = profile?.studentStatus === "approved";
  const points = profile?.loyaltyPointsBalance ?? 0;

  return (
    <AccountOptionScreen
      title="Membership"
      subtitle="Track passenger benefits, rewards level and loyalty points for ride bookings."
      icon="ribbon-outline"
      rows={[
        { label: "Current level", value: isStudent ? "Student" : "Green" },
        { label: "Ride points", value: points.toFixed(2) },
        { label: "Next benefit", value: "Priority offers" },
      ]}
    >
      <AccountNoticeCard
        title={isStudent ? "Student benefits" : "Member benefits"}
        text={
          isStudent
            ? "As a verified Student Passenger, the ride commission on every trip is credited to you as loyalty points."
            : "Apply for student verification from your profile to start earning loyalty points on every ride."
        }
        icon="sparkles-outline"
      />
    </AccountOptionScreen>
  );
}
