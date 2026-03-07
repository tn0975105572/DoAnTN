const http = require('http');

// Test notification API endpoints
async function testGet(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function testNotificationAPI() {
  console.log('🧪 Testing Notification API Endpoints...\n');
  
  // Test 1: Get all notifications
  try {
    console.log('1️⃣ Testing GET /api/thongbao/getAll');
    const result = await testGet('/api/thongbao/getAll');
    console.log('✅ Status:', result.status);
    console.log('📦 Response:', JSON.stringify(result.data, null, 2));
    console.log('');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  // Test 2: Count unread notifications for a test user
  try {
    console.log('2️⃣ Testing GET /api/thongbao/unread/:userId');
    const result = await testGet('/api/thongbao/unread/1');
    console.log('✅ Status:', result.status);
    console.log('📦 Response:', JSON.stringify(result.data, null, 2));
    console.log('');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  // Test 3: Get notifications for a user
  try {
    console.log('3️⃣ Testing GET /api/thongbao/user/:userId');
    const result = await testGet('/api/thongbao/user/1');
    console.log('✅ Status:', result.status);
    console.log('📦 Response:', JSON.stringify(result.data, null, 2));
    console.log('');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run tests
testNotificationAPI()
  .then(() => {
    console.log('✅ All tests completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
