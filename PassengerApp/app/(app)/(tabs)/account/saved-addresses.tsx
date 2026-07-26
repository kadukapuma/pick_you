import { router } from "expo-router";
import AccountOptionScreen, { AccountNoticeCard } from "../../../../features/account/AccountOptionScreen";
import { useSavedPlaces } from "../../../../hooks/useSavedPlaces";

export default function SavedAddressesScreen() {
  const { homePlace, officePlace, otherPlaces } = useSavedPlaces();

  return (
    <AccountOptionScreen
      title="Saved addresses"
      subtitle="Manage home, work and regular pickup or drop-off locations used during ride booking."
      icon="location-outline"
      rows={[
        { label: "Home", value: homePlace ? "Saved" : "Add" },
        { label: "Work", value: officePlace ? "Saved" : "Add" },
        { label: "Other", value: String(otherPlaces.length) },
      ]}
      actionLabel="Manage addresses"
      onAction={() => router.push("/saved-places" as any)}
    >
      <AccountNoticeCard title="Faster booking" text="Saved places reduce typing and keep frequent pickup or drop-off locations ready." icon="navigate-outline" />
    </AccountOptionScreen>
  );
}