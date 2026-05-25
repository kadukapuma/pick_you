import api from './api';

/**
 * Fetch maintenance mode status
 * This is a public endpoint that doesn't require authentication
 */
export const fetchMaintenanceMode = async () => {
  try {
    const response = await api.get('/app-settings/maintenance-mode');
    return {
      success: response.data.success,
      maintenanceMode: response.data.maintenance_mode || false
    };
  } catch (error) {
    // If the endpoint fails or doesn't exist, assume maintenance mode is off
    console.error('Failed to fetch maintenance mode:', error);
    return {
      success: false,
      maintenanceMode: false
    };
  }
};
