import { useState, useEffect } from 'react';
import { Search, Eye, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { postAPI } from '../services/api';
import './Posts.css';

interface Post {
  ID_BaiDang: string;
  tieu_de: string;
  mo_ta: string;
  gia: number;
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

const Posts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showModal, setShowModal] = useState(false);
  
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

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await postAPI.getAllWithDetails(currentPage, pageSize);
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
    </div>
  );
};

export default Posts;






