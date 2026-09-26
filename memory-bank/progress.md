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
