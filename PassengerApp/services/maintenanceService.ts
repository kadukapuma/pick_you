import { apiClient } from "./api";
import { IS_DEV_MODE } from "./api/config";

export const fetchMaintenanceMode = async (): Promise<boolean> => {
  if (IS_DEV_MODE) {
    return false;
  }

  const response = await apiClient.get<{ maintenance_mode?: boolean }>(
    "/app-settings/maintenance-mode",
  );

  if (!response.success) {
    return false;
  }

  return Boolean(response.data?.maintenance_mode);
};
