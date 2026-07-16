export type MapCoordinate = {
  latitude: number;
  longitude: number;
  heading?: number;
};

export type NearbyVehicle = {
  id: string;
  coordinate: MapCoordinate;
  vehicleType: string;
  heading?: number;
};
