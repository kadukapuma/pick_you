import AccountOptionScreen, { AccountNoticeCard } from "../../../../features/account/AccountOptionScreen";

export default function HelpSupportScreen() {
  return (
    <AccountOptionScreen
      title="Help & support"
      subtitle="Get help for rides, payments, safety, lost items and account issues."
      icon="help-circle-outline"
      rows={[
        { label: "Ride help", value: "Available" },
        { label: "Safety", value: "24/7" },
        { label: "Support tickets", value: "Coming soon" },
      ]}
    >
      <AccountNoticeCard title="Ride support" text="Trip-specific help already opens from ride details. Account-level tickets can connect here later." icon="chatbubbles-outline" />
      <AccountNoticeCard title="Safety support" text="Emergency and trusted contact tools can be linked to active rides." icon="shield-checkmark-outline" />
    </AccountOptionScreen>
  );
}
