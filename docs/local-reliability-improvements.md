# Hoàn thiện bản dùng cá nhân — 16/10/2026

Phạm vi: cập nhật dữ liệu web/desktop; phân biệt dữ liệu trống và mất kết nối; trạng thái lưu; sao lưu hằng ngày và phục hồi; gói chuyển máy có tài nguyên; bộ cài giữ chế độ cài cũ; lối vào tiết dạy.

Thực hiện theo từng phần:

1. Làm mới danh sách khi quay lại cửa sổ và định kỳ khi đang xem; không ghi đè thao tác chưa lưu. Dữ liệu trống là kết quả hợp lệ, lỗi tải không báo kết nối thành công.
2. Hiển thị đang lưu/chưa lưu, lần đọc dữ liệu gần nhất và nút làm mới.
3. Tạo bản sao lưu tự động mỗi ngày khi ứng dụng đang chạy; hai backend cùng kho chỉ tạo một bản. Giữ 7 bản tự động, giữ riêng bản thủ công/an toàn. Màn hình tạo, kiểm tra và phục hồi có xác nhận.
4. Gói `.eduict` chứa SQLite và tài nguyên trong uploads; không chứa API key hay tệp PowerPoint chỉ được liên kết. Nhập gói chỉ đưa vào danh sách sao lưu để người dùng xem trước và xác nhận phục hồi.
5. Bộ cài nhận diện chế độ cài hiện có; không cho ép chuyển chế độ lên cùng thư mục rồi để lại đăng ký trùng.
6. Nút vào/tiếp tục tiết dạy dùng luồng tiết học sẵn có, với bài giảng, công cụ sao và hoạt động lớp học.

Giữ nguyên dữ liệu thật và các thay đổi sao/điểm tốt có sẵn. Không phục hồi thử vào kho dữ liệu trường. Không thêm hoặc chạy bộ test trong đợt này; kiểm tra biên dịch, lint, rà mã và giao diện với dữ liệu giả. Đã đóng gói và cập nhật desktop 1.12.0; bằng chứng và giới hạn nằm bên dưới.

## Đã triển khai trong 1.12.0

- Hoàn tất cả 6 phần trên. Thanh dữ liệu hiển thị trạng thái kết nối/lưu/chưa lưu, lần đọc gần nhất và nút làm mới; tạm dừng đọc tự động khi đang nhập, đang lưu hoặc còn lỗi lưu. Yêu cầu bắt đầu trước một lần sửa bị bỏ khi trả về; chọn lớp không bị đặt lại nếu vẫn tồn tại.
- `fetchClassesFromSqlite` có chế độ ném lỗi cho luồng đồng bộ; khởi động không lấy lớp mẫu từ bộ nhớ đệm để coi là dữ liệu đã kết nối. Lớp rỗng và lỗi kết nối được thể hiện riêng.
- Sao lưu tự động sau khởi động và kiểm tra mỗi 5 phút khi backend đang chạy; ngày được tính theo Việt Nam. Khóa SQLite riêng ở thư mục backup điều phối web/desktop, tự nhả khi tiến trình thoát. Chỉ giữ 7 bản có loại `automatic`; không xóa bản thủ công/an toàn/đã nhập theo chính sách này.
- Gói `.eduict` dùng gzip và các bản ghi đường dẫn/kích thước/nội dung, truyền theo luồng ở server. Giới hạn 4 GB dữ liệu tệp, 1 GB mỗi tệp, 100.000 tệp; kiểm tra đường dẫn, tên trùng, checksum và toàn vẹn SQLite. Nhập gói đưa vào danh sách với loại `imported`, không tự phục hồi. Gói không chứa cấu hình/khóa riêng ở settings; PowerPoint liên kết ngoài kho vẫn cần mang theo hoặc có quyền truy cập OneDrive.
- Điểm an toàn trước phục hồi có manifest và được hiển thị trong danh sách. Phục hồi vẫn bị chặn nếu backend khác đang dùng database.
- Bộ cài dựa trên đăng ký gỡ cài đặt hiện có, giữ chế độ tài khoản/mọi người; chặn tham số ép chế độ ngược và trường hợp hai đăng ký trỏ cùng chương trình. Không tự xóa đăng ký không rõ nguồn gốc. Biến NSIS chỉ dùng cho installer được loại khỏi bước biên dịch uninstaller để không phát sinh warning-as-error.
- Nút vào/tiếp tục tiết dạy có ở thanh dữ liệu và trang chủ; dùng dashboard tiết học hiện có. Không tạo một màn hình dạy học thứ hai.

## Bằng chứng ngày 16/10/2026

- `npm run build`: đạt; index khoảng 450 kB, không có cảnh báo chunk lớn. Sau khi chuyển import API sang hook dev-server, build không mở/đối chiếu SQLite của người dùng. `npm run lint`: 0 lỗi, 0 cảnh báo; `git diff --check`: đạt. Không chạy lại bộ test của 1.11.2 và không lấy kết quả 266 test trước đó làm bằng chứng cho mã 1.12.0.
- `npm audit --omit=dev`: 0 vulnerability tại thời điểm kiểm tra. Stage/ASAR quét 587 file và thư mục unpacked 11 file, đều 0 finding; không phải chứng nhận không có mọi lỗ hổng.
- Trình duyệt dùng bản server thật trên cổng riêng với database mẫu trong `scratch/reliability-preview-data`: tự tạo bản ngày; UI kiểm tra toàn vẹn đạt; tải gói rồi nhập lại thành công, hiện loại “Đã nhập”. Có 5 lớp/34 học sinh mẫu và 1 tệp minh họa; checksum tài nguyên gốc và tài nguyên sau nhập khớp nhau. Console trang không có error/warn. Không phục hồi vào database trường và không phát sinh giao dịch sao/điểm trên dữ liệu thật.
- Bố cục màn hình sao lưu đã xem ở kích thước điện thoại và desktop; ảnh bằng chứng nằm ở `scratch/reliability-backup-ui.png`. Chưa đánh giá toàn bộ màn hình ở mọi kích thước.
- NSIS thành công; `release/EduMaster-Setup.exe` 113.364.124 byte, SHA-256 `B5455BDA467CDC15EF71302253314B3BAEE09047B140170DCBFC7A78A0AFC8D4`. Đối chiếu các nguồn backend chính và dist với stage khớp nhau, package stage là 1.12.0. Bộ cài gồm working copy có các thay đổi sao/điểm tốt cá nhân được giữ nguyên; các commit nhiệm vụ không chứa những thay đổi có sẵn đó.
- Trước cập nhật đã tạo bản đầy đủ `EduMaster-Backup-2026-10-16-192333-259-430740c0` với 2.397 tệp. Người dùng xác nhận đã đóng cửa sổ; còn tiến trình nền không có cửa sổ nên đã dừng đúng tiến trình bản cũ sau khi sao lưu. Backend cũ tự tắt khi kênh IPC đóng.
- Đã cài tại `D:\App_DaCaiDat\EduMaster`; installer exit 0, ProductVersion 1.12.0.0. Windows còn một đăng ký EduMaster 1.12.0 và không có đăng ký cũ ở HKLM. Khởi động mới tạo safety backup nâng cấp 1.11.2 → 1.12.0 thành công.
- API desktop và web đều trả phiên bản 1.12.0, `health.ok=true`, `database=ok`; 23 lớp/810 học sinh. Phản hồi roster sau chuẩn hóa có cùng SHA-256 `4281b3981b3ddd3b72bf484468fcc7361939d04069b5445abe789c4a5b794f7c`. Cả hai thấy cùng bản tự động `EduMaster-Backup-2026-10-16-190248-10-0ecc6925`, không có lỗi sao lưu được báo. Kết nối SQLite readOnly: integrity `ok`, foreign key lỗi 0.

## Giới hạn còn lại

- Chưa thử phục hồi thực tế qua UI; không dùng database trường để thử thao tác thay dữ liệu. Chưa mô phỏng hết trường hợp mất mạng, đang nhập nhiều ô và hai cửa sổ ghi đồng thời, hoặc gói sát giới hạn 4 GB.
- Kiểm tra desktop sau cài dựa trên EXE, log và API; chưa nghiệm thu trực tiếp mọi thao tác trên cửa sổ Electron. PowerPoint/OneDrive đăng nhập/micro vẫn cần buổi thử thực tế riêng như báo cáo 1.11.2.
- Sao lưu theo ngày chỉ chạy khi ứng dụng/backend đang mở; không có dịch vụ chạy khi đã tắt hết web và desktop. Tài nguyên được chép đầy đủ cho mỗi bản; cần đủ dung lượng đĩa. Các bản liên kết ngoài kho không được sao chép vào gói.

Log: `scratch/local-reliability-{build,lint}.log`, `scratch/local-reliability-installer-pass2.log`, `scratch/local-reliability-secret-scan.log`, `scratch/local-reliability-dependency-audit.json`.
