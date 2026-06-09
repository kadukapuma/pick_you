import { router } from "expo-router";
import { useState, useRef, useEffect } from "react";
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
  Easing,
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

  // ============ PREMIUM ENTRANCE ANIMATIONS ============
  // Map animations
  const mapScale = useRef(new Animated.Value(1.15)).current;
  const mapTranslateY = useRef(new Animated.Value(-20)).current;

  // UI element animations
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-15)).current;

  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslateY = useRef(new Animated.Value(40)).current;
  const heroScale = useRef(new Animated.Value(0.95)).current;

  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(150)).current;

  // Subtle shine effect for search bar
  const searchGlow = useRef(new Animated.Value(0)).current;

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

  // Parallax effect on scroll
  const mapParallax = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, -30],
    extrapolate: "clamp",
  });

  useEffect(() => {
    // Staggered sequence for cinematic feel
    Animated.sequence([
      // Step 1: Map zoom out + subtle parallax
      Animated.parallel([
        Animated.timing(mapScale, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(mapTranslateY, {
          toValue: 0,
          duration: 1800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // Step 2: Header slides in from top
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // Step 3: Hero text with elastic bounce effect
      Animated.parallel([
        Animated.timing(heroOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
        Animated.spring(heroTranslateY, {
          toValue: 0,
          friction: 12,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.spring(heroScale, {
          toValue: 1,
          friction: 14,
          tension: 50,
          useNativeDriver: true,
        }),
      ]),

      // Step 4: Card rises with spring + subtle glow pulse on search
      Animated.parallel([
        Animated.spring(cardTranslateY, {
          toValue: 0,
          friction: 7,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        // Subtle glow pulse animation for attention
        Animated.sequence([
          Animated.timing(searchGlow, {
            toValue: 1,
            duration: 400,
            useNativeDriver: false,
          }),
          Animated.timing(searchGlow, {
            toValue: 0,
            duration: 800,
            useNativeDriver: false,
          }),
        ]),
      ]),
    ]).start();
  }, []);

  // Interpolate glow effect for search bar
  const searchGlowIntensity = searchGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8],
  });

  return (
    <View style={styles.screen}>
      {/* MAP BACKGROUND WITH PARALLAX */}
      <Animated.View
        style={[
          styles.mapContainer,
          {
            height: heroMapHeight,
            transform: [{ translateY: mapParallax }],
          },
        ]}
      >
        <Animated.Image
          source={require("../../../assets/images/map.png")}
          style={[
            styles.mapImage,
            {
              transform: [{ scale: mapScale }, { translateY: mapTranslateY }],
            },
          ]}
        />

        {/* DYNAMIC BLUR/WHITE OVERLAY */}
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
      </Animated.View>

      {/* HEADER WITH SLIDE DOWN */}
      <Animated.View
        pointerEvents={headerActive ? "auto" : "none"}
        style={[
          styles.header,
          {
            paddingTop: headerTopPadding,
            paddingHorizontal: horizontalPadding,
            zIndex: 20,
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <HomeHeader compact={isShortScreen} />
      </Animated.View>

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
        {/* HERO TEXT WITH BOUNCE EFFECT */}
        <View
          style={[
            styles.heroSection,
            {
              paddingHorizontal: horizontalPadding,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.heroContent,
              {
                opacity: heroOpacity,
                transform: [
                  { translateY: heroTranslateY },
                  { scale: heroScale },
                ],
              },
            ]}
          >
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
        </View>

        {/* MAIN CONTENT CARD */}
        <Animated.View
          style={[
            styles.contentCard,
            {
              marginTop: sectionGap + 10,
              paddingHorizontal: horizontalPadding,
              paddingTop: 22,
              opacity: cardOpacity,
              transform: [{ translateY: cardTranslateY }],
            },
          ]}
        >
          {/* SERVICES WITH STAGGERED CHILDREN */}
          <Animated.View style={{ opacity: cardOpacity }}>
            <ServiceGridnew compact={isShortScreen} />
          </Animated.View>

          {/* SEARCH WITH GLOW EFFECT */}
          <Animated.View
            style={{
              marginTop: sectionGap,
              shadowColor: "#00A884",
              shadowRadius: searchGlowIntensity,
              shadowOpacity: 0.3,
              elevation: searchGlowIntensity,
            }}
          >
            <SearchBar
              compact={isShortScreen}
              onPress={() => router.push("/ride-search")}
            />
          </Animated.View>

          {/* FEATURES */}
          <Animated.View
            style={{ marginTop: sectionGap, opacity: cardOpacity }}
          >
            <FeatureRow compact={isShortScreen} />
          </Animated.View>

          {/* SAVED PLACES */}
          <Animated.View
            style={{ marginTop: sectionGap, opacity: cardOpacity }}
          >
            <SavedPlaces compact={isShortScreen} />
          </Animated.View>
        </Animated.View>
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
    backgroundColor: "#FFFFFF",
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
  },
});
