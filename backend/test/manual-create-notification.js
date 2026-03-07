const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function createManualNotification() {
  console.log('🔔 Tạo thông báo thủ công...\n');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '12345678',
    database: process.env.DB_NAME || 'sv_cho',
  });
  
  try {
    const notificationId = uuidv4();
    const userId = '1d22a4c4-ab8d-4d83-a997-f67671755820'; // Nhi
    const senderId = '000a9363-dead-4554-986d-9b9725cfd739'; // Lan Mai
    
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
        userId,
        senderId,
        'tin_nhan',
        'Lan Mai đã gửi tin nhắn cho bạn (TEST MANUAL)',
        '/chat',
        0
      ]
    );
    
    console.log('✅ Đã tạo thông báo thành công!');
    console.log('   ID:', notificationId);
    
    // Kiểm tra lại
    const [result] = await connection.query(
      `SELECT tb.*, nd.ho_ten as nguoi_gui
       FROM thongbao tb
       LEFT JOIN nguoidung nd ON tb.ID_NguoiGui = nd.ID_NguoiDung
       WHERE tb.ID_ThongBao = ?`,
      [notificationId]
    );
    
    console.log('\n📋 Thông báo vừa tạo:');
    console.table(result);
    
    // Đếm tổng thông báo
    const [count] = await connection.query('SELECT COUNT(*) as total FROM thongbao');
    console.log(`\n📈 Tổng số thông báo hiện tại: ${count[0].total}`);
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error('   Details:', error);
  } finally {
    await connection.end();
  }
}

createManualNotification()
  .then(() => {
    console.log('\n✅ Hoàn tất!');
    console.log('\n📱 Bây giờ reload app mobile để xem thông báo');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  });



