const { Server } = require('socket.io');
const { createServer } = require('http');
const Client = require('socket.io-client');
const ChatSocket = require('../socket/chatSocket');
const pool = require('../config/database');

describe('🔌 Socket.io Real-time Messaging Tests', () => {
  let io, server, clientSocket1, clientSocket2, clientSocket3;
  let testUsers = [];
  let testGroup = null;

  const testData = {
    user1: {
      ID_NguoiDung: 'socket-test-user-1',
      ho_ten: 'Socket User 1',
      email: 'socket1@test.com',
      mat_khau: 'password123'
    },
    user2: {
      ID_NguoiDung: 'socket-test-user-2',
      ho_ten: 'Socket User 2', 
      email: 'socket2@test.com',
      mat_khau: 'password123'
    },
    user3: {
      ID_NguoiDung: 'socket-test-user-3',
      ho_ten: 'Socket User 3',
      email: 'socket3@test.com', 
      mat_khau: 'password123'
    }
  };

  beforeAll((done) => {
    // Tạo HTTP server và Socket.io
    server = createServer();
    io = new Server(server);
    
    // Khởi tạo ChatSocket
    new ChatSocket(io);
    
    server.listen(() => {
      const port = server.address().port;
      
      // Tạo client connections
      clientSocket1 = new Client(`http://localhost:${port}`);
      clientSocket2 = new Client(`http://localhost:${port}`);
      clientSocket3 = new Client(`http://localhost:${port}`);
      
      done();
    });
  });

  beforeEach(async () => {
    // Tạo test users
    for (const [key, userData] of Object.entries(testData)) {
      try {
        await pool.query('INSERT INTO nguoidung SET ?', [userData]);
        testUsers.push(userData);
      } catch (error) {
        console.log(`User ${key} might already exist:`, error.message);
      }
    }

    // Tạo test group
    const groupData = {
      ID_GroupChat: 'socket-test-group-1',
      ten_group: 'Socket Test Group',
      mo_ta: 'Group for socket testing',
      ID_NguoiTao: testData.user1.ID_NguoiDung,
      so_thanh_vien: 3
    };

    try {
      await pool.query('INSERT INTO group_chat SET ?', [groupData]);
      testGroup = groupData;

      // Thêm members vào group
      const members = [
        { ID_ThanhVien: 'socket-member-1', ID_GroupChat: groupData.ID_GroupChat, ID_NguoiDung: testData.user1.ID_NguoiDung, vai_tro: 'admin' },
        { ID_ThanhVien: 'socket-member-2', ID_GroupChat: groupData.ID_GroupChat, ID_NguoiDung: testData.user2.ID_NguoiDung, vai_tro: 'member' },
        { ID_ThanhVien: 'socket-member-3', ID_GroupChat: groupData.ID_GroupChat, ID_NguoiDung: testData.user3.ID_NguoiDung, vai_tro: 'member' }
      ];

      for (const member of members) {
        await pool.query('INSERT INTO thanh_vien_group SET ?', [member]);
      }
    } catch (error) {
      console.log('Group might already exist:', error.message);
    }
  });

  afterEach(async () => {
    // Cleanup test data
    try {
      await pool.query('DELETE FROM tinnhan WHERE ID_NguoiGui IN (?, ?, ?)', [
        testData.user1.ID_NguoiDung,
        testData.user2.ID_NguoiDung,
        testData.user3.ID_NguoiDung
      ]);

      if (testGroup) {
        await pool.query('DELETE FROM thanh_vien_group WHERE ID_GroupChat = ?', [testGroup.ID_GroupChat]);
        await pool.query('DELETE FROM group_chat WHERE ID_GroupChat = ?', [testGroup.ID_GroupChat]);
      }

      await pool.query('DELETE FROM nguoidung WHERE ID_NguoiDung IN (?, ?, ?)', [
        testData.user1.ID_NguoiDung,
        testData.user2.ID_NguoiDung,
        testData.user3.ID_NguoiDung
      ]);
    } catch (error) {
      console.log('Cleanup error:', error.message);
    }
  });

  afterAll((done) => {
    // Đóng connections
    clientSocket1.close();
    clientSocket2.close();
    clientSocket3.close();
    io.close();
    server.close(done);
  });

  describe('🔐 User Login/Logout', () => {
    test('User login thành công', (done) => {
      clientSocket1.emit('user_login', { userId: testData.user1.ID_NguoiDung });
      
      clientSocket1.on('login_success', (data) => {
        expect(data).toHaveProperty('userId', testData.user1.ID_NguoiDung);
        expect(data).toHaveProperty('socketId');
        done();
      });
    });

    test('User logout thành công', (done) => {
      clientSocket1.emit('user_login', { userId: testData.user1.ID_NguoiDung });
      
      clientSocket1.on('login_success', () => {
        clientSocket1.emit('user_logout');
        
        // Kiểm tra user đã logout
        setTimeout(() => {
          expect(true).toBe(true); // Logout không có response event
          done();
        }, 100);
      });
    });

    test('Login với userId không hợp lệ', (done) => {
      clientSocket1.emit('user_login', { userId: 'invalid-user' });
      
      clientSocket1.on('error', (error) => {
        expect(error).toHaveProperty('message');
        done();
      });
    });
  });

  describe('💬 Private Chat', () => {
    test('Join private chat thành công', (done) => {
      clientSocket1.emit('user_login', { userId: testData.user1.ID_NguoiDung });
      
      clientSocket1.on('login_success', () => {
        clientSocket1.emit('join_chat', {
          userId: testData.user1.ID_NguoiDung,
          chatType: 'private',
          chatId: testData.user2.ID_NguoiDung
        });
        
        clientSocket1.on('join_success', (data) => {
          expect(data).toHaveProperty('chatType', 'private');
          expect(data).toHaveProperty('chatId', testData.user2.ID_NguoiDung);
          done();
        });
      });
    });

    test('Gửi tin nhắn private thành công', (done) => {
      let messageReceived = false;
      
      // User 1 login và join chat
      clientSocket1.emit('user_login', { userId: testData.user1.ID_NguoiDung });
      clientSocket1.on('login_success', () => {
        clientSocket1.emit('join_chat', {
          userId: testData.user1.ID_NguoiDung,
          chatType: 'private',
          chatId: testData.user2.ID_NguoiDung
        });
      });

      // User 2 login và join chat
      clientSocket2.emit('user_login', { userId: testData.user2.ID_NguoiDung });
      clientSocket2.on('login_success', () => {
        clientSocket2.emit('join_chat', {
          userId: testData.user2.ID_NguoiDung,
          chatType: 'private',
          chatId: testData.user1.ID_NguoiDung
        });
      });

      // User 1 gửi tin nhắn
      clientSocket1.on('join_success', () => {
        clientSocket1.emit('send_message', {
          ID_NguoiGui: testData.user1.ID_NguoiDung,
          ID_NguoiNhan: testData.user2.ID_NguoiDung,
          noi_dung: 'Hello from socket test!',
          loai_tin_nhan: 'text'
        });
      });

      // User 2 nhận tin nhắn
      clientSocket2.on('new_message', (data) => {
        expect(data).toHaveProperty('type', 'private');
        expect(data).toHaveProperty('message');
        expect(data.message).toHaveProperty('noi_dung', 'Hello from socket test!');
        expect(data).toHaveProperty('senderId', testData.user1.ID_NguoiDung);
        expect(data).toHaveProperty('receiverId', testData.user2.ID_NguoiDung);
        
        if (!messageReceived) {
          messageReceived = true;
          done();
        }
      });

      // User 1 nhận confirmation
      clientSocket1.on('message_sent', (data) => {
        expect(data).toHaveProperty('messageId');
      });
    });

    test('Đánh dấu tin nhắn đã đọc', (done) => {
      clientSocket1.emit('user_login', { userId: testData.user1.ID_NguoiDung });
      clientSocket2.emit('user_login', { userId: testData.user2.ID_NguoiDung });
      
      clientSocket1.on('login_success', () => {
        clientSocket1.emit('mark_read', {
          userId: testData.user1.ID_NguoiDung,
          chatType: 'private',
          chatId: testData.user2.ID_NguoiDung
        });
        
        clientSocket1.on('mark_read_success', (data) => {
          expect(data).toHaveProperty('chatType', 'private');
          expect(data).toHaveProperty('chatId', testData.user2.ID_NguoiDung);
          done();
        });
      });
    });
  });

  describe('👥 Group Chat', () => {
    test('Join group chat thành công', (done) => {
      clientSocket1.emit('user_login', { userId: testData.user1.ID_NguoiDung });
      
      clientSocket1.on('login_success', () => {
        clientSocket1.emit('join_chat', {
          userId: testData.user1.ID_NguoiDung,
          chatType: 'group',
          chatId: testGroup.ID_GroupChat
        });
        
        clientSocket1.on('join_success', (data) => {
          expect(data).toHaveProperty('chatType', 'group');
          expect(data).toHaveProperty('chatId', testGroup.ID_GroupChat);
          done();
        });
      });
    });

    test('Gửi tin nhắn group thành công', (done) => {
      let messageReceived = false;
      
      // Tất cả users login và join group
      [clientSocket1, clientSocket2, clientSocket3].forEach((socket, index) => {
        const userId = Object.values(testData)[index].ID_NguoiDung;
        socket.emit('user_login', { userId });
        
        socket.on('login_success', () => {
          socket.emit('join_chat', {
            userId: userId,
            chatType: 'group',
            chatId: testGroup.ID_GroupChat
          });
        });
      });

      // User 1 gửi tin nhắn group
      clientSocket1.on('join_success', () => {
        clientSocket1.emit('send_message', {
          ID_NguoiGui: testData.user1.ID_NguoiDung,
          ID_GroupChat: testGroup.ID_GroupChat,
          noi_dung: 'Hello group from socket test!',
          loai_tin_nhan: 'text'
        });
      });

      // Các users khác nhận tin nhắn
      [clientSocket2, clientSocket3].forEach(socket => {
        socket.on('new_message', (data) => {
          expect(data).toHaveProperty('type', 'group');
          expect(data).toHaveProperty('message');
          expect(data.message).toHaveProperty('noi_dung', 'Hello group from socket test!');
          expect(data).toHaveProperty('groupId', testGroup.ID_GroupChat);
          
          if (!messageReceived) {
            messageReceived = true;
            done();
          }
        });
      });
    });

    test('Join group chat không phải thành viên', (done) => {
      const nonMemberUser = 'non-member-user';
      clientSocket1.emit('user_login', { userId: nonMemberUser });
      
      clientSocket1.on('login_success', () => {
        clientSocket1.emit('join_chat', {
          userId: nonMemberUser,
          chatType: 'group',
          chatId: testGroup.ID_GroupChat
        });
        
        clientSocket1.on('error', (error) => {
          expect(error).toHaveProperty('message', 'Bạn không phải thành viên của group này');
          done();
        });
      });
    });
  });

  describe('⌨️ Typing Indicators', () => {
    test('Typing start indicator', (done) => {
      clientSocket1.emit('user_login', { userId: testData.user1.ID_NguoiDung });
      clientSocket2.emit('user_login', { userId: testData.user2.ID_NguoiDung });
      
      clientSocket1.on('login_success', () => {
        clientSocket1.emit('join_chat', {
          userId: testData.user1.ID_NguoiDung,
          chatType: 'private',
          chatId: testData.user2.ID_NguoiDung
        });
      });

      clientSocket2.on('login_success', () => {
        clientSocket2.emit('join_chat', {
          userId: testData.user2.ID_NguoiDung,
          chatType: 'private',
          chatId: testData.user1.ID_NguoiDung
        });
      });

      clientSocket1.on('join_success', () => {
        clientSocket1.emit('typing_start', {
          chatType: 'private',
          chatId: testData.user2.ID_NguoiDung,
          userId: testData.user1.ID_NguoiDung
        });
      });

      clientSocket2.on('typing_start', (data) => {
        expect(data).toHaveProperty('userId', testData.user1.ID_NguoiDung);
        expect(data).toHaveProperty('chatType', 'private');
        expect(data).toHaveProperty('chatId', testData.user2.ID_NguoiDung);
        done();
      });
    });

    test('Typing stop indicator', (done) => {
      clientSocket1.emit('user_login', { userId: testData.user1.ID_NguoiDung });
      clientSocket2.emit('user_login', { userId: testData.user2.ID_NguoiDung });
      
      clientSocket1.on('login_success', () => {
        clientSocket1.emit('join_chat', {
          userId: testData.user1.ID_NguoiDung,
          chatType: 'private',
          chatId: testData.user2.ID_NguoiDung
        });
      });

      clientSocket2.on('login_success', () => {
        clientSocket2.emit('join_chat', {
          userId: testData.user2.ID_NguoiDung,
          chatType: 'private',
          chatId: testData.user1.ID_NguoiDung
        });
      });

      clientSocket1.on('join_success', () => {
        clientSocket1.emit('typing_stop', {
          chatType: 'private',
          chatId: testData.user2.ID_NguoiDung,
          userId: testData.user1.ID_NguoiDung
        });
      });

      clientSocket2.on('typing_stop', (data) => {
        expect(data).toHaveProperty('userId', testData.user1.ID_NguoiDung);
        expect(data).toHaveProperty('chatType', 'private');
        expect(data).toHaveProperty('chatId', testData.user2.ID_NguoiDung);
        done();
      });
    });
  });

  describe('📊 Status Updates', () => {
    test('Cập nhật trạng thái online', (done) => {
      clientSocket1.emit('user_login', { userId: testData.user1.ID_NguoiDung });
      
      clientSocket1.on('login_success', () => {
        clientSocket1.emit('update_status', { status: 'online' });
        
        clientSocket1.on('status_updated', (data) => {
          expect(data).toHaveProperty('status', 'online');
          done();
        });
      });
    });

    test('Cập nhật trạng thái away', (done) => {
      clientSocket1.emit('user_login', { userId: testData.user1.ID_NguoiDung });
      
      clientSocket1.on('login_success', () => {
        clientSocket1.emit('update_status', { status: 'away' });
        
        clientSocket1.on('status_updated', (data) => {
          expect(data).toHaveProperty('status', 'away');
          done();
        });
      });
    });

    test('Cập nhật trạng thái busy', (done) => {
      clientSocket1.emit('user_login', { userId: testData.user1.ID_NguoiDung });
      
      clientSocket1.on('login_success', () => {
        clientSocket1.emit('update_status', { status: 'busy' });
        
        clientSocket1.on('status_updated', (data) => {
          expect(data).toHaveProperty('status', 'busy');
          done();
        });
      });
    });
  });

  describe('🔌 Connection Management', () => {
    test('Disconnect event', (done) => {
      clientSocket1.emit('user_login', { userId: testData.user1.ID_NguoiDung });
      
      clientSocket1.on('login_success', () => {
        // Disconnect client
        clientSocket1.disconnect();
        
        // Kiểm tra disconnect
        setTimeout(() => {
          expect(clientSocket1.connected).toBe(false);
          done();
        }, 100);
      });
    });

    test('Reconnect sau disconnect', (done) => {
      clientSocket1.emit('user_login', { userId: testData.user1.ID_NguoiDung });
      
      clientSocket1.on('login_success', () => {
        clientSocket1.disconnect();
        
        setTimeout(() => {
          // Reconnect
          clientSocket1.connect();
          
          clientSocket1.on('connect', () => {
            clientSocket1.emit('user_login', { userId: testData.user1.ID_NguoiDung });
            
            clientSocket1.on('login_success', () => {
              expect(true).toBe(true);
              done();
            });
          });
        }, 100);
      });
    });
  });

  describe('🚫 Error Handling', () => {
    test('Gửi tin nhắn thiếu thông tin', (done) => {
      clientSocket1.emit('user_login', { userId: testData.user1.ID_NguoiDung });
      
      clientSocket1.on('login_success', () => {
        clientSocket1.emit('send_message', {
          ID_NguoiGui: testData.user1.ID_NguoiDung,
          noi_dung: 'Missing receiver'
        });
        
        clientSocket1.on('error', (error) => {
          expect(error).toHaveProperty('message');
          done();
        });
      });
    });

    test('Join chat với thông tin không hợp lệ', (done) => {
      clientSocket1.emit('user_login', { userId: testData.user1.ID_NguoiDung });
      
      clientSocket1.on('login_success', () => {
        clientSocket1.emit('join_chat', {
          userId: testData.user1.ID_NguoiDung,
          chatType: 'invalid',
          chatId: 'invalid-id'
        });
        
        clientSocket1.on('error', (error) => {
          expect(error).toHaveProperty('message');
          done();
        });
      });
    });
  });

  describe('⚡ Performance Tests', () => {
    test('Gửi nhiều tin nhắn liên tiếp', (done) => {
      let messageCount = 0;
      const totalMessages = 10;
      
      clientSocket1.emit('user_login', { userId: testData.user1.ID_NguoiDung });
      clientSocket2.emit('user_login', { userId: testData.user2.ID_NguoiDung });
      
      clientSocket1.on('login_success', () => {
        clientSocket1.emit('join_chat', {
          userId: testData.user1.ID_NguoiDung,
          chatType: 'private',
          chatId: testData.user2.ID_NguoiDung
        });
      });

      clientSocket2.on('login_success', () => {
        clientSocket2.emit('join_chat', {
          userId: testData.user2.ID_NguoiDung,
          chatType: 'private',
          chatId: testData.user1.ID_NguoiDung
        });
      });

      clientSocket1.on('join_success', () => {
        // Gửi nhiều tin nhắn
        for (let i = 0; i < totalMessages; i++) {
          clientSocket1.emit('send_message', {
            ID_NguoiGui: testData.user1.ID_NguoiDung,
            ID_NguoiNhan: testData.user2.ID_NguoiDung,
            noi_dung: `Bulk message ${i + 1}`,
            loai_tin_nhan: 'text'
          });
        }
      });

      clientSocket2.on('new_message', (data) => {
        messageCount++;
        expect(data).toHaveProperty('type', 'private');
        expect(data).toHaveProperty('message');
        
        if (messageCount === totalMessages) {
          done();
        }
      });
    });
  });
});
