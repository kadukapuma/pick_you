import { router } from "expo-router";
import { Image, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";

import FeatureRow from "../../../components/home/FeatureRow";
import HomeHeader from "../../../components/home/HomeHeader";
import SavedPlaces from "../../../components/home/SavedPlaces";
import SearchBar from "../../../components/home/SearchBar";
import ServiceGridnew from "../../../components/home/serviceGridnew";

export default function HomeScreen() {
  const { height, width } = useWindowDimensions();

  const isSmallDevice = width < 370;
  const isShortScreen = height < 760;
  const isVeryShortScreen = height < 690;

  const horizontalPadding = isSmallDevice ? 14 : 18;
  const sectionGap = isVeryShortScreen ? 12 : isShortScreen ? 16 : 20;

  const headerTopPadding =
    Platform.OS === "ios"
      ? isVeryShortScreen
        ? 54
        : 60
      : (StatusBar.currentHeight ?? 0) + 14;

  const headerHeight = 70;

  // Map size — responsive, prominent, but won't blow up the row layout
  const mapWidth = width * 0.55;
  const mapHeight = height * 0.28;

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      {/* ── FIXED STICKY HEADER ───────────────────────────────────────────── */}
      <View
        style={[
          styles.headerContainer,
          {
            paddingTop: headerTopPadding,
            paddingLeft: 0,
            paddingRight: horizontalPadding,
          },
        ]}
      >
        <HomeHeader compact={isShortScreen} />
      </View>

      {/* ── SCROLLABLE CONTENT ─────────────────────────────────────────── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: headerTopPadding + headerHeight,
          paddingBottom: 130,
        }}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <View style={{ paddingHorizontal: horizontalPadding }}>

          

          {/* MAP GRAPHIC & PROMO TEXT */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
              marginTop: 18,
            }}
          >
            {/* Promo Text (Left Side) */}
            <View style={{ flex: 1.2, paddingRight: 4 }}>
              <Text style={{ fontSize: 42, fontWeight: "900", color: "#0B3D2E", lineHeight: 42 }}>
                WHERE
              </Text>
              <Text style={{ fontSize: 42, fontWeight: "900", color: "#0B3D2E", lineHeight: 42 }}>
                TO
              </Text>
              <Text style={{ fontSize: 42, fontWeight: "900", color: "#0b9e54", lineHeight: 42 }}>
                PICK?
              </Text>
              <Text style={{ fontSize: 18, color: "#6B7280", lineHeight: 24, marginTop: 16 }}>
                Book your next{"\n"}
                <Text style={{ fontWeight: "700", color: "#0b9e54" }}>ride</Text> with us
              </Text>
            </View>

            {/* Map Decoration (Right Side - Responsive) */}
            <View
              style={{
                width: mapWidth,
                height: mapHeight,
                alignItems: "flex-end",
                justifyContent: "center",
              }}
            >
              <Image
                source={require("../../../assets/images/home/map.png")}
                style={{
                  width: "100%",
                  height: "100%",
                  resizeMode: "contain",
                }}
              />
            </View>
          </View>

          {/* SEARCH BAR */}
          <View style={{ marginBottom: sectionGap + 4 }}>
            <SearchBar
              compact={isShortScreen}
              onPress={() => router.push("/ride-search")}
            />
          </View>

          {/* SERVICES GRID */}
          <View style={{ marginBottom: sectionGap }}>
            <ServiceGridnew compact={isShortScreen} />
          </View>

          {/* VIEW MORE SERVICES BUTTON */}
          <View style={{ alignItems: "center", marginBottom: sectionGap + 12 }}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={{
                backgroundColor: "#0b9e54",
                borderRadius: 25,
                paddingVertical: 12,
                paddingHorizontal: 36,
                elevation: 2,
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 13, letterSpacing: 0.2 }}>
                VIEW MORE SERVICES
              </Text>
            </TouchableOpacity>
          </View>

          {/* FEATURES
          <View style={{ marginBottom: sectionGap }}>
            <FeatureRow compact={isShortScreen} />
          </View> */}

          {/* SAVED PLACES */}
          <View style={{ marginBottom: sectionGap }}>
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
});