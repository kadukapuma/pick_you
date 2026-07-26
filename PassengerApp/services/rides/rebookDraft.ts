import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LocationSuggestion } from "../maps/locationSuggestions";

const REBOOK_DRAFT_KEY = "ride-booking:rebook-draft";

type RebookDraft = {
  pickup: LocationSuggestion;
  destination: LocationSuggestion;
  savedAt: string;
};

const readNumber = (...values: any[]): number | null => {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
};

const buildLocation = (
  id: string,
  address: string,
  latitude: number | null,
  longitude: number | null,
): LocationSuggestion | null => {
  if (latitude == null || longitude == null) return null;
  return {
    id,
    address,
    details: address,
    latitude,
    longitude,
    placeType: "address",
    provider: "local",
  };
};

export function getRebookLocationsFromRide(ride: any): {
  pickup: LocationSuggestion | null;
  destination: LocationSuggestion | null;
} {
  const fallbackId = ride?.id || Date.now();
  const pickup = buildLocation(
    `rebook-pickup-${fallbackId}`,
    ride?.pickup_address || ride?.pickup?.address || ride?.pickup || "Pickup location",
    readNumber(ride?.pickup_latitude, ride?.pickup_lat, ride?.pickup?.latitude, ride?.pickup?.lat),
    readNumber(ride?.pickup_longitude, ride?.pickup_lng, ride?.pickup?.longitude, ride?.pickup?.lng),
  );
  const destination = buildLocation(
    `rebook-destination-${fallbackId}`,
    ride?.drop_address || ride?.dropoff_address || ride?.dropoff?.address || ride?.drop?.address || ride?.drop || "Destination",
    readNumber(ride?.drop_latitude, ride?.drop_lat, ride?.dropoff_latitude, ride?.dropoff_lat, ride?.destination?.latitude, ride?.dropoff?.latitude, ride?.drop?.latitude),
    readNumber(ride?.drop_longitude, ride?.drop_lng, ride?.dropoff_longitude, ride?.dropoff_lng, ride?.destination?.longitude, ride?.dropoff?.longitude, ride?.drop?.longitude),
  );

  return { pickup, destination };
}

export async function saveRebookDraft(
  pickup: LocationSuggestion,
  destination: LocationSuggestion,
) {
  const draft: RebookDraft = {
    pickup,
    destination,
    savedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(REBOOK_DRAFT_KEY, JSON.stringify(draft));
}

export async function loadRebookDraft(): Promise<RebookDraft | null> {
  const raw = await AsyncStorage.getItem(REBOOK_DRAFT_KEY);
  if (!raw) return null;

  try {
    const draft = JSON.parse(raw) as RebookDraft;
    if (!draft?.pickup || !draft?.destination) return null;
    return draft;
  } catch {
    return null;
  }
}
