import React from "react";
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { MotiText, MotiView } from "moti";

const BRAND_GREEN = "#00A859";

const privacySections = [
  {
    title: "Information We Collect",
    body: "We may collect the following information:",
    bullets: [
      "Personal Information",
      "Full Name",
      "Phone Number",
      "Email Address",
      "National Identity Card Number",
      "Driver License Information",
      "Vehicle Information",
      "Vehicle Registration Details",
      "Vehicle Type",
      "Vehicle Insurance Information",
      "Location Information",
      "Real-time GPS location while the driver is online",
      "Route and trip-related location information",
      "Device Information",
      "Device Model",
      "Operating System Version",
      "App Version",
      "Device Identifiers",
    ],
  },
  {
    title: "How We Use Information",
    body: "We use collected information to:",
    bullets: [
      "Create and manage driver accounts",
      "Verify driver identity",
      "Match drivers with passengers",
      "Provide navigation and trip services",
      "Improve application performance",
      "Ensure platform safety and security",
      "Comply with legal requirements",
    ],
  },
  {
    title: "Location Services",
    body:
      "PickU Driver collects location data while drivers are online or actively using the application to:",
    bullets: [
      "Receive ride requests",
      "Navigate to pickup locations",
      "Track trip progress",
      "Improve service reliability",
    ],
    footer:
      "Location data continues to be collected even when the app is closed or not in use (running in the background) while a driver is online, so you can keep receiving ride requests and passengers can track your arrival even while using external navigation apps or with your screen off.",
  },
  {
    title: "Permissions We Request",
    body:
      "Before requesting device permissions, PickU Driver shows an in-app screen explaining what data is collected and why. The app requests:",
    bullets: [
      "Location (While Using the App) — to show and navigate you to nearby ride requests.",
      "Location (Background / \"Allow all the time\") — collected even when the app is closed or not in use, requested only when you choose to go online, and only after you review and agree to an in-app disclosure screen.",
      "Camera and Photos — to capture your profile picture and verification documents.",
      "Notifications — to alert you to new ride requests and account updates.",
    ],
    footer:
      "You may decline any permission, but declining background location will prevent you from going online and receiving trips. Permissions can be reviewed or changed anytime in your device Settings.",
  },
  {
    title: "Information Sharing",
    body: "We do not sell personal information.\n\nInformation may be shared with:",
    bullets: [
      "Passengers during active trips",
      "Service providers supporting our platform",
      "Government authorities when legally required",
    ],
  },
  {
    title: "Data Security",
    body:
      "We implement reasonable security measures to protect user information from unauthorized access, disclosure, or misuse.",
  },
  {
    title: "Data Retention",
    body:
      "We retain information only as long as necessary to provide services, comply with legal obligations, and resolve disputes.",
  },
  {
    title: "Your Rights",
    body: "Drivers may:",
    bullets: [
      "Request account information",
      "Request correction of inaccurate data",
      "Request account deletion where legally permitted",
    ],
  },
  {
    title: "Contact Us",
    body: "For questions regarding this Privacy Policy:\n\nEmail: support@picku.lk",
  },
];

const termsSections = [
  {
    title: "Driver Eligibility",
    body: "Drivers must:",
    bullets: [
      "Be at least 18 years old",
      "Hold a valid driving license",
      "Provide accurate registration information",
      "Maintain required vehicle documentation",
    ],
  },
  {
    title: "Driver Responsibilities",
    body: "Drivers agree to:",
    bullets: [
      "Operate vehicles safely",
      "Follow local traffic laws",
      "Maintain professional behavior",
      "Keep account information accurate",
      "Protect passenger safety and privacy",
    ],
  },
  {
    title: "App Permissions",
    body:
      "To use core driver features, you must grant PickU Driver certain device permissions:",
    bullets: [
      "Location (Foreground) — to show nearby ride requests and provide navigation.",
      "Location (Background) — collected even when the app is closed or not in use, only while you are online, to receive dispatch requests and keep passengers updated on your arrival.",
      "Camera — to capture and upload documents and vehicle photos for verification.",
    ],
    footer:
      "Background location access is requested only after you review and agree to an in-app disclosure screen. You may decline, but you will not be able to go online and receive trips until it is granted. Permissions can be changed anytime in your device Settings.",
  },
  {
    title: "Account Verification",
    body:
      "PickU may verify driver identity and vehicle documentation before account approval.\n\nSubmission of false information may result in account suspension or termination.",
  },
  {
    title: "Ride Acceptance",
    body:
      "Drivers may receive ride requests through the application.\n\nRepeated cancellation, misuse, or abuse of the platform may affect account status.",
  },
  {
    title: "Payments",
    body:
      "Drivers may receive earnings based on completed trips according to PickU policies.\n\nPayment schedules and commission structures may be updated from time to time.",
  },
  {
    title: "Prohibited Activities",
    body: "Drivers must not:",
    bullets: [
      "Share accounts with others",
      "Use fraudulent documents",
      "Engage in illegal activities",
      "Harass passengers",
      "Manipulate fares or ride information",
    ],
  },
  {
    title: "Suspension and Termination",
    body: "PickU reserves the right to suspend or terminate accounts for:",
    bullets: [
      "Violations of these terms",
      "Fraudulent activities",
      "Unsafe driving behavior",
      "Abuse of the platform",
    ],
  },
  {
    title: "Limitation of Liability",
    body:
      'PickU provides the platform on an "as available" basis and is not responsible for losses arising from service interruptions, technical failures, or events beyond our control.',
  },
  {
    title: "Changes to Terms",
    body:
      "PickU may update these Terms and Conditions at any time. Continued use of the application constitutes acceptance of updated terms.",
  },
  {
    title: "Contact Information",
    body: "For support or inquiries:\n\nEmail: support@picku.lk",
  },
];

export const legalDocuments = {
  privacy: {
    eyebrow: "Privacy Policy",
    title: "PickU Driver Privacy Policy",
    icon: "shield-check",
    intro:
      "Welcome to PickU Driver. Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your information when using the PickU Driver mobile application.",
    sections: privacySections,
  },
  terms: {
    eyebrow: "Terms & Conditions",
    title: "PickU Driver Terms and Conditions",
    icon: "file-document-outline",
    intro: "By using the PickU Driver application, you agree to the following terms.",
    sections: termsSections,
  },
};

const LegalDocumentScreen = ({ navigation, route }) => {
  const type = route?.params?.type || "privacy";
  const document = legalDocuments[type] || legalDocuments.privacy;

  return (
    <View style={styles.mainBackground}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <MotiView
        from={{ opacity: 0, scale: 0.5, rotate: "0deg" }}
        animate={{ opacity: 1, scale: 1, rotate: "15deg" }}
        transition={{ type: "timing", duration: 1800 }}
        style={[styles.graphicBlob, styles.topBlob]}
      />
      <MotiView
        from={{ opacity: 0, x: 80 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "timing", duration: 1200, delay: 300 }}
        style={[styles.graphicBlob, styles.bottomBlob]}
      />

      <SafeAreaView edges={["top"]} style={styles.safeTop}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation?.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Feather name="chevron-left" size={24} color="#1E293B" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <MotiView
          from={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", delay: 150 }}
          style={styles.iconCircle}
        >
          <MaterialCommunityIcons
            name={document.icon}
            size={34}
            color={BRAND_GREEN}
          />
        </MotiView>

        <MotiText
          from={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 250 }}
          style={styles.eyebrow}
        >
          {document.eyebrow}
        </MotiText>

        <MotiText
          from={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 320 }}
          style={styles.title}
        >
          {document.title}
        </MotiText>

        <Text style={styles.effectiveDate}>Effective Date: June 2026</Text>
        <Text style={styles.intro}>{document.intro}</Text>

        <View style={styles.documentBody}>
          {document.sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.body ? <Text style={styles.bodyText}>{section.body}</Text> : null}
              {section.bullets?.map((item) => (
                <View key={item} style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
              {section.footer ? (
                <Text style={[styles.bodyText, styles.footerBody]}>{section.footer}</Text>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={styles.bottomSafeArea} />
    </View>
  );
};

const styles = StyleSheet.create({
  mainBackground: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  graphicBlob: {
    position: "absolute",
    borderRadius: 180,
  },
  topBlob: {
    top: -110,
    right: -70,
    width: 340,
    height: 340,
    backgroundColor: "rgba(0, 168, 89, 0.12)",
  },
  bottomBlob: {
    bottom: -70,
    left: -100,
    width: 260,
    height: 260,
    backgroundColor: "rgba(203, 213, 225, 0.35)",
  },
  safeTop: {
    backgroundColor: "transparent",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 8 : 0,
    paddingBottom: 6,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 34,
    alignItems: "center",
  },
  iconCircle: {
    width: 74,
    height: 74,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 168, 89, 0.1)",
    shadowColor: "#00A859",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 4,
  },
  eyebrow: {
    color: BRAND_GREEN,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 6,
  },
  title: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
    textAlign: "center",
    marginBottom: 8,
  },
  effectiveDate: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 16,
  },
  intro: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  documentBody: {
    width: "100%",
  },
  section: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 8,
  },
  bodyText: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 21,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND_GREEN,
    marginTop: 7,
    marginRight: 10,
  },
  bulletText: {
    flex: 1,
    color: "#475569",
    fontSize: 13,
    lineHeight: 21,
  },
  footerBody: {
    marginTop: 12,
  },
  bottomSafeArea: {
    backgroundColor: "#000000",
  },
});

export default LegalDocumentScreen;
