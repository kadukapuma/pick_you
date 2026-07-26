import type { MapCoordinate, NearbyVehicle } from "./vehicleMapTypes";

const VEHICLE_PATTERN = [
  { vehicleType: "car", lat: 0.0022, lng: -0.0016, heading: 35 },
  { vehicleType: "tuk", lat: -0.0014, lng: 0.0023, heading: 120 },
  { vehicleType: "bike", lat: 0.0015, lng: 0.002, heading: 260 },
  { vehicleType: "mini-car", lat: -0.0025, lng: -0.0019, heading: 310 },
  { vehicleType: "van", lat: 0.003, lng: 0.0009, heading: 185 },
  { vehicleType: "car", lat: -0.0009, lng: -0.003, heading: 70 },
];

const normalizeVehicleType = (value?: string | null) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");

const isSameVehicleFamily = (vehicleType: string, selectedType?: string | null) => {
  const vehicle = normalizeVehicleType(vehicleType);
  const selected = normalizeVehicleType(selectedType);
  if (!selected) return true;
  if (selected === "suv") return vehicle === "van";
  if (selected === "tuk" || selected === "threewheel" || selected === "three-wheel") {
    return vehicle === "tuk" || vehicle === "three-wheel";
  }
  if (selected === "minicar" || selected === "mini-car" || selected === "mini") {
    return vehicle === "mini-car";
  }
  return vehicle === selected;
};

export const createMockNearbyVehicles = (
  center?: MapCoordinate | null,
  selectedVehicleType?: string | null,
): NearbyVehicle[] => {
  if (!center) return [];

  const filteredPattern = VEHICLE_PATTERN.filter((item) =>
    isSameVehicleFamily(item.vehicleType, selectedVehicleType),
  );
  const sourcePattern = filteredPattern.length > 0 ? filteredPattern : VEHICLE_PATTERN;

  return sourcePattern.map((item, index) => ({
    id: `nearby-${item.vehicleType}-${index}`,
    vehicleType: item.vehicleType,
    heading: item.heading,
    coordinate: {
      latitude: center.latitude + item.lat,
      longitude: center.longitude + item.lng,
      heading: item.heading,
    },
  }));
};
