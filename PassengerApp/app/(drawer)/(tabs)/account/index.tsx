import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function AccountMenuScreen() {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
            <Text style={styles.title}>Account</Text>

            <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push("/(drawer)/(tabs)/account/details")}
                activeOpacity={0.8}
            >
                <View style={styles.menuItemLeft}>
                    <Ionicons name="person-outline" size={24} color="#374151" />
                    <Text style={styles.menuItemText}>Profile Details</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* You can add more account-related options here in the future */}
            {/* 
      <TouchableOpacity style={styles.menuItem}>
          ...
      </TouchableOpacity> 
      */}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F4FBFF",
        paddingHorizontal: 20,
    },
    title: {
        color: "#111827",
        fontSize: 24,
        fontWeight: "800",
        marginBottom: 30,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#FFFFFF",
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        // Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    menuItemLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    menuItemText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#374151",
        marginLeft: 12,
    },
});
