import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenTransition from "../../../../components/ui/ScreenTransition";
import ThemeButton from "../../../../components/ui/ThemeButton";
import { StudentVerificationService } from "../../../../services/auth/studentVerificationApi";

function CardPicker({
  label,
  uri,
  onPick,
}: {
  label: string;
  uri: string | null;
  onPick: () => void;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity style={styles.cardPicker} onPress={onPick} activeOpacity={0.85}>
        {uri ? (
          <Image source={{ uri }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.cardPlaceholder}>
            <Ionicons name="camera-outline" size={28} color="#0B8F62" />
            <Text style={styles.cardPlaceholderText}>Tap to upload</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function StudentVerificationScreen() {
  const insets = useSafeAreaInsets();
  const [universityName, setUniversityName] = useState("");
  const [cardFront, setCardFront] = useState<string | null>(null);
  const [cardBack, setCardBack] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickImage = async (target: "front" | "back") => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission", "Please allow gallery access to upload your admission card.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) return;

    const uri = result.assets[0].uri;
    if (target === "front") {
      setCardFront(uri);
    } else {
      setCardBack(uri);
    }
  };

  const handleSubmit = async () => {
    if (!universityName.trim()) {
      Alert.alert("Validation", "Please enter your university name.");
      return;
    }
    if (!cardFront || !cardBack) {
      Alert.alert("Validation", "Please upload both sides of your admission card.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await StudentVerificationService.submit(
        universityName.trim(),
        cardFront,
        cardBack,
      );

      if (result.success) {
        router.replace("/(app)/(tabs)/account/student-verification-pending" as any);
      } else {
        Alert.alert("Error", result.message || "Failed to submit your application");
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to submit your application");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 10 }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.84}>
          <Ionicons name="arrow-back" size={22} color="#063D31" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Apply for Student</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenTransition>
          <Text style={styles.intro}>
            Verify your student status to start earning loyalty points on every ride you take.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>University Name</Text>
            <View style={styles.inputShell}>
              <Ionicons name="school-outline" size={22} color="#063D31" />
              <TextInput
                value={universityName}
                onChangeText={setUniversityName}
                placeholder="Enter your university name"
                style={styles.input}
                placeholderTextColor="#95A7A0"
              />
            </View>
          </View>

          <CardPicker label="Admission Card - Front" uri={cardFront} onPick={() => pickImage("front")} />
          <CardPicker label="Admission Card - Back" uri={cardBack} onPick={() => pickImage("back")} />

          <ThemeButton
            label={isSubmitting ? "Submitting..." : "Done"}
            onPress={handleSubmit}
            loading={isSubmitting}
            variant="primary"
            style={styles.submitButton}
          />
        </ScreenTransition>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F2FBF8" },
  header: { height: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.72)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(221,235,229,0.82)" },
  headerTitle: { color: "#18231F", fontSize: 18, fontWeight: "900" },
  headerSpacer: { width: 40 },
  content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 110 },
  intro: { color: "#64746E", fontSize: 13, fontWeight: "600", lineHeight: 19, marginBottom: 22 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { color: "#50665F", fontSize: 12, fontWeight: "900", marginBottom: 6 },
  inputShell: {
    minHeight: 60,
    borderWidth: 1.3,
    borderColor: "rgba(153,177,169,0.46)",
    borderRadius: 18,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  input: { flex: 1, color: "#063D31", fontSize: 15, fontWeight: "800", paddingVertical: 0 },
  cardPicker: {
    height: 150,
    borderRadius: 18,
    borderWidth: 1.3,
    borderColor: "rgba(153,177,169,0.46)",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  cardImage: { width: "100%", height: "100%" },
  cardPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  cardPlaceholderText: { color: "#0B8F62", fontSize: 13, fontWeight: "700", marginTop: 6 },
  submitButton: { marginTop: 10 },
});
