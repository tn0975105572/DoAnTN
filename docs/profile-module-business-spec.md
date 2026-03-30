# Đặc tả nghiệp vụ module Profile

## 1. Mục tiêu

Module `Profile` là trang hồ sơ người dùng trên web, đóng vai trò:

- Trung tâm nhận diện cá nhân của người dùng.
- Điểm vào cho các nghiệp vụ quan hệ bạn bè.
- Điểm tổng hợp uy tín giao dịch qua đánh giá.
- Điểm quản trị bài đăng cá nhân.
- Cầu nối giữa hồ sơ, bài đăng và tin nhắn.

Module này được thiết kế để phục vụ đồng thời 2 bối cảnh:

- Người dùng xem chính hồ sơ của mình để quản trị.
- Người dùng xem hồ sơ người khác để tương tác, kết bạn, nhắn tin, đánh giá.

---

## 2. Phạm vi chức năng

Phạm vi triển khai hiện tại gồm:

- Xem hồ sơ cá nhân của chính mình.
- Xem hồ sơ công khai của người dùng khác.
- Xem thống kê bài đăng, bạn bè, điểm, đánh giá.
- Xem danh sách bạn bè nổi bật.
- Xem danh sách bài đăng và bài đăng nổi bật.
- Xem timeline hoạt động gần đây.
- Gửi lời mời kết bạn.
- Hủy lời mời đã gửi.
- Chấp nhận lời mời.
- Từ chối lời mời.
- Hủy kết bạn.
- Nhắn tin từ hồ sơ sang màn chat.
- Gửi hoặc cập nhật đánh giá người dùng.
- Quản lý bài đăng ở chế độ chủ hồ sơ:
  - đổi trạng thái bài đăng
  - xóa bài đăng

Ngoài phạm vi hiện tại:

- Chỉnh sửa nội dung bài đăng trực tiếp tại trang hồ sơ.
- Chặn người dùng từ giao diện web.
- Tạo bài đăng mới ngay trong màn hồ sơ.
- Quản trị media gallery chuyên sâu cho hồ sơ.

---

## 3. Tác nhân

### 3.1. Khách

- Chưa đăng nhập.
- Có thể mở hồ sơ công khai nếu có `userId`.
- Không thể kết bạn, nhắn tin, đánh giá.

### 3.2. Người dùng đăng nhập

- Có thể xem hồ sơ của mình.
- Có thể xem hồ sơ người khác.
- Có thể thực hiện nghiệp vụ quan hệ bạn bè.
- Có thể nhắn tin.
- Có thể đánh giá nếu đã là bạn bè.

### 3.3. Chủ hồ sơ

- Là người dùng đang đăng nhập và `viewerId = userId`.
- Có thêm quyền quản lý bài đăng và điều hướng nhanh tới khu vực quản trị.

---

## 4. Use case chính

### UC01. Xem hồ sơ của mình

- Điều kiện: đã đăng nhập.
- Luồng:
  1. Hệ thống lấy `viewerId` từ localStorage.
  2. Hệ thống gọi `GET /api/profile/:userId`.
  3. Hệ thống trả về dữ liệu tổng hợp hồ sơ.
  4. Giao diện hiển thị thông tin cá nhân, thống kê, bài đăng, đánh giá, hoạt động.
  5. Hệ thống hiển thị thêm tab `Quản lý`.

### UC02. Xem hồ sơ người khác

- Điều kiện: có `userId` đích trong URL hoặc state điều hướng.
- Luồng:
  1. Hệ thống gọi `GET /api/profile/:userId?viewerId=currentUserId`.
  2. Hệ thống xác định trạng thái quan hệ.
  3. Giao diện hiển thị nút hành động tương ứng:
     - Gửi lời mời
     - Hủy lời mời
     - Chấp nhận
     - Từ chối
     - Hủy kết bạn
     - Nhắn tin

### UC03. Kết bạn

- Điều kiện: đã đăng nhập, không phải chủ hồ sơ, chưa là bạn.
- Luồng:
  1. Người dùng bấm `Gửi lời mời`.
  2. FE gọi `POST /api/quanhebanbe/request`.
  3. BE tạo quan hệ trạng thái chờ.
  4. FE tải lại hồ sơ và đổi trạng thái sang `request_sent`.

### UC04. Chấp nhận hoặc từ chối lời mời

- Điều kiện: hồ sơ đang ở trạng thái `request_received`.
- Luồng chấp nhận:
  1. FE gọi `PUT /api/quanhebanbe/accept`.
  2. BE cập nhật trạng thái `da_dong_y`.
  3. FE tải lại hồ sơ.
- Luồng từ chối:
  1. FE gọi `DELETE /api/quanhebanbe/unfriend`.
  2. BE xóa quan hệ chờ.
  3. FE tải lại hồ sơ.

### UC05. Nhắn tin từ hồ sơ

- Điều kiện: đã đăng nhập, không phải chủ hồ sơ.
- Luồng:
  1. Người dùng bấm `Nhắn tin`.
  2. FE điều hướng sang `/messages` và truyền `selectedUser`.
  3. Màn chat tự mở đúng cuộc trò chuyện hoặc tạo conversation tạm trên UI.

### UC06. Đánh giá người dùng

- Điều kiện:
  - đã đăng nhập
  - không phải chủ hồ sơ
  - hai bên đã là bạn bè
- Luồng:
  1. FE hiển thị form đánh giá.
  2. Người dùng chọn số sao và nhập nhận xét.
  3. FE gọi `POST /api/profile/:userId/review`.
  4. BE kiểm tra điều kiện bạn bè.
  5. BE tạo mới hoặc cập nhật đánh giá hiện có.
  6. FE tải lại phần đánh giá và thống kê.

### UC07. Quản lý bài đăng cá nhân

- Điều kiện: đang xem hồ sơ của chính mình.
- Luồng:
  1. Chủ hồ sơ mở tab `Quản lý`.
  2. Hệ thống hiển thị danh sách bài đăng.
  3. Chủ hồ sơ có thể:
     - đổi trạng thái bằng `PUT /api/baidang/update/:id`
     - xóa bằng `DELETE /api/baidang/delete/:id`
  4. FE tải lại hồ sơ sau thao tác.

---

## 5. Quy tắc nghiệp vụ

- Một người không thể tự kết bạn với chính mình.
- Một người không thể tự đánh giá chính mình.
- Chỉ bạn bè đã được chấp nhận mới được phép đánh giá.
- Một người chỉ có 1 bản đánh giá đang hoạt động đối với 1 người dùng đích.
- Khi gửi đánh giá lần sau, hệ thống cập nhật bản ghi cũ thay vì tạo bản ghi trùng.
- Chủ hồ sơ mới được thấy tab `Quản lý`.
- Khách chưa đăng nhập không được thao tác kết bạn, nhắn tin, đánh giá.
- Trạng thái quan hệ quyết định hành vi nút chính trên hồ sơ.

Các trạng thái quan hệ chính:

- `guest`
- `self`
- `not_friends`
- `request_sent`
- `request_received`
- `friends`
- `blocked`

Các trạng thái bài đăng đang quản lý:

- `dang_ban`
- `da_ban`
- `da_trao_doi`
- `da_tang`

---

## 6. Thiết kế dữ liệu trả về từ BE

API hồ sơ tổng hợp trả về các nhóm dữ liệu:

- `user`
- `viewer`
- `badges`
- `highlights`
- `stats`
- `friendsPreview`
- `listings`
- `reviews`
- `activity`

Ý nghĩa:

- `user`: thông tin hồ sơ nền tảng.
- `viewer`: góc nhìn người xem hiện tại, gồm quyền và trạng thái quan hệ.
- `badges`: huy hiệu nghiệp vụ như xác thực, VIP, uy tín, kết nối rộng.
- `highlights`: các chỉ số tóm tắt để hiển thị nhanh.
- `stats`: số lượng bài đăng, điểm, bạn bè, đánh giá, tương tác.
- `friendsPreview`: preview danh sách bạn bè.
- `listings`: bài đăng nổi bật và toàn bộ bài đăng.
- `reviews`: tổng hợp sao, phân bố, đánh giá của người xem và các đánh giá hiện có.
- `activity`: timeline sự kiện gần đây.

---

## 7. Mapping giao diện FE

### 7.1. Hero

- Avatar
- Tên người dùng
- Badge xác thực/VIP
- Bio
- Meta trường học, vị trí, ngày tham gia
- Nút hành động theo quan hệ
- 4 ô thống kê chính

### 7.2. Sidebar

- Thông tin hồ sơ
- Điểm nổi bật
- Danh sách bạn bè nổi bật

### 7.3. Main content

- `Tổng quan`: bài đăng spotlight, bài nổi bật, đánh giá mới, hoạt động gần đây
- `Bài đăng`: danh sách bài đăng và thông tin chi tiết bài đang chọn
- `Đánh giá`: summary sao, distribution, form đánh giá, danh sách review
- `Hoạt động`: timeline đầy đủ
- `Quản lý`: hành động nhanh và điều hành bài đăng

---

## 8. API sử dụng

### 8.1. API hồ sơ

- `GET /api/profile/:userId`
- `POST /api/profile/:userId/review`

### 8.2. API quan hệ bạn bè

- `POST /api/quanhebanbe/request`
- `PUT /api/quanhebanbe/accept`
- `DELETE /api/quanhebanbe/cancel`
- `DELETE /api/quanhebanbe/unfriend`

### 8.3. API bài đăng

- `PUT /api/baidang/update/:id`
- `DELETE /api/baidang/delete/:id`

### 8.4. API tin nhắn

- Màn `Messages` nhận điều hướng bằng `selectedUser` từ FE để mở đúng chat.

---

## 9. Bảng dữ liệu liên quan

Các bảng nghiệp vụ chính tham gia:

- `nguoidung`
- `quanhebanbe`
- `baidang`
- `baidang_anh`
- `danhgia`
- `xacthuc_tai_khoan`
- `nguoidungtichdiem`
- `binhluanbaidang`
- `likebaidang`

---

## 10. Điều kiện nghiệm thu

Hệ thống được xem là đạt khi:

- Mở `/profile` sẽ hiển thị hồ sơ của người đang đăng nhập.
- Mở `/profile/:userId` sẽ hiển thị hồ sơ công khai đúng người.
- Nút kết bạn đổi đúng theo trạng thái quan hệ.
- Nút nhắn tin mở đúng người trên màn chat.
- Chỉ bạn bè mới nhìn thấy form đánh giá.
- Gửi đánh giá xong summary và danh sách đánh giá cập nhật lại.
- Chủ hồ sơ đổi được trạng thái bài đăng.
- Chủ hồ sơ xóa được bài đăng.
- Build web thành công.
- Backend load route profile thành công.

---

## 11. Hướng mở rộng

- Thêm chỉnh sửa hồ sơ trực tiếp trên Profile.
- Thêm tạo bài đăng mới từ tab quản lý.
- Thêm bộ lọc bài đăng theo danh mục và trạng thái.
- Thêm block/report user từ hồ sơ.
- Thêm media gallery riêng cho hồ sơ.
- Thêm lịch sử giao dịch hoặc uy tín mua/bán theo phiên giao dịch.

---

## 12. File triển khai liên quan

- `backend/models/profile.js`
- `backend/controllers/profile.js`
- `backend/routes/profile.js`
- `backend/models/danhgia.js`
- `web/src/pages/Profile/Profile.jsx`
- `web/src/pages/Profile/Profile.css`
- `web/src/routes/index.jsx`
- `web/src/pages/AddFriends/AddFriends.jsx`
- `web/src/pages/Messages/Messages.jsx`
