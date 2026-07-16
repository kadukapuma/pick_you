import * as Location from "expo-location";
import { Platform } from "react-native";
import type { LocationSuggestion } from "./placesApi";
import { reverseGeocodeLocation } from "./placesApi";

const POSITION_TIMEOUT_MS = 12000;
const GOOD_ACCURACY_METERS = 120;

const withTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Location request timed out")), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const getReadableAddress = async (latitude: number, longitude: number) => {
  try {
    const googleResult = await reverseGeocodeLocation(latitude, longitude);
    if (googleResult) {
      return googleResult.details || googleResult.address || "Current position";
    }
  } catch {}

  try {
    const nativeResults = await Location.reverseGeocodeAsync({ latitude, longitude });
    const first = nativeResults[0];
    if (first) {
      const parts = [first.name, first.street, first.district, first.city]
        .filter(Boolean)
        .join(", ");
      if (parts) return parts;
    }
  } catch {}

  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
};

export async function getFreshCurrentLocationSuggestion(): Promise<LocationSuggestion> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("We could not get your exact location. Turn on precise location/GPS and try again.");
  }

  if (Platform.OS === "android") {
    try {
      await Location.enableNetworkProviderAsync();
    } catch {}
  }

  let position: Location.LocationObject | null = null;
  try {
    position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest }),
      POSITION_TIMEOUT_MS,
    );
  } catch {
    position = await Location.getLastKnownPositionAsync({
      maxAge: 30000,
      requiredAccuracy: GOOD_ACCURACY_METERS,
    });
  }

  if (!position) {
    throw new Error("We could not get your exact location. Turn on precise location/GPS and try again.");
  }

  const { latitude, longitude, accuracy } = position.coords;
  const details = await getReadableAddress(latitude, longitude);
  const accuracyText = Number.isFinite(accuracy ?? NaN)
    ? `Accurate within about ${Math.round(accuracy!)} m`
    : "Fresh phone GPS position";

  return {
    id: "current",
    address: "Your Location",
    details: `${details} • ${accuracyText}`,
    latitude,
    longitude,
    placeType: "address",
  };
}