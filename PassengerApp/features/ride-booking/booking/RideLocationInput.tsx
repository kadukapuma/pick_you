import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function RideLocationInput({
  pickup,
  destination,
  setDestination,
}: {
  pickup: any;
  destination: any;
  setDestination: any;
}) {
  return (
    <View style={styles.container}>
      {/* Pickup */}
      <View style={styles.row}>
        <View style={styles.dotPickup} />

        <TextInput
          value={pickup?.address || "Your Location"}
          editable={false}
          style={styles.input}
          placeholder="Pickup"
        />
      </View>

      {/* Line */}
      <View style={styles.line} />

      {/* Destination */}
      <View style={styles.row}>
        <View style={styles.dotDrop} />

        <TextInput
          value={destination?.address || ""}
          onChangeText={(text) =>
            setDestination({
              ...destination,
              address: text,
            })
          }
          placeholder="Where are you going?"
          placeholderTextColor="#999"
          style={styles.input}
        />

        <TouchableOpacity>
          <Ionicons name="add" size={24} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    elevation: 5,
    zIndex: 1000,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  dotPickup: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2563EB",
    marginRight: 12,
  },

  dotDrop: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F97316",
    marginRight: 12,
  },

  line: {
    width: 1,
    height: 25,
    backgroundColor: "#D1D5DB",
    marginLeft: 5,
    marginVertical: 4,
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: "#000",
  },
});
