import { useState, useEffect } from 'react';
import { Search, Edit, Trash2, UserPlus, Eye, CheckCircle, XCircle } from 'lucide-react';
import { userAPI } from '../services/api';
import './Users.css';

interface User {
  ID_NguoiDung: string;
  ten_dang_nhap: string;
  email: string;
  ho_ten: string;
  diem_so: number;
  da_xac_thuc: number;
  vi_tri: string | null;
  thoi_gian_tao: string;
  truong_hoc?: string;
  que_quan?: string;
  anh_dai_dien?: string;
}

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    ho_ten: '',
    email: '',
    truong_hoc: '',
    que_quan: '',
    vi_tri: '',
    da_xac_thuc: 1
  });

  // Add user modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    ten_dang_nhap: '',
    mat_khau: '',
    email: '',
    ho_ten: '',
    truong_hoc: '',
    que_quan: '',
    vi_tri: '',
    da_xac_thuc: 1,
    anh_dai_dien: ''
  });
  const [addFormErrors, setAddFormErrors] = useState<{[key: string]: string}>({});
  
  // Avatar and location state
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [avatarFilename, setAvatarFilename] = useState<string>('');
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [address, setAddress] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadUsers();
  }, [currentPage, pageSize]);

  // Load provinces data
  useEffect(() => {
    const loadProvinces = async () => {
      try {
        const response = await fetch('https://provinces.open-api.vn/api/p/');
        const data = await response.json();
        setProvinces(data);
      } catch (error) {
        console.error('Error loading provinces:', error);
      }
    };
    loadProvinces();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getAll(currentPage, pageSize);
      console.log('API Response:', response.data);
      setUsers(response.data.data || response.data);
      setTotalPages(response.data.totalPages || 1);
      setTotalUsers(response.data.total || 0);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa người dùng này?')) return;

    try {
      await userAPI.delete(id);
      setUsers(users.filter(u => u.ID_NguoiDung !== id));
      alert('Xóa người dùng thành công!');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Không thể xóa người dùng!');
    }
  };

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditForm({
      ho_ten: user.ho_ten || '',
      email: user.email || '',
      truong_hoc: user.truong_hoc || '',
      que_quan: user.que_quan || '',
      vi_tri: user.vi_tri || '',
      da_xac_thuc: user.da_xac_thuc || 1
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      const response = await userAPI.update(editingUser.ID_NguoiDung, editForm);
      if (response.data.success) {
        // Cập nhật danh sách users
        setUsers(users.map(u => 
          u.ID_NguoiDung === editingUser.ID_NguoiDung 
            ? { ...u, ...editForm }
            : u
        ));
        setShowEditModal(false);
        setEditingUser(null);
        alert('Cập nhật thông tin thành công!');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Không thể cập nhật thông tin!');
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingUser(null);
    setEditForm({
      ho_ten: '',
      email: '',
      truong_hoc: '',
      que_quan: '',
      vi_tri: '',
      da_xac_thuc: 1
    });
  };

  // Add user functions
  const handleAddUser = () => {
    setShowAddModal(true);
    setAddForm({
      ten_dang_nhap: '',
      mat_khau: '',
      email: '',
      ho_ten: '',
      truong_hoc: '',
      que_quan: '',
      vi_tri: '',
      da_xac_thuc: 1,
      anh_dai_dien: ''
    });
    setAddFormErrors({});
    setSelectedAvatar(null);
    setAvatarFilename('');
    setSelectedProvince('');
    setSelectedDistrict('');
    setDistricts([]);
    setAddress('');
  };

  const validateAddForm = () => {
    const errors: {[key: string]: string} = {};

    if (!addForm.ten_dang_nhap.trim()) {
      errors.ten_dang_nhap = 'Tên đăng nhập là bắt buộc';
    }

    if (!addForm.mat_khau.trim()) {
      errors.mat_khau = 'Mật khẩu là bắt buộc';
    } else if (addForm.mat_khau.length < 6) {
      errors.mat_khau = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    if (!addForm.email.trim()) {
      errors.email = 'Email là bắt buộc';
    } else if (!/\S+@\S+\.\S+/.test(addForm.email)) {
      errors.email = 'Email không hợp lệ';
    }

    if (!addForm.ho_ten.trim()) {
      errors.ho_ten = 'Họ tên là bắt buộc';
    }

    setAddFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveAdd = async () => {
    if (!validateAddForm()) return;

    try {
      // Prepare location data
      const provinceName = provinces.find(p => p.code.toString() === selectedProvince)?.name || '';
      const districtName = districts.find(d => d.name === selectedDistrict)?.name || '';
      const fullLocation = [address, districtName, provinceName].filter(Boolean).join(', ');

      // Prepare form data with location
      const formData = {
        ...addForm,
        que_quan: fullLocation,
        vi_tri: fullLocation,
        anh_dai_dien: avatarFilename || 'default-avatar.jpg'
      };

      const response = await userAPI.create(formData);
      if (response.data.success) {
        setShowAddModal(false);
        setAddForm({
          ten_dang_nhap: '',
          mat_khau: '',
          email: '',
          ho_ten: '',
          truong_hoc: '',
          que_quan: '',
          vi_tri: '',
          da_xac_thuc: 1,
          anh_dai_dien: ''
        });
        setAddFormErrors({});
        setSelectedAvatar(null);
        setAvatarFilename('');
        setSelectedProvince('');
        setSelectedDistrict('');
        setDistricts([]);
        setAddress('');
        alert('Thêm người dùng thành công!');
        loadUsers(); // Reload users list
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Không thể thêm người dùng!');
    }
  };

  const handleCancelAdd = () => {
    setShowAddModal(false);
    setAddForm({
      ten_dang_nhap: '',
      mat_khau: '',
      email: '',
      ho_ten: '',
      truong_hoc: '',
      que_quan: '',
      vi_tri: '',
      da_xac_thuc: 1,
      anh_dai_dien: ''
    });
    setAddFormErrors({});
    setSelectedAvatar(null);
    setAvatarFilename('');
    setSelectedProvince('');
    setSelectedDistrict('');
    setDistricts([]);
    setAddress('');
  };

  // Avatar upload function
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Show preview immediately
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedAvatar(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload file to server
      try {
        const formData = new FormData();
        formData.append('avatar', file);

        const response = await fetch('http://localhost:3000/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          // Store the filename for database, but keep full URL for preview
          setSelectedAvatar(data.imageUrl); // Full URL for preview
          setAvatarFilename(data.filename); // Filename for database
        } else {
          console.error('Upload failed');
          alert('Không thể upload ảnh. Vui lòng thử lại.');
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert('Lỗi khi upload ảnh.');
      }
    }
  };

  // Province change handler
  const handleProvinceChange = async (provinceCode: string) => {
    setSelectedProvince(provinceCode);
    setSelectedDistrict('');
    setDistricts([]);
    
    if (provinceCode) {
      try {
        const response = await fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`);
        const data = await response.json();
        setDistricts(data.districts || []);
      } catch (error) {
        console.error('Error loading districts:', error);
      }
    }
  };

  // Helper function to get image URL
  const getImageUrl = (imagePath: string) => {
    // Check if it's an external URL (starts with http/https)
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    // Otherwise, it's a local file
    return `http://localhost:3000/uploads/${imagePath}`;
  };

  const filteredUsers = users.filter(user =>
    user.ho_ten?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.ten_dang_nhap?.toLowerCase().includes(searchTerm.toLowerCase())
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
    <div className="users-page">
      <div className="page-header">
        <h2 className="page-title">Quản lý người dùng</h2>
        <button className="btn-primary" onClick={handleAddUser}>
          <UserPlus size={18} />
          Thêm người dùng
        </button>
      </div>

      <div className="page-toolbar">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Tìm kiếm người dùng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-info">
          Hiển thị <strong>{users.length}</strong> / {totalUsers} người dùng
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Họ tên</th>
              <th>Email</th>
              <th>Tên đăng nhập</th>
              <th>Điểm</th>
              <th>Vị trí</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.ID_NguoiDung}>
                <td>{user.ho_ten || 'N/A'}</td>
                <td>{user.email}</td>
                <td>{user.ten_dang_nhap}</td>
                <td className="points-cell">{user.diem_so || 0}</td>
                <td>
                  <span className={`badge badge-${user.vi_tri ? 'user' : 'admin'}`}>
                    {user.vi_tri || 'N/A'}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${user.da_xac_thuc === 1 ? 'active' : 'inactive'}`}>
                    {user.da_xac_thuc === 1 ? (
                      <>
                        <CheckCircle size={14} />
                        Đã xác thực
                      </>
                    ) : (
                      <>
                        <XCircle size={14} />
                        Chưa xác thực
                      </>
                    )}
                  </span>
                </td>
                <td>{new Date(user.thoi_gian_tao).toLocaleDateString('vi-VN')}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn-icon btn-view"
                      onClick={() => handleViewDetails(user)}
                      title="Xem chi tiết"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      className="btn-icon btn-edit"
                      onClick={() => handleEdit(user)}
                      title="Chỉnh sửa"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="btn-icon btn-delete"
                      onClick={() => handleDelete(user.ID_NguoiDung)}
                      title="Xóa"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination-container">
        <div className="pagination-info">
          <span>Trang {currentPage} / {totalPages}</span>
          <select 
            value={pageSize} 
            onChange={(e) => {
              setPageSize(parseInt(e.target.value));
              setCurrentPage(1);
            }}
            className="page-size-select"
          >
            <option value={5}>5 / trang</option>
            <option value={10}>10 / trang</option>
            <option value={20}>20 / trang</option>
            <option value={50}>50 / trang</option>
          </select>
        </div>
        
        <div className="pagination-buttons">
          <button 
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            Đầu
          </button>
          <button 
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            Trước
          </button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
            if (pageNum > totalPages) return null;
            
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
              >
                {pageNum}
              </button>
            );
          })}
          
          <button 
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            Sau
          </button>
          <button 
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            Cuối
          </button>
        </div>
      </div>

      {/* User Details Modal */}
      {showModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chi tiết người dùng</h3>
              <button onClick={() => setShowModal(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <div className="user-detail-grid">
                {/* Left Column - Avatar and Basic Info */}
                <div className="detail-column">
                  <div className="avatar-section">
                    <div className="avatar-large">
                      {selectedUser.anh_dai_dien ? (
                        <img 
                          src={getImageUrl(selectedUser.anh_dai_dien)} 
                          alt="Avatar" 
                          className="avatar-large-image"
                          onError={(e) => {
                            e.currentTarget.src = 'https://i.pravatar.cc/150?img=45';
                          }}
                        />
                      ) : (
                        <div className="avatar-placeholder-large">
                          <span>Chưa có ảnh</span>
                        </div>
                      )}
                    </div>
                    <div className="user-status">
                      <span className={`status-badge ${selectedUser.da_xac_thuc === 1 ? 'active' : 'inactive'}`}>
                        {selectedUser.da_xac_thuc === 1 ? (
                          <>
                            <CheckCircle size={16} />
                            Đã xác thực
                          </>
                        ) : (
                          <>
                            <XCircle size={16} />
                            Chưa xác thực
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Thông tin cơ bản</h4>
                    <div className="detail-row">
                      <span className="detail-label">ID:</span>
                      <span className="detail-value">{selectedUser.ID_NguoiDung}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Họ tên:</span>
                      <span className="detail-value">{selectedUser.ho_ten || 'N/A'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">{selectedUser.email}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Tên đăng nhập:</span>
                      <span className="detail-value">{selectedUser.ten_dang_nhap}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Điểm số:</span>
                      <span className="detail-value points">{selectedUser.diem_so || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Right Column - Additional Info */}
                <div className="detail-column">
                  <div className="detail-section">
                    <h4>Thông tin bổ sung</h4>
                    <div className="detail-row">
                      <span className="detail-label">Trường học:</span>
                      <span className="detail-value">{selectedUser.truong_hoc || 'N/A'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Vị trí:</span>
                      <span className="detail-value">{selectedUser.vi_tri || 'N/A'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Quê quán:</span>
                      <span className="detail-value">{selectedUser.que_quan || 'N/A'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Ngày tạo:</span>
                      <span className="detail-value">
                        {new Date(selectedUser.thoi_gian_tao).toLocaleDateString('vi-VN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Thống kê</h4>
                    <div className="stats-grid">
                      <div className="stat-item">
                        <div className="stat-value">{selectedUser.diem_so || 0}</div>
                        <div className="stat-label">Điểm hiện tại</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-value">{selectedUser.da_xac_thuc === 1 ? 'Có' : 'Không'}</div>
                        <div className="stat-label">Xác thực</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="modal-overlay" onClick={handleCancelEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chỉnh sửa thông tin người dùng</h3>
              <button onClick={handleCancelEdit} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Họ tên:</label>
                <input
                  type="text"
                  value={editForm.ho_ten}
                  onChange={(e) => setEditForm({...editForm, ho_ten: e.target.value})}
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  className="form-input"
                />
              </div>


              <div className="form-group">
                <label>Trường học:</label>
                <input
                  type="text"
                  value={editForm.truong_hoc}
                  onChange={(e) => setEditForm({...editForm, truong_hoc: e.target.value})}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Quê quán:</label>
                <input
                  type="text"
                  value={editForm.que_quan}
                  onChange={(e) => setEditForm({...editForm, que_quan: e.target.value})}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Vị trí:</label>
                <select
                  value={editForm.vi_tri}
                  onChange={(e) => setEditForm({...editForm, vi_tri: e.target.value})}
                  className="form-input"
                >
                  <option value="">Chọn vị trí</option>
                  <option value="Sinh viên">Sinh viên</option>
                  <option value="Nhân viên">Nhân viên</option>
                  <option value="Giảng viên">Giảng viên</option>
                  <option value="Ra Trường">Ra Trường</option>
                </select>
              </div>

              <div className="form-group">
                <label>Trạng thái xác thực:</label>
                <select
                  value={editForm.da_xac_thuc}
                  onChange={(e) => setEditForm({...editForm, da_xac_thuc: parseInt(e.target.value)})}
                  className="form-input"
                >
                  <option value={1}>Đã xác thực</option>
                  <option value={0}>Chưa xác thực</option>
                </select>
              </div>

              <div className="modal-actions">
                <button onClick={handleCancelEdit} className="btn-secondary">
                  Hủy
                </button>
                <button onClick={handleSaveEdit} className="btn-primary">
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={handleCancelAdd}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Thêm người dùng mới</h3>
              <button onClick={handleCancelAdd} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                {/* Left Column */}
                <div className="form-column">
                  <div className="form-group">
                    <label>Họ tên: <span className="required">*</span></label>
                    <input
                      type="text"
                      value={addForm.ho_ten}
                      onChange={(e) => setAddForm({...addForm, ho_ten: e.target.value})}
                      className={`form-input ${addFormErrors.ho_ten ? 'error' : ''}`}
                      placeholder="Nhập họ và tên"
                    />
                    {addFormErrors.ho_ten && <span className="error-message">{addFormErrors.ho_ten}</span>}
                  </div>

                  <div className="form-group">
                    <label>Email: <span className="required">*</span></label>
                    <input
                      type="email"
                      value={addForm.email}
                      onChange={(e) => setAddForm({...addForm, email: e.target.value})}
                      className={`form-input ${addFormErrors.email ? 'error' : ''}`}
                      placeholder="Nhập email"
                    />
                    {addFormErrors.email && <span className="error-message">{addFormErrors.email}</span>}
                  </div>

                  <div className="form-group">
                    <label>Tên đăng nhập: <span className="required">*</span></label>
                    <input
                      type="text"
                      value={addForm.ten_dang_nhap}
                      onChange={(e) => setAddForm({...addForm, ten_dang_nhap: e.target.value})}
                      className={`form-input ${addFormErrors.ten_dang_nhap ? 'error' : ''}`}
                      placeholder="Nhập tên đăng nhập"
                    />
                    {addFormErrors.ten_dang_nhap && <span className="error-message">{addFormErrors.ten_dang_nhap}</span>}
                  </div>

                  <div className="form-group">
                    <label>Mật khẩu: <span className="required">*</span></label>
                    <input
                      type="password"
                      value={addForm.mat_khau}
                      onChange={(e) => setAddForm({...addForm, mat_khau: e.target.value})}
                      className={`form-input ${addFormErrors.mat_khau ? 'error' : ''}`}
                      placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                    />
                    {addFormErrors.mat_khau && <span className="error-message">{addFormErrors.mat_khau}</span>}
                  </div>

                  <div className="form-group">
                    <label>Trường học:</label>
                    <input
                      type="text"
                      value={addForm.truong_hoc}
                      onChange={(e) => setAddForm({...addForm, truong_hoc: e.target.value})}
                      className="form-input"
                      placeholder="Nhập tên trường học"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="form-column">
                  <div className="form-group">
                    <label>Ảnh đại diện:</label>
                    <div className="avatar-upload-section">
                      <div className="avatar-preview">
                        {selectedAvatar ? (
                          <img src={selectedAvatar} alt="Avatar preview" className="avatar-image" />
                        ) : (
                          <div className="avatar-placeholder">
                            <span>Chưa chọn ảnh</span>
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="avatar-input"
                        id="avatar-upload"
                      />
                      <label htmlFor="avatar-upload" className="avatar-upload-btn" style={{color: 'white'}}>
                        Chọn ảnh đại diện
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Tỉnh/Thành phố:</label>
                    <select
                      value={selectedProvince}
                      onChange={(e) => handleProvinceChange(e.target.value)}
                      className="form-input"
                    >
                      <option value="">Chọn tỉnh/thành phố</option>
                      {provinces.map((province) => (
                        <option key={province.code} value={province.code}>
                          {province.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {districts.length > 0 && (
                    <div className="form-group">
                      <label>Quận/Huyện:</label>
                      <select
                        value={selectedDistrict}
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                        className="form-input"
                      >
                        <option value="">Chọn quận/huyện</option>
                        {districts.map((district) => (
                          <option key={district.code} value={district.name}>
                            {district.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Địa chỉ cụ thể:</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="form-input"
                      placeholder="Số nhà, tên đường..."
                    />
                  </div>

                  <div className="form-group">
                    <label>Vị trí:</label>
                    <select
                      value={addForm.vi_tri}
                      onChange={(e) => setAddForm({...addForm, vi_tri: e.target.value})}
                      className="form-input"
                    >
                      <option value="">Chọn vị trí</option>
                      <option value="Sinh viên">Sinh viên</option>
                      <option value="Nhân viên">Nhân viên</option>
                      <option value="Giảng viên">Giảng viên</option>
                      <option value="Ra Trường">Ra Trường</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Trạng thái xác thực:</label>
                    <select
                      value={addForm.da_xac_thuc}
                      onChange={(e) => setAddForm({...addForm, da_xac_thuc: parseInt(e.target.value)})}
                      className="form-input"
                    >
                      <option value={1}>Đã xác thực</option>
                      <option value={0}>Chưa xác thực</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button onClick={handleCancelAdd} className="btn-secondary">
                  Hủy
                </button>
                <button onClick={handleSaveAdd} className="btn-primary">
                  Thêm người dùng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;




