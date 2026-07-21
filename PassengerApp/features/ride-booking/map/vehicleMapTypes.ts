export type MapCoordinate = {
  ride_id?: number;
  driver_id?: number;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number | null;
  recorded_at?: string;
  sequence?: number;
};

export type NearbyVehicle = {
  id: string;
  coordinate: MapCoordinate;
  vehicleType: string;
  heading?: number;
};
