import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

const UnderConstructionBanner = ({
  message = "App under construction. Showing values are not true.",
  style,
}) => (
  <View style={[styles.banner, style]}>
    <View style={styles.iconWrap}>
      <Feather name="alert-triangle" size={15} color="#B45309" />
    </View>
    <Text style={styles.message}>{message}</Text>
  </View>
);

export default UnderConstructionBanner;

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
  },
  message: {
    flex: 1,
    color: "#92400E",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
});
