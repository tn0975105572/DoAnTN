import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiConfig } from '../config/api';

const config = getApiConfig();
const BASE_URL = config.BASE_URL;
const DEAL_BASE_URL = `${BASE_URL}/api/giaodich_baidang`;
const POST_BASE_URL = `${BASE_URL}/api/baidang`;

const getHeaders = async () => {
  const headers: Record<string, string> = {
    ...config.DEFAULT_HEADERS,
  };

  try {
    const token =
      (await AsyncStorage.getItem('userToken')) ||
      (await AsyncStorage.getItem('token')) ||
      (await AsyncStorage.getItem('auth_token'));

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error getting token for deal service:', error);
  }

  return headers;
};

const handleResponse = async (response: Response) => {
  if (response.status === 0) {
    throw new Error('Không thể kết nối đến máy chủ.');
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null
        ? payload.message || payload.error
        : String(payload || '');

    throw new Error(message || `HTTP ${response.status}`);
  }

  return payload;
};

const fetchWithTimeout = async (url: string, options: RequestInit, timeout = config.TIMEOUT) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error?.name === 'AbortError') {
      throw new Error('Request timeout');
    }

    if (error?.name === 'TypeError' && String(error?.message || '').includes('Network request failed')) {
      throw new Error('Không thể kết nối đến máy chủ.');
    }

    throw error;
  }
};

const request = async (path: string, options: RequestInit = {}) => {
  const headers = await getHeaders();
  const response = await fetchWithTimeout(path, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  return handleResponse(response);
};

export const dealService = {
  async getPostWithDetails(postId: string) {
    return request(`${POST_BASE_URL}/getByIdWithDetails/${postId}`, {
      method: 'GET',
    });
  },

  async getTransactionsByPost(postId: string) {
    return request(`${DEAL_BASE_URL}/post/${postId}`, {
      method: 'GET',
    });
  },

  async createRequest(payload: Record<string, unknown>) {
    return request(`${DEAL_BASE_URL}/request`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async accept(transactionId: string) {
    return request(`${DEAL_BASE_URL}/${transactionId}/accept`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  async reject(transactionId: string, payload: Record<string, unknown>) {
    return request(`${DEAL_BASE_URL}/${transactionId}/reject`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async cancel(transactionId: string, payload: Record<string, unknown>) {
    return request(`${DEAL_BASE_URL}/${transactionId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateMeeting(transactionId: string, payload: Record<string, unknown>) {
    return request(`${DEAL_BASE_URL}/${transactionId}/meeting`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async requestComplete(transactionId: string, payload: Record<string, unknown>) {
    return request(`${DEAL_BASE_URL}/${transactionId}/request-complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

export default dealService;
