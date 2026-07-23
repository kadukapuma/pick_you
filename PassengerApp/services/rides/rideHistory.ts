import { apiClient } from "../api/client";
export type PastRideStatus = "COMPLETED" | "CANCELLED";
export type PastRide = {
  id: number; status: PastRideStatus; pickup_address: string; drop_address: string;
  distance_km: number; actual_duration_minutes?: number; estimated_duration_minutes?: number;
  final_fare: number; estimated_fare: number; requested_at: string | null; completed_at: string | null;
  cancelled_at: string | null; driver?: { user?: { first_name?: string; last_name?: string } };
  vehicle?: { brand?: string; model?: string; vehicle_number?: string; vehicle_type?: string };
  payment?: { payment_method?: string };
};
type Page = { data: PastRide[]; total: number };
export const getRideHistory = (status: PastRideStatus) => apiClient.get<Page>(`/rides?status=${status}`);
