# 🚀 Quick Start Guide - Admin Dashboard

## Bước 1: Cài đặt dependencies (Đã hoàn thành)

```bash
cd admin
npm install
```

## Bước 2: Chạy Admin Dashboard

```bash
npm run dev
```

Admin dashboard sẽ chạy tại: **http://localhost:5173**

## Bước 3: Đăng nhập

Mở browser và truy cập `http://localhost:5173`

**Demo Credentials:**
- Username: `admin`
- Password: `admin123`

## Bước 4: Đảm bảo Backend đang chạy

Admin dashboard cần backend API đang chạy tại `http://localhost:3000`

```bash
# Trong terminal khác, chạy backend
cd backend
npm start
```

## 📱 Các tính năng có sẵn

### 1. Dashboard (/)
- Tổng quan hệ thống
- Thống kê người dùng, bài đăng, điểm số
- Hoạt động gần đây

### 2. Quản lý Người dùng (/users)
- Xem danh sách người dùng
- Tìm kiếm người dùng
- Xem chi tiết người dùng
- Xóa người dùng

### 3. Quản lý Bài đăng (/posts)
- Xem tất cả bài đăng
- Lọc theo trạng thái (Đang bán, Đã bán, Ẩn)
- Tìm kiếm bài đăng
- Xóa bài đăng

### 4. Quản lý Điểm số (/points)
- Xem lịch sử giao dịch điểm
- Cộng/trừ điểm thủ công cho người dùng
- Theo dõi thay đổi điểm

### 5. Thống kê & Báo cáo (/statistics)
- Biểu đồ tăng trưởng người dùng
- Phân bố bài đăng theo trạng thái
- Thống kê tổng quan hệ thống

## 🎨 Giao diện

- **Responsive**: Tương thích với desktop, tablet, mobile
- **Sidebar**: Menu điều hướng có thể thu gọn
- **Theme**: Sử dụng màu chủ đạo #791228 (đỏ đậm)
- **Icons**: Lucide React icons
- **Charts**: Recharts library

## 🔧 Cấu hình

### Thay đổi API URL

Chỉnh sửa file `admin/vite.config.ts`:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000', // Thay đổi URL backend ở đây
      changeOrigin: true,
    }
  }
}
```

Hoặc chỉnh sửa `admin/src/services/api.ts`:

```typescript
const API_BASE_URL = 'http://localhost:3000'; // Thay đổi URL backend
```

## 🛡️ Authentication

Hiện tại sử dụng demo authentication:
- Username: `admin`
- Password: `admin123`

Để implement authentication thực:
1. Tạo API endpoint login trong backend
2. Cập nhật `Login.tsx` component
3. Implement JWT token validation

## 📝 Scripts

```bash
# Development
npm run dev

# Build cho production
npm run build

# Preview production build
npm run preview
```

## 🐛 Troubleshooting

### Lỗi kết nối API

- Đảm bảo backend đang chạy tại `http://localhost:3000`
- Kiểm tra CORS settings trong backend
- Mở browser console để xem error details

### Lỗi hiển thị biểu đồ

- Clear browser cache
- Restart dev server
- Kiểm tra dependencies đã install đầy đủ

## 📞 Support

Nếu gặp vấn đề, kiểm tra:
1. Backend API có chạy không
2. Browser console có lỗi gì không
3. Network tab trong DevTools

## 🎯 Next Steps

1. Implement real authentication với backend
2. Thêm phân quyền (roles & permissions)
3. Thêm tính năng upload/export data
4. Tối ưu performance với pagination
5. Thêm real-time updates với WebSocket

---

**Enjoy using Admin Dashboard! 🎉**







