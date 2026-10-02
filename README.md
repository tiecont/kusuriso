# Kusuriso

Thư viện thông tin thuốc bằng tiếng Việt, dựng bằng Express/Pug SSR. Tra cứu theo tên thuốc, hoạt chất hoặc tên thương mại; nhóm thuốc được lọc riêng. Nội dung demo chưa được kiểm duyệt y khoa và không dùng để khuyến nghị điều trị.

## Chạy bằng Docker

Tạo `.env` từ `.env.example`, thay tất cả placeholder bằng credential riêng rồi chạy `docker compose up --build -d`. Services `migrate` và `storage-init` chuẩn bị schema/bucket trước khi ứng dụng khởi động. Nếu cần dữ liệu demo, chạy `docker compose run --rm web npm run db:seed`. Mở `http://localhost:3000` và đăng nhập bằng tài khoản trong `.env`.

Không deploy public ở giai đoạn này. Compose chỉ publish trên `127.0.0.1`; kiểm tra bind thực tế bằng `docker ps`. `compose.production.yaml` loại toàn bộ port publish khi merge với Compose local; production thực tế vẫn cần reverse proxy/TLS và URL storage riêng. `NODE_ENV=production` yêu cầu cookie secure, credential riêng và schema đã migrate. `.env.example` không chạy được trực tiếp.

PostgreSQL, MinIO và Kusuriso giữ dữ liệu riêng; PostgreSQL và MinIO dùng named volumes. MinIO Console ở `http://localhost:9001`. Compose dùng image MinIO được lưu trữ tại `bitnamilegacy`, chỉ dành cho môi trường học tập/phát triển; hãy thay image bằng bản MinIO đang được hỗ trợ trước khi triển khai thực tế.

## Hành vi trên thiết bị

Yêu thích, lịch sử đọc, chế độ lưới/danh sách, tab thư viện và vị trí cuộn của trang tra cứu được lưu bằng `localStorage`. Vị trí cuộn được phục hồi khi tải lại cùng URL hoặc quay lại trang bằng lịch sử trình duyệt. Dữ liệu này không gửi lên máy chủ và có thể xóa từ giao diện. JWT quản trị nằm trong cookie HttpOnly; nó không được lưu ở `localStorage`.

## Chạy ngoài Docker

Cần có PostgreSQL và MinIO. Sao chép `.env.example` thành `.env`, cập nhật endpoint/credentials phù hợp, rồi chạy:

```sh
npm install
npm run dev
```

Chạy `npm run build`, `npm run db:migrate`, `npm run storage:setup`, rồi `npm run db:seed` nếu cần dữ liệu demo, trước khi chạy `npm run start:prod`. Runtime chỉ kết nối và kiểm tra schema/bucket. Production không cho seed demo. `DATABASE_URL` được ưu tiên hoàn toàn so với các biến `PG*`.

## Kiểm tra

`npm run typecheck`, `npm test`, `npm run build`, `npm run audit` chạy không cần service. `npm run test:integration` cần PostgreSQL test theo các biến `PG*` (mặc định local port 5434). `npm run test:e2e` cần ứng dụng ở `127.0.0.1:3000`, dữ liệu demo và `E2E_ADMIN_USER` / `E2E_ADMIN_PASSWORD`.

CI chạy quality, integration và Playwright smoke trên PR. Sau khi workflow xanh trên GitHub, bật branch protection cho `main`: bắt buộc PR, ba job CI, branch cập nhật, chặn force push và xóa branch.

## Đường dẫn

- `GET /` tìm kiếm, lọc, yêu thích và lịch sử đọc
- `GET /thuoc/:slug` trang thông tin thuốc
- `GET /api/v1/medicines?q=...&category=...&limit=30&offset=0` API tra cứu có phân trang
- `GET /api/medicines/:slug` API chi tiết JSON
- `GET /api/medicines/by-slug?slugs=...` tải các mục đã lưu
- `/admin/login` đăng nhập quản trị bằng JWT
- `/admin` quản lý danh sách thuốc
- `GET /healthz` kiểm tra trạng thái ứng dụng
- `GET /readyz` kiểm tra PostgreSQL và schema

Các đường `/api/medicines` cũ tiếp tục hoạt động tạm thời. Nội dung y khoa cần được kiểm duyệt trước khi xuất bản thực tế. Schema kiểm duyệt được phác thảo ở [docs/content-workflow.md](docs/content-workflow.md); không nhập thêm nhiều thuốc theo schema hiện tại.
