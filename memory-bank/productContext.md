# Product Context: Hệ thống Quản lý Cân Cá

## Lý do tồn tại của dự án
Dự án được xây dựng để giải quyết vấn đề sai sót và nhầm lẫn trong việc quản lý số liệu cân cá của các hộ gia đình chăn nuôi cá. Hiện tại, việc nhập liệu và tính toán thủ công dễ dẫn đến lỗi, gây ảnh hưởng đến việc tính tiền và theo dõi sản lượng.

## Vấn đề cần giải quyết
- **Sai sót trong tính toán**: Việc tính toán thủ công tổng tiền từ số liệu cân cá thường dẫn đến lỗi.
- **Thiếu lịch sử dữ liệu**: Không có hệ thống lưu trữ thông tin cân cá qua các vụ, gây khó khăn trong việc tra cứu và phân tích.
- **Hiệu quả thấp**: Quá trình nhập liệu và quản lý thủ công tốn nhiều thời gian và công sức.

## Cách hệ thống hoạt động
- Hệ thống cung cấp các API backend để:
  - Nhập thông tin cân cá (loại cá, trọng lượng, giá tiền, v.v.).
  - Tự động tính toán tổng tiền dựa trên dữ liệu nhập vào.
  - Lưu trữ thông tin vào cơ sở dữ liệu để tra cứu lịch sử.
- Hệ thống được thiết kế đơn giản, tập trung vào chức năng cốt lõi để đảm bảo độ tin cậy và dễ sử dụng.

## Mục tiêu trải nghiệm người dùng
- **Đơn giản và chính xác**: Đảm bảo việc nhập liệu và tính toán không có lỗi, giúp người dùng tin tưởng vào hệ thống.
- **Truy xuất dễ dàng**: Lịch sử cân cá có thể được truy xuất nhanh chóng khi cần thiết.
- **Chuẩn bị cho tương lai**: Hệ thống được thiết kế linh hoạt để tích hợp với thiết bị cân điện tử, giảm thiểu công việc thủ công trong tương lai.
