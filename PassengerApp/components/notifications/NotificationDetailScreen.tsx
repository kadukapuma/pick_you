import { Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  title?: string;
  message?: string;
  onClose: () => void;
};

export default function NotificationDetailScreen({ title, message, onClose }: Props) {
  return (
    <View style={styles.wrapper}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={22} color="#18231F" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={3}>{title || "Notification"}</Text>
          <Image source={require("../../assets/images/logo.png")} style={styles.logo} resizeMode="contain" />
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <Text style={styles.message}>{message}</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#F2FBF8" },
  circle1: {
    position: "absolute", top: -40, right: -60, width: 220, height: 220,
    borderRadius: 110, backgroundColor: "rgba(32, 183, 104, 0.12)",
  },
  circle2: {
    position: "absolute", bottom: 100, left: -80, width: 280, height: 280,
    borderRadius: 140, backgroundColor: "rgba(32, 183, 104, 0.08)",
  },
  safe: { flex: 1 },
  closeButton: {
    alignSelf: "flex-end", marginRight: 20, marginTop: 8, width: 36, height: 36,
    borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(24,35,31,0.06)",
  },
  header: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
    paddingHorizontal: 24, marginTop: 8,
  },
  title: { flex: 1, paddingRight: 16, fontSize: 26, fontWeight: "900", color: "#18231F" },
  logo: { width: 60, height: 60, borderRadius: 16 },
  body: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingVertical: 24 },
  message: { fontSize: 17, lineHeight: 26, color: "#334037", textAlign: "center" },
});
