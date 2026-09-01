import { View, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  name: string;
  onNameChange: (value: string) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
}

export default function FriendDetailsInput({
  name,
  onNameChange,
  phone,
  onPhoneChange,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <Ionicons name="person-outline" size={18} color="#6B7280" />
        <TextInput
          style={styles.input}
          placeholder="Friend's name"
          placeholderTextColor="#9CA3AF"
          value={name}
          onChangeText={onNameChange}
          autoCapitalize="words"
        />
      </View>
      <View style={styles.divider} />
      <View style={styles.field}>
        <Ionicons name="call-outline" size={18} color="#6B7280" />
        <TextInput
          style={styles.input}
          placeholder="Friend's phone number"
          placeholderTextColor="#9CA3AF"
          value={phone}
          onChangeText={onPhoneChange}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: "#0D4F3C",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#0D4F3C",
    padding: 0,
  },
});
