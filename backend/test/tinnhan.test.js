const request = require('supertest');
const app = require('../server'); // Điều chỉnh đường dẫn theo cấu trúc project của bạn
const pool = require('../config/database');

describe('📱 API Tin Nhắn Tests', () => {
  let testUsers = [];
  let testGroup = null;
  let testMessages = [];
  let authTokens = {};

  // Test data
  const testData = {
    user1: {
      ID_NguoiDung: 'test-user-1',
      ho_ten: 'Nguyễn Văn A',
      email: 'test1@example.com',
      mat_khau: 'password123'
    },
    user2: {
      ID_NguoiDung: 'test-user-2', 
      ho_ten: 'Trần Thị B',
      email: 'test2@example.com',
      mat_khau: 'password123'
    },
    user3: {
      ID_NguoiDung: 'test-user-3',
      ho_ten: 'Lê Văn C', 
      email: 'test3@example.com',
      mat_khau: 'password123'
    }
  };

  beforeAll(async () => {
    // Tạo test users
    for (const [key, userData] of Object.entries(testData)) {
      try {
        await pool.query('INSERT INTO nguoidung SET ?', [userData]);
        testUsers.push(userData);
        
        // Login để lấy token
        const loginRes = await request(app)
          .post('/nguoidung/login')
          .send({
            email: userData.email,
            mat_khau: userData.mat_khau
          });
        
        if (loginRes.body.success) {
          authTokens[key] = loginRes.body.token;
        }
      } catch (error) {
        console.log(`User ${key} might already exist:`, error.message);
      }
    }

    // Tạo test group
    const groupData = {
      ID_GroupChat: 'test-group-1',
      ten_group: 'Test Group',
      mo_ta: 'Group for testing',
      ID_NguoiTao: testData.user1.ID_NguoiDung,
      so_thanh_vien: 3
    };

    try {
      await pool.query('INSERT INTO group_chat SET ?', [groupData]);
      testGroup = groupData;

      // Thêm members vào group
      const members = [
        { ID_ThanhVien: 'member-1', ID_GroupChat: groupData.ID_GroupChat, ID_NguoiDung: testData.user1.ID_NguoiDung, vai_tro: 'admin' },
        { ID_ThanhVien: 'member-2', ID_GroupChat: groupData.ID_GroupChat, ID_NguoiDung: testData.user2.ID_NguoiDung, vai_tro: 'member' },
        { ID_ThanhVien: 'member-3', ID_GroupChat: groupData.ID_GroupChat, ID_NguoiDung: testData.user3.ID_NguoiDung, vai_tro: 'member' }
      ];

      for (const member of members) {
        await pool.query('INSERT INTO thanh_vien_group SET ?', [member]);
      }
    } catch (error) {
      console.log('Group might already exist:', error.message);
    }
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      // Xóa tin nhắn test
      await pool.query('DELETE FROM tinnhan WHERE ID_NguoiGui IN (?, ?, ?)', [
        testData.user1.ID_NguoiDung,
        testData.user2.ID_NguoiDung, 
        testData.user3.ID_NguoiDung
      ]);

      // Xóa group members
      if (testGroup) {
        await pool.query('DELETE FROM thanh_vien_group WHERE ID_GroupChat = ?', [testGroup.ID_GroupChat]);
        await pool.query('DELETE FROM group_chat WHERE ID_GroupChat = ?', [testGroup.ID_GroupChat]);
      }

      // Xóa test users
      await pool.query('DELETE FROM nguoidung WHERE ID_NguoiDung IN (?, ?, ?)', [
        testData.user1.ID_NguoiDung,
        testData.user2.ID_NguoiDung,
        testData.user3.ID_NguoiDung
      ]);
    } catch (error) {
      console.log('Cleanup error:', error.message);
    }
  });

  describe('🔍 GET /tinnhan/getAll', () => {
    test('Lấy tất cả tin nhắn thành công', async () => {
      const response = await request(app)
        .get('/tinnhan/getAll')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('🔍 GET /tinnhan/getById/:id', () => {
    test('Lấy tin nhắn theo ID thành công', async () => {
      // Tạo tin nhắn test trước
      const messageData = {
        ID_TinNhan: 'test-message-1',
        ID_NguoiGui: testData.user1.ID_NguoiDung,
        ID_NguoiNhan: testData.user2.ID_NguoiDung,
        noi_dung: 'Test message content',
        loai_tin_nhan: 'text',
        trang_thai: 'da_gui'
      };

      await pool.query('INSERT INTO tinnhan SET ?', [messageData]);
      testMessages.push(messageData);

      const response = await request(app)
        .get(`/tinnhan/getById/${messageData.ID_TinNhan}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('ID_TinNhan', messageData.ID_TinNhan);
    });

    test('Lấy tin nhắn không tồn tại', async () => {
      const response = await request(app)
        .get('/tinnhan/getById/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Tin nhắn không tồn tại');
    });
  });

  describe('💬 GET /tinnhan/private/:user1Id/:user2Id', () => {
    test('Lấy tin nhắn chat 1-1 thành công', async () => {
      const response = await request(app)
        .get(`/tinnhan/private/${testData.user1.ID_NguoiDung}/${testData.user2.ID_NguoiDung}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('Lấy tin nhắn chat 1-1 với pagination', async () => {
      const response = await request(app)
        .get(`/tinnhan/private/${testData.user1.ID_NguoiDung}/${testData.user2.ID_NguoiDung}?limit=10&offset=0`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('👥 GET /tinnhan/group/:groupId/:userId', () => {
    test('Lấy tin nhắn group thành công', async () => {
      const response = await request(app)
        .get(`/tinnhan/group/${testGroup.ID_GroupChat}/${testData.user1.ID_NguoiDung}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('Lấy tin nhắn group với user không phải thành viên', async () => {
      const nonMemberUser = 'non-member-user';
      const response = await request(app)
        .get(`/tinnhan/group/${testGroup.ID_GroupChat}/${nonMemberUser}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Bạn không phải thành viên của group này');
    });
  });

  describe('📋 GET /tinnhan/conversations/:userId', () => {
    test('Lấy danh sách cuộc trò chuyện thành công', async () => {
      const response = await request(app)
        .get(`/tinnhan/conversations/${testData.user1.ID_NguoiDung}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('🔢 GET /tinnhan/unread/:userId', () => {
    test('Đếm tin nhắn chưa đọc thành công', async () => {
      const response = await request(app)
        .get(`/tinnhan/unread/${testData.user2.ID_NguoiDung}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('total_unread');
      expect(response.body.data).toHaveProperty('unread_private');
      expect(response.body.data).toHaveProperty('unread_group');
    });
  });

  describe('📤 POST /tinnhan/send', () => {
    test('Gửi tin nhắn chat 1-1 thành công', async () => {
      const messageData = {
        ID_NguoiGui: testData.user1.ID_NguoiDung,
        ID_NguoiNhan: testData.user2.ID_NguoiDung,
        noi_dung: 'Hello from test!',
        loai_tin_nhan: 'text'
      };

      const response = await request(app)
        .post('/tinnhan/send')
        .send(messageData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('messageId');
      expect(response.body.data).toHaveProperty('message');
    });

    test('Gửi tin nhắn group thành công', async () => {
      const messageData = {
        ID_NguoiGui: testData.user1.ID_NguoiDung,
        ID_GroupChat: testGroup.ID_GroupChat,
        noi_dung: 'Hello group!',
        loai_tin_nhan: 'text'
      };

      const response = await request(app)
        .post('/tinnhan/send')
        .send(messageData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    test('Gửi tin nhắn thiếu thông tin bắt buộc', async () => {
      const messageData = {
        ID_NguoiGui: testData.user1.ID_NguoiDung,
        noi_dung: 'Missing receiver'
      };

      const response = await request(app)
        .post('/tinnhan/send')
        .send(messageData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Phải có người nhận hoặc group chat');
    });

    test('Gửi tin nhắn thiếu nội dung', async () => {
      const messageData = {
        ID_NguoiGui: testData.user1.ID_NguoiDung,
        ID_NguoiNhan: testData.user2.ID_NguoiDung
      };

      const response = await request(app)
        .post('/tinnhan/send')
        .send(messageData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Thiếu thông tin bắt buộc');
    });

    test('Gửi tin nhắn với file đính kèm', async () => {
      const messageData = {
        ID_NguoiGui: testData.user1.ID_NguoiDung,
        ID_NguoiNhan: testData.user2.ID_NguoiDung,
        noi_dung: 'Message with file',
        loai_tin_nhan: 'file',
        file_dinh_kem: 'test-file.jpg'
      };

      const response = await request(app)
        .post('/tinnhan/send')
        .send(messageData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('✏️ PUT /tinnhan/update/:id', () => {
    test('Cập nhật tin nhắn thành công', async () => {
      // Tạo tin nhắn test
      const messageData = {
        ID_TinNhan: 'test-message-update',
        ID_NguoiGui: testData.user1.ID_NguoiDung,
        ID_NguoiNhan: testData.user2.ID_NguoiDung,
        noi_dung: 'Original message',
        loai_tin_nhan: 'text',
        trang_thai: 'da_gui'
      };

      await pool.query('INSERT INTO tinnhan SET ?', [messageData]);

      const updateData = {
        noi_dung: 'Updated message content',
        userId: testData.user1.ID_NguoiDung
      };

      const response = await request(app)
        .put(`/tinnhan/update/${messageData.ID_TinNhan}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Cập nhật tin nhắn thành công');
    });

    test('Cập nhật tin nhắn không có quyền', async () => {
      const updateData = {
        noi_dung: 'Unauthorized update',
        userId: testData.user2.ID_NguoiDung // User khác
      };

      const response = await request(app)
        .put('/tinnhan/update/test-message-update')
        .send(updateData)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Bạn không có quyền chỉnh sửa tin nhắn này');
    });

    test('Cập nhật tin nhắn không tồn tại', async () => {
      const updateData = {
        noi_dung: 'Update non-existent',
        userId: testData.user1.ID_NguoiDung
      };

      const response = await request(app)
        .put('/tinnhan/update/non-existent-message')
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Tin nhắn không tồn tại');
    });
  });

  describe('🗑️ DELETE /tinnhan/delete/:id', () => {
    test('Xóa tin nhắn thành công', async () => {
      // Tạo tin nhắn test
      const messageData = {
        ID_TinNhan: 'test-message-delete',
        ID_NguoiGui: testData.user1.ID_NguoiDung,
        ID_NguoiNhan: testData.user2.ID_NguoiDung,
        noi_dung: 'Message to delete',
        loai_tin_nhan: 'text',
        trang_thai: 'da_gui'
      };

      await pool.query('INSERT INTO tinnhan SET ?', [messageData]);

      const deleteData = {
        userId: testData.user1.ID_NguoiDung
      };

      const response = await request(app)
        .delete(`/tinnhan/delete/${messageData.ID_TinNhan}`)
        .send(deleteData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Xóa tin nhắn thành công');
    });

    test('Xóa tin nhắn không có quyền', async () => {
      const deleteData = {
        userId: testData.user2.ID_NguoiDung // User khác
      };

      const response = await request(app)
        .delete('/tinnhan/delete/test-message-delete')
        .send(deleteData)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('✅ POST /tinnhan/mark-read', () => {
    test('Đánh dấu tin nhắn đã đọc thành công', async () => {
      const markReadData = {
        userId: testData.user2.ID_NguoiDung,
        senderId: testData.user1.ID_NguoiDung
      };

      const response = await request(app)
        .post('/tinnhan/mark-read')
        .send(markReadData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('markedCount');
    });
  });

  describe('✅ POST /tinnhan/mark-group-read', () => {
    test('Đánh dấu tin nhắn group đã đọc thành công', async () => {
      const markReadData = {
        userId: testData.user1.ID_NguoiDung,
        groupId: testGroup.ID_GroupChat
      };

      const response = await request(app)
        .post('/tinnhan/mark-group-read')
        .send(markReadData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('markedCount');
    });
  });

  describe('🔒 Authentication Tests', () => {
    test('Truy cập API không có token', async () => {
      const response = await request(app)
        .get('/tinnhan/getAll')
        .expect(200); // API này có thể không yêu cầu auth

      // Kiểm tra response structure
      expect(response.body).toHaveProperty('success');
    });
  });

  describe('📊 Performance Tests', () => {
    test('Lấy tin nhắn với pagination lớn', async () => {
      const response = await request(app)
        .get(`/tinnhan/private/${testData.user1.ID_NguoiDung}/${testData.user2.ID_NguoiDung}?limit=100&offset=0`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('Gửi nhiều tin nhắn liên tiếp', async () => {
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        const messageData = {
          ID_NguoiGui: testData.user1.ID_NguoiDung,
          ID_NguoiNhan: testData.user2.ID_NguoiDung,
          noi_dung: `Bulk message ${i + 1}`,
          loai_tin_nhan: 'text'
        };

        promises.push(
          request(app)
            .post('/tinnhan/send')
            .send(messageData)
        );
      }

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('success', true);
      });
    });
  });

  describe('🔄 Edge Cases', () => {
    test('Gửi tin nhắn với nội dung rỗng', async () => {
      const messageData = {
        ID_NguoiGui: testData.user1.ID_NguoiDung,
        ID_NguoiNhan: testData.user2.ID_NguoiDung,
        noi_dung: '',
        loai_tin_nhan: 'text'
      };

      const response = await request(app)
        .post('/tinnhan/send')
        .send(messageData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    test('Gửi tin nhắn với nội dung quá dài', async () => {
      const longMessage = 'a'.repeat(10000); // 10KB message
      
      const messageData = {
        ID_NguoiGui: testData.user1.ID_NguoiDung,
        ID_NguoiNhan: testData.user2.ID_NguoiDung,
        noi_dung: longMessage,
        loai_tin_nhan: 'text'
      };

      const response = await request(app)
        .post('/tinnhan/send')
        .send(messageData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
    });

    test('Lấy tin nhắn với ID không hợp lệ', async () => {
      const response = await request(app)
        .get('/tinnhan/getById/invalid-id-format')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});
