import AccountOptionScreen, { AccountNoticeCard } from "../../../../features/account/AccountOptionScreen";

export default function AboutScreen() {
  return (
    <AccountOptionScreen
      title="About PickU"
      subtitle="PickU passenger app information, company details, terms and app version."
      icon="information-circle-outline"
      rows={[
        { label: "App", value: "PickU Passenger" },
        { label: "Version", value: "1.0.0" },
        { label: "Service", value: "Ride booking" },
      ]}
    >
      <AccountNoticeCard title="Your Everyday Partner" text="This screen is ready for legal pages, privacy policy, terms and app release details." icon="leaf-outline" />
    </AccountOptionScreen>
  );
}
