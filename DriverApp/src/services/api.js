import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Note: If using Android Emulator use 'http://10.0.2.2:8000/api'
// If using physical device via EXPO, use your computer's local IP (e.g. 'http://159.198.75.110:8000/api')
const API_BASE_URL = 'http://159.198.75.110/api';

const api = axios.create({
  baseURL: API_BASE_URL,
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
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
