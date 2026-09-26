# Progress: Hệ thống Quản lý Cân Cá

## Những gì đã hoạt động
- **Khởi tạo Memory Bank**: Các tệp cốt lõi như `projectbrief.md`, `productContext.md`, `activeContext.md`, `systemPatterns.md`, và `techContext.md` đã được tạo để lưu trữ thông tin dự án.
- **Kế hoạch phát triển**: Đã xây dựng kế hoạch sơ bộ cho hệ thống backend, bao gồm các tính năng chính và kiến trúc hệ thống.

## Những gì còn lại để xây dựng
- **API Backend**:
  - Phát triển các endpoint cho nhập liệu cân cá (`/fish-weight`).
  - Xây dựng endpoint để tính toán tổng tiền (`/calculate-total`).
  - Tạo endpoint để truy xuất lịch sử cân cá (`/history`).
- **Cơ sở dữ liệu**:
  - Quyết định và thiết lập cơ sở dữ liệu (MongoDB hoặc SQLite).
  - Thiết kế schema cho dữ liệu cân cá và lịch sử giao dịch.
- **Kiểm tra và triển khai**:
  - Kiểm tra các API endpoint để đảm bảo tính chính xác và độ tin cậy.
  - Triển khai hệ thống cục bộ để kiểm tra toàn diện.
- **Tích hợp tương lai**:
  - Chuẩn bị tài liệu và cấu trúc để tích hợp với thiết bị cân điện tử.

## Trạng thái hiện tại
- Dự án đang ở giai đoạn khởi tạo, với các tệp Memory Bank đã được thiết lập để lưu trữ thông tin và kế hoạch phát triển.
- Chưa có mã nguồn hoặc API nào được triển khai, trọng tâm hiện tại là hoàn thiện tài liệu và chuẩn bị cho phát triển.

## Các vấn đề đã biết
- Chưa có quyết định cuối cùng về cơ sở dữ liệu (MongoDB hoặc SQLite), cần đánh giá thêm dựa trên yêu cầu hiệu suất.
- Thiếu thông tin chi tiết về thiết bị cân điện tử để chuẩn bị tích hợp trong tương lai.

## Sự phát triển của các quyết định dự án
- Ban đầu, dự án được xác định là một hệ thống backend tập trung vào các API để nhập liệu, tính toán và lưu trữ dữ liệu cân cá.
- Quyết định tập trung vào tính đơn giản và độ tin cậy, không phát triển giao diện người dùng ở giai đoạn đầu.
- Thiết kế hệ thống linh hoạt để hỗ trợ tích hợp thiết bị cân điện tử trong tương lai đã được đưa vào kế hoạch từ đầu.

## Cập nhật 2026-09-26 — Hạ tầng test & sửa lỗi (kế hoạch 02)
- Tách `app.js` (Express + routes, export `app`) khỏi `server.js` (kết nối Mongo + listen); `npm test` chạy Jest + Supertest trên MongoDB in-memory.
- API xóa bản ghi cân: `DELETE /api/fish-weights/deleteFishWeights/:fishWeightId` (xóa mềm, ghi LogTracking cả khi không tìm thấy id). Route `PUT /createFishWeights/:id` cũ đã gỡ.
- `getFishTypes`, `getDataFish`, `getBasketTypes` bỏ bản ghi `isDelete: true` và sắp theo `createdAt`.
- Vấn đề đã biết: cluster Atlas `cluster0.w4zp0gf` không còn phân giải DNS → production Vercel đang lỗi, cần tạo lại cluster/cập nhật chuỗi kết nối.

## Cập nhật 2026-09-26 — CRUD danh mục & sửa bản ghi cân (kế hoạch 03)
- Loại cá, loại giỏ: thêm/sửa/xóa mềm; tên duy nhất trong bản ghi chưa xóa (trim, không phân biệt hoa thường); thêm lại tên đã xóa thì khôi phục bản ghi cũ; trọng lượng giỏ phải >= 0.
- Sửa bản ghi cân: `PUT /api/fish-weights/updateFishWeights/:fishWeightId`.
- `getDataFish` trả thêm `fishWeightItems` (có `_id`) cho FE sửa/xóa từng lần cân.

## Cập nhật 2026-09-26 — Phiên cân & tính tiền (kế hoạch 05)
- Resource mới `weigh-session`: tạo/đóng phiên (luôn chỉ 1 phiên mở), bảng giá theo phiên × loại cá, tổng hợp tiền `getSessionSummary`.
- Lần cân lưu `session`, `basketWeightSnapshot`, `netWeight`; số cân phải lớn hơn trọng lượng giỏ; phiên đã đóng không sửa/xóa lần cân.
- Script `npm run migrate:sessions` gom dữ liệu cũ vào phiên "Dữ liệu cũ" — cần sao lưu DB rồi chạy trên production SAU khi deploy BE, TRƯỚC khi deploy FE.

## Cập nhật 2026-09-26 — Nhật ký & đăng nhập (kế hoạch 06)
- Nhật ký phân trang ở server (`page`, `pageSize` tối đa 100).
- Đăng nhập bằng mật khẩu dùng chung (`POST /api/auth/login`, JWT 30 ngày); mọi API khác cần token; sai 5 lần/15 phút mỗi IP thì bị chặn; CORS chỉ cho GitHub Pages và localhost:3001.
- Cần đặt `APP_PASSWORD_HASH` và `JWT_SECRET` trên Vercel và `.env` — thiếu thì server không khởi động.

## Cập nhật 2026-09-26 — Chạy local không cần Atlas
- `npm run dev:local`: chạy BE với MongoDB tạm trong bộ nhớ, có sẵn dữ liệu mẫu, mật khẩu đăng nhập `dev-local` (chỉ dùng cho DB tạm này). Tắt là mất dữ liệu.
- Biến `MONGODB_URI` (tùy chọn): có thì dùng nguyên chuỗi đó (MongoDB trên máy/Docker/Atlas mới), không cần `USER_MONGODB`/`PWD_MONGODB`. Script migration cũng dùng biến này.

## Cập nhật 2026-09-26 — Loại tiền theo phiên
- Mỗi phiên có `currency` (VND hoặc USD, mặc định lấy theo phiên gần nhất). `PUT /api/weigh-sessions/updateSessionCurrency/:id` đổi loại tiền và xóa bảng giá cũ (không quy đổi tỷ giá).
- Đơn giá và thành tiền làm tròn theo loại tiền: VND số nguyên, USD đến cent. Phiên cũ không có trường này được coi là VND, không cần migration.
