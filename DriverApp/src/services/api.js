import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Note: If using Android Emulator use 'http://10.0.2.2:8000/api'
// If using physical device via EXPO, use your computer's local IP (e.g. 'http://192.168.x.x:8000/api')
// const API_BASE_URL = 'https://picku.lk/api';
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'https://picku.lk/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  // Without this, a slow/hung response (network stall, a slow broadcast on
  // the server) leaves the calling screen waiting forever with no way to
  // recover - e.g. a ride-action button stuck showing its spinner. Failing
  // after 20s turns that into a normal, catchable error instead.
  timeout: 20000,
  headers: {
    'Accept': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (
      ["post", "put", "patch", "delete"].includes(config.method?.toLowerCase()) &&
      !config.headers["Idempotency-Key"]
    ) {
      config.headers["Idempotency-Key"] =
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
