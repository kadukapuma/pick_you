import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import ScreenTransition from "../../components/ui/ScreenTransition";
import EmptyState from "./TripEmptyState";
import { completedTrips } from "./tripMockData";
import { TripList, TripSectionHeader, tripColors } from "./TripListItems";

export default function CompletedTab() {
  if (completedTrips.length === 0) {
    return <EmptyState title="No completed rides" message="Finished rides will appear here." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenTransition style={styles.block}>
        <TripSectionHeader title="Completed" />
        <TripList trips={completedTrips} />
      </ScreenTransition>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tripColors.BG },
  content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 112 },
  block: { marginBottom: 20 },
});
