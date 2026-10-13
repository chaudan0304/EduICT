# Trò chơi lớp học tiểu học

## Phạm vi được triển khai
- Hộp quà bí mật: gọi học sinh hoặc mở nhiệm vụ, không lặp trong một vòng.
- Chuyến tàu lớp học: gọi một nhóm nhỏ hoặc chia đều học sinh thành các nhóm.
- Bản đồ kho báu: giáo viên xác nhận từng nhiệm vụ, cả lớp tiến đến kho báu.
- Dùng danh sách lớp hiện tại; bỏ chọn học sinh vắng trước khi chơi.
- Mở từ thanh bên, trang chủ, tiết học và trình chiếu. Tôn trọng giảm chuyển động.
- Dùng công cụ sao nhóm hiện có; xác nhận riêng, giữ sổ cái và ID khi thử lại.
- Tiến độ trò chơi tạm thời theo lớp/ngày trong phiên trình duyệt, không phải dữ liệu sao lưu.

## Các bước
1. Kiểm tra kết nối Claude thực tế bằng Read package.json.
2. Xây dựng bộ chọn người tham gia và Hộp quà.
3. Thêm Chuyến tàu, Bản đồ kho báu và thưởng sao đã xác nhận.
4. Gắn các lối mở nhanh, xử lý lớp thay đổi và lớp rỗng.
5. Build, lint, xem giao diện, ghi nhận giới hạn; commit và đẩy nhánh tính năng.

Không tạo bài kiểm thử hoặc chạy test tự động khi chưa được yêu cầu. Không đóng gói EXE trong yêu cầu này.

## Phối hợp Claude
Claude Code 2.1.292 có sẵn. Proxy 8080 ban đầu tắt. Sau khi mở proxy hiện có,
/v1/models trả claude-opus-5 và claude-sonnet-5, nhưng Claude Code từ chối cả hai
model khi thực hiện tác vụ Read. Model cấu hình cũ claude-opus-4-8 chỉ nhận retry.
Chưa chứng minh được Read thực tế, nên Codex tự thực hiện; không giao sửa mã cho Claude.

Đây là kế hoạch riêng của tính năng; giữ các kế hoạch cũ để bảo toàn lịch sử.
