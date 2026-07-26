const VEHICLE_MAP_ICONS = {
  bike: require("../assets/icons/bike.png"),
  car: require("../assets/icons/car.png"),
  "mini-car": require("../assets/icons/mini-car.png"),
  minicar: require("../assets/icons/mini-car.png"),
  suv: require("../assets/icons/van.png"),
  threewheel: require("../assets/icons/three-wheel.png"),
  "three-wheel": require("../assets/icons/three-wheel.png"),
  tuk: require("../assets/icons/three-wheel.png"),
  "tuk-tuk": require("../assets/icons/three-wheel.png"),
  van: require("../assets/icons/van.png"),
};

const normalizeVehicleType = (vehicleType) =>
  String(vehicleType || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");

export const getVehicleMapIcon = (vehicleType) => {
  const normalizedType = normalizeVehicleType(vehicleType);
  return VEHICLE_MAP_ICONS[normalizedType] || VEHICLE_MAP_ICONS.car;
};
