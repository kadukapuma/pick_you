import { router } from "expo-router";
import AccountOptionScreen, { AccountNoticeCard } from "../../../../features/account/AccountOptionScreen";

export default function PaymentsScreen() {
  return (
    <AccountOptionScreen
      title="Payments"
      subtitle="Manage preferred ride payment methods. Card and wallet backend support can attach here later."
      icon="card-outline"
      rows={[
        { label: "Default", value: "Cash" },
        { label: "Cards", value: "Not connected" },
        { label: "Wallet", value: "Available soon" },
      ]}
      actionLabel="Change booking payment"
      onAction={() => router.push("/ride-booking/payment-method" as any)}
    >
      <AccountNoticeCard title="Payment setup" text="Current rides still use existing booking payment logic. This account screen is prepared for future saved cards/wallet APIs." icon="wallet-outline" />
    </AccountOptionScreen>
  );
}
