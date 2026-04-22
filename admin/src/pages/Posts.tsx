import { useState, useEffect } from 'react';
import { Search, Eye, Trash2, CheckCircle, XCircle, Pencil } from 'lucide-react';
import api, { categoryAPI, postAPI } from '../services/api';
import './Posts.css';

interface Post {
  ID_BaiDang: string;
  ID_DanhMuc?: string;
  ID_LoaiBaiDang?: string;
  tieu_de: string;
  mo_ta: string;
  gia: number | null;
  vi_tri: string;
  trang_thai: string;
  thoi_gian_tao: string;
  ho_ten?: string;
  TenNguoiDung?: string;
  anh_dai_dien?: string;
  TenLoaiBaiDang?: string;
  TenDanhMuc?: string;
  SoLuongAnh?: number;
  SoLuongLike?: number;
  SoLuongBinhLuan?: number;
  DanhSachAnh?: string[];
}

interface Category {
  ID_DanhMuc: string;
  ten: string;
}

interface PostType {
  ID_LoaiBaiDang: string;
  ten: string;
}

const Posts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [postTypes, setPostTypes] = useState<PostType[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadPosts();
  }, [currentPage, pageSize, filterStatus, searchTerm]);

  // Reset về trang 1 khi filter thay đổi
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [filterStatus, searchTerm]);

  useEffect(() => {
    const loadSupportData = async () => {
      try {
        const [categoriesResponse, postTypesResponse] = await Promise.all([
          categoryAPI.getAll(),
          api.get('/api/loaibaidang/getAll'),
        ]);

        setCategories(
          Array.isArray(categoriesResponse.data)
            ? categoriesResponse.data
            : categoriesResponse.data?.data || [],
        );
        setPostTypes(
          Array.isArray(postTypesResponse.data)
            ? postTypesResponse.data
            : postTypesResponse.data?.data || [],
        );
      } catch (error) {
        console.error('Error loading post form options:', error);
      }
    };

    void loadSupportData();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await postAPI.getAll(currentPage, pageSize, filterStatus, searchTerm);
      setPosts(response.data.data || response.data);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa bài đăng này?')) return;

    try {
      await postAPI.delete(id);
      setPosts(posts.filter(p => p.ID_BaiDang !== id));
      alert('Xóa bài đăng thành công!');
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Không thể xóa bài đăng!');
    }
  };

  const handleViewDetails = (post: Post) => {
    setSelectedPost(post);
    setShowModal(true);
  };

  const handleEdit = (post: Post) => {
    setEditingPost({
      ...post,
      gia: post.gia ?? 0,
      vi_tri: post.vi_tri || '',
      mo_ta: post.mo_ta || '',
      ID_DanhMuc: post.ID_DanhMuc || '',
      ID_LoaiBaiDang: post.ID_LoaiBaiDang || '',
    });
    setShowEditModal(true);
  };

  const handleCloseEdit = () => {
    setShowEditModal(false);
    setEditingPost(null);
    setSavingEdit(false);
  };

  const handleSaveEdit = async () => {
    if (!editingPost) return;

    if (!editingPost.tieu_de?.trim()) {
      alert('Vui lòng nhập tiêu đề bài đăng.');
      return;
    }

    if (!editingPost.ID_DanhMuc || !editingPost.ID_LoaiBaiDang) {
      alert('Vui lòng chọn danh mục và loại bài đăng.');
      return;
    }

    setSavingEdit(true);

    try {
      await postAPI.update(editingPost.ID_BaiDang, {
        ID_DanhMuc: editingPost.ID_DanhMuc,
        ID_LoaiBaiDang: editingPost.ID_LoaiBaiDang,
        tieu_de: editingPost.tieu_de.trim(),
        mo_ta: editingPost.mo_ta?.trim() || '',
        gia:
          editingPost.gia === null || editingPost.gia === undefined
            ? null
            : Number(editingPost.gia),
        vi_tri: editingPost.vi_tri?.trim() || '',
        trang_thai: editingPost.trang_thai,
        thoi_gian_cap_nhat: new Date().toISOString(),
      });

      await loadPosts();
      handleCloseEdit();
      alert('Cập nhật bài đăng thành công!');
    } catch (error) {
      console.error('Error updating post:', error);
      alert('Không thể cập nhật bài đăng!');
    } finally {
      setSavingEdit(false);
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


  const statusOptions = [
    { value: 'all', label: 'Tất cả' },
    { value: 'dang_ban', label: 'Đang bán' },
    { value: 'da_ban', label: 'Đã bán' },
    { value: 'an', label: 'Ẩn' },
  ];

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="posts-page">
      <div className="page-header">
        <h2 className="page-title">Quản lý bài đăng</h2>
      </div>

      <div className="page-toolbar">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Tìm kiếm bài đăng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          {statusOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="filter-info">
          Hiển thị <strong>{posts.length}</strong> bài đăng
        </div>
      </div>

      <div className="posts-grid">
        {posts.map((post) => (
          <div key={post.ID_BaiDang} className="post-card">
            {/* Post Image */}
            <div className="post-image-container">
              {post.DanhSachAnh && post.DanhSachAnh.length > 0 ? (
                <img 
                  src={getImageUrl(post.DanhSachAnh[0])} 
                  alt={post.tieu_de}
                  className="post-image"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/300x200?text=No+Image';
                  }}
                />
              ) : (
                <div className="post-image-placeholder">
                  <span>Không có ảnh</span>
                </div>
              )}
              {post.DanhSachAnh && post.DanhSachAnh.length > 1 && (
                <div className="image-count">
                  +{post.DanhSachAnh.length - 1}
                </div>
              )}
            </div>

            <div className="post-content">
              <div className="post-header">
                <h3 className="post-title">{post.tieu_de}</h3>
                <span className={`post-status ${post.trang_thai}`}>
                  {post.trang_thai === 'dang_ban' && <><CheckCircle size={14} /> Đang bán</>}
                  {post.trang_thai === 'da_ban' && <><XCircle size={14} /> Đã bán</>}
                  {post.trang_thai === 'an' && <><XCircle size={14} /> Ẩn</>}
                </span>
              </div>
              
              <p className="post-description">
                {post.mo_ta?.substring(0, 120)}{post.mo_ta?.length > 120 ? '...' : ''}
              </p>
              
              <div className="post-details">
                <div className="post-detail-item">
                  <span className="detail-label">Giá:</span>
                  <span className="detail-value price">{post.gia?.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="post-detail-item">
                  <span className="detail-label">Vị trí:</span>
                  <span className="detail-value">{post.vi_tri || 'N/A'}</span>
                </div>
                <div className="post-detail-item">
                  <span className="detail-label">Người đăng:</span>
                  <span className="detail-value">{post.TenNguoiDung || 'N/A'}</span>
                </div>
              </div>

              <div className="post-actions">
                <button 
                  className="btn-icon btn-view" 
                  title="Xem chi tiết"
                  onClick={() => handleViewDetails(post)}
                >
                  <Eye size={16} />
                </button>
                <button
                  className="btn-icon btn-edit"
                  onClick={() => handleEdit(post)}
                  title="Chỉnh sửa"
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="btn-icon btn-delete"
                  onClick={() => handleDelete(post.ID_BaiDang)}
                  title="Xóa"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="no-data">
          <p>Không tìm thấy bài đăng nào</p>
        </div>
      )}

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

      {/* Post Details Modal */}
      {showModal && selectedPost && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chi tiết bài đăng</h3>
              <button onClick={() => setShowModal(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <div className="post-detail-grid">
                {/* Left Column - Images */}
                <div className="detail-column">
                  <div className="images-section">
                    <h4>Hình ảnh sản phẩm</h4>
                    {selectedPost.DanhSachAnh && selectedPost.DanhSachAnh.length > 0 ? (
                      <div className="images-grid">
                        {selectedPost.DanhSachAnh.map((image, index) => (
                          <div key={index} className="image-item">
                            <img 
                              src={getImageUrl(image)} 
                              alt={`${selectedPost.tieu_de} - ${index + 1}`}
                              className="detail-image"
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/300x200?text=No+Image';
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="no-images">
                        <span>Không có hình ảnh</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column - Post Info */}
                <div className="detail-column">
                  <div className="detail-section">
                    <h4>Thông tin bài đăng</h4>
                    <div className="detail-row">
                      <span className="detail-label">ID:</span>
                      <span className="detail-value">{selectedPost.ID_BaiDang}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Tiêu đề:</span>
                      <span className="detail-value">{selectedPost.tieu_de}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Mô tả:</span>
                      <span className="detail-value">{selectedPost.mo_ta}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Giá:</span>
                      <span className="detail-value price">{selectedPost.gia?.toLocaleString('vi-VN')} đ</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Vị trí:</span>
                      <span className="detail-value">{selectedPost.vi_tri || 'N/A'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Trạng thái:</span>
                      <span className="detail-value">
                        <span className={`status-badge ${selectedPost.trang_thai === 'dang_ban' ? 'active' : 'inactive'}`}>
                          {selectedPost.trang_thai === 'dang_ban' && <><CheckCircle size={14} /> Đang bán</>}
                          {selectedPost.trang_thai === 'da_ban' && <><XCircle size={14} /> Đã bán</>}
                          {selectedPost.trang_thai === 'an' && <><XCircle size={14} /> Ẩn</>}
                        </span>
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Ngày đăng:</span>
                      <span className="detail-value">
                        {new Date(selectedPost.thoi_gian_tao).toLocaleDateString('vi-VN', {
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
                    <h4>Thông tin người đăng</h4>
                    <div className="user-info">
                      <div className="user-avatar">
                        {selectedPost.anh_dai_dien ? (
                          <img 
                            src={`http://localhost:3000/uploads/${selectedPost.anh_dai_dien}`} 
                            alt="Avatar"
                            className="user-avatar-image"
                            onError={(e) => {
                              e.currentTarget.src = 'https://i.pravatar.cc/150?img=45';
                            }}
                          />
                        ) : (
                          <div className="user-avatar-placeholder">
                            <span>?</span>
                          </div>
                        )}
                      </div>
                      <div className="user-details">
                        <div className="detail-row">
                          <span className="detail-label">Tên:</span>
                          <span className="detail-value">{selectedPost.TenNguoiDung || 'N/A'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Loại bài đăng:</span>
                          <span className="detail-value">{selectedPost.TenLoaiBaiDang || 'N/A'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Danh mục:</span>
                          <span className="detail-value">{selectedPost.TenDanhMuc || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Thống kê</h4>
                    <div className="stats-grid">
                      <div className="stat-item">
                        <div className="stat-value">{selectedPost.SoLuongAnh || 0}</div>
                        <div className="stat-label">Hình ảnh</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-value">{selectedPost.SoLuongLike || 0}</div>
                        <div className="stat-label">Lượt thích</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-value">{selectedPost.SoLuongBinhLuan || 0}</div>
                        <div className="stat-label">Bình luận</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingPost && (
        <div className="modal-overlay" onClick={handleCloseEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chỉnh sửa bài đăng</h3>
              <button onClick={handleCloseEdit} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tiêu đề:</label>
                <input
                  type="text"
                  value={editingPost.tieu_de || ''}
                  onChange={(e) =>
                    setEditingPost((current) =>
                      current ? { ...current, tieu_de: e.target.value } : current,
                    )
                  }
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Mô tả:</label>
                <textarea
                  value={editingPost.mo_ta || ''}
                  onChange={(e) =>
                    setEditingPost((current) =>
                      current ? { ...current, mo_ta: e.target.value } : current,
                    )
                  }
                  className="form-input form-textarea"
                  rows={5}
                />
              </div>

              <div className="posts-form-grid">
                <div className="form-group">
                  <label>Giá:</label>
                  <input
                    type="number"
                    min="0"
                    value={editingPost.gia ?? ''}
                    onChange={(e) =>
                      setEditingPost((current) =>
                        current
                          ? {
                              ...current,
                              gia: e.target.value === '' ? null : Number(e.target.value),
                            }
                          : current,
                      )
                    }
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Trạng thái:</label>
                  <select
                    value={editingPost.trang_thai || 'dang_ban'}
                    onChange={(e) =>
                      setEditingPost((current) =>
                        current ? { ...current, trang_thai: e.target.value } : current,
                      )
                    }
                    className="form-input"
                  >
                    <option value="dang_ban">Đang bán</option>
                    <option value="dang_giu_cho">Đang giữ chỗ</option>
                    <option value="dang_giao_dich">Đang giao dịch</option>
                    <option value="da_ban">Đã bán</option>
                    <option value="da_trao_doi">Đã trao đổi</option>
                    <option value="da_tang">Đã tặng</option>
                    <option value="an">Ẩn</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Danh mục:</label>
                  <select
                    value={editingPost.ID_DanhMuc || ''}
                    onChange={(e) =>
                      setEditingPost((current) =>
                        current ? { ...current, ID_DanhMuc: e.target.value } : current,
                      )
                    }
                    className="form-input"
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map((category) => (
                      <option key={category.ID_DanhMuc} value={category.ID_DanhMuc}>
                        {category.ten}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Loại bài đăng:</label>
                  <select
                    value={editingPost.ID_LoaiBaiDang || ''}
                    onChange={(e) =>
                      setEditingPost((current) =>
                        current ? { ...current, ID_LoaiBaiDang: e.target.value } : current,
                      )
                    }
                    className="form-input"
                  >
                    <option value="">Chọn loại bài đăng</option>
                    {postTypes.map((type) => (
                      <option key={type.ID_LoaiBaiDang} value={type.ID_LoaiBaiDang}>
                        {type.ten}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Vị trí:</label>
                <input
                  type="text"
                  value={editingPost.vi_tri || ''}
                  onChange={(e) =>
                    setEditingPost((current) =>
                      current ? { ...current, vi_tri: e.target.value } : current,
                    )
                  }
                  className="form-input"
                />
              </div>

              <div className="modal-actions">
                <button onClick={handleCloseEdit} className="btn-secondary" disabled={savingEdit}>
                  Hủy
                </button>
                <button onClick={handleSaveEdit} className="btn-primary" disabled={savingEdit}>
                  {savingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Posts;




