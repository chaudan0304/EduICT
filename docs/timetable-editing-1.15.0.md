# Chỉnh lớp và giờ trong thời khóa biểu — 1.15.0

## Cách dùng

Mở Lịch giảng dạy (từ thanh đầu trang hoặc màn hình Tiết học), chọn **Chỉnh lớp & giờ học**.

- Chọn lớp, Trống hoặc Nghỉ tại từng ô thứ/tiết.
- Nhập giờ bắt đầu/kết thúc ở cột Thời gian. Có 4 tiết sáng, 3 tiết chiều; cùng khung giờ từ thứ Hai đến thứ Sáu. Chưa hỗ trợ khung riêng từng ngày, thêm tiết hoặc lịch cuối tuần.
- Khoảng nghỉ được tính tự động từ khoảng trống giữa các tiết; không cần sửa giờ nghỉ riêng.
- Bấm **Lưu TKB** để áp dụng. **Khôi phục mặc định** chỉ đưa lịch/giờ mặc định vào biểu mẫu, phải lưu mới áp dụng.
- Bản chưa lưu được giữ trong trình duyệt/app đang soạn. Đóng rồi mở, chọn chỉnh sửa để tiếp tục. **Bỏ bản sửa & tải lịch mới** bỏ bản nháp sau khi đã đọc lại thành công dữ liệu chung.

## Lưu và dùng chung

- GET `/api/timetable` bổ sung `periodSlots` (7 tiết được chuẩn hóa) và `revision`. POST nhận `{timetable, periodSlots, expectedRevision}`, trả dữ liệu vừa lưu. Lớp và giờ ghi cùng giao dịch SQLite `BEGIN IMMEDIATE`; lỗi không ghi một nửa.
- Giờ có dạng HH:MM trong cùng ngày; kết thúc sau bắt đầu; các tiết theo thứ tự, không chồng nhau. Metadata tiết lấy từ danh sách cố định, không tin số giờ/phút/duration do client gửi.
- Revision SHA-256 tính từ nội dung lịch và giờ. Nếu revision đã đổi, trả 409 `TIMETABLE_STALE`, không ghi đè. Gửi khung giờ mà thiếu revision trả 428. API cũ chỉ gửi lưới vẫn được hỗ trợ và giữ nguyên khung giờ đã lưu; các client cũ đó chưa có kiểm tra revision.
- Dữ liệu nằm trong `app_settings` với khóa `timetable_data` và `timetable_periods`, đã nằm trong cơ chế xuất/sao lưu SQLite hiện có. Không đổi lịch thực tế của người dùng trong lúc triển khai.
- Frontend đọc lịch lúc mở app, khi lấy lại focus/hiển thị và mỗi 15 giây. Phản hồi bắt đầu trước một lần lưu mới bị bỏ. Nếu đang sửa, lịch mới không thay biểu mẫu mà hiện cảnh báo để giáo viên quyết định.
- Đồng hồ/navbar dùng khung giờ đang áp dụng. Cửa sổ tiết đang dạy giữ đối tượng khung giờ đã chọn để tránh thay đồng hồ đột ngột. Mở lại tiết học dùng lịch mới; chưa bổ sung lưu snapshot khung giờ vào lịch sử tiết học.
- Tạo tiết học bật đồng bộ lịch sẽ lấy thời lượng của khung giờ đã chọn, bao gồm số phút ngoài các lựa chọn 20/25/30/35/40/45/80.

## Kiểm chứng và giới hạn

- Build Vite đạt, lint sạch. Đã xem giao diện chỉnh sửa bằng trình duyệt ở bản xem trước cổng 5195 với kho SQLite riêng; ảnh trong `scratch/timetable-editor-preview.png`.
- Lượt yêu cầu này không thêm/chạy bộ test tự động và chưa nghiệm thu tình huống lưu lịch, lỗi mạng hoặc hai cửa sổ sửa đồng thời qua giao diện. Không dùng con số 279 test của 1.14.0 làm kết quả cho thay đổi mới.
- Không sửa thời khóa biểu thật, không thay dữ liệu học sinh/điểm trong quá trình làm. Các thay đổi sao/điểm tốt có sẵn được giữ ngoài commit nhiệm vụ.

## Bộ cài và bản đang dùng

- NSIS hoàn tất: `release/EduMaster-Setup.exe`, 113.376.141 byte, SHA-256 `33E23B7E0ABAEDF9D9AF79F2960E36F756B8741CB7A3A9C6E2514585CE8D468A`. Bộ cài 1.14.0 được giữ riêng trong scratch, mã băm khớp bản trước.
- Quét stage 977 tệp, ASAR 594 tệp và unpacked 11 tệp: 0 finding. Nguồn backend/shared mới đối chiếu stage đều khớp.
- Tạo và verify bản trước cập nhật `EduMaster-Backup-2026-10-17-003633-528-c60b366a`: 23 lớp, 810 học sinh, 91 bài, 53 câu hỏi. Người dùng xác nhận đã đóng app và chọn Yes tại UAC.
- Bản cài tại `D:\App_DaCaiDat\EduMaster` có ProductVersion 1.15.0.0; ASAR khớp bản release. Chỉ một đăng ký HKCU EduMaster 1.15.0; không có mục trùng HKLM. Khởi động mới tạo safety backup nâng cấp 1.14.0 → 1.15.0.
- Đối chiếu chỉ đọc: web 5173 và desktop 50991 đều trả 1.15.0, health/database OK, 23 lớp/810 học sinh, cùng mã băm roster `23c3725c271b11348bc2b3d2717d9dc4820bfc19ca6cf688c6ecb3d6c1a6dc5c`. Cùng trả 7 tiết và revision lịch `7097dea75afe08284490e82c60c6634d49d2933fb679d864d0e317e117861cd2`. Đây là kiểm tra bản triển khai và dữ liệu đọc, không phải kết quả kiểm thử lưu/xung đột lịch.
