import React, { useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const STEPS = [
  {
    icon: "home",
    title: "Enter Your Bank Name",
    description:
      "Type the name of the bank where you hold your account — e.g. Commercial Bank, Sampath Bank, or BOC.",
  },
  {
    icon: "map-pin",
    title: "Add The Branch",
    description:
      "Enter the exact branch name shown on your passbook or bank statement, so your payout routes correctly.",
  },
  {
    icon: "user",
    title: "Account Holder Name",
    description:
      "Type your name exactly as it appears on the bank account. A mismatch here can delay your payouts.",
  },
  {
    icon: "hash",
    title: "Account Number",
    description:
      "Carefully enter your account number and double-check every digit before saving.",
  },
];

const BankDetailsGuideModal = ({ visible, onClose, onFinish }) => {
  const [activeStep, setActiveStep] = useState(0);
  const scrollRef = useRef(null);

  const goToStep = (index) => {
    setActiveStep(index);
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
  };

  const handleMomentumEnd = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveStep(index);
  };

  const handleSkip = () => {
    setActiveStep(0);
    onClose?.();
  };

  const handleNext = () => {
    if (activeStep < STEPS.length - 1) {
      goToStep(activeStep + 1);
      return;
    }

    setActiveStep(0);
    // Last step's primary action should actually get the driver into the
    // form, not just dismiss the explainer — bank details are required
    // before payouts can go out.
    (onFinish ?? onClose)?.();
  };

  const isLastStep = activeStep === STEPS.length - 1;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleSkip}>
      <View style={styles.container}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Bank Details Guide</Text>
            <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumEnd}
          scrollEventThrottle={16}
        >
          {STEPS.map((step, index) => (
            <View key={step.title} style={styles.stepSlide}>
              <LinearGradient colors={["#00A859", "#007A41"]} style={styles.stepIconCircle}>
                <Feather name={step.icon} size={40} color="#FFF" />
              </LinearGradient>

              <Text style={styles.stepBadge}>STEP {index + 1} OF {STEPS.length}</Text>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDescription}>{step.description}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.dotsRow}>
            {STEPS.map((step, index) => (
              <View
                key={step.title}
                style={[styles.dot, index === activeStep && styles.dotActive]}
              />
            ))}
          </View>

          <TouchableOpacity style={styles.nextButton} activeOpacity={0.85} onPress={handleNext}>
            <LinearGradient colors={["#00A859", "#007A41"]} style={styles.nextButtonGradient}>
              <Text style={styles.nextButtonText}>
                {isLastStep ? "Add Bank Details" : "Next"}
              </Text>
              <Feather
                name={isLastStep ? "arrow-right-circle" : "arrow-right"}
                size={18}
                color="#FFF"
                style={{ marginLeft: 8 }}
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <SafeAreaView edges={["bottom"]} style={styles.bottomSafeArea} />
      </View>
    </Modal>
  );
};

export default BankDetailsGuideModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    flexShrink: 1,
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800",
  },
  skipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  skipText: {
    color: "#64748B",
    fontWeight: "700",
    fontSize: 13,
  },
  stepSlide: {
    width: SCREEN_WIDTH,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
  },
  stepIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
    shadowColor: "#00A859",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  stepBadge: {
    fontSize: 11,
    fontWeight: "800",
    color: "#00A859",
    letterSpacing: 1,
    marginBottom: 10,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 12,
  },
  stepDescription: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 4,
  },
  dotActive: {
    width: 22,
    backgroundColor: "#00A859",
  },
  nextButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  nextButtonGradient: {
    minHeight: 54,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  nextButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "900",
  },
  bottomSafeArea: {
    backgroundColor: "#000000",
  },
});
