import { Ionicons } from "@expo/vector-icons";
import { Image, Text, TouchableOpacity, View } from "react-native";

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
        <TouchableOpacity
          key={index}
          activeOpacity={0.8}
          style={{
            width: "23%",

            backgroundColor: item.bg,

            borderRadius: compact ? 14 : 18,

            paddingVertical: compact ? 5 : 8,
            paddingHorizontal: compact ? 6 : 8,

            marginBottom: compact ? 5 : 9,
          }}
        >
          {/* IMAGE */}
          <Image
            source={item.image}
            style={{
              width: compact ? 36 : 50,
              height: compact ? 36 : 50,
              resizeMode: "contain",
              alignSelf: "center",
            }}
          />

          {/* TITLE */}
          <Text
            style={{
              color: "#111827",
              fontWeight: "700",
              fontSize: compact ? 9 : 10,
              marginTop: compact ? 4 : 8,
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
            }}
            numberOfLines={1}
          >
            {item.subtitle}
          </Text>

          {/* ARROW */}
          <View
            style={{
              width: compact ? 18 : 20,
              height: compact ? 18 : 20,
              borderRadius: compact ? 9 : 10,

              backgroundColor: item.color,

              alignItems: "center",
              justifyContent: "center",

              alignSelf: "flex-end",

              marginTop: compact ? 3 : 6,
            }}
          >
            <Ionicons name="arrow-forward" size={11} color="white" />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}
