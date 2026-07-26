import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";

const services = [
  {
    title: "Find Ride",
    subtitle: "Book instantly",
    image: require("../../assets/images/home/car_opt.png"),
    accent: "#0B9E54",
  },
  {
    title: "Delivery",
    subtitle: "Fast items",
    image: require("../../assets/images/home/bike_opt.png"),
    accent: "#13A875",
    comingSoonMessage: "Quick and reliable item delivery is on the way.",
  },
  {
    title: "Parcels",
    subtitle: "Send anywhere",
    image: require("../../assets/images/home/truck_opt.png"),
    accent: "#0A7F5A",
    comingSoonMessage: "You’ll soon be able to send parcels safely anywhere.",
  },
  {
    title: "Find Food",
    subtitle: "Favorite food",
    image: require("../../assets/images/home/food_opt.png"),
    accent: "#16A34A",
    comingSoonMessage: "Your favorite meals and restaurants are coming soon.",
  },
];

export default function ServiceGrid({ compact = false }: { compact?: boolean }) {
  const [comingSoonService, setComingSoonService] =
    React.useState<(typeof services)[number] | null>(null);
  const { width } = useWindowDimensions();
  const isNarrow = width < 360;
  const isTablet = width >= 768;
  const gridGap = isNarrow ? 10 : 12;
  const cardWidth = isTablet ? "23%" : isNarrow ? "47.5%" : "47%";

  return (
    <View style={[styles.gridContainer, { gap: gridGap }]}>
      {services.map((item, index) => (
        <TouchableOpacity
          key={item.title}
          activeOpacity={0.74}
          style={[
            styles.card,
            index === 0 && styles.primaryCard,
            {
              width: cardWidth,
              minHeight: compact ? 104 : 116,
              padding: compact ? 9 : 10,
            },
          ]}
          onPress={() => {
            if (index === 0) {
              router.push("/ride-booking/pickup-map" as any);
              return;
            }

            setComingSoonService(item);
          }}
        >
          <View style={styles.topRow}>
            <View
              style={[
                styles.accentDot,
                { backgroundColor: item.accent },
                index !== 0 && styles.mutedDot,
              ]}
            />
            {index === 0 ? (
              <Text style={styles.badgeText} numberOfLines={1}>
                Ride
              </Text>
            ) : null}
          </View>

          <View
            style={[
              styles.imageContainer,
              compact && styles.compactImageContainer,
            ]}
          >
            <Image source={item.image} style={styles.image} contentFit="contain" />
          </View>

          <View style={styles.textContainer}>
            <Text
              style={[styles.title, { fontSize: compact ? 13 : 14 }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.88}
            >
              {item.title}
            </Text>
            <Text
              style={[styles.subtitle, { fontSize: compact ? 10.5 : 11.5 }]}
              numberOfLines={1}
            >
              {item.subtitle}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
      <Modal
        visible={Boolean(comingSoonService)}
        transparent
        animationType="fade"
        onRequestClose={() => setComingSoonService(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {comingSoonService ? (
              <View style={styles.modalImageWrap}>
                <Image
                  source={comingSoonService.image}
                  style={styles.modalImage}
                  contentFit="contain"
                />
              </View>
            ) : null}
            <Text style={styles.modalEyebrow}>COMING SOON</Text>
            <Text style={styles.modalTitle}>{comingSoonService?.title}</Text>
            <Text style={styles.modalMessage}>
              {comingSoonService?.comingSoonMessage}
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              activeOpacity={0.84}
              onPress={() => setComingSoonService(null)}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(11,143,98,0.12)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 7,
    elevation: 2,
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  primaryCard: {
    borderColor: "rgba(11,158,84,0.32)",
    shadowOpacity: 0.1,
  },
  topRow: {
    minHeight: 18,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accentDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  mutedDot: {
    opacity: 0.36,
  },
  badgeText: {
    color: "#0B8F62",
    fontSize: 10,
    fontWeight: "800",
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 1.75,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    marginBottom: 7,
  },
  compactImageContainer: {
    aspectRatio: 1.95,
    marginBottom: 5,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  textContainer: {
    width: "100%",
  },
  title: {
    color: "#0F2E23",
    fontWeight: "800",
    marginBottom: 3,
    letterSpacing: 0,
  },
  subtitle: {
    color: "#68776F",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    padding: 24,
    backgroundColor: "rgba(15, 23, 42, 0.48)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    elevation: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  modalImageWrap: { width: 110, height: 82, marginBottom: 8 },
  modalImage: { width: "100%", height: "100%" },
  modalEyebrow: {
    color: "#0B9E54",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  modalTitle: {
    color: "#0F2E23",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 5,
  },
  modalMessage: {
    color: "#64746D",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 21,
    textAlign: "center",
    marginTop: 9,
  },
  modalButton: {
    width: "100%",
    height: 50,
    borderRadius: 25,
    backgroundColor: "#0B9E54",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  modalButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },});
