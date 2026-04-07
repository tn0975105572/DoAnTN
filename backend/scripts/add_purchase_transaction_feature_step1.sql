-- STEP 1 (single-table version)
-- Huong toi MVP gon:
-- 1. Mo rong trang thai bai dang
-- 2. Mo rong loai thong bao
-- 3. Chi tao 1 bang duy nhat: giaodich_baidang
-- Khong dung FOREIGN KEY o buoc nay de tranh loi khoi tao.

ALTER TABLE `baidang`
MODIFY COLUMN `trang_thai` ENUM(
  'dang_ban',
  'dang_giu_cho',
  'dang_giao_dich',
  'da_ban',
  'da_trao_doi',
  'da_tang'
) DEFAULT 'dang_ban';

ALTER TABLE `thongbao`
MODIFY COLUMN `loai` ENUM(
  'tin_nhan',
  'phan_hoi_bai_dang',
  'cap_nhat_dich_vu',
  'loi_moi_su_kien',
  'voucher_moi',
  'thanh_toan',
  'like_bai_dang',
  'binh_luan_bai_dang',
  'yeu_cau_mua_hang',
  'cap_nhat_giao_dich'
) DEFAULT NULL;

CREATE TABLE IF NOT EXISTS `giaodich_baidang` (
  `ID_GiaoDich` char(36) NOT NULL,
  `ID_BaiDang` char(36) NOT NULL,
  `ID_NguoiBan` char(36) NOT NULL,
  `ID_NguoiMua` char(36) NOT NULL,
  `ID_TinNhanKhoiTao` char(36) DEFAULT NULL,
  `ghi_chu_nguoi_mua` text DEFAULT NULL,
  `trang_thai` enum(
    'cho_nguoi_ban_xac_nhan',
    'nguoi_ban_da_chap_nhan',
    'cho_hen_gap',
    'cho_xac_nhan_hoan_tat',
    'hoan_tat',
    'nguoi_mua_da_huy',
    'nguoi_ban_da_tu_choi',
    'he_thong_da_huy',
    'het_han'
  ) DEFAULT 'cho_nguoi_ban_xac_nhan',
  `ly_do_huy` varchar(255) DEFAULT NULL,
  `dia_chi_hen_gap` varchar(255) DEFAULT NULL,
  `vi_do_hen_gap` decimal(10,8) DEFAULT NULL,
  `kinh_do_hen_gap` decimal(11,8) DEFAULT NULL,
  `ghi_chu_hen_gap` text DEFAULT NULL,
  `ID_NguoiTaoHen` char(36) DEFAULT NULL,
  `lich_su_json` json DEFAULT NULL,
  `ma_khoa_yeu_cau_mo` varchar(80) DEFAULT NULL,
  `ma_khoa_baidang_active` char(36) DEFAULT NULL,
  `thoi_gian_yeu_cau` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `thoi_gian_nguoi_ban_xac_nhan` timestamp NULL DEFAULT NULL,
  `thoi_gian_hen_gap` datetime DEFAULT NULL,
  `thoi_gian_hoan_tat` timestamp NULL DEFAULT NULL,
  `thoi_gian_huy` timestamp NULL DEFAULT NULL,
  `thoi_gian_het_han` timestamp NULL DEFAULT NULL,
  `thoi_gian_tao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `thoi_gian_cap_nhat` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_GiaoDich`),
  UNIQUE KEY `uq_giaodich_request_open` (`ma_khoa_yeu_cau_mo`),
  UNIQUE KEY `uq_giaodich_active_accepted_baidang` (`ma_khoa_baidang_active`),
  KEY `idx_giaodich_baidang` (`ID_BaiDang`),
  KEY `idx_giaodich_nguoiban` (`ID_NguoiBan`),
  KEY `idx_giaodich_nguoimua` (`ID_NguoiMua`),
  KEY `idx_giaodich_tinnhan_khoitao` (`ID_TinNhanKhoiTao`),
  KEY `idx_giaodich_trangthai` (`trang_thai`),
  KEY `idx_giaodich_thoigianyeucau` (`thoi_gian_yeu_cau`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
