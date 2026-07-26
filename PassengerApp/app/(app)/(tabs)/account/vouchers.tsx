import AccountOptionScreen, { AccountNoticeCard } from "../../../../features/account/AccountOptionScreen";

export default function VouchersScreen() {
  return (
    <AccountOptionScreen
      title="Voucher redeem"
      subtitle="Redeem ride vouchers, promo codes and campaign coupons before booking."
      icon="ticket-outline"
      rows={[
        { label: "Saved vouchers", value: "0" },
        { label: "Redeem status", value: "Ready" },
        { label: "Applies to", value: "Ride bookings" },
      ]}
    >
      <AccountNoticeCard title="Voucher entry" text="A code input can be connected here when voucher validation endpoints are ready." icon="barcode-outline" />
    </AccountOptionScreen>
  );
}
