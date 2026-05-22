import { useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import FeatureRow from "../../components/home/FeatureRow";
import HomeHeader from "../../components/home/HomeHeader";
import PromoBanner from "../../components/home/PromoBanner";
import SavedPlaces from "../../components/home/SavedPlaces";
import SearchBar from "../../components/home/SearchBar";
import ServiceGrid from "../../components/home/ServiceGrid";
import WalletCard from "../../components/home/WalletCard";
import ServiceGridnew from "../../components/home/serviceGridnew";
import { router } from "expo-router";

export default function HomeScreen() {
  const { height, width } = useWindowDimensions();
  const isShort = height < 760;
  const isVeryShort = height < 690;
  const horizontalPadding = width < 370 ? 12 : 16;
  const topPadding = isVeryShort ? 24 : 34;
  const headerHeight = isShort ? 42 : 52;
  const gap = isVeryShort ? 6 : isShort ? 8 : 10;
  const [headerActive, setHeaderActive] = useState(true);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const shouldActivateHeader = event.nativeEvent.contentOffset.y <= 2;

    setHeaderActive((current) =>
      current === shouldActivateHeader ? current : shouldActivateHeader,
    );
  };

  return (
    <View style={styles.screen}>
      <View
        pointerEvents={headerActive ? "auto" : "none"}
        style={[
          styles.header,
          {
            paddingHorizontal: horizontalPadding,
            paddingTop: topPadding,
            zIndex: headerActive ? 3 : 0,
          },
        ]}
      >
        <HomeHeader compact={isShort} />
      </View>

      <ScrollView
        style={styles.scroller}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: topPadding + headerHeight + gap,
            paddingBottom: 112,
          },
        ]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.contentPanel,
            {
              paddingHorizontal: horizontalPadding,
              paddingTop: gap,
            },
          ]}
        >
          <View
            style={[
              styles.content,
              {
                gap,
              },
            ]}
          >
            <View style={styles.topSection}>
              <View style={styles.heroCopy}>
                <Text style={[styles.greeting, isVeryShort && styles.tinyText]}>
                  Vanakkam! 👋
                </Text>

                <Text
                  style={[
                    styles.heroTitle,
                    isShort && styles.compactHeroTitle,
                    isVeryShort && styles.tinyHeroTitle,
                  ]}
                >
                  Where do you{"\n"}want to go today?
                </Text>

                <Text style={[styles.heroMeta, isVeryShort && styles.tinyText]}>
                  Fast • Safe • Affordable
                </Text>
              </View>

              <WalletCard compact={isShort} />
            </View>

            <ServiceGridnew compact={isShort} />

            <SearchBar
              compact={isShort}
              onPress={() => router.push("/ride-search")}
            />

            <FeatureRow compact={isShort} />

            {/* <PromoBanner compact={isShort} /> */}

            <SavedPlaces compact={isShort} />
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
  header: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  scroller: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentPanel: {
    backgroundColor: "#F4FBFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
  topSection: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heroCopy: {
    flex: 1,
    marginRight: 8,
  },
  greeting: {
    color: "#0B3D2E",
    fontSize: 12,
  },
  heroTitle: {
    color: "#111827",
    fontSize: 25,
    fontWeight: "800",
    lineHeight: 30,
    marginTop: 3,
  },
  compactHeroTitle: {
    fontSize: 22,
    lineHeight: 26,
  },
  tinyHeroTitle: {
    fontSize: 20,
    lineHeight: 24,
  },
  heroMeta: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 5,
  },
  tinyText: {
    fontSize: 10,
  },
});
