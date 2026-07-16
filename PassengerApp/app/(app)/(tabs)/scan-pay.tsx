import { Ionicons } from "@expo/vector-icons";
import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedValue, setScannedValue] = useState<string | null>(null);

  const hasPermission = permission?.granted;

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    setScannedValue(result.data);
  };

  if (!permission || (!hasPermission && permission.canAskAgain)) {
    return (
      <View style={styles.centerScreen}>
        <Ionicons name="camera-outline" size={34} color="#20B768" />
        <Text style={styles.statusText}>Opening camera...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.permissionScreen}>
        <View style={styles.permissionIcon}>
          <Ionicons name="camera-outline" size={34} color="#20B768" />
        </View>

        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionText}>
          Camera permission was denied. Enable camera access in your device
          settings to use Scan & Pay.
        </Text>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={requestPermission}
          style={styles.primaryButton}
        >
          <Ionicons name="camera" size={18} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Open Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <CameraView
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "ean13", "code128"],
        }}
        facing="back"
        onBarcodeScanned={scannedValue ? undefined : handleBarcodeScanned}
        style={StyleSheet.absoluteFill}
      />

      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.topShade} />

        <View style={styles.middleRow}>
          <View style={styles.sideShade} />

          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>

          <View style={styles.sideShade} />
        </View>

        <View style={styles.bottomShade} />
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Scan & Pay</Text>
        <Text style={styles.subtitle}>Place the QR code inside the frame</Text>
      </View>

      {scannedValue ? (
        <View style={styles.resultSheet}>
          <View style={styles.resultIcon}>
            <Ionicons name="checkmark" size={24} color="#FFFFFF" />
          </View>

          <Text style={styles.resultTitle}>QR code scanned</Text>
          <Text numberOfLines={2} style={styles.resultValue}>
            {scannedValue}
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setScannedValue(null)}
            style={styles.primaryButton}
          >
            <Ionicons name="scan" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000000",
  },
  centerScreen: {
    alignItems: "center",
    backgroundColor: "#F4FBFF",
    flex: 1,
    justifyContent: "center",
  },
  statusText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
  },
  permissionScreen: {
    alignItems: "center",
    backgroundColor: "#F4FBFF",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  permissionIcon: {
    alignItems: "center",
    backgroundColor: "#E8FAF0",
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  permissionTitle: {
    color: "#111827",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 18,
    textAlign: "center",
  },
  permissionText: {
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: "center",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#20B768",
    borderRadius: 24,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 22,
    paddingHorizontal: 22,
    paddingVertical: 13,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topShade: {
    backgroundColor: "rgba(0,0,0,0.45)",
    flex: 1,
  },
  middleRow: {
    flexDirection: "row",
    height: 260,
  },
  sideShade: {
    backgroundColor: "rgba(0,0,0,0.45)",
    flex: 1,
  },
  scanFrame: {
    height: 260,
    width: 260,
  },
  bottomShade: {
    backgroundColor: "rgba(0,0,0,0.45)",
    flex: 1.4,
  },
  corner: {
    borderColor: "#20B768",
    height: 42,
    position: "absolute",
    width: 42,
  },
  topLeft: {
    borderLeftWidth: 5,
    borderTopWidth: 5,
    left: 0,
    top: 0,
  },
  topRight: {
    borderRightWidth: 5,
    borderTopWidth: 5,
    right: 0,
    top: 0,
  },
  bottomLeft: {
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    bottom: 0,
    left: 0,
  },
  bottomRight: {
    borderBottomWidth: 5,
    borderRightWidth: 5,
    bottom: 0,
    right: 0,
  },
  header: {
    left: 24,
    position: "absolute",
    right: 24,
    top: 58,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 6,
  },
  resultSheet: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    bottom: 0,
    left: 0,
    paddingBottom: 116,
    paddingHorizontal: 24,
    paddingTop: 24,
    position: "absolute",
    right: 0,
  },
  resultIcon: {
    alignItems: "center",
    backgroundColor: "#20B768",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  resultTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 12,
  },
  resultValue: {
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
    textAlign: "center",
  },
});
