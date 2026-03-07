// API Configuration
export const API_CONFIG = {
  BASE_URL: 'http://localhost:3000',
  ENDPOINTS: {
    // User endpoints
    USERS: {
      GET_ALL: '/api/nguoidung/getAll',
      GET_BY_ID: '/api/nguoidung/get',
      CREATE: '/api/nguoidung/create',
      UPDATE: '/api/nguoidung/update',
      DELETE: '/api/nguoidung/delete',
      LOGIN: '/api/nguoidung/login',
      SEARCH: '/api/nguoidung/search',
    },
    
    // Post endpoints
    POSTS: {
      GET_ALL: '/api/baidang/getAll',
      GET_ALL_WITH_DETAILS: '/api/baidang/getAllWithDetails',
      GET_BY_ID: '/api/baidang/getById',
      GET_BY_USER: '/api/baidang/getByUserId',
      CREATE: '/api/baidang/create',
      UPDATE: '/api/baidang/update',
      DELETE: '/api/baidang/delete',
      SEARCH: '/api/baidang/search',
    },
    
    // Points endpoints
    POINTS: {
      GET_HISTORY: '/api/lich_su_tich_diem/getAll',
      GET_BY_USER: '/api/lich_su_tich_diem/getByUserId',
      GET_USER_STATS: '/api/lich_su_tich_diem/getUserStats',
      GET_OVERALL_STATS: '/api/lich_su_tich_diem/getOverallStats',
      ADD_POINTS: '/api/lich_su_tich_diem/addPoints',
    },
    
    // Category endpoints
    CATEGORIES: {
      GET_ALL: '/api/danhmuc/getAll',
      GET_BY_ID: '/api/danhmuc/getById',
      CREATE: '/api/danhmuc/create',
      UPDATE: '/api/danhmuc/update',
      DELETE: '/api/danhmuc/delete',
    },
    
    // Report endpoints
    REPORTS: {
      GET_ALL: '/api/baocao/getAll',
      GET_BY_ID: '/api/baocao/getById',
      RESOLVE: '/api/baocao/resolve',
    },
    
    // Like endpoints
    LIKES: {
      GET_ALL: '/api/likebaidang/getAll',
      GET_BY_POST: '/api/likebaidang/getByPost',
      GET_BY_USER: '/api/likebaidang/getByUser',
    },
    
    // Comment endpoints
    COMMENTS: {
      GET_ALL: '/api/binhluanbaidang/getAll',
      GET_BY_POST: '/api/binhluanbaidang/getByPost',
      GET_BY_USER: '/api/binhluanbaidang/getByUser',
    },
    
    // Notification endpoints
    NOTIFICATIONS: {
      GET_ALL: '/api/thongbao/getAll',
      GET_BY_USER: '/api/thongbao/getByUser',
      MARK_AS_READ: '/api/thongbao/markAsRead',
    },
  },
  
  // Request timeout (tăng lên 8s để đảm bảo ổn định)
  TIMEOUT: 8000,
  
  // Retry configuration
  RETRY: {
    ATTEMPTS: 2, // Giảm từ 3 xuống 2
    DELAY: 500,  // Giảm từ 1000ms xuống 500ms
  },
};

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Error types
export interface ApiError {
  message: string;
  status: number;
  code?: string;
}
