import { getApiConfig } from '../config/api';

// Lấy config API
const config = getApiConfig();
const BASE_URL = `${config.BASE_URL}${config.ENDPOINTS.TINNHAN}`;

// Hàm helper để tạo request headers
const getHeaders = async () => {
  const headers = {
    ...config.DEFAULT_HEADERS,
  };

  // Lấy token từ AsyncStorage
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const token =
      (await AsyncStorage.getItem('userToken')) || // Key từ dangnhap.tsx
      (await AsyncStorage.getItem('token')) ||
      (await AsyncStorage.getItem('auth_token'));

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error getting token:', error);
  }

  return headers;
};

// Hàm helper để xử lý response
const handleResponse = async (response) => {
  // Kiểm tra status 0 (network error)
  if (response.status === 0) {
    throw new Error(
      'Network Error: Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.',
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data;
};

// Hàm helper để tạo request với timeout
const fetchWithTimeout = async (url, options, timeout = config.TIMEOUT) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    // Xử lý network errors
    if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
      throw new Error(
        'Network Error: Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.',
      );
    }
    throw error;
  }
};

// Chat Service
export const chatService = {
  // Lấy danh sách cuộc trò chuyện của user
  async getConversations(userId) {
    try {
      const headers = await getHeaders();
      const response = await fetchWithTimeout(`${BASE_URL}/conversations/${userId}`, {
        method: 'GET',
        headers,
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  },

  // Lấy tin nhắn chat 1-1
  async getPrivateMessages(user1Id, user2Id, limit = 50, offset = 0) {
    try {
      const headers = await getHeaders();
      const response = await fetchWithTimeout(
        `${BASE_URL}/private/${user1Id}/${user2Id}?limit=${limit}&offset=${offset}`,
        {
          method: 'GET',
          headers,
        },
      );
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching private messages:', error);
      throw error;
    }
  },

  // Lấy tin nhắn group chat
  async getGroupMessages(groupId, userId, limit = 50, offset = 0) {
    try {
      const headers = await getHeaders();
      const response = await fetchWithTimeout(
        `${BASE_URL}/group/${groupId}/${userId}?limit=${limit}&offset=${offset}`,
        {
          method: 'GET',
          headers,
        },
      );
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching group messages:', error);
      throw error;
    }
  },

  // Gửi tin nhắn
  async sendMessage(messageData) {
    try {
      const headers = await getHeaders();
      const response = await fetchWithTimeout(`${BASE_URL}/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify(messageData),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // Đánh dấu tin nhắn đã đọc (chat 1-1)
  async markAsRead(userId, senderId) {
    try {
      const headers = await getHeaders();
      const response = await fetchWithTimeout(`${BASE_URL}/mark-read`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId,
          senderId,
        }),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error marking as read:', error);
      throw error;
    }
  },

  // Đánh dấu tin nhắn group đã đọc
  async markGroupAsRead(userId, groupId) {
    try {
      const headers = await getHeaders();
      const response = await fetchWithTimeout(`${BASE_URL}/mark-group-read`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId,
          groupId,
        }),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error marking group as read:', error);
      throw error;
    }
  },

  // Lấy số tin nhắn chưa đọc
  async getUnreadCount(userId) {
    try {
      const headers = await getHeaders();
      const response = await fetchWithTimeout(`${BASE_URL}/unread/${userId}`, {
        method: 'GET',
        headers,
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw error;
    }
  },

  // Cập nhật tin nhắn
  async updateMessage(messageId, content, userId) {
    try {
      const headers = await getHeaders();
      const response = await fetchWithTimeout(`${BASE_URL}/update/${messageId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          noi_dung: content,
          userId,
        }),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
    }
  },

  // Xóa tin nhắn
  async deleteMessage(messageId, userId) {
    try {
      const headers = await getHeaders();
      const response = await fetchWithTimeout(`${BASE_URL}/delete/${messageId}`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ userId }),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  },

  // Xóa cuộc trò chuyện (xóa tất cả tin nhắn với người này)
  async deleteConversation(userId, otherUserId) {
    try {
      const headers = await getHeaders();
      const response = await fetchWithTimeout(
        `${BASE_URL}/delete-conversation/${userId}/${otherUserId}`,
        {
          method: 'DELETE',
          headers,
        },
      );
      return await handleResponse(response);
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  },
};

export default chatService;
