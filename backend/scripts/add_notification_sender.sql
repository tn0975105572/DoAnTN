-- Migration: Thêm cột ID_NguoiGui vào bảng thongbao
-- Để lưu thông tin người gửi thông báo (người like, comment, nhắn tin)

-- Bước 1: Thêm cột ID_NguoiGui nếu chưa có
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'thongbao'
  AND COLUMN_NAME = 'ID_NguoiGui';

SET @query = IF(@col_exists = 0,
  'ALTER TABLE `thongbao` ADD COLUMN `ID_NguoiGui` char(36) DEFAULT NULL AFTER `ID_NguoiDung`',
  'SELECT "Column ID_NguoiGui already exists" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Bước 2: Thêm index cho ID_NguoiGui nếu chưa có
SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'thongbao'
  AND INDEX_NAME = 'ID_NguoiGui';

SET @query = IF(@index_exists = 0,
  'ALTER TABLE `thongbao` ADD KEY `ID_NguoiGui` (`ID_NguoiGui`)',
  'SELECT "Index ID_NguoiGui already exists" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Bước 3: Thêm foreign key constraint nếu chưa có
SET @fk_exists = 0;
SELECT COUNT(*) INTO @fk_exists
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'thongbao'
  AND CONSTRAINT_NAME = 'thongbao_ibfk_2';

SET @query = IF(@fk_exists = 0,
  'ALTER TABLE `thongbao` ADD CONSTRAINT `thongbao_ibfk_2` FOREIGN KEY (`ID_NguoiGui`) REFERENCES `nguoidung` (`ID_NguoiDung`) ON DELETE CASCADE',
  'SELECT "Foreign key thongbao_ibfk_2 already exists" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Bước 4: Cập nhật enum loai để thêm các loại mới
ALTER TABLE `thongbao` 
MODIFY COLUMN `loai` ENUM(
  'tin_nhan',
  'phan_hoi_bai_dang',
  'cap_nhat_dich_vu',
  'loi_moi_su_kien',
  'voucher_moi',
  'thanh_toan',
  'like_bai_dang',
  'binh_luan_bai_dang'
) DEFAULT NULL;

-- Bước 5: Thêm các index để tăng performance
-- Index cho da_doc
SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'thongbao'
  AND INDEX_NAME = 'idx_da_doc';

SET @query = IF(@index_exists = 0,
  'CREATE INDEX `idx_da_doc` ON `thongbao` (`da_doc`)',
  'SELECT "Index idx_da_doc already exists" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index cho thoi_gian_tao
SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'thongbao'
  AND INDEX_NAME = 'idx_thoi_gian_tao';

SET @query = IF(@index_exists = 0,
  'CREATE INDEX `idx_thoi_gian_tao` ON `thongbao` (`thoi_gian_tao`)',
  'SELECT "Index idx_thoi_gian_tao already exists" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index composite cho user_unread
SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'thongbao'
  AND INDEX_NAME = 'idx_user_unread';

SET @query = IF(@index_exists = 0,
  'CREATE INDEX `idx_user_unread` ON `thongbao` (`ID_NguoiDung`, `da_doc`, `thoi_gian_tao`)',
  'SELECT "Index idx_user_unread already exists" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Hoàn tất
SELECT 'Migration completed successfully!' AS status;

