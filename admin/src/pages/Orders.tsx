import { useEffect, useMemo, useState } from 'react';
import { Search, Eye, BadgeCheck, Clock, MapPin } from 'lucide-react';
import { orderAPI } from '../services/api';
import './Orders.css';

interface Order {
  ID_DonHang: string;
  ma_hoa_don: string;
  ID_GiaoDich: string;
  ID_BaiDang: string;
  ID_NguoiBan: string;
  ID_NguoiMua: string;
  tieu_de_bai_dang: string;
  gia_giao_dich: number | null;
  dia_chi_hen_gap?: string | null;
  thoi_gian_hen_gap?: string | null;
  ghi_chu_hen_gap?: string | null;
  ghi_chu_nguoi_mua?: string | null;
  trang_thai: string;
  thoi_gian_hoan_tat?: string | null;
  ten_nguoi_ban?: string | null;
  email_nguoi_ban?: string | null;
  anh_nguoi_ban?: string | null;
  ten_nguoi_mua?: string | null;
  email_nguoi_mua?: string | null;
  anh_nguoi_mua?: string | null;
  anh_bai_dang?: string | null;
}

const formatCurrency = (value: number | null | undefined) => {
  const amount = Number(value || 0);
  if (!amount) return 'Liên hệ';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getImageUrl = (imagePath?: string | null) => {
  if (!imagePath) return 'https://via.placeholder.com/420x260?text=Invoice';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  return `http://localhost:3000/uploads/${imagePath}`;
};

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        const response = await orderAPI.getAll();
        setOrders(Array.isArray(response.data?.data) ? response.data.data : []);
      } catch (error) {
        console.error('Error loading orders:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return orders;

    return orders.filter((order) =>
      [
        order.ma_hoa_don,
        order.tieu_de_bai_dang,
        order.ten_nguoi_ban,
        order.ten_nguoi_mua,
        order.ID_GiaoDich,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [orders, searchTerm]);

  const totalAmount = useMemo(
    () => filteredOrders.reduce((sum, order) => sum + Number(order.gia_giao_dich || 0), 0),
    [filteredOrders],
  );

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="oa-loading">
        <div className="spinner"></div>
        <p>Đang tải hóa đơn...</p>
      </div>
    );
  }

  return (
    <div className="oa-page">
      <div className="oa-header">
        <div>
          <h2 className="oa-title">Quản lý hóa đơn</h2>
          <p className="oa-subtitle">Lưu trữ hóa đơn được sinh ra khi giao dịch bài đăng hoàn tất.</p>
        </div>
        <div className="oa-stats">
          <div className="oa-stat-card">
            <strong>{filteredOrders.length}</strong>
            <span>Hóa đơn</span>
          </div>
          <div className="oa-stat-card">
            <strong>{formatCurrency(totalAmount)}</strong>
            <span>Tổng giá trị</span>
          </div>
        </div>
      </div>

      <div className="oa-toolbar">
        <div className="oa-search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm theo mã hóa đơn, tiêu đề, người mua, người bán..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="oa-toolbar-info">
          Hiển thị <strong>{filteredOrders.length}</strong> hóa đơn
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="oa-empty">
          <p>Chưa có hóa đơn nào được tạo.</p>
        </div>
      ) : (
        <div className="oa-grid">
          {filteredOrders.map((order) => (
            <article key={order.ID_DonHang} className="oa-card">
              <img
                className="oa-card-image"
                src={getImageUrl(order.anh_bai_dang)}
                alt={order.tieu_de_bai_dang}
                onError={(event) => {
                  event.currentTarget.src = 'https://via.placeholder.com/420x260?text=Invoice';
                }}
              />

              <div className="oa-card-body">
                <div className="oa-card-top">
                  <span className="oa-badge">
                    <BadgeCheck size={14} />
                    Hoàn tất
                  </span>
                  <span className="oa-code">{order.ma_hoa_don}</span>
                </div>

                <h3 className="oa-card-title">{order.tieu_de_bai_dang}</h3>
                <div className="oa-price">{formatCurrency(order.gia_giao_dich)}</div>

                <div className="oa-meta">
                  <div>
                    <Clock size={14} />
                    <span>{formatDateTime(order.thoi_gian_hoan_tat)}</span>
                  </div>
                  <div>
                    <MapPin size={14} />
                    <span>{order.dia_chi_hen_gap || 'Chưa có địa chỉ hẹn gặp'}</span>
                  </div>
                </div>

                <div className="oa-people">
                  <div>
                    <small>Người bán</small>
                    <strong>{order.ten_nguoi_ban || 'Không rõ'}</strong>
                  </div>
                  <div>
                    <small>Người mua</small>
                    <strong>{order.ten_nguoi_mua || 'Không rõ'}</strong>
                  </div>
                </div>

                <div className="oa-actions">
                  <button className="oa-btn-icon oa-btn-view" onClick={() => handleViewDetails(order)} title="Xem chi tiết">
                    <Eye size={16} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {showModal && selectedOrder && (
        <div className="oa-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="oa-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="oa-modal-header">
              <h3>Chi tiết hóa đơn</h3>
              <button className="oa-modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <div className="oa-modal-body">
              <img
                className="oa-detail-image"
                src={getImageUrl(selectedOrder.anh_bai_dang)}
                alt={selectedOrder.tieu_de_bai_dang}
                onError={(event) => {
                  event.currentTarget.src = 'https://via.placeholder.com/420x260?text=Invoice';
                }}
              />

              <div className="oa-detail-grid">
                <div className="oa-detail-card">
                  <h4>Thông tin hóa đơn</h4>
                  <div className="oa-detail-row"><span>Mã hóa đơn</span><strong>{selectedOrder.ma_hoa_don}</strong></div>
                  <div className="oa-detail-row"><span>ID giao dịch</span><strong>{selectedOrder.ID_GiaoDich}</strong></div>
                  <div className="oa-detail-row"><span>Bài đăng</span><strong>{selectedOrder.tieu_de_bai_dang}</strong></div>
                  <div className="oa-detail-row"><span>Giá trị</span><strong>{formatCurrency(selectedOrder.gia_giao_dich)}</strong></div>
                  <div className="oa-detail-row"><span>Hoàn tất lúc</span><strong>{formatDateTime(selectedOrder.thoi_gian_hoan_tat)}</strong></div>
                  <div className="oa-detail-row"><span>Thời gian hẹn gặp</span><strong>{formatDateTime(selectedOrder.thoi_gian_hen_gap)}</strong></div>
                  <div className="oa-detail-row"><span>Địa chỉ</span><strong>{selectedOrder.dia_chi_hen_gap || 'Chưa có'}</strong></div>
                </div>

                <div className="oa-detail-card">
                  <h4>Người bán</h4>
                  <div className="oa-person-block">
                    <strong>{selectedOrder.ten_nguoi_ban || 'Không rõ'}</strong>
                    <span>{selectedOrder.email_nguoi_ban || 'Chưa có email'}</span>
                  </div>

                  <h4 className="oa-subsection">Người mua</h4>
                  <div className="oa-person-block">
                    <strong>{selectedOrder.ten_nguoi_mua || 'Không rõ'}</strong>
                    <span>{selectedOrder.email_nguoi_mua || 'Chưa có email'}</span>
                  </div>
                </div>

                <div className="oa-detail-card oa-detail-card-full">
                  <h4>Ghi chú</h4>
                  <div className="oa-note-grid">
                    <div className="oa-note-block">
                      <small>Ghi chú điểm hẹn</small>
                      <p>{selectedOrder.ghi_chu_hen_gap || 'Không có ghi chú điểm hẹn.'}</p>
                    </div>
                    <div className="oa-note-block">
                      <small>Ghi chú người mua</small>
                      <p>{selectedOrder.ghi_chu_nguoi_mua || 'Không có ghi chú từ người mua.'}</p>
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

export default Orders;
