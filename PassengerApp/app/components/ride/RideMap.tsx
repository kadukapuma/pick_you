import MapboxRideMap from "../map/MapboxRideMap";

type Props = {
  location: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number } | null;
  driverLocation?: { latitude: number; longitude: number; heading?: number } | null;
  onMapPress?: (event: any) => void;
};

export default function RideMap({
  location,
  destination,
  driverLocation,
  onMapPress,
}: Props) {
  return (
    <MapboxRideMap
      pickup={location}
      dropoff={destination}
      driverLocation={driverLocation}
      routeCoordinates={destination ? [location, destination] : []}
      onMapPress={onMapPress}
    />
  );
}
