import { router } from "expo-router";
import { useState, useRef } from "react";
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  Animated,
} from "react-native";

import FeatureRow from "../../components/home/FeatureRow";
import HomeHeader from "../../components/home/HomeHeader";
import SavedPlaces from "../../components/home/SavedPlaces";
import SearchBar from "../../components/home/SearchBar";
import ServiceGridnew from "../../components/home/serviceGridnew";

export default function HomeScreen() {
  const { height, width } = useWindowDimensions();

  // Responsive helpers
  const isSmallDevice = width < 370;
  const isShortScreen = height < 760;
  const isVeryShortScreen = height < 690;

  // Dynamic spacing
  const horizontalPadding = isSmallDevice ? 14 : 18;
  const sectionGap = isVeryShortScreen ? 10 : isShortScreen ? 12 : 16;

  // Header spacing
  const headerTopPadding =
    Platform.OS === "ios"
      ? isVeryShortScreen
        ? 54
        : 60
      : (StatusBar.currentHeight || 0) + 14;

  const headerHeight = isShortScreen ? 60 : 68;

  // Hero map height
  const heroMapHeight = isVeryShortScreen ? 300 : isShortScreen ? 350 : 410;

  const [headerActive, setHeaderActive] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const isAtTop = offsetY <= 2;
    setHeaderActive((current) => (current === isAtTop ? current : isAtTop));
    scrollY.setValue(offsetY);
  };

  // Calculate blur/white overlay opacity based on scroll position
  const mapOverlayOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 0.85],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.screen}>
      {/* MAP BACKGROUND */}
      <View
        style={[
          styles.mapContainer,
          {
            height: heroMapHeight,
          },
        ]}
      >
        <Image
          source={require("../../../assets/images/map.png")}
          style={styles.mapImage}
        />

        {/* DYNAMIC BLUR/WHITE OVERLAY - THIS CREATES THE BLUR EFFECT ON SCROLL */}
        <Animated.View
          style={[
            styles.mapBlurOverlay,
            {
              opacity: mapOverlayOpacity,
            },
          ]}
        />

        {/* BOTTOM GRADIENT OVERLAY */}
        <View style={styles.mapOverlay} />
      </View>

      {/* HEADER */}
      <View
        pointerEvents={headerActive ? "auto" : "none"}
        style={[
          styles.header,
          {
            paddingTop: headerTopPadding,
            paddingHorizontal: horizontalPadding,
            zIndex: 20,
          },
        ]}
      >
        <HomeHeader compact={isShortScreen} />
      </View>

      {/* CONTENT */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: headerTopPadding + headerHeight + heroMapHeight * 0.42,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        bounces
      >
        {/* HERO TEXT - NO BLUR, ALWAYS VISIBLE */}
        <View
          style={[
            styles.heroSection,
            {
              paddingHorizontal: horizontalPadding,
            },
          ]}
        >
          <View style={styles.heroContent}>
            <Text
              style={[
                styles.heroTitle,
                isShortScreen && styles.compactHeroTitle,
                isVeryShortScreen && styles.smallHeroTitle,
              ]}
            >
              Where do you{"\n"}want to go today?
            </Text>
          </View>
        </View>

        {/* MAIN CONTENT CARD - REMOVED SHADOW */}
        <View
          style={[
            styles.contentCard,
            {
              marginTop: sectionGap + 10,
              paddingHorizontal: horizontalPadding,
              paddingTop: 22,
            },
          ]}
        >
          {/* SERVICES */}
          <View>
            <ServiceGridnew compact={isShortScreen} />
          </View>

          {/* SEARCH */}
          <View style={{ marginTop: sectionGap }}>
            <SearchBar
              compact={isShortScreen}
              onPress={() => router.push("/ride-search")}
            />
          </View>

          {/* FEATURES */}
          <View style={{ marginTop: sectionGap }}>
            <FeatureRow compact={isShortScreen} />
          </View>

          {/* SAVED PLACES */}
          <View style={{ marginTop: sectionGap }}>
            <SavedPlaces compact={isShortScreen} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4FBFF",
  },

  mapContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
  },

  mapImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  mapBlurOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF", // White overlay creates blur effect on map
  },

  mapOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
    backgroundColor: "rgba(244,251,255,0.92)",
  },

  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },

  scrollView: {
    flex: 1,
  },

  heroSection: {
    zIndex: 5,
  },

  heroContent: {
    width: "100%",
  },

  greeting: {
    color: "#0B3D2E",
    fontSize: 13,
    fontWeight: "600",
  },

  heroTitle: {
    color: "#111827",
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36,
    marginTop: 4,
    letterSpacing: -0.4,
    maxWidth: "92%",
  },

  compactHeroTitle: {
    fontSize: 25,
    lineHeight: 31,
  },

  smallHeroTitle: {
    fontSize: 22,
    lineHeight: 28,
  },

  heroSubtitle: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
  },

  smallText: {
    fontSize: 11,
  },

  contentCard: {
    flex: 1,
    backgroundColor: "#F4FBFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    minHeight: 500,
    // REMOVED SHADOW PROPERTIES - no more shadow/elevation
  },
});
