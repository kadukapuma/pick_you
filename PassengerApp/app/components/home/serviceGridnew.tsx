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
  // {
  //   title: "PickU Bike",
  //   subtitle: "Bike Taxi",
  //   image: require("../../../assets/images/bike.png"),
  //   bg: "#E6F8E8",
  //   color: "#22B36A",
  // },
  // {
  //   title: "PickU Food",
  //   subtitle: "Delivery",
  //   image: require("../../../assets/images/food.png"),
  //   bg: "#FFF1D8",
  //   color: "#F59E0B",
  // },
  // {
  //   title: "PickU Drop",
  //   subtitle: "Parcel",
  //   image: require("../../../assets/images/parcel.png"),
  //   bg: "#E6F4FB",
  //   color: "#3BAAE8",
  // },
  // {
  //   title: "PickU Load",
  //   subtitle: "Lorries",
  //   image: require("../../../assets/images/truck.png"),
  //   bg: "#EFEAFE",
  //   color: "#8B5CF6",
  // },
  // {
  //   title: "PickU Rent",
  //   subtitle: "Cars",
  //   image: require("../../../assets/images/rent.png"),
  //   bg: "#FFF7D6",
  //   color: "#EAB308",
  // },
  // {
  //   title: "PickU Mart",
  //   subtitle: "Groceries",
  //   image: require("../../../assets/images/mart.png"),
  //   bg: "#E8FAF0",
  //   color: "#10B981",
  // },
  // {
  //   title: "PickU Offers",
  //   subtitle: "Best Deals",
  //   image: require("../../../assets/images/offers.png"),
  //   bg: "#FFE6EF",
  //   color: "#EC4899",
  // },
];
type ServiceGridProps = {
  compact?: boolean;
};

export default function ServiceGridnew({ compact = false }: ServiceGridProps) {
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
          activeOpacity={0.85}
          style={{
            width: "100%",
            flexDirection: "row",
            alignItems: "center",

            backgroundColor: item.bg,

            borderRadius: compact ? 20 : 26,

            paddingVertical: compact ? 18 : 24,
            paddingHorizontal: compact ? 16 : 22,

            marginBottom: compact ? 10 : 16,

            minHeight: compact ? 115 : 145,
          }}
        >
          {/* LEFT IMAGE */}
          <Image
            source={item.image}
            style={{
              width: compact ? 95 : 120,
              height: compact ? 95 : 120,
              resizeMode: "contain",
            }}
          />

          {/* TEXT AREA */}
          <View
            style={{
              flex: 1,
              marginLeft: 10,
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: "#111827",
                fontWeight: "800",
                fontSize: compact ? 20 : 26,
                textAlign: "left",
              }}
              numberOfLines={1}
            >
              {item.title}
            </Text>

            <Text
              style={{
                color: "#6B7280",
                fontSize: compact ? 15 : 18,
                marginTop: 5,
                textAlign: "left",
                fontWeight: "600",
              }}
              numberOfLines={1}
            >
              {item.subtitle}
            </Text>
          </View>

          {/* RIGHT ARROW */}
          <View
            style={{
              width: compact ? 42 : 54,
              height: compact ? 42 : 54,
              borderRadius: compact ? 21 : 27,

              backgroundColor: item.color,

              alignItems: "center",
              justifyContent: "center",

              marginLeft: 10,
            }}
          >
            <Ionicons
              name="arrow-forward"
              size={compact ? 22 : 30}
              color="white"
            />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}
