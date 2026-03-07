# Admin Dashboard

Admin dashboard cho hệ thống mạng xã hội, được xây dựng với Vite + React + TypeScript.

## 🚀 Tính năng

- **Dashboard**: Tổng quan hệ thống với thống kê realtime
- **Quản lý người dùng**: Xem, chỉnh sửa, xóa người dùng
- **Quản lý bài đăng**: Quản lý tất cả bài đăng trong hệ thống
- **Quản lý điểm số**: Theo dõi giao dịch điểm, cộng/trừ điểm thủ công
- **Thống kê & Báo cáo**: Biểu đồ và báo cáo chi tiết

## 📋 Yêu cầu

- Node.js >= 16.x
- Backend API đang chạy tại `http://localhost:3000`

## 🛠️ Cài đặt

```bash
# Cài đặt dependencies
npm install

# Chạy development server
npm run dev

# Build cho production
npm run build

# Preview production build
npm run preview
```

## 🔑 Đăng nhập

Demo credentials:
- **Username**: `admin`
- **Password**: `admin123`

## 🌐 Cấu hình

Backend API URL được cấu hình trong `vite.config.ts`:

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  }
}
```

## 📁 Cấu trúc thư mục

```
admin/
├── src/
│   ├── components/       # React components
│   │   └── Layout.tsx   # Main layout component
│   ├── pages/           # Page components
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Users.tsx
│   │   ├── Posts.tsx
│   │   ├── Points.tsx
│   │   └── Statistics.tsx
│   ├── services/        # API services
│   │   └── api.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 🎨 Technologies

- **Vite**: Build tool
- **React 18**: UI framework
- **TypeScript**: Type safety
- **React Router**: Routing
- **Axios**: HTTP client
- **Recharts**: Charts library
- **Lucide React**: Icons

## 📝 API Endpoints

Admin dashboard kết nối với các API endpoints sau:

### Người dùng
- `GET /nguoidung/getAll` - Lấy danh sách người dùng
- `GET /nguoidung/getById/:id` - Lấy thông tin người dùng
- `DELETE /nguoidung/delete/:id` - Xóa người dùng

### Bài đăng
- `GET /baidang/getAll` - Lấy danh sách bài đăng
- `DELETE /baidang/delete/:id` - Xóa bài đăng

### Điểm số
- `GET /lich_su_tich_diem/getAll` - Lấy lịch sử giao dịch
- `POST /lich_su_tich_diem/addPoints` - Cộng/trừ điểm
- `GET /lich_su_tich_diem/getOverallStats` - Thống kê tổng quan

## 🔒 Authentication

Hiện tại sử dụng authentication đơn giản với localStorage. 
Trong production, nên implement JWT authentication với backend.

## 📱 Responsive Design

Dashboard được tối ưu cho:
- Desktop (> 1024px)
- Tablet (768px - 1024px)
- Mobile (< 768px)

## 🐛 Debug

Mở browser console để xem logs và errors.

## 📄 License

MIT







