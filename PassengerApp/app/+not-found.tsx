import { StyleSheet, Text, View } from "react-native";
import { Link, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops! Not Found" }} />
      <SafeAreaView
        style={styles.safeArea}
        edges={["top", "bottom", "left", "right"]}
      >
        <View style={styles.container}>
          <Text style={{ color: "#fff", fontSize: 24, marginBottom: 20, alignItems: "center", textAlign: "center"       }}>
            The page you are looking for does not exist.
          </Text>
          <Link href="/(drawer)/(tabs)/home" style={styles.button}>
            Go back to Home screen!
          </Link>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#25292e", // ensures background fills safe area
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    fontSize: 20,
    textDecorationLine: "underline",
    color: "#fff",
  },
});
