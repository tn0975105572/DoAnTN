const http = require('http');

// Test gửi tin nhắn và xem có tạo thông báo không
async function testSendMessage() {
  console.log('💌 Test gửi tin nhắn...\n');
  
  const messageData = {
    ID_NguoiGui: '1d22a4c4-ab8d-4d83-a997-f67671755820', // Nhi (A)
    ID_NguoiNhan: '3bcb7f72-7e56-4a5c-a381-9725e8ff052d', // B
    noi_dung: 'Test message - kiểm tra thông báo'
  };
  
  console.log('📤 Gửi tin nhắn:');
  console.log('   Từ:', messageData.ID_NguoiGui);
  console.log('   Đến:', messageData.ID_NguoiNhan);
  console.log('   Nội dung:', messageData.noi_dung);
  console.log('');
  
  const data = JSON.stringify(messageData);
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/tinnhan/send',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log('📥 Response Status:', res.statusCode);
        try {
          const parsed = JSON.parse(responseData);
          console.log('📦 Response:', JSON.stringify(parsed, null, 2));
          
          if (parsed.success) {
            console.log('\n✅ Tin nhắn đã được gửi!');
            console.log('\n⏰ CHỜ 2 GIÂY rồi kiểm tra thông báo...');
            
            // Đợi 2s để backend tạo thông báo
            setTimeout(() => {
              checkNotifications(messageData.ID_NguoiNhan).then(resolve).catch(reject);
            }, 2000);
          } else {
            console.log('\n❌ Gửi tin nhắn thất bại!');
            resolve();
          }
        } catch (e) {
          console.log('Raw response:', responseData);
          resolve();
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Error:', error.message);
      reject(error);
    });
    
    req.write(data);
    req.end();
  });
}

async function checkNotifications(userId) {
  console.log(`\n🔔 Kiểm tra thông báo cho user: ${userId}`);
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/thongbao/user/${userId}`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          
          if (parsed.success && parsed.data && parsed.data.length > 0) {
            console.log(`\n✅ CÓ ${parsed.data.length} THÔNG BÁO!`);
            console.log('\n📋 Chi tiết:');
            parsed.data.forEach((notif, index) => {
              console.log(`\n${index + 1}. ${notif.noi_dung}`);
              console.log(`   Loại: ${notif.loai}`);
              console.log(`   Đã đọc: ${notif.da_doc ? 'Rồi' : 'Chưa'}`);
              console.log(`   Thời gian: ${notif.thoi_gian_tao}`);
            });
          } else {
            console.log('\n❌ KHÔNG CÓ THÔNG BÁO NÀO!');
            console.log('\n🔍 Nguyên nhân có thể:');
            console.log('   1. Backend không tạo thông báo khi gửi tin nhắn');
            console.log('   2. Backend có lỗi nhưng không log ra');
            console.log('   3. req.io undefined trong controller');
            console.log('\n💡 Giải pháp: Xem backend logs khi gửi tin nhắn');
          }
          
          resolve();
        } catch (e) {
          console.log('Response:', responseData);
          resolve();
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Error:', error.message);
      reject(error);
    });
    
    req.end();
  });
}

testSendMessage()
  .then(() => {
    console.log('\n✅ Test hoàn tất!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test thất bại:', error);
    process.exit(1);
  });



