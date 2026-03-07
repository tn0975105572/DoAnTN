const mysql = require('mysql2/promise');

async function checkUsers() {
  console.log('🔍 Kiểm tra người dùng trong database...\n');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '12345678',
    database: process.env.DB_NAME || 'sv_cho',
  });
  
  try {
    // Lấy user đang test
    const userId = '1d22a4c4-ab8d-4d83-a997-f67671755820';
    
    const [users] = await connection.query(
      'SELECT ID_NguoiDung, ho_ten, email FROM nguoidung WHERE ID_NguoiDung = ?',
      [userId]
    );
    
    if (users.length > 0) {
      console.log('✅ User tồn tại:');
      console.table(users);
    } else {
      console.log('❌ Không tìm thấy user với ID:', userId);
    }
    
    // Lấy vài user khác
    const [allUsers] = await connection.query(
      'SELECT ID_NguoiDung, ho_ten, email FROM nguoidung LIMIT 5'
    );
    
    console.log('\n📋 5 users trong database:');
    console.table(allUsers);
    
    // Kiểm tra tin nhắn gần đây
    const [messages] = await connection.query(
      'SELECT * FROM tinnhan ORDER BY thoi_gian_tao DESC LIMIT 5'
    );
    
    console.log('\n💌 5 tin nhắn gần đây:');
    if (messages.length > 0) {
      console.table(messages.map(m => ({
        ID: m.ID_TinNhan.substring(0, 8) + '...',
        NguoiGui: m.ID_NguoiGui ? m.ID_NguoiGui.substring(0, 8) + '...' : null,
        NguoiNhan: m.ID_NguoiNhan ? m.ID_NguoiNhan.substring(0, 8) + '...' : null,
        NoiDung: m.noi_dung ? m.noi_dung.substring(0, 30) : '',
        ThoiGian: m.thoi_gian_tao
      })));
    } else {
      console.log('Không có tin nhắn nào');
    }
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await connection.end();
  }
}

checkUsers()
  .then(() => {
    console.log('\n✅ Kiểm tra hoàn tất!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  });



