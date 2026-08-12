import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { apiClient } from "../../../services/api/client";

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data?: { action?: string; app?: string } | null;
}

export default function NotificationScreen() {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    const response = await apiClient.get<{ data: NotificationItem[] }>(
      "/notifications",
      { suppressErrorLog: true },
    );
    if (response.success && response.data) {
      const list = (response.data as any).data ?? response.data;
      setNotifications(Array.isArray(list) ? list : []);
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

  const handleMarkRead = async (item: NotificationItem) => {
    if (item.is_read) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)),
    );
    await apiClient.put(`/notifications/${item.id}`, { is_read: true });
  };

  const handlePressNotification = (item: NotificationItem) => {
    handleMarkRead(item);
    if (item.data?.action === "app_update") {
      router.push("/update");
    } else {
      router.push({
        pathname: "/notification",
        params: { title: item.title, message: item.message },
      } as any);
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[styles.item, !item.is_read && styles.itemUnread]}
      activeOpacity={0.7}
      onPress={() => handlePressNotification(item)}
    >
      {!item.is_read && <View style={styles.unreadDot} />}
      <View style={styles.itemText}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemMessage} numberOfLines={2} ellipsizeMode="tail">{item.message}</Text>
        <Text style={styles.itemTime}>
          {new Date(item.created_at).toLocaleString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#20B768" />
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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2FBF8" },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 26, fontWeight: "900", color: "#18231F" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 15, color: "#6B7C76" },
  listContent: { paddingBottom: 24 },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(15, 23, 42, 0.06)",
    backgroundColor: "#FFFFFF",
  },
  itemUnread: { backgroundColor: "#EFFBF4" },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#20B768",
    marginTop: 6,
    marginRight: 10,
  },
  itemText: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: "700", color: "#18231F", marginBottom: 4 },
  itemMessage: { fontSize: 14, color: "#475569", lineHeight: 20, marginBottom: 6 },
  itemTime: { fontSize: 12, color: "#94A3B8" },
});
