import Constants from 'expo-constants';

// API Configuration
export const API_CONFIG = {
  // Timeout cho requests (ms)
  TIMEOUT: 10000,

  // Headers mặc định
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  },

  // Endpoints
  ENDPOINTS: {
    TINNHAN: '/api/tinnhan',
    USERS: '/users',
    AUTH: '/auth',
  },
};

// Environment specific configs
export const getApiConfig = () => {
  // Lấy API URL từ expo config (tự động lấy IP của máy)
  const baseURL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000';

  console.log('🔧 API Config loaded:', baseURL);

  return {
    ...API_CONFIG,
    BASE_URL: baseURL,
    SOCKET_URL: baseURL,
  };
};

export default API_CONFIG;
