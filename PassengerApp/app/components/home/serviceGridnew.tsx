import { Ionicons } from "@expo/vector-icons";
import { useRef } from "react";
import { Animated, Image, Text, TouchableOpacity, View } from "react-native";

const services = [
  {
    title: "PickU Ride",
    subtitle: "Car · Mini · A/C",
    image: require("../../../assets/images/car.png"),
    bg: "#DDF5EC",
    color: "#22B36A",
    badge: null,
  },
  // {
  //   title: "PickU Bike",
  //   subtitle: "Bike Taxi",
  //   image: require("../../../assets/images/bike.png"),
  //   bg: "#E6F8E8",
  //   color: "#22B36A",
  //   badge: null,
  // },
  // {
  //   title: "PickU Food",
  //   subtitle: "Delivery",
  //   image: require("../../../assets/images/food.png"),
  //   bg: "#FFF1D8",
  //   color: "#F59E0B",
  //   badge: "HOT",
  // },
  // {
  //   title: "PickU Drop",
  //   subtitle: "Parcel Delivery",
  //   image: require("../../../assets/images/parcel.png"),
  //   bg: "#E6F4FB",
  //   color: "#3BAAE8",
  //   badge: null,
  // },
  // {
  //   title: "PickU Load",
  //   subtitle: "Lorries",
  //   image: require("../../../assets/images/truck.png"),
  //   bg: "#EFEAFE",
  //   color: "#8B5CF6",
  //   badge: null,
  // },
  // {
  //   title: "PickU Rent",
  //   subtitle: "Cars",
  //   image: require("../../../assets/images/rent.png"),
  //   bg: "#FFF7D6",
  //   color: "#EAB308",
  //   badge: null,
  // },
  // {
  //   title: "PickU Mart",
  //   subtitle: "Groceries",
  //   image: require("../../../assets/images/mart.png"),
  //   bg: "#E8FAF0",
  //   color: "#10B981",
  //   badge: "NEW",
  // },
  // {
  //   title: "PickU Offers",
  //   subtitle: "Best Deals",
  //   image: require("../../../assets/images/offers.png"),
  //   bg: "#FFE6EF",
  //   color: "#EC4899",
  //   badge: "🔥",
  // },
];

type ServiceGridProps = {
  compact?: boolean;
};

function ServiceCard({
  item,
  compact,
}: {
  item: (typeof services)[0];
  compact: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 28,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 22,
      bounciness: 8,
    }).start();
  };

  return (
    <Animated.View
      style={{ transform: [{ scale }], marginBottom: compact ? 10 : 14 }}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{
          width: "100%",
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: item.bg,
          borderRadius: compact ? 20 : 26,
          paddingVertical: compact ? 16 : 22,
          paddingHorizontal: compact ? 16 : 22,
          minHeight: compact ? 110 : 140,
          overflow: "hidden",
        }}
      >
        {/* Subtle radial highlight top-right */}
        <View
          style={{
            position: "absolute",
            top: -30,
            right: -30,
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: "rgba(255,255,255,0.22)",
          }}
          pointerEvents="none"
        />

        {/* LEFT IMAGE */}
        <Image
          source={item.image}
          style={{
            width: compact ? 88 : 112,
            height: compact ? 88 : 112,
            resizeMode: "contain",
          }}
        />

        {/* TEXT AREA */}
        <View style={{ flex: 1, marginLeft: 12, justifyContent: "center" }}>
          {/* Optional badge */}
          {item.badge && (
            <View
              style={{
                alignSelf: "flex-start",
                backgroundColor: item.color,
                borderRadius: 6,
                paddingHorizontal: 7,
                paddingVertical: 2,
                marginBottom: 6,
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 9,
                  fontWeight: "800",
                  letterSpacing: 0.5,
                }}
              >
                {item.badge}
              </Text>
            </View>
          )}

          <Text
            style={{
              color: "#111827",
              fontWeight: "800",
              fontSize: compact ? 20 : 26,
              letterSpacing: -0.3,
            }}
            numberOfLines={1}
          >
            {item.title}
          </Text>

          <Text
            style={{
              color: "#6B7280",
              fontSize: compact ? 13 : 16,
              marginTop: 4,
              fontWeight: "500",
            }}
            numberOfLines={1}
          >
            {item.subtitle}
          </Text>
        </View>

        {/* RIGHT ARROW */}
        <View
          style={{
            width: compact ? 42 : 52,
            height: compact ? 42 : 52,
            borderRadius: compact ? 21 : 26,
            backgroundColor: item.color,
            alignItems: "center",
            justifyContent: "center",
            marginLeft: 10,
            // Inner shadow feel via double ring
            shadowColor: item.color,
            shadowOpacity: 0.4,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          }}
        >
          <Ionicons
            name="arrow-forward"
            size={compact ? 20 : 26}
            color="white"
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ServiceGridnew({ compact = false }: ServiceGridProps) {
  return (
    <View>
      {services.map((item, index) => (
        <ServiceCard key={index} item={item} compact={compact} />
      ))}
    </View>
  );
}
