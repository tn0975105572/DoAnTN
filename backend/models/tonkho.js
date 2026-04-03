const pool = require("../config/database");
const { v4: uuidv4 } = require("uuid");

const tonkho = {}; // Using an object to hold methods

// Lấy tất cả tonkho
tonkho.getAll = async () => {
  const [rows] = await pool.query("SELECT * FROM tonkho");
  return rows;
};

// Lấy tonkho theo ID
tonkho.getById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM tonkho WHERE ID_TonKho = ?", [id]);
  return rows[0];
};

// Lấy tonkho theo ID bài đăng
tonkho.getByPostId = async (postId) => {
  const [rows] = await pool.query(
    "SELECT ID_TonKho, ID_BaiDang, so_luong_con_lai FROM tonkho WHERE ID_BaiDang = ? ORDER BY ID_TonKho ASC",
    [postId],
  );

  if (!rows.length) {
    return null;
  }

  const totalQuantity = rows.reduce((sum, row) => sum + Number(row.so_luong_con_lai || 0), 0);

  return {
    ...rows[0],
    so_luong_con_lai: totalQuantity,
    duplicate_count: Math.max(0, rows.length - 1),
  };
};

// Thêm tonkho
tonkho.insert = async (data) => {
  const payload = {
    ...data,
    ID_TonKho: data?.ID_TonKho || uuidv4(),
  };
  await pool.query("INSERT INTO tonkho SET ?", [payload]);
  return payload.ID_TonKho;
};

// Cập nhật tonkho
tonkho.update = async (id, data) => {
  const [result] = await pool.query("UPDATE tonkho SET ? WHERE ID_TonKho = ?", [data, id]);
  return result.affectedRows;
};

// Tạo mới hoặc gộp tồn kho theo bài đăng
tonkho.upsertByPostId = async (postId, quantity) => {
  const normalizedQuantity = Math.max(0, Number.parseInt(quantity, 10) || 0);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      "SELECT ID_TonKho FROM tonkho WHERE ID_BaiDang = ? ORDER BY ID_TonKho ASC",
      [postId],
    );

    if (!rows.length) {
      const inventoryId = uuidv4();
      await connection.query(
        "INSERT INTO tonkho (ID_TonKho, ID_BaiDang, so_luong_con_lai) VALUES (?, ?, ?)",
        [inventoryId, postId, normalizedQuantity],
      );
      await connection.commit();

      return {
        ID_TonKho: inventoryId,
        ID_BaiDang: postId,
        so_luong_con_lai: normalizedQuantity,
        created: true,
        removedDuplicates: 0,
      };
    }

    const primaryId = rows[0].ID_TonKho;
    await connection.query("UPDATE tonkho SET so_luong_con_lai = ? WHERE ID_TonKho = ?", [
      normalizedQuantity,
      primaryId,
    ]);

    let removedDuplicates = 0;
    if (rows.length > 1) {
      const duplicateIds = rows.slice(1).map((row) => row.ID_TonKho);
      removedDuplicates = duplicateIds.length;
      const placeholders = duplicateIds.map(() => "?").join(", ");
      await connection.query(`DELETE FROM tonkho WHERE ID_TonKho IN (${placeholders})`, duplicateIds);
    }

    await connection.commit();

    return {
      ID_TonKho: primaryId,
      ID_BaiDang: postId,
      so_luong_con_lai: normalizedQuantity,
      created: false,
      removedDuplicates,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Xóa tonkho
tonkho.delete = async (id) => {
  const [result] = await pool.query("DELETE FROM tonkho WHERE ID_TonKho = ?", [id]);
  return result.affectedRows;
};

module.exports = tonkho;
