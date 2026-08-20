import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import HomeHeader from "../../../features/home/HomeHeader";
import SavedPlaces from "../../../features/home/SavedPlacesPreview";
import SearchBar from "../../../features/home/RideSearchBar";
import ServiceGrid from "../../../features/home/ServiceGrid";
import StudentEligibilityModal from "../../../components/ui/StudentEligibilityModal";
import StudentStatusModal from "../../../components/ui/StudentStatusModal";
import { StudentVerificationService } from "../../../services/auth/studentVerificationApi";

const STUDENT_PROMPT_SEEN_KEY = "student_prompt_seen";
const STUDENT_LAST_SEEN_STATUS_KEY = "student_last_seen_status";

export default function HomeScreen() {
  const { height, width } = useWindowDimensions();
  const [showEligibilityModal, setShowEligibilityModal] = useState(false);
  const [statusModal, setStatusModal] = useState<"approved" | "rejected" | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const result = await StudentVerificationService.getStatus();
      if (!mounted || !result.success || !result.data) return;

      const currentStatus = result.data.status;
      const lastSeenStatus = await AsyncStorage.getItem(STUDENT_LAST_SEEN_STATUS_KEY);

      if (
        (currentStatus === "approved" || currentStatus === "rejected") &&
        lastSeenStatus !== currentStatus
      ) {
        setStatusModal(currentStatus);
        await AsyncStorage.setItem(STUDENT_LAST_SEEN_STATUS_KEY, currentStatus);
        return;
      }

      if (currentStatus === "none") {
        const promptSeen = await AsyncStorage.getItem(STUDENT_PROMPT_SEEN_KEY);
        if (!promptSeen) {
          setShowEligibilityModal(true);
        }
      } else {
        await AsyncStorage.setItem(STUDENT_LAST_SEEN_STATUS_KEY, currentStatus);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const dismissEligibilityModal = async () => {
    setShowEligibilityModal(false);
    await AsyncStorage.setItem(STUDENT_PROMPT_SEEN_KEY, "1");
  };

  const acceptEligibilityPrompt = async () => {
    setShowEligibilityModal(false);
    await AsyncStorage.setItem(STUDENT_PROMPT_SEEN_KEY, "1");
    router.push("/(app)/(tabs)/account/student-verification" as any);
  };

  const isVerySmallDevice = width < 340;
  const isSmallDevice = width < 380;
  const isTablet = width >= 768;

  const isShortScreen = height < 760;
  const isVeryShortScreen = height < 690;

  const useStackedHero = width < 330;

  const horizontalPadding = isVerySmallDevice
    ? 12
    : isSmallDevice
      ? 14
      : isTablet
        ? 28
        : 18;

  const sectionGap = isVeryShortScreen ? 12 : isShortScreen ? 16 : 20;

  const headerTopPadding =
    Platform.OS === "ios"
      ? isVeryShortScreen
        ? 48
        : 56
      : (StatusBar.currentHeight ?? 0) + 12;

  const headerHeight = 70;

  /*
   * Responsive hero measurements.
   * These values are capped so the map cannot consume too much width.
   */
  const heroTitleSize = isVerySmallDevice
    ? 30
    : isSmallDevice
      ? 34
      : isTablet
        ? 52
        : 40;

  const heroLineHeight = Math.round(heroTitleSize * 1.02);

  const subtitleSize = isVerySmallDevice ? 14 : isSmallDevice ? 16 : 18;

  const availableWidth = width - horizontalPadding * 2;

  const mapWidth = useStackedHero
    ? Math.min(availableWidth, 280)
    : Math.min(availableWidth * (isTablet ? 0.5 : 0.52), isTablet ? 420 : 240);

  const mapHeight = useStackedHero
    ? Math.min(height * 0.23, 190)
    : Math.min(height * 0.27, isTablet ? 340 : 240);

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Fixed header */}
      <View
        style={[
          styles.headerContainer,
          {
            paddingTop: headerTopPadding,
            paddingRight: horizontalPadding,
          },
        ]}
      >
        <HomeHeader compact={isShortScreen} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: headerTopPadding + headerHeight,
          paddingBottom: 130,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces
      >
        <View style={{ paddingHorizontal: horizontalPadding }}>
          {/* Hero section */}
          <View
            style={[
              styles.heroContainer,
              {
                flexDirection: useStackedHero ? "column" : "row",
                minHeight: useStackedHero ? undefined : mapHeight,
                marginTop: isVeryShortScreen ? 10 : 18,
                marginBottom: isVeryShortScreen ? 14 : 20,
              },
            ]}
          >
            {/* Hero text */}
            <View
              style={[
                styles.heroTextContainer,
                useStackedHero
                  ? styles.stackedHeroText
                  : {
                      flex: 1,
                      paddingRight: isVerySmallDevice ? 6 : 10,
                    },
              ]}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                style={[
                  styles.heroTitle,
                  {
                    fontSize: heroTitleSize,
                    lineHeight: heroLineHeight,
                  },
                ]}
              >
                WHERE
              </Text>

              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                style={[
                  styles.heroTitle,
                  {
                    fontSize: heroTitleSize,
                    lineHeight: heroLineHeight,
                  },
                ]}
              >
                TO
              </Text>

              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                style={[
                  styles.heroTitle,
                  styles.greenTitle,
                  {
                    fontSize: heroTitleSize,
                    lineHeight: heroLineHeight,
                  },
                ]}
              >
                PICK?
              </Text>

              <Text
                style={[
                  styles.heroSubtitle,
                  {
                    fontSize: subtitleSize,
                    lineHeight: subtitleSize + 7,
                    marginTop: isVerySmallDevice ? 10 : 14,
                  },
                ]}
              >
                Book your next{"\n"}
                <Text style={styles.greenSubtitle}>ride</Text> with us
              </Text>
            </View>

            {/* Map graphic */}
            <View
              style={[
                styles.mapContainer,
                {
                  width: mapWidth,
                  height: mapHeight,
                  marginTop: useStackedHero ? 8 : 0,
                  alignSelf: useStackedHero ? "center" : "auto",
                },
              ]}
            >
              <Image
                source={require("../../../assets/images/home/map.png")}
                style={styles.mapImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Search bar */}
          <View style={{ marginBottom: sectionGap + 4 }}>
            <SearchBar
              compact={isShortScreen}
              onPress={() => router.push("/ride-booking")}
            />
          </View>

          {/* Services grid */}
          <View style={{ marginBottom: sectionGap }}>
            <ServiceGrid compact={isShortScreen} />
          </View>

          {/* Saved places */}
          <View style={{ marginBottom: sectionGap }}>
            <SavedPlaces compact={isShortScreen} />
          </View>
        </View>
      </ScrollView>

      <StudentEligibilityModal
        visible={showEligibilityModal}
        onYes={acceptEligibilityPrompt}
        onDismiss={dismissEligibilityModal}
      />

      {statusModal ? (
        <StudentStatusModal
          visible
          status={statusModal}
          onClose={() => setStatusModal(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4FBFF",
  },

  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: "#F4FBFF",
    paddingBottom: 12,
  },

  scrollView: {
    flex: 1,
  },

  heroContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },

  heroTextContainer: {
    minWidth: 0,
    flexShrink: 1,
    justifyContent: "center",
    zIndex: 2,
  },

  stackedHeroText: {
    width: "100%",
    alignItems: "center",
  },

  heroTitle: {
    width: "100%",
    fontWeight: "900",
    color: "#0B3D2E",
    includeFontPadding: false,
  },

  greenTitle: {
    color: "#0B9E54",
  },

  heroSubtitle: {
    color: "#6B7280",
    includeFontPadding: false,
  },

  greenSubtitle: {
    fontWeight: "700",
    color: "#0B9E54",
  },

  mapContainer: {
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  mapImage: {
    width: "100%",
    height: "100%",
  },

});
