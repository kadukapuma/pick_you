import React from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { Image } from "expo-image";

const services = [
  {
    title: "Find Ride",
    subtitle: "Book instantly",
    image: require("../../assets/images/home/car_opt.png"),
  },
  {
    title: "Delivery",
    subtitle: "Fast items",
    image: require("../../assets/images/home/bike_opt.png"),
  },
  {
    title: "Parcels",
    subtitle: "Send anywhere",
    image: require("../../assets/images/home/truck_opt.png"),
  },
  {
    title: "Find Food",
    subtitle: "Favorite food",
    image: require("../../assets/images/home/food_opt.png"),
  },
];

export default function ServiceGridnew({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.gridContainer}>
      {services.map((item, index) => (
        <TouchableOpacity
          key={index}
          activeOpacity={0.7}
          style={[styles.card, { minHeight: compact ? 95 : 105 }]}
        >
          {/* TOP IMAGE */}
          <View style={styles.imageContainer}>
            <Image
              source={item.image}
              style={styles.image}
              contentFit="contain"
            />
          </View>

          {/* BOTTOM TEXT */}
          <View style={styles.textContainer}>
            <Text style={[styles.title, { fontSize: compact ? 13 : 14 }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.subtitle, { fontSize: compact ? 10 : 11 }]} numberOfLines={1}>
              {item.subtitle}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    width: "100%",
  },
  card: {
    width: "46%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 10,

    // Lightweight shadow for performance over battery drain
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,

    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 1.4, // Lower ratio = taller image — makes icon bigger within card
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  textContainer: {
    width: "100%",
  },
  title: {
    color: "#0F2E23",
    fontWeight: "700",
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  subtitle: {
    color: "#6B7280",
    fontWeight: "400",
  },
});
