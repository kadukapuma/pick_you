import type { ImageSourcePropType } from "react-native";

const VEHICLE_RIDE_IMAGES: Record<string, ImageSourcePropType> = {
  car: require("../assets/images/vehicles/car.png"),
  tuk: require("../assets/images/vehicles/threewheel.png"),
  tuktuk: require("../assets/images/vehicles/threewheel.png"),
  threewheel: require("../assets/images/vehicles/threewheel.png"),
  bike: require("../assets/images/vehicles/bike.png"),
  motorbike: require("../assets/images/vehicles/bike.png"),
  motorcycle: require("../assets/images/vehicles/bike.png"),
  suv: require("../assets/images/vehicles/minivan.png"),
  van: require("../assets/images/vehicles/van.png"),
  minivan: require("../assets/images/vehicles/van.png"),
  minicar: require("../assets/images/vehicles/minicar.png"),
  mini: require("../assets/images/vehicles/minicar.png"),
};

const normalizeVehicleKey = (value?: string | null) =>
  String(value || "car")
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

export function getVehicleRideImage(
  vehicleType?: string | null,
): ImageSourcePropType {
  return VEHICLE_RIDE_IMAGES[normalizeVehicleKey(vehicleType)] || VEHICLE_RIDE_IMAGES.car;
}
