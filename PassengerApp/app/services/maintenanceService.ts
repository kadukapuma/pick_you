import { apiClient } from "./api";

export const fetchMaintenanceMode = async (): Promise<boolean> => {
  const response = await apiClient.get<{ maintenance_mode?: boolean }>(
    "/app-settings/maintenance-mode",
  );

  if (!response.success) {
    return false;
  }

  return Boolean(response.data?.maintenance_mode);
};
