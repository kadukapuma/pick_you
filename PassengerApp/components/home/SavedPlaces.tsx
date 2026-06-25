import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

const places = [
  {
    icon: "home-outline",
    title: "Home",
    subtitle: "2nd Lane",
  },
  {
    icon: "business-outline",
    title: "Office",
    subtitle: "KKS Road",
  },
  {
    icon: "location-outline",
    title: "Sun Travels",
    subtitle: "Temple Road",
  },
  {
    icon: "add",
    title: "Add",
    subtitle: "Place",
  },
];

type SavedPlacesProps = {
  compact?: boolean;
};

export default function SavedPlaces({ compact = false }: SavedPlacesProps) {
  return (
    <View>
      {/* HEADER */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",

          marginBottom: compact ? 5 : 10,
        }}
      >
        <Text
          style={{
            fontSize: compact ? 14 : 16,
            fontWeight: "800",
            color: "#111827",
          }}
        >
          Where to go again?
        </Text>

        <TouchableOpacity>
          <Text
            style={{
              color: "#22B36A",
              fontWeight: "700",
              fontSize: compact ? 11 : 13,
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
          <TouchableOpacity
            key={index}
            activeOpacity={0.8}
            style={{
              width: "23%",

              backgroundColor: "white",

              borderRadius: compact ? 14 : 18,

              paddingVertical: compact ? 5 : 9,
              paddingHorizontal: compact ? 6 : 8,

              shadowColor: "#000",
              shadowOpacity: 0.02,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            {/* ICON */}
            <View
              style={{
                width: compact ? 24 : 32,
                height: compact ? 24 : 32,
                borderRadius: compact ? 12 : 16,

                backgroundColor: "#EEF7FF",

                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name={item.icon as any}
                size={compact ? 13 : 16}
                color="#6B7280"
              />
            </View>

            {/* TITLE */}
            <Text
              style={{
                color: "#111827",
                fontSize: compact ? 9 : 10,
                fontWeight: "700",

                marginTop: compact ? 4 : 7,
              }}
              numberOfLines={1}
            >
              {item.title}
            </Text>

            {/* SUBTITLE */}
            <Text
              style={{
                color: "#9CA3AF",
                fontSize: compact ? 7 : 8,

                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {item.subtitle}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
