# Kế hoạch Triển khai Hệ thống Quản lý Khách sạn / Motel

Dựa trên yêu cầu của bạn, hệ thống này khá lớn và đòi hỏi kiến trúc **Multi-tenant (Đa người thuê)**, trong đó một Admin có thể có nhiều Chi nhánh (Branch/Hotel), và Nhân viên sẽ làm việc trong Chi nhánh đó.

Do khối lượng công việc để tự động tạo toàn bộ các services là rất lớn và không thể hoàn thành trong một lần, tôi đề xuất chia nhỏ thành các giai đoạn (Phases). Dưới đây là kế hoạch chi tiết.

## User Review Required

> [!CAUTION]
> Kiến trúc cơ sở dữ liệu hiện tại (trong thư mục `shared/db/init`) **chưa có** các trường `hotel_id` hoặc `branch_id` cho tính năng đa chi nhánh. Để đáp ứng yêu cầu của bạn, chúng ta BẮT BUỘC phải sửa lại cấu trúc Database trước khi code các services. Bạn có đồng ý với việc thay đổi cấu trúc DB này không?

> [!WARNING]
> Vì có rất nhiều tính năng, chúng ta nên bắt đầu từng phần một. Bạn có muốn bắt đầu với **Giai đoạn 1: Sửa đổi Database và hoàn thiện Auth-Service (Đăng ký tạo hotel, sinh mã mời)** trước không?

## Open Questions

1. **Về Mã mời (Invite Code)**: Mã mời này có thời hạn không? Hay chỉ cần Admin tạo ra 1 mã cố định cho mỗi chi nhánh để nhân viên dùng khi đăng ký? *(Hiện tại hệ thống đang tự set cố định 1 mã khi tạo chi nhánh)*
2. **Giao tiếp giữa các service**: Hiện tại hệ thống dùng Kong API Gateway, bạn muốn các service gọi nội bộ qua REST (axios) hay sử dụng RabbitMQ mà bạn đã cài sẵn trong docker-compose?

## Proposed Changes

Tôi đề xuất chia quá trình phát triển thành các giai đoạn sau:

### Giai đoạn 1: Database & Auth Service (Khởi tạo hệ thống)
- [x] **Sửa đổi DB**: Đã khởi tạo các scripts SQL (01-auth.sql, 02-room.sql, 03-booking.sql) hỗ trợ Multi-tenant (có `hotel_id`, `branch_id`) đồng bộ với code hiện tại.
- [x] **Auth Service (Register)**:
  - [x] Đăng ký Admin -> Tự tạo 1 Hotel -> Tạo 1 Branch mặc định -> Tự động thêm 10 phòng (Gọi sang Room DB Pool).
  - [x] Đăng ký Staff -> Yêu cầu nhập Invite Code -> Gắn user vào Branch tương ứng.
  - [x] Đồng bộ hoá lại biến tính giá phòng (`base_price`, `hourly_base_price`) giữa Auth và Booking Service.
- [ ] **Auth Service (Các tính năng còn lại)**:
  - [ ] Thêm API CRUD quản lý thông tin Nhân viên.
  - [ ] Setup Middleware phân quyền (RBAC) dành cho Role Admin / Staff.

### Giai đoạn 2: Room Service & Service-svc (Quản lý Phòng và Dịch vụ)
- **Room Service**:
  - CRUD phòng, hạng phòng (VIP, Thường), loại phòng, giá phòng.
  - Quản lý trạng thái phòng (6 trạng thái).
- **Service-svc (Hàng hóa & Dịch vụ)**:
  - CRUD dịch vụ (thuê xe, đồ ăn, nước uống) và giá dịch vụ.

### Giai đoạn 3: Booking Service & Guest Service (Luồng Lễ tân)
- **Guest Service**: CRUD thông tin khách hàng, Blacklist khách hàng.
- **Booking Service**:
  - Luồng thuê phòng (theo giờ, theo ngày) tính tiền tự động.
  - Chức năng Check-in / Check-out.
  - Quản lý hóa đơn (bao gồm tiền phòng + tiền dịch vụ).

### Giai đoạn 4: Report Service & Settings
- **Report Service**: 
  - Tính toán doanh thu (hàng hóa, thuê phòng).
  - Xuất báo cáo PDF/Excel.
  - API trả data cho Biểu đồ (Dashboard Admin).

## Verification Plan

### Automated Tests
- Khởi động lại `docker-compose` với cấu trúc database mới để đảm bảo các bảng được tạo thành công.
- Gọi API bằng `curl` hoặc viết script test (Node.js) để kiểm tra luồng Đăng ký Admin -> Tự động tạo 10 phòng.

### Manual Verification
- Cung cấp file hướng dẫn (Walkthrough) chứa danh sách các API đã tạo và cách test bằng Postman hoặc UI của bạn.

---
**Vui lòng xem và cho tôi biết bạn có muốn bắt đầu với "Giai đoạn 1" bằng cách thiết kế lại Database không nhé!**
