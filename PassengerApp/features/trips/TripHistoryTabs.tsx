import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { SceneMap, TabView } from "react-native-tab-view";
import CancelledTab from "./CancelledTripsTab";
import ComplaintTab from "./ComplaintsTab";
import CompletedTab from "./CompletedTripsTab";
import OngoingTab from "./OngoingTripsTab";

export type ActivityTab = "Ongoing" | "Completed" | "Complaint" | "Cancelled";

interface ActivityTabHeaderProps {
  activeTab: ActivityTab;
  onTabChange: (tab: ActivityTab) => void;
}

const tabs: ActivityTab[] = ["Ongoing", "Completed", "Complaint", "Cancelled"];

const renderScene = SceneMap({
  Ongoing: OngoingTab,
  Completed: CompletedTab,
  Complaint: ComplaintTab,
  Cancelled: CancelledTab,
});

export default function ActivityTabHeader({ activeTab, onTabChange }: ActivityTabHeaderProps) {
  const layout = useWindowDimensions();
  const [index, setIndex] = useState(() => Math.max(0, tabs.indexOf(activeTab)));
  const [routes] = useState(tabs.map((tab) => ({ key: tab, title: tab === "Complaint" ? "Issues" : tab })));

  const handleIndexChange = (newIndex: number) => {
    setIndex(newIndex);
    onTabChange(tabs[newIndex]);
  };

  const renderTabBar = () => (
    <View style={styles.tabsWrap}>
      {routes.map((route, routeIndex) => {
        const focused = routeIndex === index;
        return (
          <TouchableOpacity
            key={route.key}
            style={[styles.tabButton, focused && styles.tabButtonActive]}
            onPress={() => handleIndexChange(routeIndex)}
            activeOpacity={0.86}
          >
            <Text style={[styles.tabText, focused && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
              {route.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <TabView
      navigationState={{ index, routes }}
      renderScene={renderScene}
      renderTabBar={renderTabBar}
      onIndexChange={handleIndexChange}
      initialLayout={{ width: layout.width }}
      style={styles.tabView}
    />
  );
}

const styles = StyleSheet.create({
  tabView: { flex: 1 },
  tabsWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 18,
    marginBottom: 8,
    padding: 4,
    borderRadius: 22,
    backgroundColor: "transparent",
    borderWidth: 1.2,
    borderColor: "rgba(153,177,169,0.38)",
  },
  tabButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },
  tabButtonActive: {
    backgroundColor: "#063D31",
  },
  tabText: { color: "#697872", fontSize: 13, fontWeight: "800" },
  tabTextActive: { color: "#FFFFFF", fontWeight: "900" },
});

