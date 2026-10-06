# Lịch sử thay đổi

## 1.1.1 — 06/10/2026

### Sửa

- PowerPoint toàn màn hình che bảng điều khiển EduICT: thêm cửa sổ công cụ nổi riêng khi bắt đầu slideshow.
- Có Trước/Tiếp, Hiện EduICT, Về slide, Dừng và lối tắt Đếm giờ/Điểm tốt/Vòng quay; kéo để di chuyển, thu gọn/mở rộng.
- Khi kết thúc slideshow hoặc bấm Esc, thanh nổi đóng và EduICT được đưa trở lại. Trạng thái luôn nổi của cửa sổ chính được phục hồi sau khi dừng.
- Có nút mở lại thanh nổi trong bảng điều khiển bài liên kết.

Bộ cài thử nghiệm Windows x64; đã kiểm tra build, cú pháp, lint và nội dung gói cài. Hiển thị trên PowerPoint toàn màn hình, nhiều màn hình và nâng cấp thực tế còn cần thử trên máy người dùng.

## 1.1.0 — 06/10/2026

Bộ cài Windows x64 phục vụ thử nghiệm trên máy người dùng.

### Thêm

- Liên kết file PowerPoint `.pptx`/`.ppt` trên máy; EduICT lưu đường dẫn và thông tin bài, không nhập nội dung file vào ứng dụng.
- Chọn lại file khi đường dẫn thay đổi, giữ ID bài và các liên kết tiết học.
- Bảng điều khiển PowerPoint gốc trong thư viện và tiết học: mở slideshow, trước/tiếp, dừng và ghi chú dạy học.

### Thay đổi

- Trang chủ, thanh điều hướng, thanh chọn lớp và thư viện bài học có bố cục gọn hơn, hỗ trợ màn hình hẹp.
- Bài PowerPoint mới dùng luồng liên kết; bài imported cũ tiếp tục dùng dữ liệu đã lưu.
- Xóa liên kết chỉ xóa bản ghi bài học; file nguồn vẫn nằm ở nơi giáo viên lưu. Backup EduICT chỉ mang đường dẫn của bài liên kết; khi chuyển máy cần mang file gốc theo và chọn lại file.

### Điều kiện thử nghiệm

- Trình chiếu file liên kết cần EduICT Desktop trên Windows và Microsoft PowerPoint.
- Bộ cài chưa ký số. Kiểm thử cài đặt/nâng cấp, restart và hiệu ứng/trigger/media trên bản EXE 1.1.0 còn cần thực hiện.
