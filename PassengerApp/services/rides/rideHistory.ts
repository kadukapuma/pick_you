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

export type RideHistoryPage = {
  data: PastRide[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  next_page_url?: string | null;
};

export const getRideHistory = (
  status: PastRideStatus,
  page = 1,
  perPage = 15,
) =>
  apiClient.get<RideHistoryPage>(
    `/rides?status=${status}&page=${page}&per_page=${perPage}`,
  );
