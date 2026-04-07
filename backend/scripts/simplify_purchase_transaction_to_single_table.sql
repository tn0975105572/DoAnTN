-- Dung script nay neu ban da chay ban cu co 3 bang:
-- - giaodich_baidang
-- - giaodich_baidang_lichsu
-- - giaodich_baidang_diemhen
--
-- Muc tieu:
-- - giu lai duy nhat bang giaodich_baidang
-- - them cot diem hen + lich su json vao bang chinh
-- - xoa 2 bang phu
--
-- Luu y:
-- - Script nay gia dinh 2 bang phu chua co du lieu quan trong.
-- - Neu 2 bang phu da co du lieu that, nen backup truoc khi chay.

ALTER TABLE `giaodich_baidang`
  ADD COLUMN `dia_chi_hen_gap` varchar(255) DEFAULT NULL AFTER `ly_do_huy`,
  ADD COLUMN `vi_do_hen_gap` decimal(10,8) DEFAULT NULL AFTER `dia_chi_hen_gap`,
  ADD COLUMN `kinh_do_hen_gap` decimal(11,8) DEFAULT NULL AFTER `vi_do_hen_gap`,
  ADD COLUMN `ghi_chu_hen_gap` text DEFAULT NULL AFTER `kinh_do_hen_gap`,
  ADD COLUMN `ID_NguoiTaoHen` char(36) DEFAULT NULL AFTER `ghi_chu_hen_gap`,
  ADD COLUMN `lich_su_json` json DEFAULT NULL AFTER `ID_NguoiTaoHen`;

DROP TABLE IF EXISTS `giaodich_baidang_diemhen`;
DROP TABLE IF EXISTS `giaodich_baidang_lichsu`;
