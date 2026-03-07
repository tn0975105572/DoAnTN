const http = require('http');

// Test tạo thông báo trực tiếp
async function testCreateNotification() {
  console.log('🧪 Test tạo thông báo...\n');
  
  const notificationData = {
    ID_NguoiDung: '1d22a4c4-ab8d-4d83-a997-f67671755820', // User nhận thông báo
    ID_NguoiGui: 'test-sender-id',
    loai: 'tin_nhan',
    noi_dung: 'Test thông báo tin nhắn',
    lien_ket: '/test',
    da_doc: 0
  };
  
  const data = JSON.stringify(notificationData);
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/thongbao/create',
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
        console.log('Status:', res.statusCode);
        try {
          const parsed = JSON.parse(responseData);
          console.log('Response:', JSON.stringify(parsed, null, 2));
          resolve(parsed);
        } catch (e) {
          console.log('Raw response:', responseData);
          resolve(responseData);
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

testCreateNotification()
  .then(() => {
    console.log('\n✅ Test hoàn tất!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test thất bại:', error);
    process.exit(1);
  });

