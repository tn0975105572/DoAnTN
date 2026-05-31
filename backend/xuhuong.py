import logging
import os
import time

import pandas as pd
from sqlalchemy import create_engine, text


# File này tách riêng thuật toán xu hướng khỏi recommend.py.
# recommend.py giữ nhiệm vụ gợi ý organic; xuhuong.py xử lý bài mua gói đẩy xu hướng.

SO_BAI_XU_HUONG_MOI_NGUOI_DUNG = 12
SO_BAI_TOI_DA_MOI_DANH_MUC = 3
HE_SO_GIAM_THEO_THOI_GIAN = 1.6
DIEM_CONG_DUNG_DANH_MUC_QUAN_TAM = 35
DIEM_LIKE = 4
DIEM_BINH_LUAN = 2


logging.basicConfig(
    filename="xuhuong.log",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)


def tao_chuoi_ket_noi_csdl():
    may_chu = os.getenv("DB_HOST", "localhost")
    nguoi_dung = os.getenv("DB_USER", "root")
    mat_khau = os.getenv("DB_PASS", "12345678")
    ten_csdl = os.getenv("DB_NAME", "sv_cho")
    return f"mysql+mysqlconnector://{nguoi_dung}:{mat_khau}@{may_chu}/{ten_csdl}"


def tao_bang_xu_huong(neu_ket_noi):
    neu_ket_noi.execute(text("""
        CREATE TABLE IF NOT EXISTS goiy_xuhuong (
            ID_NguoiDung CHAR(36) NOT NULL,
            ID_BaiDang CHAR(36) NOT NULL,
            Score DECIMAL(12,4) NOT NULL,
            ID_Boost CHAR(36) NULL,
            ly_do VARCHAR(255) NULL,
            thoi_gian_cap_nhat DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (ID_NguoiDung, ID_BaiDang),
            KEY idx_xuhuong_user_score (ID_NguoiDung, Score),
            KEY idx_xuhuong_post (ID_BaiDang)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    """))


def lay_danh_muc_quan_tam(neu_ket_noi):
    truy_van = """
        SELECT tuong_tac.ID_NguoiDung, b.ID_DanhMuc, COUNT(*) AS do_quan_tam
        FROM (
            SELECT ID_NguoiDung, ID_BaiDang FROM likebaidang
            UNION ALL
            SELECT ID_NguoiDung, ID_BaiDang FROM binhluanbaidang
        ) tuong_tac
        INNER JOIN baidang b ON b.ID_BaiDang = tuong_tac.ID_BaiDang
        WHERE b.ID_DanhMuc IS NOT NULL
        GROUP BY tuong_tac.ID_NguoiDung, b.ID_DanhMuc
        ORDER BY tuong_tac.ID_NguoiDung, do_quan_tam DESC
    """
    du_lieu = pd.read_sql(truy_van, neu_ket_noi)
    ket_qua = {}

    for ma_nguoi_dung, nhom in du_lieu.groupby("ID_NguoiDung"):
        ket_qua[ma_nguoi_dung] = set(nhom.head(5)["ID_DanhMuc"].dropna().tolist())

    return ket_qua


def tinh_diem_hien_thi(bai, danh_muc_quan_tam):
    diem_ca_nhan = (
        DIEM_CONG_DUNG_DANH_MUC_QUAN_TAM
        if bai["ID_DanhMuc"] in danh_muc_quan_tam
        else 0
    )
    diem_goc = (
        float(bai["boost_score"] or 0)
        + float(bai["so_like"] or 0) * DIEM_LIKE
        + float(bai["so_binh_luan"] or 0) * DIEM_BINH_LUAN
        + diem_ca_nhan
    )
    tuoi_boost = max(float(bai["tuoi_boost_gio"] or 0), 0)
    return diem_goc / pow(tuoi_boost + 2, HE_SO_GIAM_THEO_THOI_GIAN)


def chon_bai_theo_gioi_han_danh_muc(danh_sach_bai):
    so_luong_theo_danh_muc = {}
    ket_qua = []

    for bai in danh_sach_bai:
        khoa_danh_muc = bai["ID_DanhMuc"] or "khong_danh_muc"
        so_luong = so_luong_theo_danh_muc.get(khoa_danh_muc, 0)

        if so_luong >= SO_BAI_TOI_DA_MOI_DANH_MUC:
            continue

        so_luong_theo_danh_muc[khoa_danh_muc] = so_luong + 1
        ket_qua.append(bai)

        if len(ket_qua) >= SO_BAI_XU_HUONG_MOI_NGUOI_DUNG:
            break

    return ket_qua


def chay_tinh_xu_huong():
    bat_dau = time.time()
    logging.info("Bắt đầu tính bài xu hướng")

    engine = create_engine(tao_chuoi_ket_noi_csdl())

    try:
        with engine.begin() as ket_noi:
            tao_bang_xu_huong(ket_noi)

            nguoi_dung = pd.read_sql("SELECT ID_NguoiDung FROM nguoidung", ket_noi)
            danh_muc_quan_tam_theo_user = lay_danh_muc_quan_tam(ket_noi)

            truy_van_bai_boost = """
                SELECT
                    bb.ID_Boost,
                    bb.ID_BaiDang,
                    bb.ID_NguoiDung AS ID_ChuBai,
                    bb.boost_score,
                    bb.ket_thuc_luc,
                    GREATEST(TIMESTAMPDIFF(HOUR, bb.bat_dau_luc, NOW()), 0) AS tuoi_boost_gio,
                    b.ID_DanhMuc,
                    COALESCE(like_stats.so_like, 0) AS so_like,
                    COALESCE(comment_stats.so_binh_luan, 0) AS so_binh_luan
                FROM baidang_boost bb
                INNER JOIN baidang b ON b.ID_BaiDang = bb.ID_BaiDang
                LEFT JOIN (
                    SELECT ID_BaiDang, COUNT(*) AS so_like
                    FROM likebaidang
                    GROUP BY ID_BaiDang
                ) like_stats ON like_stats.ID_BaiDang = b.ID_BaiDang
                LEFT JOIN (
                    SELECT ID_BaiDang, COUNT(*) AS so_binh_luan
                    FROM binhluanbaidang
                    GROUP BY ID_BaiDang
                ) comment_stats ON comment_stats.ID_BaiDang = b.ID_BaiDang
                WHERE bb.trang_thai = 'active'
                  AND bb.ket_thuc_luc > NOW()
                  AND b.trang_thai = 'dang_ban'
            """
            bai_boost = pd.read_sql(truy_van_bai_boost, ket_noi)

            ket_noi.execute(text("DELETE FROM goiy_xuhuong"))

            if nguoi_dung.empty or bai_boost.empty:
                logging.info("Không có người dùng hoặc không có bài boost đang hoạt động")
                return

            so_ban_ghi = 0

            for _, user in nguoi_dung.iterrows():
                ma_nguoi_dung = user["ID_NguoiDung"]
                danh_muc_quan_tam = danh_muc_quan_tam_theo_user.get(ma_nguoi_dung, set())

                ung_vien = []
                for _, bai in bai_boost.iterrows():
                    if str(bai["ID_ChuBai"]) == str(ma_nguoi_dung):
                        continue

                    ung_vien.append({
                        "ID_BaiDang": bai["ID_BaiDang"],
                        "ID_Boost": bai["ID_Boost"],
                        "ID_DanhMuc": bai["ID_DanhMuc"],
                        "Score": tinh_diem_hien_thi(bai, danh_muc_quan_tam),
                    })

                ung_vien.sort(key=lambda item: item["Score"], reverse=True)
                bai_duoc_chon = chon_bai_theo_gioi_han_danh_muc(ung_vien)

                for bai in bai_duoc_chon:
                    ket_noi.execute(
                        text("""
                            INSERT INTO goiy_xuhuong
                                (ID_NguoiDung, ID_BaiDang, Score, ID_Boost, ly_do, thoi_gian_cap_nhat)
                            VALUES
                                (:ma_nguoi_dung, :ma_bai_dang, :diem, :ma_boost, :ly_do, NOW())
                        """),
                        {
                            "ma_nguoi_dung": ma_nguoi_dung,
                            "ma_bai_dang": bai["ID_BaiDang"],
                            "diem": bai["Score"],
                            "ma_boost": bai["ID_Boost"],
                            "ly_do": "Bài đang được đẩy xu hướng, có giới hạn slot và cá nhân hóa theo danh mục",
                        },
                    )
                    so_ban_ghi += 1

            logging.info(
                "Đã cập nhật %s bản ghi xu hướng trong %.2f giây",
                so_ban_ghi,
                time.time() - bat_dau,
            )
    finally:
        engine.dispose()


if __name__ == "__main__":
    chay_tinh_xu_huong()
