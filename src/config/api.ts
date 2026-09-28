import axios from 'axios';
import { Alert } from 'react-native';

// Must be your computer's LAN IP (not 'localhost') so a phone on the same
// network/hotspot can reach the backend. Find it with `ipconfig` (Windows)
// if it changes.
const BASE_URL = 'http://192.168.43.204:5001';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

// Registered by the app root so an expired/invalid token can force a clean
// logout instead of leaving the user stuck on a screen that keeps failing.
let onUnauthorized: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  onUnauthorized = handler;
};

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Backend rejects any action the logged-in staff member's permissions don't
// cover with a 403, even if a UI element was mistakenly shown - this is the
// visible confirmation that the block is real, not just cosmetic.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only auto-logout on 401s from authenticated requests - the login
    // endpoint itself also returns 401 for wrong credentials, but that
    // request never carries our Authorization header.
    if (error?.response?.status === 401 && error.config?.headers?.Authorization) {
      onUnauthorized?.();
    }
    if (error?.response?.status === 403) {
      Alert.alert('Access Denied', error.response.data?.message || "You don't have permission to do this.");
    }
    return Promise.reject(error);
  }
);

export default api;
export { BASE_URL };