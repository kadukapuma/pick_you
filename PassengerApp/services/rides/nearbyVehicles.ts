import { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import type { MapCoordinate, NearbyVehicle } from "../../features/ride-booking/map/vehicleMapTypes";

type NearbyVehicleResponse = {
  id: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  recorded_at?: string;
  vehicle_type: string;
  distance_meters?: number;
};

const POLL_INTERVAL_MS = 10_000;

export function useNearbyVehicles(center?: MapCoordinate | null, vehicleType?: string | null): NearbyVehicle[] {
  const [vehicles, setVehicles] = useState<NearbyVehicle[]>([]);
  const latitude = center?.latitude;
  const longitude = center?.longitude;

  useEffect(() => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setVehicles([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const query = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude) });
      if (vehicleType) query.set("vehicle_type", vehicleType);
      const response = await apiClient.get<NearbyVehicleResponse[]>(`/nearby-vehicles?${query.toString()}`, { suppressErrorLog: true });
      if (cancelled) return;
      if (!response.success || !Array.isArray(response.data)) {
        setVehicles([]);
        return;
      }
      setVehicles(response.data.filter((vehicle) =>
        Number.isFinite(Number(vehicle.latitude)) && Number.isFinite(Number(vehicle.longitude)),
      ).map((vehicle) => ({
        id: vehicle.id,
        vehicleType: vehicle.vehicle_type,
        heading: Number(vehicle.heading || 0),
        distanceMeters: Number.isFinite(Number(vehicle.distance_meters))
          ? Number(vehicle.distance_meters)
          : undefined,
        coordinate: {
          latitude: Number(vehicle.latitude),
          longitude: Number(vehicle.longitude),
          heading: Number(vehicle.heading || 0),
          speed: Number(vehicle.speed || 0),
          recorded_at: vehicle.recorded_at,
        },
      })));
    };
    void load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [latitude, longitude, vehicleType]);

  return vehicles;
}
