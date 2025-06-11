# Tech Context: Hệ thống Quản lý Cân Cá

## Công nghệ được sử dụng
- **Node.js**: Nền tảng chính để xây dựng hệ thống backend.
- **Express.js**: Framework để tạo các API RESTful, xử lý các yêu cầu và định tuyến.
- **MongoDB hoặc SQLite**: Cơ sở dữ liệu để lưu trữ thông tin cân cá và lịch sử giao dịch (quyết định cuối cùng sẽ dựa trên yêu cầu về hiệu suất và quy mô).
- **NPM**: Quản lý các gói và phụ thuộc của dự án.

## Thiết lập phát triển
- **Môi trường phát triển**: Sử dụng Visual Studio Code để viết và kiểm tra mã nguồn.
- **Cấu trúc thư mục**: Dựa trên cấu trúc hiện tại của dự án (`app/controllers`, `app/models`, `app/routes`, `app/services`), tổ chức mã nguồn theo mô-đun.
- **Quy trình phát triển**:
  - Viết mã nguồn cho các API endpoint.
  - Kiểm tra API bằng các công cụ như Postman hoặc các script tự động.
  - Triển khai cục bộ để kiểm tra toàn bộ hệ thống.

## Ràng buộc kỹ thuật
- **Hiệu suất**: Hệ thống cần xử lý nhanh chóng các yêu cầu nhập liệu và tính toán để không làm chậm quá trình cân cá.
- **Quy mô nhỏ ban đầu**: Vì đối tượng người dùng là các hộ gia đình chăn nuôi cá, hệ thống không cần hỗ trợ số lượng lớn người dùng đồng thời ở giai đoạn đầu.
- **Tích hợp tương lai**: Cần thiết kế hệ thống để dễ dàng tích hợp với thiết bị cân điện tử, có thể yêu cầu thêm các giao thức hoặc phần cứng.

## Phụ thuộc
- **Express.js**: Phụ thuộc chính để xây dựng API.
- **Mongoose (nếu dùng MongoDB)**: Để kết nối và thao tác với cơ sở dữ liệu MongoDB.
- **Các gói khác**: Có thể bao gồm các thư viện để kiểm tra, bảo mật và ghi log (sẽ được xác định trong quá trình phát triển).

## Mẫu sử dụng công cụ
- **Git**: Quản lý mã nguồn và lịch sử thay đổi.
- **Postman**: Kiểm tra và xác nhận các API endpoint.
- **VSCode Extensions**: Hỗ trợ lập trình Node.js và Express.js (ví dụ: ESLint để kiểm tra mã, Debugger for Node.js).
