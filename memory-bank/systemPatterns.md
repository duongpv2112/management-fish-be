# System Patterns: Hệ thống Quản lý Cân Cá

## Kiến trúc hệ thống
- **Backend**: Sử dụng Node.js và Express.js để xây dựng các API RESTful phục vụ cho việc nhập liệu, tính toán và lưu trữ dữ liệu cân cá.
- **Cơ sở dữ liệu**: Dự kiến sử dụng MongoDB hoặc SQLite để lưu trữ thông tin cân cá và lịch sử giao dịch. Quyết định cuối cùng sẽ dựa trên yêu cầu về hiệu suất và quy mô.
- **API Structure**: Các endpoint chính bao gồm:
  - `/fish-weight`: Để nhập thông tin cân cá.
  - `/calculate-total`: Để tính toán tổng tiền dựa trên dữ liệu nhập vào.
  - `/history`: Để truy xuất lịch sử cân cá.

## Quyết định kỹ thuật chính
- **Tập trung vào Backend**: Không phát triển giao diện người dùng ở giai đoạn đầu, chỉ tập trung vào các API để đảm bảo tính đơn giản và độ tin cậy.
- **Thiết kế linh hoạt**: Hệ thống được thiết kế theo mô-đun để dễ dàng mở rộng và tích hợp với thiết bị cân điện tử trong tương lai.
- **Bảo mật dữ liệu**: Đảm bảo dữ liệu cân cá được lưu trữ an toàn, tránh mất mát hoặc truy cập trái phép.

## Mẫu thiết kế sử dụng
- **RESTful API**: Các endpoint được thiết kế theo chuẩn REST để đảm bảo tính nhất quán và dễ sử dụng.
- **MVC Pattern**: Sử dụng mô hình Model-View-Controller (nếu áp dụng) để tổ chức mã nguồn, tách biệt logic nghiệp vụ và dữ liệu.
- **Modular Design**: Các thành phần hệ thống được chia thành các mô-đun riêng biệt (ví dụ: controllers, services, models) để dễ bảo trì và mở rộng.

## Mối quan hệ giữa các thành phần
- **Controllers**: Xử lý các yêu cầu từ API, gọi các dịch vụ tương ứng để thực hiện logic nghiệp vụ.
- **Services**: Chứa logic nghiệp vụ chính như tính toán tổng tiền và quản lý dữ liệu cân cá.
- **Models**: Định nghĩa cấu trúc dữ liệu cho các đối tượng như cân cá, lịch sử giao dịch.
- **Database**: Lưu trữ dữ liệu từ các models, cung cấp khả năng truy xuất và cập nhật.

## Đường dẫn triển khai quan trọng
- **Nhập liệu cân cá**: Yêu cầu từ `/fish-weight` -> Controller -> Service -> Model -> Database.
- **Tính toán tổng tiền**: Yêu cầu từ `/calculate-total` -> Controller -> Service (tính toán) -> Trả về kết quả.
- **Truy xuất lịch sử**: Yêu cầu từ `/history` -> Controller -> Service -> Database -> Trả về kết quả.
