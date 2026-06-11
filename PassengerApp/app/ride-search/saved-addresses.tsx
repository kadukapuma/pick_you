import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

interface SavedAddress {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  icon: string;
  isDefault?: boolean;
}

// Temporary mock data - replace with your API call
const MOCK_ADDRESSES: SavedAddress[] = [
  {
    id: "1",
    name: "Home",
    address: "Your Home Address",
    latitude: 0,
    longitude: 0,
    icon: "home",
    isDefault: true,
  },
  {
    id: "2",
    name: "Work",
    address: "Your Work Address",
    latitude: 0,
    longitude: 0,
    icon: "briefcase",
  },
];

export default function SavedAddressesScreen() {
  const [addresses, setAddresses] = useState<SavedAddress[]>(MOCK_ADDRESSES);

  const handleAddAddress = () => {
    router.push({
      pathname: "/add-edit-address",
      params: { mode: "add" },
    });
  };

  const handleEditAddress = (address: SavedAddress) => {
    router.push({
      pathname: "/add-edit-address",
      params: {
        mode: "edit",
        address: JSON.stringify(address),
      },
    });
  };

  const handleDeleteAddress = (id: string, name: string) => {
    Alert.alert(
      "Delete Address",
      `Are you sure you want to delete "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setAddresses((prev) => prev.filter((addr) => addr.id !== id));
          },
        },
      ],
    );
  };

  const handleSetAsDefault = (id: string) => {
    setAddresses((prev) =>
      prev.map((addr) => ({
        ...addr,
        isDefault: addr.id === id,
      })),
    );
  };

  const renderAddressItem = ({ item }: { item: SavedAddress }) => (
    <TouchableOpacity
      style={styles.addressCard}
      onPress={() => handleEditAddress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.addressIcon}>
        <Ionicons name={item.icon as any} size={24} color="#1B9E6E" />
      </View>

      <View style={styles.addressInfo}>
        <View style={styles.addressHeader}>
          <Text style={styles.addressName}>{item.name}</Text>
          {item.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>Default</Text>
            </View>
          )}
        </View>
        <Text style={styles.addressDetail} numberOfLines={1}>
          {item.address}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteAddress(item.id, item.name)}
      >
        <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#0D4F3C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Addresses</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Add Button */}
      <TouchableOpacity style={styles.addButton} onPress={handleAddAddress}>
        <Ionicons name="add-circle" size={24} color="#1B9E6E" />
        <Text style={styles.addButtonText}>Add New Address</Text>
      </TouchableOpacity>

      {/* Addresses List */}
      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        renderItem={renderAddressItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={64} color="#D6F2E7" />
            <Text style={styles.emptyText}>No saved addresses yet</Text>
            <Text style={styles.emptySubtext}>
              Add your frequently visited places
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0FAF5",
  },
  header: {
    marginTop: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0D4F3C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0D4F3C",
  },
  headerSpacer: {
    width: 40,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    shadowColor: "#0D4F3C",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1B9E6E",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#0D4F3C",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  addressIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E8F5F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  addressInfo: {
    flex: 1,
  },
  addressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  addressName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0D4F3C",
  },
  defaultBadge: {
    backgroundColor: "#E8F5F0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#1B9E6E",
  },
  addressDetail: {
    fontSize: 13,
    color: "#6B9E8E",
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#4A7A68",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#6B9E8E",
    marginTop: 8,
  },
});
