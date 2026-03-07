const mysql = require('mysql2/promise');

async function checkTableStructure() {
  console.log('🔍 Kiểm tra cấu trúc bảng thongbao...\n');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '12345678',
    database: process.env.DB_NAME || 'sv_cho',
  });
  
  try {
    // Kiểm tra cấu trúc bảng
    const [columns] = await connection.query(
      'DESCRIBE thongbao'
    );
    
    console.log('📊 Cột trong bảng thongbao:');
    console.table(columns.map(col => ({
      Field: col.Field,
      Type: col.Type,
      Null: col.Null,
      Key: col.Key,
      Default: col.Default
    })));
    
    // Kiểm tra có cột ID_NguoiGui không
    const hasIDNguoiGui = columns.some(col => col.Field === 'ID_NguoiGui');
    
    if (hasIDNguoiGui) {
      console.log('\n✅ Cột ID_NguoiGui đã tồn tại!');
    } else {
      console.log('\n❌ THIẾU cột ID_NguoiGui! Cần chạy migration!');
      console.log('📝 Chạy: mysql -u root -p sv_cho < backend/scripts/add_notification_sender.sql');
    }
    
    // Đếm số thông báo
    const [count] = await connection.query(
      'SELECT COUNT(*) as total FROM thongbao'
    );
    console.log(`\n📈 Tổng số thông báo: ${count[0].total}`);
    
    // Xem 3 thông báo mới nhất
    const [recent] = await connection.query(
      'SELECT * FROM thongbao ORDER BY thoi_gian_tao DESC LIMIT 3'
    );
    console.log(`\n📋 3 thông báo mới nhất:`);
    console.table(recent);
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await connection.end();
  }
}

checkTableStructure()
  .then(() => {
    console.log('\n✅ Kiểm tra hoàn tất!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  });



