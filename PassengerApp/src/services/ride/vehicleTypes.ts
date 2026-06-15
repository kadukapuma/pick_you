import type { RideOption } from "../../context/RideSearchContext";

export interface DBVehicleType {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  is_active: boolean;
  fare_config: {
    id: number;
    vehicle_type: string;
    base_fare: string;
    per_km_rate: string;
    per_minute_rate: string;
    cancellation_fee: string;
    is_active: boolean;
  } | null;
}

export const MOCK_VEHICLE_TYPES: DBVehicleType[] = [
  {
    id: 1,
    name: "car",
    display_name: "Car",
    description: "Standard 4-seater cars and hatchbacks",
    is_active: true,
    fare_config: {
      id: 1,
      vehicle_type: "car",
      base_fare: "150.00",
      per_km_rate: "80.00",
      per_minute_rate: "5.00",
      cancellation_fee: "50.00",
      is_active: true,
    },
  },
  {
    id: 2,
    name: "tuk",
    display_name: "Tuk Tuk",
    description: "Classic 3-wheeler auto rickshaws",
    is_active: true,
    fare_config: {
      id: 2,
      vehicle_type: "tuk",
      base_fare: "100.00",
      per_km_rate: "60.00",
      per_minute_rate: "5.00",
      cancellation_fee: "50.00",
      is_active: true,
    },
  },
  {
    id: 3,
    name: "bike",
    display_name: "Motorbike",
    description: "Fast single-passenger motorbikes",
    is_active: true,
    fare_config: {
      id: 3,
      vehicle_type: "bike",
      base_fare: "80.00",
      per_km_rate: "40.00",
      per_minute_rate: "5.00",
      cancellation_fee: "50.00",
      is_active: true,
    },
  },
  {
    id: 4,
    name: "suv",
    display_name: "SUV",
    description: "Large 6-seater family vehicles",
    is_active: true,
    fare_config: {
      id: 4,
      vehicle_type: "suv",
      base_fare: "200.00",
      per_km_rate: "100.00",
      per_minute_rate: "5.00",
      cancellation_fee: "50.00",
      is_active: true,
    },
  },
];

const ICON_MAP: Record<string, "car" | "bicycle" | "bus"> = {
  car: "car",
  tuk: "car",
  bike: "bicycle",
  suv: "bus",
};
const ETA_MAP: Record<string, string> = {
  bike: "1 min",
  tuk: "2 mins",
  car: "3 mins",
  suv: "5 mins",
};
const RATING_MAP: Record<string, number> = {
  bike: 4.5,
  tuk: 4.7,
  car: 4.8,
  suv: 4.9,
};

export function mapDBVehicleToOption(
  vt: DBVehicleType,
  distanceMeters: number,
  durationSeconds: number,
): RideOption {
  let price = 0;
  if (vt.fare_config) {
    const { base_fare, per_km_rate, per_minute_rate } = vt.fare_config;
    price =
      parseFloat(base_fare) +
      (distanceMeters / 1000) * parseFloat(per_km_rate) +
      (durationSeconds / 60) * parseFloat(per_minute_rate);
  } else {
    price = 150 + (distanceMeters / 1000) * 60;
  }
  return {
    id: vt.name,
    name: vt.display_name,
    icon: ICON_MAP[vt.name] ?? "car",
    price: parseFloat(price.toFixed(2)),
    eta: ETA_MAP[vt.name] ?? "4 mins",
    rating: RATING_MAP[vt.name] ?? 4.6,
  };
}
