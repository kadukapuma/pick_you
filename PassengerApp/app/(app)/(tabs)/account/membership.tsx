import AccountOptionScreen, { AccountNoticeCard } from "../../../../features/account/AccountOptionScreen";

export default function MembershipScreen() {
  return (
    <AccountOptionScreen
      title="Membership"
      subtitle="Track passenger benefits, rewards level and future loyalty points for ride bookings."
      icon="ribbon-outline"
      rows={[
        { label: "Current level", value: "Green" },
        { label: "Ride points", value: "120" },
        { label: "Next benefit", value: "Priority offers" },
      ]}
    >
      <AccountNoticeCard title="Member benefits" text="This screen is ready for loyalty points, tier upgrades and ride reward APIs." icon="sparkles-outline" />
    </AccountOptionScreen>
  );
}
