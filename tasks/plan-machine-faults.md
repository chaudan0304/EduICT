# Quản lý máy lỗi — 1.10.0

- Dùng chung trạng thái 31 máy giữa các lớp, không cần xếp chỗ học sinh.
- Ba trạng thái: bình thường, có lỗi vẫn dùng được, không dùng được.
- Ghi loại lỗi, ghi chú, ngày báo; đánh dấu đã sửa và giữ lịch sử.
- Giữ các máy hỏng cũ, không tự động đổi chỗ học sinh khi báo lỗi.
- Lưu SQLite; xuất toàn bộ dữ liệu bao gồm lịch sử máy.
- Thực hiện trên nhánh codex/machine-fault-management.
- Kiểm tra lint, build, gói bộ cài; không chạy test hoặc thao tác thử trên dữ liệu thật.
