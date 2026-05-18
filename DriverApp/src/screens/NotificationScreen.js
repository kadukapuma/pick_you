import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Animated, // Import Animated
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const dummyNotifications = [
  { id: "1", type: "earnings", icon: "dollar-sign", title: "Daily Earnings Goal Reached!", message: "Congratulations! You earned $250 today.", time: "2 hours ago", color: "#22C55E" },
  { id: "2", type: "bonus", icon: "gift", title: "Bonus Available", message: "Complete 3 more trips to earn a $20 bonus.", time: "5 hours ago", color: "#FFEA61" },
  { id: "3", type: "surge", icon: "trending-up", title: "Surge Pricing Active", message: "High demand in Downtown area. 2.5x multiplier!", time: "1 day ago", color: "#A855F7" },
  { id: "4", type: "rating", icon: "star", title: "New 5-Star Review", message: "Sarah Johnson left you a great review!", time: "2 days ago", color: "#F59E0B" },
  { id: "5", type: "alert", icon: "alert-circle", title: "Document Expiring Soon", message: "Your insurance expires in 30 days. Please update.", time: "3 days ago", color: "#EF4444" },
];

const NotificationScreen = () => {
  const navigation = useNavigation();

  // Create an array of animated values for each item
  const fadeAnims = useRef(dummyNotifications.map(() => new Animated.Value(0))).current;
  const slideAnims = useRef(dummyNotifications.map(() => new Animated.Value(20))).current;

  useEffect(() => {
    // Run staggered animation
    const animations = dummyNotifications.map((_, i) => {
      return Animated.parallel([
        Animated.timing(fadeAnims[i], {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnims[i], {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.stagger(100, animations).start();
  }, []);

  const renderItem = ({ item, index }) => (
    <Animated.View
      style={{
        opacity: fadeAnims[index],
        transform: [{ translateY: slideAnims[index] }],
      }}
    >
      <TouchableOpacity style={styles.notificationItem} activeOpacity={0.7}>
        <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
          <Feather name={item.icon} size={22} color="#FFF" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="dark-content" transparent backgroundColor="transparent" />
      
      {/* BACKGROUND GRAPHICS */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      <SafeAreaView edges={["top"]} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
          >
            <Feather name="x" size={24} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {/* List */}
        <FlatList
          data={dummyNotifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>

      {/* FOOTER */}
      <SafeAreaView edges={["bottom"]} style={styles.bottomSafe}>
        <View style={styles.footer}>
          <TouchableOpacity style={styles.markReadButton}>
            <Text style={styles.markReadText}>Mark All as Read</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default NotificationScreen;

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  container: {
    flex: 1,
  },
  circle1: {
    position: "absolute",
    top: -40,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(0, 168, 89, 0.12)",
  },
  circle2: {
    position: "absolute",
    bottom: 120,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(0, 168, 89, 0.08)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
  },
  closeButton: {
    padding: 4,
  },
  listContent: {
    paddingBottom: 20,
  },
  notificationItem: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(15, 23, 42, 0.05)", 
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
    marginBottom: 6,
  },
  time: {
    fontSize: 12,
    color: "#94A3B8",
  },
  bottomSafe: {
    backgroundColor: "transparent",
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  markReadButton: {
    width: "100%",
    paddingVertical: 12,
    alignItems: "center",
  },
  markReadText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#00A859",
  },
});