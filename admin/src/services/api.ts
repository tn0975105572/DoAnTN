import axios, { AxiosResponse, AxiosError } from 'axios';
import { API_CONFIG, ApiError } from '../config/api';

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle responses and errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    const apiError: ApiError = {
      message: error.message || 'An error occurred',
      status: error.response?.status || 500,
      code: error.code,
    };

    // Handle specific error cases
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('adminToken');
      window.location.href = '/';
    }

    return Promise.reject(apiError);
  }
);

// API Services
export const userAPI = {
  getAll: (page = 1, limit = 10) => api.get(`/api/nguoidung/getAll?page=${page}&limit=${limit}`),
  getById: (id: string) => api.get(`/api/nguoidung/get/${id}`),
  create: (data: any) => api.post('/api/nguoidung/create', data),
  update: (id: string, data: any) => api.put(`/api/nguoidung/update/${id}`, data),
  delete: (id: string) => api.delete(`/api/nguoidung/delete/${id}`),
  getStats: () => api.get('/api/nguoidung/stats'),
};

export const postAPI = {
  getAll: (page = 1, limit = 10, status = 'all', search = '') => {
    let url = `/api/baidang/getAllWithDetails?page=${page}&limit=${limit}`;
    if (status !== 'all') {
      url += `&status=${status}`;
    }
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    return api.get(url);
  },
  getById: (id: string) => api.get(`/api/baidang/getById/${id}`),
  create: (data: any) => api.post('/api/baidang/create', data),
  update: (id: string, data: any) => api.put(`/api/baidang/update/${id}`, data),
  delete: (id: string) => api.delete(`/api/baidang/delete/${id}`),
  getByStatus: (status: string) => api.get(`/api/baidang/getByStatus/${status}`),
  getAllWithDetails: (page = 1, limit = 10) => api.get(`/api/baidang/getAllWithDetails?page=${page}&limit=${limit}`),
  getByUserId: (userId: string) => api.get(`/api/baidang/getByUserId/${userId}`),
  search: (keyword: string) => api.get(`/api/baidang/search?keyword=${keyword}`),
};

export const pointsAPI = {
  getHistory: (userId?: string) => 
    userId ? api.get(`/api/lich_su_tich_diem/getByUserId/${userId}`) : api.get('/api/lich_su_tich_diem/getAll'),
  getUserStats: (userId: string) => api.get(`/api/lich_su_tich_diem/getUserStats/${userId}`),
  getOverallStats: () => api.get('/api/lich_su_tich_diem/getOverallStats'),
  addPoints: (data: {
    userId: string;
    pointChange: number;
    transactionType: string;
    description: string;
    referenceId?: string;
  }) => api.post('/api/lich_su_tich_diem/addPoints', data),
};

export const categoryAPI = {
  getAll: () => api.get('/api/danhmuc/getAll'),
  getById: (id: string) => api.get(`/api/danhmuc/getById/${id}`),
  create: (data: any) => api.post('/api/danhmuc/create', data),
  update: (id: string, data: any) => api.put(`/api/danhmuc/update/${id}`, data),
  delete: (id: string) => api.delete(`/api/danhmuc/delete/${id}`),
};

export const reportAPI = {
  getAll: () => api.get('/api/baocao/getAll'),
  getById: (id: string) => api.get(`/api/baocao/getById/${id}`),
  resolve: (id: string, data: any) => api.put(`/api/baocao/resolve/${id}`, data),
};

export const likeAPI = {
  getAll: () => api.get('/api/likebaidang/getAll'),
  getByPost: (postId: string) => api.get(`/api/likebaidang/getByPost/${postId}`),
  getByUser: (userId: string) => api.get(`/api/likebaidang/getByUser/${userId}`),
};

export const commentAPI = {
  getAll: () => api.get('/api/binhluanbaidang/getAll'),
  getByPost: (postId: string) => api.get(`/api/binhluanbaidang/getByPost/${postId}`),
  getByUser: (userId: string) => api.get(`/api/binhluanbaidang/getByUser/${userId}`),
};

export const notificationAPI = {
  getAll: () => api.get('/api/thongbao/getAll'),
  getByUser: (userId: string) => api.get(`/api/thongbao/getByUser/${userId}`),
  markAsRead: (id: string) => api.put(`/api/thongbao/markAsRead/${id}`),
};

export default api;


