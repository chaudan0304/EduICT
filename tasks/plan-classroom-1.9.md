# EduICT 1.9.0: công cụ hỗ trợ lớp học

## Phạm vi được người dùng giao
Phối hợp Codex và Claude Code triển khai sáu cải tiến: cấu hình Gemini trong giao diện; hoàn tác lượt sao gần nhất; sao cho nhóm học sinh; kiểm tra trước giờ dạy; báo cáo tiến bộ theo tháng có xuất PDF; thông báo phiên bản mới.

## Phân công và hợp đồng
- Claude Code: chỉ tạo `src/components/ClassroomTools/*` và báo cáo T101. Bốn màn hình độc lập; không sửa integration/backend.
- Codex: API, sao theo nhóm/hoàn tác, tích hợp Navbar, rà soát mã, phiên bản và bộ cài. Đọc báo cáo/mã thực tế trước khi nhận.
- API `/api/classroom-tools/*` trả JSON; lỗi `{error}` với status 400/403/404/409/500/502. Không trả khóa Gemini.
- Sao theo nhóm giữ cùng sổ cái, giao dịch SQLite và receipt chống lặp; hoàn tác bằng bút toán bù, không xóa lịch sử.
- PDF desktop dùng cửa sổ ẩn sandbox/JavaScript tắt và `printToPDF`, chỉ nhận mã lớp/học sinh/tháng qua IPC; người dùng chọn nơi lưu. Web dùng bản in HTML có tiếng Việt và Lưu thành PDF; không gửi dữ liệu ra ngoài.
- Phiên bản mới đọc GitHub Releases chính thức; thiếu release/mạng phải báo trung thực. Không tự cài và không tự xuất bản release.

## Thứ tự
1. Giao T101 cho Claude, đồng thời Codex tạo các API. Claude lỗi 503 và lần thử lại không trả kết quả; Codex tiếp quản theo chỉ đạo người dùng.
2. Codex mở rộng sao nhóm và hoàn tác; nhóm chọn học sinh, lưu tên/thành viên theo lớp.
3. Nhận Claude, đối chiếu API và tích hợp giao diện.
4. Rà soát tĩnh, lint/build, đóng gói NSIS và quét bí mật. Không thêm/chạy test trong lượt này vì người dùng chưa yêu cầu.
5. Commit/push nhánh `codex/classroom-improvements`, bàn giao EXE và giới hạn chưa kiểm tra trên máy thực.

## Tiêu chí hoàn thành
Có đường đi sử dụng cho cả sáu chức năng; API key chỉ lưu ở cấu hình riêng backend; các lần chỉnh/hoàn tác sao không ghi đè dữ liệu điểm và không lặp khi retry; báo cáo đọc dữ liệu đã lưu, phân biệt tổng sao với lịch sử tháng; kiểm tra slide không quảng cáo rằng mạng/link/hiệu ứng đã được xác minh; EXE chứa đúng source build.
