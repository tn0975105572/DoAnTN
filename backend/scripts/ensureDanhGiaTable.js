const pool = require("../config/database");

const createDanhGiaTableSql = `
  CREATE TABLE IF NOT EXISTS danhgia (
    ID_DanhGia char(36) NOT NULL,
    ID_NguoiDanhGia char(36) NOT NULL,
    doi_tuong_id char(36) NOT NULL,
    loai enum('nguoi_dung','bai_dang','dich_vu_thue') NOT NULL,
    diem_so int DEFAULT NULL,
    binh_luan text,
    thoi_gian_tao timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ID_DanhGia),
    KEY ID_NguoiDanhGia (ID_NguoiDanhGia),
    KEY idx_danhgia_loai_doituong (loai, doi_tuong_id),
    CONSTRAINT danhgia_ibfk_1 FOREIGN KEY (ID_NguoiDanhGia) REFERENCES nguoidung (ID_NguoiDung) ON DELETE CASCADE,
    CONSTRAINT danhgia_chk_1 CHECK ((diem_so between 1 and 5))
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
`;

async function main() {
  await pool.query(createDanhGiaTableSql);
  const [rows] = await pool.query("SHOW TABLES LIKE 'danhgia'");

  if (!rows.length) {
    throw new Error("Khong tao duoc bang danhgia.");
  }

  console.log("ensureDanhGiaTable: ok");
  process.exit(0);
}

main().catch((error) => {
  console.error("ensureDanhGiaTable:", error.message);
  process.exit(1);
});
