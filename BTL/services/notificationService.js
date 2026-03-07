import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000';
const API_URL = `${API_BASE_URL}/api`;

export const notificationService = {
  // Lấy danh sách thông báo theo user ID
  getByUserId: async (userId, limit = 50) => {
    try {
      const url = `${API_URL}/thongbao/user/${userId}?limit=${limit}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  },

  // Đếm số lượng thông báo chưa đọc
  countUnread: async (userId) => {
    try {
      const url = `${API_URL}/thongbao/unread/${userId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, unread_count: 0 };
    }
  },

  // Đánh dấu một thông báo đã đọc
  markAsRead: async (notificationId) => {
    try {
      const url = `${API_URL}/thongbao/mark-read/${notificationId}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      return { success: false, error: error.message };
    }
  },

  // Đánh dấu tất cả thông báo đã đọc
  markAllAsRead: async (userId) => {
    try {
      const url = `${API_URL}/thongbao/mark-all-read/${userId}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      return { success: false, error: error.message };
    }
  },

  // Tạo thông báo mới
  create: async (notificationData) => {
    try {
      const url = `${API_URL}/thongbao/create`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Xóa thông báo
  delete: async (notificationId) => {
    try {
      const url = `${API_URL}/thongbao/delete/${notificationId}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Format icon theo loại thông báo
  getIconByType: (type) => {
    const icons = {
      tin_nhan: '💌',
      phan_hoi_bai_dang: '❤️',
      cap_nhat_dich_vu: '⭐',
      loi_moi_su_kien: '🔊',
      voucher_moi: '💰',
      thanh_toan: '💳',
    };
    return icons[type] || '🔔';
  },

  // Format thời gian
  formatTime: (timeString) => {
    const now = new Date();
    const time = new Date(timeString);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return time.toLocaleDateString('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    });
  },
};


