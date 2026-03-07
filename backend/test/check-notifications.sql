-- Kiểm tra thông báo trong database
USE sv_cho;

-- Xem 10 thông báo mới nhất
SELECT 
  tb.*,
  nd_gui.ho_ten as nguoi_gui,
  nd_nhan.ho_ten as nguoi_nhan
FROM thongbao tb
LEFT JOIN nguoidung nd_gui ON tb.ID_NguoiGui = nd_gui.ID_NguoiDung
LEFT JOIN nguoidung nd_nhan ON tb.ID_NguoiDung = nd_nhan.ID_NguoiDung
ORDER BY tb.thoi_gian_tao DESC
LIMIT 10;

-- Đếm theo loại
SELECT loai, COUNT(*) as so_luong
FROM thongbao
GROUP BY loai;

-- Xem thông báo tin nhắn
SELECT *
FROM thongbao
WHERE loai = 'tin_nhan'
ORDER BY thoi_gian_tao DESC
LIMIT 5;



