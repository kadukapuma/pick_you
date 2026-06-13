import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
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
} from "react-native";

import FeatureRow from "../../../components/home/FeatureRow";
import HomeHeader from "../../../components/home/HomeHeader";
import SavedPlaces from "../../../components/home/SavedPlaces";
import SearchBar from "../../../components/home/SearchBar";
import ServiceGridnew from "../../../components/home/serviceGridnew";

// ─── Staggered entrance animation hook ─────────────────────────────────────
function useEntrance(delay = 0, duration = 520) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(22)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return { opacity, transform: [{ translateY }] };
}

// ─── Map scale-in animation hook ────────────────────────────────────────────
function useMapEntrance() {
  const scale = useRef(new Animated.Value(1.08)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 700,
        delay: 80,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 900,
        delay: 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return { opacity, transform: [{ scale }] };
}

export default function HomeScreen() {
  const { height, width } = useWindowDimensions();

  // ── Responsive breakpoints ──────────────────────────────────────────────
  const isSmallDevice = width < 370;
  const isShortScreen = height < 760;
  const isVeryShortScreen = height < 690;

  const horizontalPadding = isSmallDevice ? 14 : 18;
  const sectionGap = isVeryShortScreen ? 10 : isShortScreen ? 12 : 16;

  const headerTopPadding =
    Platform.OS === "ios"
      ? isVeryShortScreen
        ? 54
        : 60
      : (StatusBar.currentHeight ?? 0) + 14;

  const headerHeight = isShortScreen ? 60 : 68;
  const heroMapHeight = isVeryShortScreen ? 300 : isShortScreen ? 350 : 410;

  // ── Scroll state ────────────────────────────────────────────────────────
  const [headerActive, setHeaderActive] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    scrollY.setValue(offsetY);
  };

  // ── Scroll-driven map overlay ───────────────────────────────────────────
  const mapOverlayOpacity = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [0, 0.88],
    extrapolate: "clamp",
  });

  // ── Parallax on map ─────────────────────────────────────────────────────
  const mapParallax = scrollY.interpolate({
    inputRange: [0, heroMapHeight],
    outputRange: [0, -heroMapHeight * 0.25],
    extrapolate: "clamp",
  });

  // ── Hero title scale on scroll ─────────────────────────────────────────
  const heroScale = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0.92],
    extrapolate: "clamp",
  });

  const heroOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  // ── Entrance animations ─────────────────────────────────────────────────
  const mapAnim = useMapEntrance();
  const heroAnim = useEntrance(180, 600);
  const servicesAnim = useEntrance(300, 540);
  const searchAnim = useEntrance(400, 540);
  const featuresAnim = useEntrance(480, 540);
  const savedAnim = useEntrance(560, 540);

  // ── Header entrance ─────────────────────────────────────────────────────
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(-12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 500,
        delay: 60,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(headerY, {
        toValue: 0,
        duration: 500,
        delay: 60,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      {/* ── MAP BACKGROUND ─────────────────────────────────────────────── */}
      <View style={[styles.mapContainer, { height: heroMapHeight }]}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              transform: [{ translateY: mapParallax }],
              opacity: mapAnim.opacity,
            },
          ]}
        >
          <Animated.Image
            source={require("../../../../assets/images/map.png")}
            style={[styles.mapImage, { transform: mapAnim.transform }]}
          />
        </Animated.View>

        {/* Scroll-driven white overlay */}
        <Animated.View
          style={[styles.mapBlurOverlay, { opacity: mapOverlayOpacity }]}
        />

        {/* Bottom gradient fade */}
        <View style={styles.mapBottomFade} />
      </View>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.header,
          {
            paddingTop: headerTopPadding,
            paddingHorizontal: horizontalPadding,
            zIndex: 20,
            opacity: headerOpacity,
            transform: [{ translateY: headerY }],
          },
        ]}
      >
        <HomeHeader compact={isShortScreen} />
      </Animated.View>

      {/* ── SCROLLABLE CONTENT ─────────────────────────────────────────── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: headerTopPadding + headerHeight + heroMapHeight * 0.42,
          paddingBottom: 130,
        }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        bounces
      >
        {/* HERO TEXT */}
        <Animated.View
          style={[
            styles.heroSection,
            { paddingHorizontal: horizontalPadding },
            heroAnim,
            {
              opacity: Animated.multiply(heroAnim.opacity, heroOpacity),
              transform: [...heroAnim.transform, { scale: heroScale }],
            },
          ]}
        >
          <Text style={[styles.heroEyebrow, isSmallDevice && { fontSize: 11 }]}>
            🇱🇰 Jaffna & beyond
          </Text>
          <Text
            style={[
              styles.heroTitle,
              isShortScreen && styles.compactHeroTitle,
              isVeryShortScreen && styles.smallHeroTitle,
            ]}
          >
            Where do you{"\n"}want to go today?
          </Text>
        </Animated.View>

        {/* CONTENT CARD */}
        <View
          style={[
            styles.contentCard,
            {
              marginTop: sectionGap + 10,
              paddingHorizontal: horizontalPadding,
              paddingTop: 26,
            },
          ]}
        >
          {/* Pill handle */}
          <View style={styles.cardHandle} />

          {/* SERVICES */}
          <Animated.View style={[servicesAnim]}>
            <ServiceGridnew compact={isShortScreen} />
          </Animated.View>

          {/* SEARCH */}
          <Animated.View style={[{ marginTop: sectionGap }, searchAnim]}>
            <SearchBar
              compact={isShortScreen}
              onPress={() => router.push("/ride-search")}
            />
          </Animated.View>

          {/* FEATURES */}
          <Animated.View style={[{ marginTop: sectionGap }, featuresAnim]}>
            <FeatureRow compact={isShortScreen} />
          </Animated.View>

          {/* SAVED PLACES */}
          <Animated.View style={[{ marginTop: sectionGap }, savedAnim]}>
            <SavedPlaces compact={isShortScreen} />
          </Animated.View>
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

  // ── Map ────────────────────────────────────────────────────────────────
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
  },

  mapBottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 160,
    // Gradient-like fade using rgba layering
    backgroundColor: "rgba(244,251,255,0.94)",
  },

  // ── Header ─────────────────────────────────────────────────────────────
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    elevation: 999, // Add this line for Android
  },

  // ── Scroll ─────────────────────────────────────────────────────────────
  scrollView: {
    flex: 1,
  },

  // ── Hero text ──────────────────────────────────────────────────────────
  heroSection: {
    zIndex: 5,
  },

  heroEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: "#20B768",
    letterSpacing: 0.4,
    marginBottom: 6,
    textTransform: "uppercase",
  },

  heroTitle: {
    color: "#111827",
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36,
    letterSpacing: -0.5,
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

  // ── Content card ───────────────────────────────────────────────────────
  contentCard: {
    flex: 1,
    backgroundColor: "#F4FBFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    minHeight: 500,
  },

  cardHandle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1E8F5",
    marginBottom: 20,
    marginTop: -4,
  },
});
