// =====================================================
// CLIENT SIDE SOCKET.IO INTEGRATION
// =====================================================

class ChatSocketClient {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.currentUser = null;
    this.eventHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  // Kết nối socket
  connect(token, userId) {
    try {
      this.socket = io('http://localhost:3000', {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling']
      });

      this.currentUser = userId;
      this.setupEventListeners();
      return this.socket;
    } catch (error) {
      console.error('Error connecting to socket:', error);
      throw error;
    }
  }

  // Thiết lập event listeners
  setupEventListeners() {
    // Kết nối thành công
    this.socket.on('connect', () => {
      console.log('✅ Connected to chat server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');
    });

    // Ngắt kết nối
    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from chat server:', reason);
      this.isConnected = false;
      this.emit('disconnected', reason);
      
      // Tự động kết nối lại
      if (reason === 'io server disconnect') {
        this.handleReconnect();
      }
    });

    // Lỗi kết nối
    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      this.emit('connection_error', error);
      this.handleReconnect();
    });

    // Đăng nhập thành công
    this.socket.on('login_success', (data) => {
      console.log('✅ Login successful:', data);
      this.emit('login_success', data);
    });

    // Tin nhắn mới
    this.socket.on('new_message', (data) => {
      console.log('📨 New message received:', data);
      this.emit('new_message', data);
    });

    // Tin nhắn đã được đọc
    this.socket.on('message_read', (data) => {
      console.log('✅ Message read:', data);
      this.emit('message_read', data);
    });

    // Typing indicator
    this.socket.on('typing_start', (data) => {
      this.emit('typing_start', data);
    });

    this.socket.on('typing_stop', (data) => {
      this.emit('typing_stop', data);
    });

    // Trạng thái bạn bè
    this.socket.on('friend_status_change', (data) => {
      this.emit('friend_status_change', data);
    });

    // Thông báo
    this.socket.on('notification', (data) => {
      this.emit('notification', data);
    });

    // Lỗi
    this.socket.on('error', (data) => {
      console.error('❌ Socket error:', data);
      this.emit('error', data);
    });
  }

  // Xử lý kết nối lại
  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`🔄 Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        if (!this.isConnected) {
          this.socket.connect();
        }
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached');
      this.emit('reconnect_failed');
    }
  }

  // Đăng nhập user
  login(userId) {
    if (!this.isConnected) {
      throw new Error('Socket not connected');
    }
    
    this.socket.emit('user_login', { userId });
  }

  // Đăng xuất user
  logout() {
    if (this.isConnected) {
      this.socket.emit('user_logout');
    }
  }

  // Tham gia chat
  joinChat(chatType, chatId) {
    if (!this.isConnected) {
      throw new Error('Socket not connected');
    }
    
    this.socket.emit('join_chat', { 
      userId: this.currentUser,
      chatType, 
      chatId 
    });
  }

  // Rời chat
  leaveChat(chatType, chatId) {
    if (this.isConnected) {
      this.socket.emit('leave_chat', { chatType, chatId });
    }
  }

  // Gửi tin nhắn
  sendMessage(messageData) {
    if (!this.isConnected) {
      throw new Error('Socket not connected');
    }
    
    this.socket.emit('send_message', {
      ...messageData,
      ID_NguoiGui: this.currentUser
    });
  }

  // Đánh dấu đã đọc
  markAsRead(chatType, chatId) {
    if (this.isConnected) {
      this.socket.emit('mark_read', {
        userId: this.currentUser,
        chatType,
        chatId
      });
    }
  }

  // Bắt đầu typing
  startTyping(chatType, chatId) {
    if (this.isConnected) {
      this.socket.emit('typing_start', {
        userId: this.currentUser,
        chatType,
        chatId
      });
    }
  }

  // Dừng typing
  stopTyping(chatType, chatId) {
    if (this.isConnected) {
      this.socket.emit('typing_stop', {
        userId: this.currentUser,
        chatType,
        chatId
      });
    }
  }

  // Cập nhật trạng thái
  updateStatus(status) {
    if (this.isConnected) {
      this.socket.emit('update_status', { status });
    }
  }

  // Event system
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  // Ngắt kết nối
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
    }
  }

  // Lấy trạng thái kết nối
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      socketId: this.socket?.id
    };
  }
}

// =====================================================
// USAGE EXAMPLES
// =====================================================

// Khởi tạo client
const chatClient = new ChatSocketClient();

// Kết nối với token
const token = 'your-jwt-token';
const userId = 'user-id';
chatClient.connect(token, userId);

// Event handlers
chatClient.on('connected', () => {
  console.log('Connected to chat server');
  chatClient.login(userId);
});

chatClient.on('new_message', (data) => {
  console.log('New message:', data);
  // Xử lý tin nhắn mới trong UI
  displayNewMessage(data.message);
});

chatClient.on('message_read', (data) => {
  console.log('Message read:', data);
  // Cập nhật UI hiển thị đã đọc
  updateMessageReadStatus(data);
});

chatClient.on('typing_start', (data) => {
  console.log('User is typing:', data);
  // Hiển thị typing indicator
  showTypingIndicator(data.userId);
});

chatClient.on('typing_stop', (data) => {
  console.log('User stopped typing:', data);
  // Ẩn typing indicator
  hideTypingIndicator(data.userId);
});

chatClient.on('friend_status_change', (data) => {
  console.log('Friend status changed:', data);
  // Cập nhật trạng thái bạn bè
  updateFriendStatus(data.userId, data.status);
});

chatClient.on('notification', (data) => {
  console.log('Notification:', data);
  // Hiển thị notification
  showNotification(data);
});

// Gửi tin nhắn
function sendMessage(receiverId, content) {
  chatClient.sendMessage({
    ID_NguoiNhan: receiverId,
    noi_dung: content,
    loai_tin_nhan: 'text'
  });
}

// Gửi tin nhắn group
function sendGroupMessage(groupId, content) {
  chatClient.sendMessage({
    ID_GroupChat: groupId,
    noi_dung: content,
    loai_tin_nhan: 'text'
  });
}

// Tham gia chat
function joinPrivateChat(otherUserId) {
  chatClient.joinChat('private', otherUserId);
}

function joinGroupChat(groupId) {
  chatClient.joinChat('group', groupId);
}

// Đánh dấu đã đọc
function markMessagesAsRead(chatType, chatId) {
  chatClient.markAsRead(chatType, chatId);
}

// Typing indicator
let typingTimer;
function onTypingStart(chatType, chatId) {
  chatClient.startTyping(chatType, chatId);
  
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    chatClient.stopTyping(chatType, chatId);
  }, 3000);
}

// Export cho sử dụng
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChatSocketClient;
} else if (typeof window !== 'undefined') {
  window.ChatSocketClient = ChatSocketClient;
}
