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
  `ID` char(36) NOT NULL DEFAULT (uuid()),
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
-- Table structure for table `group_chat`
--

DROP TABLE IF EXISTS `group_chat`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `group_chat` (
  `ID_GroupChat` char(36) NOT NULL,
  `ten_group` varchar(255) NOT NULL,
  `mo_ta` text,
  `anh_dai_dien` varchar(255) DEFAULT NULL,
  `ID_NguoiTao` char(36) NOT NULL,
  `so_thanh_vien` int DEFAULT '1',
  `trang_thai` enum('hoat_dong','khoa','xoa') DEFAULT 'hoat_dong',
  `thoi_gian_tao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_GroupChat`),
  KEY `idx_group_nguoitao` (`ID_NguoiTao`),
  KEY `idx_group_trangthai` (`trang_thai`),
  CONSTRAINT `group_chat_ibfk_1` FOREIGN KEY (`ID_NguoiTao`) REFERENCES `nguoidung` (`ID_NguoiDung`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `likebaidang`
--

DROP TABLE IF EXISTS `likebaidang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `likebaidang` (
  `ID_Like` char(36) NOT NULL DEFAULT (uuid()),
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
-- Table structure for table `thanh_vien_group`
--

DROP TABLE IF EXISTS `thanh_vien_group`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `thanh_vien_group` (
  `ID_ThanhVien` char(36) NOT NULL,
  `ID_GroupChat` char(36) NOT NULL,
  `ID_NguoiDung` char(36) NOT NULL,
  `vai_tro` enum('admin','member') DEFAULT 'member',
  `trang_thai` enum('active','left') DEFAULT 'active',
  `thoi_gian_tham_gia` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_ThanhVien`),
  UNIQUE KEY `unique_member_group` (`ID_GroupChat`,`ID_NguoiDung`),
  KEY `idx_thanhvien_group` (`ID_GroupChat`),
  KEY `idx_thanhvien_nguoidung` (`ID_NguoiDung`),
  CONSTRAINT `thanh_vien_group_ibfk_1` FOREIGN KEY (`ID_GroupChat`) REFERENCES `group_chat` (`ID_GroupChat`) ON DELETE CASCADE,
  CONSTRAINT `thanh_vien_group_ibfk_2` FOREIGN KEY (`ID_NguoiDung`) REFERENCES `nguoidung` (`ID_NguoiDung`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `update_group_member_count_insert` AFTER INSERT ON `thanh_vien_group` FOR EACH ROW BEGIN
    UPDATE `group_chat` 
    SET `so_thanh_vien` = `so_thanh_vien` + 1 
    WHERE `ID_GroupChat` = NEW.`ID_GroupChat`;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `update_group_member_count_delete` AFTER DELETE ON `thanh_vien_group` FOR EACH ROW BEGIN
    UPDATE `group_chat` 
    SET `so_thanh_vien` = GREATEST(`so_thanh_vien` - 1, 1) 
    WHERE `ID_GroupChat` = OLD.`ID_GroupChat`;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

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
  `ID_GroupChat` char(36) DEFAULT NULL,
  `ID_NguoiGui` char(36) NOT NULL,
  `ID_NguoiNhan` char(36) DEFAULT NULL,
  `noi_dung` text NOT NULL,
  `loai_tin_nhan` enum('text','image','file') DEFAULT 'text',
  `tin_nhan_phu_thuoc` char(36) DEFAULT NULL,
  `trang_thai` enum('da_gui','da_nhan','da_doc') DEFAULT 'da_gui',
  `da_xoa_gui` tinyint(1) DEFAULT '0',
  `thoi_gian_gui` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `thoi_gian_doc` timestamp NULL DEFAULT NULL,
  `file_dinh_kem` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`ID_TinNhan`),
  KEY `ID_GroupChat` (`ID_GroupChat`),
  KEY `ID_NguoiNhan` (`ID_NguoiNhan`),
  KEY `idx_tinnhan_gui_nhan` (`ID_NguoiGui`,`ID_NguoiNhan`),
  KEY `idx_tinnhan_phu_thuoc` (`tin_nhan_phu_thuoc`),
  KEY `idx_tinnhan_group` (`ID_GroupChat`),
  CONSTRAINT `tinnhan_ibfk_1` FOREIGN KEY (`ID_NguoiGui`) REFERENCES `nguoidung` (`ID_NguoiDung`) ON DELETE CASCADE,
  CONSTRAINT `tinnhan_ibfk_2` FOREIGN KEY (`ID_NguoiNhan`) REFERENCES `nguoidung` (`ID_NguoiDung`) ON DELETE CASCADE,
  CONSTRAINT `tinnhan_ibfk_3` FOREIGN KEY (`tin_nhan_phu_thuoc`) REFERENCES `tinnhan` (`ID_TinNhan`) ON DELETE SET NULL,
  CONSTRAINT `tinnhan_ibfk_4` FOREIGN KEY (`ID_GroupChat`) REFERENCES `group_chat` (`ID_GroupChat`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tinnhan_backup`
--

DROP TABLE IF EXISTS `tinnhan_backup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tinnhan_backup` (
  `ID_TinNhan` char(36) NOT NULL,
  `ID_NguoiGui` char(36) NOT NULL,
  `ID_NguoiNhan` char(36) NOT NULL,
  `noi_dung` text NOT NULL,
  `thoi_gian_gui` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `da_doc` tinyint(1) DEFAULT '0'
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
-- Temporary view structure for view `v_group_nguoi_dung`
--

DROP TABLE IF EXISTS `v_group_nguoi_dung`;
/*!50001 DROP VIEW IF EXISTS `v_group_nguoi_dung`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_group_nguoi_dung` AS SELECT 
 1 AS `ID_GroupChat`,
 1 AS `ten_group`,
 1 AS `mo_ta`,
 1 AS `anh_dai_dien`,
 1 AS `so_thanh_vien`,
 1 AS `vai_tro`,
 1 AS `trang_thai_thanh_vien`,
 1 AS `thoi_gian_tham_gia`,
 1 AS `tin_nhan_cuoi`,
 1 AS `thoi_gian_tin_nhan_cuoi`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_tinnhan_chi_tiet`
--

DROP TABLE IF EXISTS `v_tinnhan_chi_tiet`;
/*!50001 DROP VIEW IF EXISTS `v_tinnhan_chi_tiet`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_tinnhan_chi_tiet` AS SELECT 
 1 AS `ID_TinNhan`,
 1 AS `ID_GroupChat`,
 1 AS `ID_NguoiGui`,
 1 AS `ID_NguoiNhan`,
 1 AS `noi_dung`,
 1 AS `loai_tin_nhan`,
 1 AS `tin_nhan_phu_thuoc`,
 1 AS `trang_thai`,
 1 AS `da_xoa_gui`,
 1 AS `thoi_gian_gui`,
 1 AS `thoi_gian_doc`,
 1 AS `file_dinh_kem`,
 1 AS `ten_nguoi_gui`,
 1 AS `anh_nguoi_gui`,
 1 AS `ten_nguoi_nhan`,
 1 AS `ten_group`,
 1 AS `anh_group`,
 1 AS `noi_dung_reply`,
 1 AS `ten_nguoi_reply`,
 1 AS `loai_chat`*/;
SET character_set_client = @saved_cs_client;

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

--
-- Dumping events for database 'sv_cho'
--

--
-- Dumping routines for database 'sv_cho'
--
/*!50003 DROP PROCEDURE IF EXISTS `AddMemberToGroup` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `AddMemberToGroup`(
    IN p_group_id CHAR(36),
    IN p_user_id CHAR(36),
    IN p_added_by CHAR(36)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Kiểm tra quyền thêm thành viên (chỉ admin)
    IF EXISTS (
        SELECT 1 FROM thanh_vien_group 
        WHERE ID_GroupChat = p_group_id 
        AND ID_NguoiDung = p_added_by 
        AND vai_tro = 'admin'
    ) THEN
        -- Thêm thành viên
        INSERT INTO `thanh_vien_group` (`ID_ThanhVien`, `ID_GroupChat`, `ID_NguoiDung`)
        VALUES (UUID(), p_group_id, p_user_id)
        ON DUPLICATE KEY UPDATE trang_thai = 'active';
        
        SELECT 'SUCCESS' as result;
    ELSE
        SELECT 'NO_PERMISSION' as result;
    END IF;
    
    COMMIT;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `CreateGroupChat` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `CreateGroupChat`(
    IN p_ten_group VARCHAR(255),
    IN p_mo_ta TEXT,
    IN p_ID_NguoiTao CHAR(36)
)
BEGIN
    DECLARE v_group_id CHAR(36);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Tạo group chat
    SET v_group_id = UUID();
    INSERT INTO `group_chat` (`ID_GroupChat`, `ten_group`, `mo_ta`, `ID_NguoiTao`)
    VALUES (v_group_id, p_ten_group, p_mo_ta, p_ID_NguoiTao);
    
    -- Thêm người tạo làm admin
    INSERT INTO `thanh_vien_group` (`ID_ThanhVien`, `ID_GroupChat`, `ID_NguoiDung`, `vai_tro`)
    VALUES (UUID(), v_group_id, p_ID_NguoiTao, 'admin');
    
    COMMIT;
    SELECT v_group_id AS group_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `GetGroupMessages` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `GetGroupMessages`(
    IN p_group_id CHAR(36),
    IN p_user_id CHAR(36),
    IN p_limit INT,
    IN p_offset INT
)
BEGIN
    -- Gán giá trị mặc định nếu null
    IF p_limit IS NULL OR p_limit <= 0 THEN
        SET p_limit = 50;
    END IF;

    IF p_offset IS NULL OR p_offset < 0 THEN
        SET p_offset = 0;
    END IF;

    -- Kiểm tra user có trong group không
    IF EXISTS (
        SELECT 1 FROM thanh_vien_group 
        WHERE ID_GroupChat = p_group_id 
          AND ID_NguoiDung = p_user_id 
          AND trang_thai = 'active'
    ) THEN
        SELECT 
            t.ID_TinNhan,
            t.ID_GroupChat,
            t.ID_NguoiGui,
            t.noi_dung,
            t.loai_tin_nhan,
            t.tin_nhan_phu_thuoc,
            t.trang_thai,
            t.da_xoa_gui,
            t.thoi_gian_gui,
            t.thoi_gian_doc,
            t.file_dinh_kem,
            u.ho_ten AS ten_nguoi_gui,
            u.anh_dai_dien AS anh_nguoi_gui,
            t_reply.noi_dung AS noi_dung_reply
        FROM tinnhan t
        LEFT JOIN nguoidung u ON t.ID_NguoiGui = u.ID_NguoiDung
        LEFT JOIN tinnhan t_reply ON t.tin_nhan_phu_thuoc = t_reply.ID_TinNhan
        WHERE t.ID_GroupChat = p_group_id 
          AND t.da_xoa_gui = 0
        ORDER BY t.thoi_gian_gui DESC
        LIMIT p_limit OFFSET p_offset;
    ELSE
        SELECT 'NOT_MEMBER' AS error;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Final view structure for view `v_group_nguoi_dung`
--

/*!50001 DROP VIEW IF EXISTS `v_group_nguoi_dung`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_group_nguoi_dung` AS select `g`.`ID_GroupChat` AS `ID_GroupChat`,`g`.`ten_group` AS `ten_group`,`g`.`mo_ta` AS `mo_ta`,`g`.`anh_dai_dien` AS `anh_dai_dien`,`g`.`so_thanh_vien` AS `so_thanh_vien`,`tv`.`vai_tro` AS `vai_tro`,`tv`.`trang_thai` AS `trang_thai_thanh_vien`,`tv`.`thoi_gian_tham_gia` AS `thoi_gian_tham_gia`,(select `t`.`noi_dung` from `tinnhan` `t` where (`t`.`ID_GroupChat` = `g`.`ID_GroupChat`) order by `t`.`thoi_gian_gui` desc limit 1) AS `tin_nhan_cuoi`,(select `t`.`thoi_gian_gui` from `tinnhan` `t` where (`t`.`ID_GroupChat` = `g`.`ID_GroupChat`) order by `t`.`thoi_gian_gui` desc limit 1) AS `thoi_gian_tin_nhan_cuoi` from (`group_chat` `g` join `thanh_vien_group` `tv` on((`g`.`ID_GroupChat` = `tv`.`ID_GroupChat`))) where (`tv`.`trang_thai` = 'active') */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_tinnhan_chi_tiet`
--

/*!50001 DROP VIEW IF EXISTS `v_tinnhan_chi_tiet`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_tinnhan_chi_tiet` AS select `t`.`ID_TinNhan` AS `ID_TinNhan`,`t`.`ID_GroupChat` AS `ID_GroupChat`,`t`.`ID_NguoiGui` AS `ID_NguoiGui`,`t`.`ID_NguoiNhan` AS `ID_NguoiNhan`,`t`.`noi_dung` AS `noi_dung`,`t`.`loai_tin_nhan` AS `loai_tin_nhan`,`t`.`tin_nhan_phu_thuoc` AS `tin_nhan_phu_thuoc`,`t`.`trang_thai` AS `trang_thai`,`t`.`da_xoa_gui` AS `da_xoa_gui`,`t`.`thoi_gian_gui` AS `thoi_gian_gui`,`t`.`thoi_gian_doc` AS `thoi_gian_doc`,`t`.`file_dinh_kem` AS `file_dinh_kem`,`u_gui`.`ho_ten` AS `ten_nguoi_gui`,`u_gui`.`anh_dai_dien` AS `anh_nguoi_gui`,`u_nhan`.`ho_ten` AS `ten_nguoi_nhan`,`g`.`ten_group` AS `ten_group`,`g`.`anh_dai_dien` AS `anh_group`,`t_reply`.`noi_dung` AS `noi_dung_reply`,`u_reply`.`ho_ten` AS `ten_nguoi_reply`,(case when (`t`.`ID_GroupChat` is not null) then 'group' else 'private' end) AS `loai_chat` from (((((`tinnhan` `t` left join `nguoidung` `u_gui` on((`t`.`ID_NguoiGui` = `u_gui`.`ID_NguoiDung`))) left join `nguoidung` `u_nhan` on((`t`.`ID_NguoiNhan` = `u_nhan`.`ID_NguoiDung`))) left join `group_chat` `g` on((`t`.`ID_GroupChat` = `g`.`ID_GroupChat`))) left join `tinnhan` `t_reply` on((`t`.`tin_nhan_phu_thuoc` = `t_reply`.`ID_TinNhan`))) left join `nguoidung` `u_reply` on((`t_reply`.`ID_NguoiGui` = `u_reply`.`ID_NguoiDung`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-07 14:39:25
