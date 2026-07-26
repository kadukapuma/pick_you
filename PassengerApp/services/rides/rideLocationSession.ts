import AsyncStorage from "@react-native-async-storage/async-storage";

export type RideSessionCoordinate = {
  latitude: number;
  longitude: number;
};

const keyForRide = (rideId: number) => `active-ride:${rideId}:trip-start`;

const isCoordinate = (value: unknown): value is RideSessionCoordinate => {
  const coordinate = value as RideSessionCoordinate | null;
  return (
    Number.isFinite(coordinate?.latitude) &&
    Number.isFinite(coordinate?.longitude) &&
    Math.abs(Number(coordinate?.latitude)) <= 90 &&
    Math.abs(Number(coordinate?.longitude)) <= 180
  );
};

export async function saveTripStartCoordinate(
  rideId: number,
  coordinate: RideSessionCoordinate,
) {
  if (!rideId || !isCoordinate(coordinate)) return;
  await AsyncStorage.setItem(keyForRide(rideId), JSON.stringify(coordinate));
}

export async function loadTripStartCoordinate(
  rideId: number,
): Promise<RideSessionCoordinate | null> {
  if (!rideId) return null;
  const stored = await AsyncStorage.getItem(keyForRide(rideId));
  if (!stored) return null;

  try {
    const coordinate = JSON.parse(stored);
    return isCoordinate(coordinate) ? coordinate : null;
  } catch {
    return null;
  }
}

export async function clearTripStartCoordinate(rideId: number) {
  if (!rideId) return;
  await AsyncStorage.removeItem(keyForRide(rideId));
}
