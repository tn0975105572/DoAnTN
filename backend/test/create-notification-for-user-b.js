const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function createNotificationForUserB() {
  console.log('🔔 Tạo thông báo cho User B...\n');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '12345678',
    database: process.env.DB_NAME || 'sv_cho',
  });
  
  try {
    const notificationId = uuidv4();
    const userB = '3bcb7f72-7e56-4a5c-a381-9725e8ff052d'; // User B
    const userA = '1d22a4c4-ab8d-4d83-a997-f67671755820'; // User A (Nhi)
    
    // Tạo thông báo
    await connection.query(
      `INSERT INTO thongbao (
        ID_ThongBao,
        ID_NguoiDung,
        ID_NguoiGui,
        loai,
        noi_dung,
        lien_ket,
        da_doc
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        notificationId,
        userB,
        userA,
        'tin_nhan',
        'Nhi đã gửi tin nhắn cho bạn',
        '/chat',
        0
      ]
    );
    
    console.log('✅ Đã tạo thông báo cho User B!');
    console.log('   ID Thông báo:', notificationId);
    console.log('   Người nhận:', userB);
    console.log('   Người gửi:', userA);
    
    // Kiểm tra
    const [notifications] = await connection.query(
      `SELECT tb.*, nd.ho_ten as nguoi_gui
       FROM thongbao tb
       LEFT JOIN nguoidung nd ON tb.ID_NguoiGui = nd.ID_NguoiDung
       WHERE tb.ID_NguoiDung = ?
       ORDER BY tb.thoi_gian_tao DESC`,
      [userB]
    );
    
    console.log(`\n📊 Tổng số thông báo của User B: ${notifications.length}`);
    
    if (notifications.length > 0) {
      console.log('\n📋 Thông báo mới nhất:');
      const latest = notifications[0];
      console.log(`   Nội dung: ${latest.noi_dung}`);
      console.log(`   Từ: ${latest.nguoi_gui}`);
      console.log(`   Loại: ${latest.loai}`);
      console.log(`   Thời gian: ${latest.thoi_gian_tao}`);
    }
    
    console.log('\n📱 BÂY GIỜ:');
    console.log('   1. Reload app mobile (User B)');
    console.log('   2. Xem icon 🔔 → Sẽ có badge số');
    console.log('   3. Click vào → Xem thông báo');
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await connection.end();
  }
}

createNotificationForUserB()
  .then(() => {
    console.log('\n✅ Hoàn tất!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  });



