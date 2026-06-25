import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LocationSuggestion } from "../../services/location/locationSuggestionsService";

interface SavedAddress {
  id: string;
  name: string;
  address: string;
  icon: string;
  coordinates?: { lat: number; lng: number };
}

interface Props {
  onSelectAddress: (address: LocationSuggestion) => void;
  savedAddresses?: SavedAddress[];
}

const DEFAULT_ADDRESSES: SavedAddress[] = [
  {
    id: "map",
    name: "Set location on map",
    address: "Choose from map",
    icon: "map-outline",
  },
  {
    id: "home",
    name: "Add Home",
    address: "Set your home address",
    icon: "add-outline",
  },
  {
    id: "work",
    name: "Add Work",
    address: "Set your work address",
    icon: "add-outline",
  },
  {
    id: "gym",
    name: "Royal Gym Walala",
    address: "Walala Road, Menikhinna",
    icon: "fitness",
  },
  {
    id: "kcc",
    name: "KCC Multiplex",
    address: "Sri Dalada Veediya, Kandy",
    icon: "film",
  },
  { id: "colombo", name: "Colombo", address: "Colombo", icon: "business" },
  { id: "kandy", name: "Kandy", address: "Kandy", icon: "location" },
];

export default function SavedAddresses({
  onSelectAddress,
  savedAddresses = DEFAULT_ADDRESSES,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePress = (address: SavedAddress) => {
    // Convert to LocationSuggestion format
    const location: LocationSuggestion = {
      id: address.id,
      address: address.name,
      details: address.address,
      latitude: address.coordinates?.lat || 0,
      longitude: address.coordinates?.lng || 0,
      placeType: "address",
    };
    onSelectAddress(location);
    setIsExpanded(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.title}>Saved Addresses</Text>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color="#6B9E8E"
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.list}>
          {savedAddresses.map((address) => (
            <TouchableOpacity
              key={address.id}
              style={styles.item}
              onPress={() => handlePress(address)}
            >
              <View
                style={[styles.iconContainer, { backgroundColor: "#E8F5F0" }]}
              >
                <Ionicons
                  name={address.icon as any}
                  size={20}
                  color="#1B9E6E"
                />
              </View>
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>{address.name}</Text>
                <Text style={styles.itemSubtitle} numberOfLines={1}>
                  {address.address}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#0D4F3C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0D4F3C",
  },
  list: {
    borderTopWidth: 1,
    borderTopColor: "#F0FAF5",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0FAF5",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0D4F3C",
  },
  itemSubtitle: {
    fontSize: 12,
    color: "#6B9E8E",
    marginTop: 2,
  },
});
