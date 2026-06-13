import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";

const places = [
  {
    icon: "home",
    title: "Home",
    subtitle: "2nd Lane",
    color: "#22B36A",
    bg: "#DDF5EC",
  },
  {
    icon: "business",
    title: "Office",
    subtitle: "KKS Road",
    color: "#3BAAE8",
    bg: "#E6F4FB",
  },
  {
    icon: "location",
    title: "Sun Travels",
    subtitle: "Temple Rd",
    color: "#F59E0B",
    bg: "#FFF1D8",
  },
  {
    icon: "add-circle",
    title: "Add",
    subtitle: "New place",
    color: "#9CA3AF",
    bg: "#F3F4F6",
  },
];

type SavedPlacesProps = {
  compact?: boolean;
};

function PlaceCard({
  item,
  compact,
}: {
  item: (typeof places)[0];
  compact: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const router = useRouter(); // ✅ grab router here

  return (
    <Animated.View style={{ width: "23%", transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() =>
          Animated.spring(scale, {
            toValue: 0.93,
            useNativeDriver: true,
            speed: 32,
            bounciness: 3,
          }).start()
        }
        onPressOut={() => {
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 22,
            bounciness: 8,
          }).start();

          // ✅ Navigate when released
          router.push("/saveaddress");
        }}
        style={{
          backgroundColor: "white",
          borderRadius: compact ? 16 : 20,
          paddingVertical: compact ? 8 : 12,
          paddingHorizontal: compact ? 7 : 10,
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
          borderWidth: 1,
          borderColor: "#F1F5F9",
        }}
      >
        {/* ICON bubble */}
        <View
          style={{
            width: compact ? 28 : 36,
            height: compact ? 28 : 36,
            borderRadius: compact ? 14 : 18,
            backgroundColor: item.bg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={item.icon as any}
            size={compact ? 14 : 18}
            color={item.color}
          />
        </View>

        {/* TITLE */}
        <Text
          style={{
            color: "#111827",
            fontSize: compact ? 9.5 : 11,
            fontWeight: "700",
            marginTop: compact ? 6 : 9,
            letterSpacing: -0.1,
          }}
          numberOfLines={1}
        >
          {item.title}
        </Text>

        {/* SUBTITLE */}
        <Text
          style={{
            color: "#9CA3AF",
            fontSize: compact ? 7.5 : 9,
            marginTop: 2,
            fontWeight: "400",
          }}
          numberOfLines={1}
        >
          {item.subtitle}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function SavedPlaces({ compact = false }: SavedPlacesProps) {
  return (
    <View>
      {/* HEADER */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: compact ? 8 : 12,
        }}
      >
        <Text
          style={{
            fontSize: compact ? 14 : 16,
            fontWeight: "800",
            color: "#111827",
            letterSpacing: -0.2,
          }}
        >
          Where to go again?
        </Text>

        <TouchableOpacity
          style={{
            backgroundColor: "#DDF5EC",
            borderRadius: 20,
            paddingHorizontal: compact ? 10 : 12,
            paddingVertical: compact ? 4 : 5,
          }}
        >
          <Text
            style={{
              color: "#22B36A",
              fontWeight: "700",
              fontSize: compact ? 11 : 12,
            }}
          >
            View All
          </Text>
        </TouchableOpacity>
      </View>

      {/* CARDS */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        {places.map((item, index) => (
          <PlaceCard key={index} item={item} compact={compact} />
        ))}
      </View>
    </View>
  );
}
