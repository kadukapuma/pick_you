import React, { useCallback, useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import api from "../services/api";

const timeAgo = (isoDate) => {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
};

const NotificationScreen = () => {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await api.get("/notifications");
      const list = response.data?.data?.data ?? response.data?.data ?? [];
      setNotifications(Array.isArray(list) ? list : []);
    } catch (error) {
      console.log("Failed to load notifications:", error);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadNotifications();
      setLoading(false);
    })();
  }, [loadNotifications]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleMarkRead = async (item) => {
    if (item.is_read) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
    );
    try {
      await api.put(`/notifications/${item.id}`, { is_read: true });
    } catch (error) {
      console.log("Failed to mark notification read:", error);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await Promise.all(
      unread.map((n) =>
        api.put(`/notifications/${n.id}`, { is_read: true }).catch(() => {})
      )
    );
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.notificationItem}
      activeOpacity={0.7}
      onPress={() => handleMarkRead(item)}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: item.is_read ? "#94A3B8" : "#00A859" },
        ]}
      >
        <Feather name="bell" size={22} color="#FFF" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
      </View>
    </TouchableOpacity>
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

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#00A859" />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No notifications yet.</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          />
        )}
      </SafeAreaView>

      {/* FOOTER */}
      <SafeAreaView edges={["bottom"]} style={styles.bottomSafe}>
        <View style={styles.footer}>
          <TouchableOpacity style={styles.markReadButton} onPress={handleMarkAllRead}>
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 15,
    color: "#64748B",
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
