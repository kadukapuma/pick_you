import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import ScreenTransition from "../../components/ui/ScreenTransition";

export default function EmptyState({
  title = "No trips yet",
  message = "Your ride activity will appear here.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <ScreenTransition style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="car-sport-outline" size={27} color="#063D31" />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 34, paddingBottom: 96 },
  iconWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "transparent",
    borderWidth: 1.2,
    borderColor: "rgba(153,177,169,0.38)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: { color: "#18231F", fontSize: 18, fontWeight: "900", textAlign: "center" },
  message: { color: "#697872", fontSize: 14, fontWeight: "600", lineHeight: 20, textAlign: "center", marginTop: 6 },
});

