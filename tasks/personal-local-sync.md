# Đồng bộ dữ liệu cá nhân trên cùng máy — 15/10/2026

Người dùng xác nhận: web và desktop trên máy này, gồm thiết lập trò chơi. Nguồn chính là dữ liệu web; sao lưu cả hai trước khi chuyển.

1. Lưu trạng thái trò chơi trong SQLite theo lớp, không đổi khóa mỗi ngày; giữ bộ nhớ tạm khi mất kết nối, phát hiện ghi đè giữa hai cửa sổ.
2. Ảnh trò chơi lưu vào thư mục dữ liệu trên máy, dùng chung giữa hai bản. Micro vẫn không ghi âm.
3. Tạo bản sao SQLite nhất quán của web và desktop, giữ bản cũ; chuyển web sang kho AppData của desktop và thay dữ liệu đích bằng nguồn web đã chọn.
4. Giữ nguyên các thay đổi đang có ở phân hệ sao/điểm tốt; chỉ commit các tệp của nhiệm vụ này.
5. Build/lint, tạo bộ cài cập nhật nếu cần để desktop nhận API/giao diện mới. Không thêm/chạy test tự động khi chưa được yêu cầu.

Hoàn thành: đã sao lưu riêng hai nguồn, chuyển dữ liệu web vào AppData, ghép uploads, dùng chung cấu hình riêng, build/cài 1.11.0. Kiểm tra đọc của hai backend khớp 23 lớp/810 học sinh và API trò chơi. Hồ sơ chi tiết và khôi phục: `docs/personal-local-sync.md`. Chưa thực hiện luồng chơi/ghi trò chơi xuyên hai giao diện hoặc micro thực tế.
