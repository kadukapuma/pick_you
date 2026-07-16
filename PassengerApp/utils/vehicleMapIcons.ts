import type { ImageSourcePropType } from "react-native";

const VEHICLE_MAP_ICONS: Record<string, ImageSourcePropType> = {
  bike: require("../assets/icons/bike.png"),
  motorbike: require("../assets/icons/bike.png"),
  motorcycle: require("../assets/icons/bike.png"),
  car: require("../assets/icons/car.png"),
  "mini-car": require("../assets/icons/mini-car.png"),
  minicar: require("../assets/icons/mini-car.png"),
  mini: require("../assets/icons/mini-car.png"),
  suv: require("../assets/icons/van.png"),
  threewheel: require("../assets/icons/three-wheel.png"),
  "three-wheel": require("../assets/icons/three-wheel.png"),
  "three-wheeler": require("../assets/icons/three-wheel.png"),
  tuk: require("../assets/icons/three-wheel.png"),
  "tuk-tuk": require("../assets/icons/three-wheel.png"),
  van: require("../assets/icons/van.png"),
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


