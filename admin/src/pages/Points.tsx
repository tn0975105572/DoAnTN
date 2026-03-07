import { useState, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { pointsAPI, userAPI } from '../services/api';
import './Points.css';

interface PointHistory {
  ID_LichSu: string;
  ID_NguoiDung: string;
  loai_giao_dich: string;
  diem_thay_doi: number;
  diem_truoc: number;
  diem_sau: number;
  mo_ta: string;
  thoi_gian_tao: string;
  ho_ten?: string;
}

const Points = () => {
  const [history, setHistory] = useState<PointHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [pointAmount, setPointAmount] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [historyRes, usersRes] = await Promise.all([
        pointsAPI.getHistory(),
        userAPI.getAll(),
      ]);
      setHistory(historyRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser || !pointAmount) {
      alert('Vui lòng điền đầy đủ thông tin!');
      return;
    }

    try {
      await pointsAPI.addPoints({
        userId: selectedUser,
        pointChange: parseInt(pointAmount),
        transactionType: 'tang_diem',
        description: description || 'Admin cộng điểm thủ công',
      });

      alert('Cộng điểm thành công!');
      setShowAddModal(false);
      setSelectedUser('');
      setPointAmount('');
      setDescription('');
      loadData();
    } catch (error) {
      console.error('Error adding points:', error);
      alert('Không thể cộng điểm!');
    }
  };

  const filteredHistory = history.filter(item =>
    item.mo_ta?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.ho_ten?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="points-page">
      <div className="page-header">
        <h2 className="page-title">Quản lý điểm số</h2>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} />
          Cộng điểm
        </button>
      </div>

      <div className="page-toolbar">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Tìm kiếm giao dịch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-info">
          Hiển thị <strong>{filteredHistory.length}</strong> / {history.length} giao dịch
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Người dùng</th>
              <th>Loại giao dịch</th>
              <th>Mô tả</th>
              <th>Điểm trước</th>
              <th>Thay đổi</th>
              <th>Điểm sau</th>
              <th>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.map((item) => (
              <tr key={item.ID_LichSu}>
                <td>{item.ho_ten || 'N/A'}</td>
                <td>
                  <span className="transaction-type">
                    {item.loai_giao_dich}
                  </span>
                </td>
                <td>{item.mo_ta}</td>
                <td>{item.diem_truoc}</td>
                <td className="points-change">
                  <span className={item.diem_thay_doi > 0 ? 'positive' : 'negative'}>
                    {item.diem_thay_doi > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    {item.diem_thay_doi > 0 ? '+' : ''}{item.diem_thay_doi}
                  </span>
                </td>
                <td className="points-total">{item.diem_sau}</td>
                <td>{new Date(item.thoi_gian_tao).toLocaleString('vi-VN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Points Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cộng điểm cho người dùng</h3>
              <button onClick={() => setShowAddModal(false)} className="modal-close">×</button>
            </div>
            <form onSubmit={handleAddPoints} className="modal-body">
              <div className="form-group">
                <label>Chọn người dùng</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  required
                >
                  <option value="">-- Chọn người dùng --</option>
                  {users.map(user => (
                    <option key={user.ID_NguoiDung} value={user.ID_NguoiDung}>
                      {user.ho_ten} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Số điểm</label>
                <input
                  type="number"
                  value={pointAmount}
                  onChange={(e) => setPointAmount(e.target.value)}
                  placeholder="Nhập số điểm (âm để trừ)"
                  required
                />
              </div>

              <div className="form-group">
                <label>Mô tả</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Lý do cộng/trừ điểm"
                  rows={3}
                />
              </div>

              <button type="submit" className="btn-submit">
                Xác nhận
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Points;







