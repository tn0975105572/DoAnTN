import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiConfig } from '../config/api';

const config = getApiConfig();
const ORDER_BASE_URL = `${config.BASE_URL}/api/donhang`;

export interface OrderRecord {
  ID_DonHang: string;
  ma_hoa_don: string;
  ID_GiaoDich: string;
  ID_BaiDang: string;
  ID_NguoiBan: string;
  ID_NguoiMua: string;
  tieu_de_bai_dang: string;
  gia_giao_dich: number | string | null;
  dia_chi_hen_gap?: string | null;
  thoi_gian_hen_gap?: string | null;
  ghi_chu_hen_gap?: string | null;
  ghi_chu_nguoi_mua?: string | null;
  trang_thai: string;
  thoi_gian_hoan_tat?: string | null;
  thoi_gian_tao?: string | null;
  thoi_gian_cap_nhat?: string | null;
  ten_nguoi_ban?: string | null;
  email_nguoi_ban?: string | null;
  anh_nguoi_ban?: string | null;
  ten_nguoi_mua?: string | null;
  email_nguoi_mua?: string | null;
  anh_nguoi_mua?: string | null;
  vi_tri_bai_dang?: string | null;
  anh_bai_dang?: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

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
    console.error('Error getting token for order service:', error);
  }

  return headers;
};

const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeout = config.TIMEOUT,
) => {
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

    if (
      error?.name === 'TypeError' &&
      String(error?.message || '').includes('Network request failed')
    ) {
      throw new Error('Không thể kết nối đến máy chủ.');
    }

    throw error;
  }
};

const handleResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
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

  return payload as ApiResponse<T>;
};

const request = async <T>(path: string, options: RequestInit = {}) => {
  const headers = await getHeaders();
  const response = await fetchWithTimeout(path, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  return handleResponse<T>(response);
};

export const orderService = {
  async getMyOrders() {
    return request<OrderRecord[]>(`${ORDER_BASE_URL}/my`, {
      method: 'GET',
    });
  },

  async getById(orderId: string) {
    return request<OrderRecord>(`${ORDER_BASE_URL}/getById/${orderId}`, {
      method: 'GET',
    });
  },
};

export default orderService;
