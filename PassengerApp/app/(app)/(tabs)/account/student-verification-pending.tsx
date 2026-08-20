import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenTransition from "../../../../components/ui/ScreenTransition";

export default function StudentVerificationPendingScreen() {
  const insets = useSafeAreaInsets();

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(app)/(tabs)/home" as any);
    }
  };

  return (
    <View style={styles.screen}>
      <TouchableOpacity
        style={[styles.closeButton, { top: insets.top + 16 }]}
        onPress={handleClose}
        activeOpacity={0.84}
      >
        <Ionicons name="close" size={22} color="#063D31" />
      </TouchableOpacity>

      <View style={styles.content}>
        <ScreenTransition>
          <View style={styles.iconWrap}>
            <Ionicons name="time-outline" size={48} color="#0B8F62" />
          </View>

          <Text style={styles.title}>Application under review</Text>
          <Text style={styles.subtitle}>
            Your student application is under review. We&apos;ll notify you as soon as
            it&apos;s approved. You can keep booking rides while you wait — loyalty
            points will start once your student status is confirmed.
          </Text>
        </ScreenTransition>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F2FBF8" },
  closeButton: {
    position: "absolute",
    right: 18,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.72)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(221,235,229,0.82)",
  },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#DDF7ED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  title: { color: "#18231F", fontSize: 20, fontWeight: "900", textAlign: "center", marginBottom: 10 },
  subtitle: { color: "#697872", fontSize: 14, fontWeight: "600", lineHeight: 21, textAlign: "center" },
});
