const pool = require("../config/database");

const binhluanbaidang = {};

// Lấy tất cả bình luận
binhluanbaidang.getAll = async () => {
    const [rows] = await pool.query("SELECT * FROM binhluanbaidang");
    return rows;
};
binhluanbaidang.getbyID_BaiDang = async (id) => {
    const [rows] = await pool.query("SELECT * FROM binhluanbaidang WHERE ID_BaiDang = ?", [id]);
    return rows;
}
binhluanbaidang.getById = async (id) => {
    const [rows] = await pool.query("SELECT * FROM binhluanbaidang WHERE ID_BinhLuan = ?", [id]);
    return rows[0];
};

binhluanbaidang.getCommentTreeByPostId = async (postId) => {
    const sql = `
        WITH RECURSIVE BinhLuanCay AS (
            SELECT *, 0 AS CapDo
            FROM binhluanbaidang
            WHERE ID_BaiDang = ? AND ID_BinhLuanCha IS NULL
            UNION ALL
            SELECT con.*, cha.CapDo + 1
            FROM binhluanbaidang AS con
            JOIN BinhLuanCay AS cha ON con.ID_BinhLuanCha = cha.ID_BinhLuan
        )
        SELECT * FROM BinhLuanCay ORDER BY thoi_gian_binh_luan ASC;
    `;
    const [rows] = await pool.query(sql, [postId]);
    return rows;
};

binhluanbaidang.insert = async (data) => {
    const [result] = await pool.query("INSERT INTO binhluanbaidang SET ?", [data]);
    return result;
};

// Cập nhật bình luận
binhluanbaidang.update = async (id, data) => {
    const [result] = await pool.query("UPDATE binhluanbaidang SET ? WHERE ID_BinhLuan = ?", [data, id]);
    return result.affectedRows;
};

// Xóa bình luận
binhluanbaidang.delete = async (id) => {
    const [result] = await pool.query("DELETE FROM binhluanbaidang WHERE ID_BinhLuan = ?", [id]);
    return result.affectedRows;
};

module.exports = binhluanbaidang;