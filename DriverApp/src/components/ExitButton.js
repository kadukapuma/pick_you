import React from "react";
import { Feather } from "@expo/vector-icons";
import { TouchableOpacity, StyleSheet } from "react-native";

const ExitButton = ({ onPress, style, color = "#FFF" }) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.button, style]}>
      <Feather name="x" size={22} color={color} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ExitButton;
