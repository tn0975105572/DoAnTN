-- Tao bang hoa don cho giao dich mua ban hoan tat
-- Moi giao dich hoan tat sinh ra toi da 1 hoa don

CREATE TABLE IF NOT EXISTS `donhang` (
  `ID_DonHang` char(36) NOT NULL,
  `ma_hoa_don` varchar(40) NOT NULL,
  `ID_GiaoDich` char(36) NOT NULL,
  `ID_BaiDang` char(36) NOT NULL,
  `ID_NguoiBan` char(36) NOT NULL,
  `ID_NguoiMua` char(36) NOT NULL,
  `tieu_de_bai_dang` varchar(255) NOT NULL,
  `gia_giao_dich` decimal(15,2) DEFAULT NULL,
  `dia_chi_hen_gap` varchar(255) DEFAULT NULL,
  `thoi_gian_hen_gap` datetime DEFAULT NULL,
  `ghi_chu_hen_gap` text DEFAULT NULL,
  `ghi_chu_nguoi_mua` text DEFAULT NULL,
  `trang_thai` enum('hoan_tat','da_huy') DEFAULT 'hoan_tat',
  `thoi_gian_hoan_tat` datetime DEFAULT NULL,
  `thoi_gian_tao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `thoi_gian_cap_nhat` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_DonHang`),
  UNIQUE KEY `uq_donhang_ma_hoa_don` (`ma_hoa_don`),
  UNIQUE KEY `uq_donhang_giaodich` (`ID_GiaoDich`),
  KEY `idx_donhang_baidang` (`ID_BaiDang`),
  KEY `idx_donhang_nguoiban` (`ID_NguoiBan`),
  KEY `idx_donhang_nguoimua` (`ID_NguoiMua`),
  KEY `idx_donhang_hoantat` (`thoi_gian_hoan_tat`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
