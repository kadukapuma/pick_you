import AccountOptionScreen, { AccountNoticeCard } from "../../../../features/account/AccountOptionScreen";

export default function PromotionsScreen() {
  return (
    <AccountOptionScreen
      title="Promotions"
      subtitle="View active ride offers, campaign rewards and eligible discounts. Backend promotion rules can connect here later."
      icon="megaphone-outline"
      rows={[
        { label: "Available offers", value: "2" },
        { label: "Best ride discount", value: "10% off" },
        { label: "Status", value: "Ready to use" },
      ]}
    >
      <AccountNoticeCard title="Weekend ride offer" text="Save on selected city rides. The final discount will be validated by backend before booking." icon="pricetag-outline" />
      <AccountNoticeCard title="Refer and earn" text="Invite friends and earn ride credit when referral support is connected." icon="people-outline" />
    </AccountOptionScreen>
  );
}
