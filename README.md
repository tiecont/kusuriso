# Kusuriso

Thư viện thông tin thuốc bằng tiếng Việt, dựng bằng Express/Pug SSR. Người đọc có thể tìm theo tên thuốc, hoạt chất hoặc nhóm, xem trang chi tiết và dùng API JSON. Quản trị viên đăng nhập bằng JWT trong cookie HttpOnly để thêm, sửa, xóa thuốc và tải ảnh lên MinIO.

## Chạy bằng Docker

Chạy `docker compose up --build -d` từ thư mục `kusuriso/`, sau đó mở `http://localhost:3000`. Môi trường local dùng tài khoản demo `admin` / `admin123`; chỉ dùng khi ứng dụng chỉ truy cập trên máy cá nhân.

Khu vực quản trị ở `/admin/login`. Trước khi đưa ứng dụng lên mạng, sao chép `.env.example` thành `.env`, đặt `NODE_ENV=production`, thay mật khẩu và secret mẫu bằng giá trị riêng, rồi đặt `COOKIE_SECURE=true` khi chạy sau HTTPS. Ứng dụng sẽ không khởi động ở chế độ production nếu JWT secret ngắn hơn 32 ký tự hoặc mật khẩu quản trị còn là giá trị mẫu.

PostgreSQL, MinIO và Kusuriso giữ dữ liệu riêng; PostgreSQL và MinIO dùng named volumes. MinIO Console ở `http://localhost:9001`. Compose dùng image MinIO được lưu trữ tại `bitnamilegacy`, chỉ dành cho môi trường học tập/phát triển; hãy thay image bằng bản MinIO đang được hỗ trợ trước khi triển khai thực tế.

## Hành vi trên thiết bị

Yêu thích, lịch sử đọc, chế độ lưới/danh sách, tab thư viện và vị trí cuộn của trang tra cứu được lưu bằng `localStorage`. Vị trí cuộn được phục hồi khi tải lại cùng URL hoặc quay lại trang bằng lịch sử trình duyệt. Dữ liệu này không gửi lên máy chủ và có thể xóa từ giao diện. JWT quản trị nằm trong cookie HttpOnly; nó không được lưu ở `localStorage`.

## Chạy ngoài Docker

Cần có PostgreSQL và MinIO. Sao chép `.env.example` thành `.env`, cập nhật endpoint/credentials phù hợp, rồi chạy:

```sh
npm install
npm run dev
```

Kusuriso tạo bảng `medicines`, cấu hình bucket và thêm dữ liệu mẫu khi khởi động.

## Đường dẫn

- `GET /` tìm kiếm, lọc, yêu thích và lịch sử đọc
- `GET /thuoc/:slug` trang thông tin thuốc
- `GET /api/medicines?q=...&category=...` API tra cứu JSON
- `GET /api/medicines/:slug` API chi tiết JSON
- `GET /api/medicines/by-slug?slugs=...` tải các mục đã lưu
- `/admin/login` đăng nhập quản trị bằng JWT
- `/admin` quản lý danh sách thuốc
- `GET /healthz` kiểm tra trạng thái ứng dụng

Thông tin mẫu chỉ để tham khảo, không thay thế chẩn đoán hoặc tư vấn của bác sĩ/dược sĩ. Nội dung y khoa cần được kiểm duyệt trước khi xuất bản thực tế.
