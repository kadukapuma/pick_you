import { Ionicons } from "@expo/vector-icons";
import { useRef } from "react";
import { Animated, Image, Text, TouchableOpacity, View } from "react-native";

const services = [
  {
    title: "PickU Ride",
    subtitle: "Car, Mini",
    image: require("../../../assets/images/car.png"),
    bg: "#DDF5EC",
    color: "#22B36A",
  },
  {
    title: "PickU Bike",
    subtitle: "Bike Taxi",
    image: require("../../../assets/images/bike.png"),
    bg: "#E6F8E8",
    color: "#22B36A",
  },
  {
    title: "PickU Food",
    subtitle: "Delivery",
    image: require("../../../assets/images/food.png"),
    bg: "#FFF1D8",
    color: "#F59E0B",
  },
  {
    title: "PickU Drop",
    subtitle: "Parcel",
    image: require("../../../assets/images/parcel.png"),
    bg: "#E6F4FB",
    color: "#3BAAE8",
  },
  {
    title: "PickU Load",
    subtitle: "Lorries",
    image: require("../../../assets/images/truck.png"),
    bg: "#EFEAFE",
    color: "#8B5CF6",
  },
  {
    title: "PickU Rent",
    subtitle: "Cars",
    image: require("../../../assets/images/rent.png"),
    bg: "#FFF7D6",
    color: "#EAB308",
  },
  {
    title: "PickU Mart",
    subtitle: "Groceries",
    image: require("../../../assets/images/mart.png"),
    bg: "#E8FAF0",
    color: "#10B981",
  },
  {
    title: "PickU Offers",
    subtitle: "Best Deals",
    image: require("../../../assets/images/offers.png"),
    bg: "#FFE6EF",
    color: "#EC4899",
  },
];

type ServiceGridProps = {
  compact?: boolean;
};

function GridCard({
  item,
  compact,
}: {
  item: (typeof services)[0];
  compact: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View
      style={{
        width: "23%",
        marginBottom: compact ? 6 : 10,
        transform: [{ scale }],
      }}
    >
      <TouchableOpacity
        activeOpacity={0.82}
        onPressIn={() =>
          Animated.spring(scale, {
            toValue: 0.93,
            useNativeDriver: true,
            speed: 32,
            bounciness: 3,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 22,
            bounciness: 8,
          }).start()
        }
        style={{
          backgroundColor: item.bg,
          borderRadius: compact ? 16 : 20,
          paddingVertical: compact ? 8 : 12,
          paddingHorizontal: compact ? 6 : 8,
          alignItems: "flex-start",
          overflow: "hidden",
        }}
      >
        {/* Soft highlight circle */}
        <View
          style={{
            position: "absolute",
            top: -14,
            right: -14,
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: "rgba(255,255,255,0.28)",
          }}
          pointerEvents="none"
        />

        {/* IMAGE */}
        <Image
          source={item.image}
          style={{
            width: compact ? 38 : 52,
            height: compact ? 38 : 52,
            resizeMode: "contain",
            alignSelf: "center",
          }}
        />

        {/* TITLE */}
        <Text
          style={{
            color: "#111827",
            fontWeight: "800",
            fontSize: compact ? 9 : 10,
            marginTop: compact ? 5 : 9,
            letterSpacing: -0.1,
          }}
          numberOfLines={1}
        >
          {item.title}
        </Text>

        {/* SUBTITLE */}
        <Text
          style={{
            color: "#6B7280",
            fontSize: compact ? 8 : 9,
            marginTop: 2,
            fontWeight: "400",
          }}
          numberOfLines={1}
        >
          {item.subtitle}
        </Text>

        {/* ARROW */}
        <View
          style={{
            width: compact ? 20 : 24,
            height: compact ? 20 : 24,
            borderRadius: compact ? 10 : 12,
            backgroundColor: item.color,
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "flex-end",
            marginTop: compact ? 4 : 7,
            shadowColor: item.color,
            shadowOpacity: 0.35,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          }}
        >
          <Ionicons name="arrow-forward" size={11} color="white" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ServiceGrid({ compact = false }: ServiceGridProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
      }}
    >
      {services.map((item, index) => (
        <GridCard key={index} item={item} compact={compact} />
      ))}
    </View>
  );
}
