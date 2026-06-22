import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";
import OngoingTab from "./OngoingTab";
import CompletedTab from "./CompletedTab";
import ComplaintTab from "./ComplaintTab";
import CancelledTab from "./CancelledTab";

export type ActivityTab = "Ongoing" | "Completed" | "Complaint" | "Cancelled";

interface ActivityTabHeaderProps {
  activeTab: ActivityTab;
  onTabChange: (tab: ActivityTab) => void;
}

const renderScene = SceneMap({
  Ongoing: OngoingTab,
  Completed: CompletedTab,
  Complaint: ComplaintTab,
  Cancelled: CancelledTab,
});

export default function ActivityTabHeader({
  activeTab,
  onTabChange,
}: ActivityTabHeaderProps) {
  const layout = useWindowDimensions();
  const [index, setIndex] = useState(() => {
    const tabs: ActivityTab[] = [
      "Ongoing",
      "Completed",
      "Complaint",
      "Cancelled",
    ];
    return tabs.indexOf(activeTab);
  });

  const [routes] = useState([
    { key: "Ongoing", title: "Ongoing" },
    { key: "Completed", title: "Completed" },
    { key: "Complaint", title: "Complaint" },
    { key: "Cancelled", title: "Cancelled" },
  ]);

  const handleIndexChange = (newIndex: number) => {
    setIndex(newIndex);
    const tabs: ActivityTab[] = [
      "Ongoing",
      "Completed",
      "Complaint",
      "Cancelled",
    ];
    onTabChange(tabs[newIndex]);
  };

  const renderTabBar = (props: any) => (
    <TabBar
      {...props}
      indicatorStyle={{ backgroundColor: "#1B9E6E", height: 3 }}
      style={{ backgroundColor: "transparent", elevation: 0, shadowOpacity: 0 }}
      tabStyle={{ width: "auto" }}
      scrollEnabled={true}
      activeColor="#1B9E6E"
      inactiveColor="#6B9E8E"
      labelStyle={{
        fontSize: 16,
        fontWeight: "600",
        textTransform: "capitalize",
      }}
    />
  );

  return (
    <TabView
      navigationState={{ index, routes }}
      renderScene={renderScene}
      renderTabBar={renderTabBar}
      onIndexChange={handleIndexChange}
      initialLayout={{ width: layout.width }}
    />
  );
}
