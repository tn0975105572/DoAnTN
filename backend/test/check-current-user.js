const mysql = require('mysql2/promise');

async function checkUser() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'sv_cho',
  });
  
  try {
    const userId = '3bcb7f72-7e56-4a5c-a381-9725e8ff052d';
    
    // Kiểm tra user
    const [user] = await connection.query(
      'SELECT * FROM nguoidung WHERE ID_NguoiDung = ?',
      [userId]
    );
    
    if (user.length > 0) {
      console.log('✅ User tồn tại:', user[0].ho_ten);
    } else {
      console.log('❌ User KHÔNG tồn tại với ID:', userId);
      
      // Tìm user khác
      const [others] = await connection.query('SELECT ID_NguoiDung, ho_ten FROM nguoidung LIMIT 5');
      console.log('\n📋 Các user có sẵn:');
      others.forEach(u => console.log(`   ${u.ID_NguoiDung} - ${u.ho_ten}`));
    }
    
    // Kiểm tra thông báo
    const [notifications] = await connection.query(
      'SELECT * FROM thongbao WHERE ID_NguoiDung = ?',
      [userId]
    );
    
    console.log(`\n📊 Số thông báo: ${notifications.length}`);
    
    if (notifications.length > 0) {
      console.log('\n📋 Thông báo:');
      notifications.forEach(n => {
        console.log(`   ${n.noi_dung} - ${n.thoi_gian_tao}`);
      });
    }
    
  } finally {
    await connection.end();
  }
}

checkUser();



