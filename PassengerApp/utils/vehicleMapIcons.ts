import type { ImageSourcePropType } from "react-native";

const VEHICLE_MAP_ICONS: Record<string, ImageSourcePropType> = {
  bike: require("../assets/icons/map/bike.png"),
  motorbike: require("../assets/icons/map/bike.png"),
  motorcycle: require("../assets/icons/map/bike.png"),
  car: require("../assets/icons/map/car.png"),
  "mini-car": require("../assets/icons/map/mini-car.png"),
  minicar: require("../assets/icons/map/mini-car.png"),
  mini: require("../assets/icons/map/mini-car.png"),
  suv: require("../assets/icons/map/van.png"),
  threewheel: require("../assets/icons/map/three-wheel.png"),
  "three-wheel": require("../assets/icons/map/three-wheel.png"),
  "three-wheeler": require("../assets/icons/map/three-wheel.png"),
  tuk: require("../assets/icons/map/three-wheel.png"),
  "tuk-tuk": require("../assets/icons/map/three-wheel.png"),
  van: require("../assets/icons/map/van.png"),
};

const normalizeVehicleType = (vehicleType?: string | null) =>
  String(vehicleType || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");

export const getVehicleMapIcon = (
  vehicleType?: string | null,
): ImageSourcePropType => {
  const normalizedType = normalizeVehicleType(vehicleType);
  return VEHICLE_MAP_ICONS[normalizedType] || VEHICLE_MAP_ICONS.car;
};


