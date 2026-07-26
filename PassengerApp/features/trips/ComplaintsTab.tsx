import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import ScreenTransition from "../../components/ui/ScreenTransition";
import EmptyState from "./TripEmptyState";
import { complaintTrips } from "./tripMockData";
import { TripList, TripSectionHeader, tripColors } from "./TripListItems";

export default function ComplaintTab() {
  if (complaintTrips.length === 0) {
    return <EmptyState title="No ride issues" message="Ride support cases will appear here." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenTransition style={styles.block}>
        <TripSectionHeader title="Issues" />
        <TripList trips={complaintTrips} />
      </ScreenTransition>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tripColors.BG },
  content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 112 },
  block: { marginBottom: 20 },
});
