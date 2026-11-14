import axios from 'axios';
import { Platform } from 'react-native';

/**
 * Platform-aware base URL resolution.
 * Useful if backend is running locally and accessed from simulator/emulator.
 */
function getBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  // Fallbacks for local development
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000'; // Android emulator localhost alias
  }
  return 'http://localhost:8000'; // iOS simulator or web
}

export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000, // Stockfish analysis might take some time depending on depth
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for standardized error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // You can inject custom error logging or telemetry here
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);
