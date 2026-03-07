-- MySQL dump 10.13  Distrib 8.0.42, for Win64 (x86_64)
--
-- Host: localhost    Database: sv_cho
-- ------------------------------------------------------
-- Server version	9.3.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `baidang`
--

DROP TABLE IF EXISTS `baidang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `baidang` (
  `ID_BaiDang` char(36) NOT NULL,
  `ID_NguoiDung` char(36) NOT NULL,
  `ID_LoaiBaiDang` char(36) NOT NULL,
  `ID_DanhMuc` char(36) DEFAULT NULL,
  `tieu_de` varchar(255) NOT NULL,
  `mo_ta` text,
  `gia` decimal(10,2) DEFAULT NULL,
  `vi_tri` varchar(255) DEFAULT NULL,
  `trang_thai` enum('dang_ban','da_ban','da_trao_doi','da_tang') DEFAULT 'dang_ban',
  `thoi_gian_tao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `thoi_gian_cap_nhat` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_BaiDang`),
  KEY `ID_LoaiBaiDang` (`ID_LoaiBaiDang`),
  KEY `idx_baidang_tieu_de` (`tieu_de`),
  KEY `idx_baidang_danh_muc` (`ID_DanhMuc`),
  KEY `idx_baidang_nguoi_dung` (`ID_NguoiDung`),
  CONSTRAINT `baidang_ibfk_1` FOREIGN KEY (`ID_NguoiDung`) REFERENCES `nguoidung` (`ID_NguoiDung`) ON DELETE CASCADE,
  CONSTRAINT `baidang_ibfk_2` FOREIGN KEY (`ID_LoaiBaiDang`) REFERENCES `loaibaidang` (`ID_LoaiBaiDang`) ON DELETE RESTRICT,
  CONSTRAINT `baidang_ibfk_3` FOREIGN KEY (`ID_DanhMuc`) REFERENCES `danhmuc` (`ID_DanhMuc`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `baidang_anh`
--

DROP TABLE IF EXISTS `baidang_anh`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `baidang_anh` (
  `ID_BaiDang` varchar(50) NOT NULL,
  `LinkAnh` text NOT NULL,
  `ID` char(36) NOT NULL,
  PRIMARY KEY (`ID`),
  KEY `ID_BaiDang` (`ID_BaiDang`),
  CONSTRAINT `BaiDang_Anh_ibfk_1` FOREIGN KEY (`ID_BaiDang`) REFERENCES `baidang` (`ID_BaiDang`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `baocao`
--

DROP TABLE IF EXISTS `baocao`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `baocao` (
  `ID_BaoCao` char(36) NOT NULL,
  `ID_NguoiBaoCao` char(36) NOT NULL,
  `doi_tuong_bao_cao_id` char(36) NOT NULL,
  `loai` enum('nguoi_dung','bai_dang','dich_vu_thue','tin_nhan') DEFAULT NULL,
  `ly_do` text,
  `trang_thai` enum('dang_xu_ly','da_xu_ly') DEFAULT 'dang_xu_ly',
  `thoi_gian_tao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_BaoCao`),
  KEY `ID_NguoiBaoCao` (`ID_NguoiBaoCao`),
  CONSTRAINT `baocao_ibfk_1` FOREIGN KEY (`ID_NguoiBaoCao`) REFERENCES `nguoidung` (`ID_NguoiDung`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `binhluanbaidang`
--

DROP TABLE IF EXISTS `binhluanbaidang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `binhluanbaidang` (
  `ID_BinhLuan` char(36) NOT NULL,
  `ID_BaiDang` char(36) NOT NULL,
  `ID_NguoiDung` char(36) NOT NULL,
  `noi_dung` text NOT NULL,
  `thoi_gian_binh_luan` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `ID_BinhLuanCha` char(36) DEFAULT NULL,
  PRIMARY KEY (`ID_BinhLuan`),
  KEY `ID_NguoiDung` (`ID_NguoiDung`),
  KEY `idx_binhluan_baidang` (`ID_BaiDang`),
  KEY `ID_BinhLuanCha` (`ID_BinhLuanCha`),
  CONSTRAINT `binhluanbaidang_ibfk_1` FOREIGN KEY (`ID_BaiDang`) REFERENCES `baidang` (`ID_BaiDang`) ON DELETE CASCADE,
  CONSTRAINT `binhluanbaidang_ibfk_2` FOREIGN KEY (`ID_NguoiDung`) REFERENCES `nguoidung` (`ID_NguoiDung`) ON DELETE CASCADE,
  CONSTRAINT `binhluanbaidang_ibfk_3` FOREIGN KEY (`ID_BinhLuanCha`) REFERENCES `binhluanbaidang` (`ID_BinhLuan`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `chitietdonhang`
--

DROP TABLE IF EXISTS `chitietdonhang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chitietdonhang` (
  `ID_ChiTietDonHang` char(36) NOT NULL,
  `ID_DonHang` char(36) NOT NULL,
  `ID_DichVuThue` char(36) NOT NULL,
  `so_luong` int DEFAULT '1',
  `gia` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`ID_ChiTietDonHang`),
  KEY `ID_DonHang` (`ID_DonHang`),
  KEY `ID_DichVuThue` (`ID_DichVuThue`),
  CONSTRAINT `chitietdonhang_ibfk_1` FOREIGN KEY (`ID_DonHang`) REFERENCES `donhang` (`ID_DonHang`) ON DELETE CASCADE,
  CONSTRAINT `chitietdonhang_ibfk_2` FOREIGN KEY (`ID_DichVuThue`) REFERENCES `dichvuthue` (`ID_DichVuThue`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `danhgia`
--

DROP TABLE IF EXISTS `danhgia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `danhgia` (
  `ID_DanhGia` char(36) NOT NULL,
  `ID_NguoiDanhGia` char(36) NOT NULL,
  `doi_tuong_id` char(36) NOT NULL,
  `loai` enum('nguoi_dung','bai_dang','dich_vu_thue') NOT NULL,
  `diem_so` int DEFAULT NULL,
  `binh_luan` text,
  `thoi_gian_tao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_DanhGia`),
  KEY `ID_NguoiDanhGia` (`ID_NguoiDanhGia`),
  KEY `idx_danhgia_loai_doituong` (`loai`,`doi_tuong_id`),
  CONSTRAINT `danhgia_ibfk_1` FOREIGN KEY (`ID_NguoiDanhGia`) REFERENCES `nguoidung` (`ID_NguoiDung`) ON DELETE CASCADE,
  CONSTRAINT `danhgia_chk_1` CHECK ((`diem_so` between 1 and 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `danhmuc`
--

DROP TABLE IF EXISTS `danhmuc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `danhmuc` (
  `ID_DanhMuc` char(36) NOT NULL,
  `ten` varchar(50) NOT NULL,
  `mo_ta` text,
  `ID_DanhMuc_Cha` char(36) DEFAULT NULL,
  PRIMARY KEY (`ID_DanhMuc`),
  KEY `ID_DanhMuc_Cha` (`ID_DanhMuc_Cha`),
  CONSTRAINT `danhmuc_ibfk_1` FOREIGN KEY (`ID_DanhMuc_Cha`) REFERENCES `danhmuc` (`ID_DanhMuc`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dichvuthue`
--

DROP TABLE IF EXISTS `dichvuthue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dichvuthue` (
  `ID_DichVuThue` char(36) NOT NULL,
  `ID_NguoiDung` char(36) NOT NULL,
  `tieu_de` varchar(255) NOT NULL,
  `mo_ta` text,
  `dia_diem_di` varchar(255) DEFAULT NULL,
  `dia_diem_den` varchar(255) DEFAULT NULL,
  `ngan_sach` decimal(10,2) DEFAULT NULL,
  `thoi_gian_yeu_cau` datetime DEFAULT NULL,
  `trang_thai` enum('mo','dang_thuc_hien','hoan_thanh','huy') DEFAULT 'mo',
  `ID_NguoiCungCap` char(36) DEFAULT NULL,
  `thoi_gian_tao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `thoi_gian_cap_nhat` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_DichVuThue`),
  KEY `ID_NguoiCungCap` (`ID_NguoiCungCap`),
  KEY `idx_dichvuthue_nguoi_dung` (`ID_NguoiDung`),
  KEY `idx_dichvuthue_trang_thai` (`trang_thai`),
  CONSTRAINT `dichvuthue_ibfk_1` FOREIGN KEY (`ID_NguoiDung`) REFERENCES `nguoidung` (`ID_NguoiDung`) ON DELETE CASCADE,
  CONSTRAINT `dichvuthue_ibfk_2` FOREIGN KEY (`ID_NguoiCungCap`) REFERENCES `nguoidung` (`ID_NguoiDung`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `donhang`
--

DROP TABLE IF EXISTS `donhang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `donhang` (
  `ID_DonHang` char(36) NOT NULL,
  `ID_NguoiDung` char(36) NOT NULL,
  `tong_tien` decimal(10,2) DEFAULT NULL,
  `trang_thai` enum('cho_xac_nhan','da_giao','huy') DEFAULT 'cho_xac_nhan',
  `thoi_gian_dat` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_DonHang`),
  KEY `idx_donhang_nguoi_dung` (`ID_NguoiDung`),
  CONSTRAINT `donhang_ibfk_1` FOREIGN KEY (`ID_NguoiDung`) REFERENCES `nguoidung` (`ID_NguoiDung`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `giohang`
--

DROP TABLE IF EXISTS `giohang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `giohang` (
  `ID_GioHang` char(36) NOT NULL,
  `ID_NguoiDung` char(36) NOT NULL,
  `ID_DichVuThue` char(36) NOT NULL,
  `so_luong` int DEFAULT '1',
  `thoi_gian_them` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_GioHang`),
  KEY `ID_DichVuThue` (`ID_DichVuThue`),
  KEY `idx_giohang_nguoi_dung` (`ID_NguoiDung`),
  CONSTRAINT `giohang_ibfk_1` FOREIGN KEY (`ID_NguoiDung`) REFERENCES `nguoidung` (`ID_NguoiDung`) ON DELETE CASCADE,
  CONSTRAINT `giohang_ibfk_2` FOREIGN KEY (`ID_DichVuThue`) REFERENCES `dichvuthue` (`ID_DichVuThue`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `goiy_baidang`
--

DROP TABLE IF EXISTS `goiy_baidang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `goiy_baidang` (
  `ID_NguoiDung` char(36) NOT NULL,
  `ID_BaiDang` char(36) NOT NULL,
  `Score` float NOT NULL,
  `thoi_gian_cap_nhat` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_NguoiDung`,`ID_BaiDang`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `likebaidang`
--

DROP TABLE IF EXISTS `likebaidang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `likebaidang` (
  `ID_Like` char(36) NOT NULL,
  `ID_BaiDang` char(36) NOT NULL,
  `ID_NguoiDung` char(36) NOT NULL,
  `thoi_gian_like` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_Like`),
  UNIQUE KEY `unique_like` (`ID_BaiDang`,`ID_NguoiDung`),
  KEY `ID_NguoiDung` (`ID_NguoiDung`),
  CONSTRAINT `likebaidang_ibfk_1` FOREIGN KEY (`ID_BaiDang`) REFERENCES `baidang` (`ID_BaiDang`) ON DELETE CASCADE,
  CONSTRAINT `likebaidang_ibfk_2` FOREIGN KEY (`ID_NguoiDung`) REFERENCES `nguoidung` (`ID_NguoiDung`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `loaibaidang`
--

DROP TABLE IF EXISTS `loaibaidang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `loaibaidang` (
  `ID_LoaiBaiDang` char(36) NOT NULL,
  `ten` varchar(50) NOT NULL,
  `mo_ta` text,
  PRIMARY KEY (`ID_LoaiBaiDang`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `nguoidung`
--

DROP TABLE IF EXISTS `nguoidung`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nguoidung` (
  `ID_NguoiDung` char(36) NOT NULL,
  `ten_dang_nhap` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `mat_khau` varchar(255) NOT NULL,
  `ho_ten` varchar(100) DEFAULT NULL,
  `truong_hoc` varchar(100) DEFAULT NULL,
  `vi_tri` varchar(255) DEFAULT NULL,
  `anh_dai_dien` varchar(255) DEFAULT NULL,
  `da_xac_thuc` tinyint(1) DEFAULT '0',
  `thoi_gian_tao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `thoi_gian_cap_nhat` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `que_quan` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`ID_NguoiDung`),
  UNIQUE KEY `ten_dang_nhap` (`ten_dang_nhap`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_nguoidung_email` (`email`),
  KEY `idx_nguoidung_ten` (`ten_dang_nhap`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `nguoidungvoucher`
--

DROP TABLE IF EXISTS `nguoidungvoucher`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nguoidungvoucher` (
  `ID_NguoiDungVoucher` char(36) NOT NULL,
  `ID_NguoiDung` char(36) NOT NULL,
  `ID_Voucher` char(36) NOT NULL,
  `thoi_gian_su_dung` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_NguoiDungVoucher`),
  UNIQUE KEY `unique_voucher_use` (`ID_NguoiDung`,`ID_Voucher`),
  KEY `ID_Voucher` (`ID_Voucher`),
  CONSTRAINT `nguoidungvoucher_ibfk_1` FOREIGN KEY (`ID_NguoiDung`) REFERENCES `nguoidung` (`ID_NguoiDung`) ON DELETE CASCADE,
  CONSTRAINT `nguoidungvoucher_ibfk_2` FOREIGN KEY (`ID_Voucher`) REFERENCES `voucher` (`ID_Voucher`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `quanhebanbe`
--

DROP TABLE IF EXISTS `quanhebanbe`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quanhebanbe` (
  `ID_QuanHe` char(36) NOT NULL,
  `ID_NguoiGui` char(36) NOT NULL,
  `ID_NguoiNhan` char(36) NOT NULL,
  `trang_thai` enum('dang_cho','da_dong_y','da_chan') DEFAULT 'dang_cho',
  `thoi_gian_tao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `thoi_gian_cap_nhat` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_QuanHe`),
  UNIQUE KEY `unique_friendship` (`ID_NguoiGui`,`ID_NguoiNhan`),
  KEY `idx_quanhe_nguoinhan` (`ID_NguoiNhan`),
  CONSTRAINT `quanhebanbe_ibfk_1` FOREIGN KEY (`ID_NguoiGui`) REFERENCES `nguoidung` (`ID_NguoiDung`) ON DELETE CASCADE,
  CONSTRAINT `quanhebanbe_ibfk_2` FOREIGN KEY (`ID_NguoiNhan`) REFERENCES `nguoidung` (`ID_NguoiDung`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sukien`
--

DROP TABLE IF EXISTS `sukien`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sukien` (
  `ID_SuKien` char(36) NOT NULL,
  `ID_NguoiTao` char(36) NOT NULL,
  `tieu_de` varchar(255) NOT NULL,
  `mo_ta` text,
  `ngay_dien_ra` datetime DEFAULT NULL,
  `vi_tri` varchar(255) DEFAULT NULL,
  `trang_thai` enum('sap_dien_ra','dang_dien_ra','ket_thuc') DEFAULT 'sap_dien_ra',
  `thoi_gian_tao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_SuKien`),
  KEY `ID_NguoiTao` (`ID_NguoiTao`),
  CONSTRAINT `sukien_ibfk_1` FOREIGN KEY (`ID_NguoiTao`) REFERENCES `nguoidung` (`ID_NguoiDung`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `thanhtoan`
--

DROP TABLE IF EXISTS `thanhtoan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `thanhtoan` (
  `ID_ThanhToan` char(36) NOT NULL,
  `ID_DonHang` char(36) NOT NULL,
  `phuong_thuc` enum('momo','zalopay','cod') DEFAULT 'cod',
  `so_tien` decimal(10,2) DEFAULT NULL,
  `trang_thai` enum('thanh_cong','that_bai') DEFAULT 'that_bai',
  `thoi_gian_thanh_toan` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`ID_ThanhToan`),
  KEY `idx_thanhtoan_donhang` (`ID_DonHang`),
  CONSTRAINT `thanhtoan_ibfk_1` FOREIGN KEY (`ID_DonHang`) REFERENCES `donhang` (`ID_DonHang`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `thongbao`
--

DROP TABLE IF EXISTS `thongbao`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `thongbao` (
  `ID_ThongBao` char(36) NOT NULL,
  `ID_NguoiDung` char(36) NOT NULL,
  `loai` enum('tin_nhan','phan_hoi_bai_dang','cap_nhat_dich_vu','loi_moi_su_kien','voucher_moi','thanh_toan') DEFAULT NULL,
  `noi_dung` varchar(255) DEFAULT NULL,
  `lien_ket` varchar(255) DEFAULT NULL,
  `da_doc` tinyint(1) DEFAULT '0',
  `thoi_gian_tao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_ThongBao`),
  KEY `ID_NguoiDung` (`ID_NguoiDung`),
  CONSTRAINT `thongbao_ibfk_1` FOREIGN KEY (`ID_NguoiDung`) REFERENCES `nguoidung` (`ID_NguoiDung`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tinnhan`
--

DROP TABLE IF EXISTS `tinnhan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tinnhan` (
  `ID_TinNhan` char(36) NOT NULL,
  `ID_NguoiGui` char(36) NOT NULL,
  `ID_NguoiNhan` char(36) NOT NULL,
  `noi_dung` text NOT NULL,
  `thoi_gian_gui` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `da_doc` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`ID_TinNhan`),
  KEY `ID_NguoiNhan` (`ID_NguoiNhan`),
  KEY `idx_tinnhan_gui_nhan` (`ID_NguoiGui`,`ID_NguoiNhan`),
  CONSTRAINT `tinnhan_ibfk_1` FOREIGN KEY (`ID_NguoiGui`) REFERENCES `nguoidung` (`ID_NguoiDung`) ON DELETE CASCADE,
  CONSTRAINT `tinnhan_ibfk_2` FOREIGN KEY (`ID_NguoiNhan`) REFERENCES `nguoidung` (`ID_NguoiDung`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tinnhanai`
--

DROP TABLE IF EXISTS `tinnhanai`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tinnhanai` (
  `ID_TinNhanAI` char(36) NOT NULL,
  `ID_NguoiDung` char(36) NOT NULL,
  `noi_dung_gui` text NOT NULL,
  `noi_dung_tra_loi` text,
  `thoi_gian_gui` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_TinNhanAI`),
  KEY `ID_NguoiDung` (`ID_NguoiDung`),
  CONSTRAINT `tinnhanai_ibfk_1` FOREIGN KEY (`ID_NguoiDung`) REFERENCES `nguoidung` (`ID_NguoiDung`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tonkho`
--

DROP TABLE IF EXISTS `tonkho`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tonkho` (
  `ID_TonKho` char(36) NOT NULL,
  `ID_BaiDang` char(36) NOT NULL,
  `so_luong_con_lai` int DEFAULT '1',
  PRIMARY KEY (`ID_TonKho`),
  KEY `idx_tonkho_baidang` (`ID_BaiDang`),
  CONSTRAINT `tonkho_ibfk_1` FOREIGN KEY (`ID_BaiDang`) REFERENCES `baidang` (`ID_BaiDang`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `voucher`
--

DROP TABLE IF EXISTS `voucher`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `voucher` (
  `ID_Voucher` char(36) NOT NULL,
  `ma_voucher` varchar(20) NOT NULL,
  `mo_ta` text,
  `gia_tri` decimal(10,2) DEFAULT NULL,
  `ngay_bat_dau` date DEFAULT NULL,
  `ngay_ket_thuc` date DEFAULT NULL,
  `so_luong` int DEFAULT NULL,
  `trang_thai` enum('hoat_dong','het_han','het_so_luong') DEFAULT 'hoat_dong',
  `thoi_gian_tao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_Voucher`),
  UNIQUE KEY `ma_voucher` (`ma_voucher`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `xac_thuc_tai_khoan`
--

DROP TABLE IF EXISTS `xac_thuc_tai_khoan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `xac_thuc_tai_khoan` (
  `ID_XacThuc` char(36) NOT NULL,
  `ID_NguoiDung` char(36) NOT NULL,
  `anh_khuon_mat` varchar(255) NOT NULL,
  `anh_cmnd` varchar(255) NOT NULL,
  `trang_thai` enum('cho_duyet','da_duyet','tu_choi') DEFAULT 'cho_duyet',
  `thoi_gian_tao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `thoi_gian_cap_nhat` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_XacThuc`),
  KEY `fk_xacthuc_nguoidung` (`ID_NguoiDung`),
  CONSTRAINT `fk_xacthuc_nguoidung` FOREIGN KEY (`ID_NguoiDung`) REFERENCES `nguoidung` (`ID_NguoiDung`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-28 11:00:57
