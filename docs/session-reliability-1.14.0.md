# Lưu tiết học, bản nháp và nơi dự phòng — 1.14.0

## Thay đổi

- Tạo mới dùng mã ổn định qua các lần thử lại; SQLite kiểm tra cùng nội dung trong giao dịch `BEGIN IMMEDIATE`. Gửi lại cùng mã/nội dung trả bản đã có; nội dung khác báo 409 để tránh ghi đè. Lưu `started_at` khi chọn vào dạy ngay. Cập nhật tiết học không tồn tại trả 404.
- Biểu mẫu tạo tiết học/câu hỏi chờ máy chủ xác nhận; lỗi giữ nội dung và hiện thông báo. Xóa tiết học chỉ xóa cache và hàng trên màn hình sau phản hồi thành công.
- Trạng thái/tiến trình có hàng đợi cục bộ theo mã tiết học, gộp bản sửa mới và gửi tuần tự. Đọc lại từ máy chủ vẫn phủ bản chưa lưu; cảnh báo ở danh sách, dashboard và tổng kết. Giáo viên bấm Thử lưu lại để gửi PUT; không tự gửi lại POST sao, quiz, sự kiện hoặc tham gia.
- Tổng kết tính `(ended_at - started_at) - total_paused_seconds - khoảng đang tạm dừng`, không dùng thời lượng dự kiến thay số thực tế. Bản cũ thiếu mốc thời gian không suy đoán. Hoạt động bỏ qua không được đếm đã hoàn thành.
- Bản nháp giữ biểu mẫu tiết học, sửa/thêm hoạt động, câu hỏi thủ công và hai biểu mẫu AI. Chỉ xóa sau lưu/áp dụng; lỗi bộ nhớ cục bộ được báo, không giả vờ đã giữ an toàn. Mỗi trình duyệt/app có bản riêng; đây không phải đồng bộ bản nháp giữa web và desktop.

## Nơi dự phòng

Trong Công cụ lớp học → Sao lưu & phục hồi, chọn/nhập một thư mục có sẵn, đánh dấu đồng ý lưu dữ liệu lớp và điểm, rồi bật. Desktop dùng hộp chọn thư mục có sẵn; web nhập đường dẫn trên máy chạy backend. Sau đó tạo bản mới hoặc chép bản đang chọn. Bản tự động chạy khi ứng dụng đang mở cũng chép sang nơi dự phòng; lần chép đã thành công không bị chép lại định kỳ.

Các gói nằm trong `EduMaster-backups`, có đuôi `.eduict`, được kiểm tra SHA-256. Không ghi đè tệp trùng tên khác nội dung, không tự xóa gói dự phòng. Lỗi nơi dự phòng không làm mất bản sao lưu chính. Từ chối UNC, thư mục bên trong kho đang dùng và đường dẫn con bị chuyển qua symlink/junction. Bản sao chỉ giữ đường dẫn với PowerPoint liên kết; không tải các tệp OneDrive.

Nếu chọn thư mục OneDrive đã đồng bộ trên máy, OneDrive sẽ tải gói lên tài khoản kết nối. Người dùng đã chọn thiết lập sau trong app; lượt này không cấu hình hoặc chép dữ liệu trường ra thư mục khác.

## Kiểm chứng

- 279/279 test, 22 suite đạt; lint sạch. Các test mới phủ HTTP 503 khi tạo/xóa, giữ bản sửa qua lần đọc dữ liệu cũ, gửi tuần tự bản sửa đến khi request cũ đang chờ, kiểm tra dạng phản hồi xác nhận, tính thời gian trừ nghỉ, lưu/khôi phục bản nháp và lỗi quota.
- Sao lưu dùng SQLite thử riêng: tạo gói ở thư mục đích được chọn, nhập lại/verify, bảo vệ tệp xung đột, dọn tệp tạm và tắt cấu hình. Các kiểm tra hardlink/rename chạy ngoài sandbox Windows.
- Trình duyệt dùng server 5194 và SQLite riêng trong `scratch/reliability-1140-data`. Đã nhập tên/ghi chú, đóng và tải lại trang, khôi phục đúng bản nháp; HTTP 503 giữ form và hiện lỗi; khôi phục kết nối, bấm lưu thành công và có một tiết học trong danh sách.
- Công cụ trình duyệt bị kẹt sau hộp JavaScript confirm thử xóa; chưa nghiệm thu bằng thao tác UI phần thử xóa lại, AI/bản nháp câu hỏi và hộp chọn thư mục Windows trong lượt này. API/helper có test, không coi đó là đã thử đầy đủ trên bản cài.

## Bộ cài và dữ liệu đang dùng

- NSIS hoàn tất; EXE bộ cài 113.373.501 byte, SHA-256 `A7F4C8F97DC0ED911AAEC3D00BCB5EF9CC7CF0F774049DFFBC08F34DC15B7C3D`. Bộ cài 1.13.0 được giữ trong `scratch/EduMaster-Setup-1.13.0.exe` với mã băm khớp bản trước.
- Stage 975 tệp, ASAR 592 tệp, unpacked 11 tệp: 0 finding từ secret scan. Bốn nguồn backend mới/sửa đối chiếu với stage đều khớp. Build đạt; `npm audit --omit=dev` qua mạng: 0 vulnerability tại thời điểm kiểm tra.
- Trước cài tạo và verify `EduMaster-Backup-2026-10-17-002141-668-aa4224bd`, đủ 23 lớp/810 học sinh/91 bài, 1.118.208 byte. Người dùng đã chọn Yes ở UAC; EXE cài tại `D:\App_DaCaiDat\EduMaster` có ProductVersion 1.14.0.0; chỉ một đăng ký HKCU EduMaster 1.14.0, không có đăng ký trùng HKLM.
- Khởi động mới tạo safety backup nâng cấp 1.13.0 → 1.14.0. Web cổng 5173 và desktop cổng 63216 đều trả 1.14.0, health/database OK. JSON danh sách lớp của hai bên cùng SHA-256 `23c3725c271b11348bc2b3d2717d9dc4820bfc19ca6cf688c6ecb3d6c1a6dc5c`, 23 lớp/810 học sinh; SQLite integrity OK, 0 lỗi khóa ngoại. Nơi dự phòng cả hai vẫn chưa bật.
- Bộ cài chứa working copy cá nhân hiện tại; các commit nhiệm vụ không đưa các sửa sao/điểm tốt có sẵn vào lịch sử Git. Log kiểm tra giữ trong `scratch/reliability-1140-*`, không commit dữ liệu trường hoặc ảnh.

## Giới hạn

- Không có tự hợp nhất bản sửa cùng tiết học ở nhiều cửa sổ. Chỉ thử lưu lại khi nội dung cục bộ còn là nội dung muốn giữ. Hàng đợi/bản nháp phụ thuộc bộ nhớ của trình duyệt; nếu quota bị chặn giao diện yêu cầu giữ cửa sổ mở.
- Những API lịch sử sự kiện/tham gia cũ chưa được chuyển thành hàng đợi trong đợt này. Không tuyên bố đã sửa mọi đường ghi trong ứng dụng.
- Người dùng tự thử OneDrive và micro sau. Chưa thử mất điện, rút ổ khi đang chép hoặc gói sát giới hạn 4 GB.
- Các sửa sao/điểm tốt có sẵn được giữ trong working copy, không đưa vào commit của đợt này.
