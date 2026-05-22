import { useState, useCallback, useRef } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  searchLocationSuggestions,
  LocationSuggestion,
} from "../../services/location/multiProviderService";

interface LocationSearchProps {
  onSelectLocation: (location: LocationSuggestion) => void;
  currentLocation?: LocationSuggestion;
  placeholder?: string;
  isDestination?: boolean;
}

export default function LocationSearch({
  onSelectLocation,
  currentLocation,
  placeholder = "Where are you going?",
  isDestination = true,
}: LocationSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimer = useRef<number | null>(null);

  const handleSearch = (text: string) => {
    setSearchQuery(text);

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!text.trim() || text.length < 3) {
      setSuggestions([]);
      return;
    }

    // Set new debounce timer (800ms - optimized for free tier)
    debounceTimer.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchLocationSuggestions(text);
        setSuggestions(results);
        setShowSuggestions(true);
      } catch (error) {
        console.log("Search error:", error);
      } finally {
        setIsLoading(false);
      }
    }, 800);
  };

  const handleSelectLocation = (location: LocationSuggestion) => {
    onSelectLocation(location);
    setSearchQuery("");
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleClear = () => {
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchInputWrapper}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={handleSearch}
          onFocus={() => setShowSuggestions(true)}
          style={styles.searchInput}
          autoFocus={isDestination}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={handleClear}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Current Location Button */}
      {currentLocation && !showSuggestions && (
        <TouchableOpacity
          style={styles.currentLocationButton}
          onPress={() => handleSelectLocation(currentLocation)}
        >
          <View style={styles.currentLocIcon}>
            <Ionicons name="location" size={18} color="#2563EB" />
          </View>
          <View style={styles.currentLocText}>
            <Text style={styles.currentLocLabel}>Current Location</Text>
            <Text style={styles.currentLocAddress}>
              {currentLocation.address}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
        </TouchableOpacity>
      )}

      {/* Suggestions List */}
      {showSuggestions && suggestions.length > 0 && (
        <ScrollView
          style={styles.suggestionsContainer}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {suggestions.map((suggestion) => (
            <TouchableOpacity
              key={suggestion.id}
              style={styles.suggestionItem}
              onPress={() => handleSelectLocation(suggestion)}
              activeOpacity={0.6}
            >
              <View style={styles.suggestionIcon}>
                <Ionicons
                  name={
                    suggestion.placeType === "saved"
                      ? "heart"
                      : "location-sharp"
                  }
                  size={18}
                  color={
                    suggestion.placeType === "saved" ? "#EF4444" : "#0B7BDC"
                  }
                />
              </View>

              <View style={styles.suggestionText}>
                <Text style={styles.suggestionTitle}>{suggestion.address}</Text>
                <Text style={styles.suggestionDetails}>
                  {suggestion.details}
                </Text>
              </View>

              <View>
                <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Loading State */}
      {isLoading && showSuggestions && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#0B7BDC" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}

      {/* No Results */}
      {showSuggestions &&
        !isLoading &&
        suggestions.length === 0 &&
        searchQuery.length > 0 && (
          <View style={styles.noResultsContainer}>
            <Ionicons name="location-outline" size={40} color="#D1D5DB" />
            <Text style={styles.noResultsText}>No locations found</Text>
            <Text style={styles.noResultsSubtext}>
              Try a different search term
            </Text>
          </View>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4FBFF",
  },

  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#000",
    padding: 0,
  },

  currentLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: "#F0F7FF",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB",
  },

  currentLocIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    elevation: 2,
  },

  currentLocText: {
    flex: 1,
  },

  currentLocLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },

  currentLocAddress: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
    marginTop: 2,
  },

  suggestionsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 8,
  },

  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginVertical: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 1,
  },

  suggestionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F7FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  suggestionText: {
    flex: 1,
  },

  suggestionTitle: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "600",
  },

  suggestionDetails: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },

  loadingText: {
    marginTop: 12,
    color: "#6B7280",
    fontSize: 14,
  },

  noResultsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },

  noResultsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginTop: 16,
  },

  noResultsSubtext: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 6,
  },
});
