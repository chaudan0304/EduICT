# Dùng chung dữ liệu web và desktop trên máy cá nhân

Ngày 15/10/2026 · Phiên bản 1.11.0 · Nhánh `codex/personal-local-sync`.

## Đã chọn và áp dụng

Người dùng xác nhận dùng chung dữ liệu web/desktop trên cùng máy, gồm thiết lập trò chơi; chọn **dữ liệu web làm chính**. Sau khi sao lưu và đóng app theo xác nhận, kho desktop đã nhận dữ liệu web: 23 lớp, 810 học sinh, 91 bài, 47 phiên học, 142 giao dịch sao, tổng 494 sao.

Kho chung: `%APPDATA%\EduMaster\data`. Web được cấu hình riêng trên máy bằng `.env` đã bỏ khỏi Git, qua `EDUICT_DATA_DIR`, `EDUICT_DB_PATH`, `EDUICT_SHARED_LOCAL_DATA=1`. Bản desktop đóng gói vẫn sử dụng kho AppData chuẩn. Đường dẫn cá nhân và khóa API không đưa vào mã nguồn hoặc bộ cài.

Hai bản dùng cùng tệp SQLite và thư mục `uploads`, không sao chép qua lại mỗi lần mở. Cấu hình AI dùng chung trong `data/settings/.env`; lấy cấu hình web làm nguồn theo lựa chọn người dùng. Đã thêm bước đọc cấu hình trước khi backend giữ các đường dẫn uploads. Các dữ liệu khác trong AppData, như liên kết PowerPoint, giữ nguyên.

Đây là đồng bộ trên máy này; không bật máy chủ công khai, đăng nhập cloud hoặc tải dữ liệu lên Internet.

## Trò chơi

- Lưu thiết lập, câu hỏi, người tham gia, kết quả và tiến độ theo lớp trong `app_settings` của SQLite. Không đổi khóa mỗi ngày.
- Các bản xuất toàn bộ JSON/SQL/SQLite chứa phần thiết lập/trạng thái này vì hệ thống xuất đọc mọi bảng. Ảnh nằm trong uploads, cần giữ thư mục đó hoặc dùng bản sao lưu có tệp; xuất SQLite riêng không chứa tệp ảnh.
- Chỉ báo **Đang lưu / Đã lưu / Chưa kết nối** ở màn hình thiết lập. Nên chờ **Đã lưu** trước khi đóng app. Chuyển sang lớp hoặc lần mở khác vẫn nạp từ SQLite.
- Ghi được gom trong khoảng 400 ms; trong lúc mất mạng nội bộ/API, bản chờ lưu giữ trong bộ nhớ đệm trình duyệt. Bản đệm không thay thế SQLite và có thể khác giữa origin/cổng của desktop.
- Hai cửa sổ cùng sửa một lớp: lưu có phiên bản kỳ vọng; cửa sổ cũ nhận xung đột, không tự ghi đè. **Nạp dữ liệu chung** hỏi trước khi bỏ thay đổi chưa lưu. Khi quay lại cửa sổ hoặc mỗi sáu giây, bản không có thay đổi chờ lưu nạp dữ liệu chung; không nạp giữa hiệu ứng đếm ngược/mở quà.
- Tiến độ cũ còn trong `sessionStorage` của cùng origin được chuyển khi lớp chưa có bản lưu chung. Dữ liệu phiên đã mất không thể khôi phục bằng chức năng này.
- Ảnh riêng PNG/JPEG/WebP tối đa 3 MB lưu trong `uploads/classroom-games`, dùng dấu SHA-256 làm tên tệp. Không lưu chuỗi ảnh trong SQLite. API chỉ nhận thao tác từ máy này; không có API xóa ảnh hàng loạt.
- Trò chơi không tự ghi sao. Công cụ thưởng sao vẫn cần xác nhận. Micro không lưu/đồng bộ âm thanh hoặc tự bật lại; đồng bộ chỉ gồm thiết lập và mốc đã đạt.

## Bản sao lưu của lần chuyển này

Nằm dưới `%APPDATA%\EduMaster\migration-backups\personal-sync-apply-2026-10-15T09-18-50-210Z`:

- `web.sqlite`: ảnh chụp SQLite nhất quán của nguồn được chọn.
- `desktop.sqlite` và `desktop-original.sqlite`: dữ liệu desktop trước khi thay.
- `desktop-uploads`: tệp desktop trước khi ghép thư mục uploads từ web.
- `web.env.private`, `desktop.env.private`: cấu hình riêng, có thể chứa khóa; không chia sẻ hoặc đưa lên Git.
- `manifest.json`: nguồn, đích, số dòng và kết quả kiểm tra toàn vẹn.

Nguồn web cũ và uploads trong thư mục dự án vẫn giữ nguyên. Script `scripts/enable-personal-local-sync.mjs` yêu cầu cờ nguồn chính và xác nhận app đã đóng, sao lưu trước, kiểm tra đích khớp nguồn, giữ dữ liệu gốc và không chạy lại nếu đã dùng chung. Khi snapshot WAL của nguồn vừa dừng bị lỗi I/O do kết nối chỉ đọc, đã phục hồi/checkpoint SQLite bằng kết nối không thay schema/bản ghi và chạy lại thành công; lần thử lỗi chưa thay dữ liệu đích.

Khôi phục: đóng cả hai bản, sao lưu kho chung hiện tại, chọn đúng ảnh chụp cần khôi phục rồi thay SQLite và tệp uploads tương ứng. Không chép đè tệp SQLite/WAL khi ứng dụng đang mở.

## Ranh giới kiểm chứng

- Đã tạo và cài bộ EXE 1.11.0 vào bản EduMaster sẵn có trên máy; lần mở đầu tạo thêm safety backup trước cập nhật từ 1.7.0.
- Backend desktop đã khởi động từ bộ cài mới và log đúng kho SQLite chung; `/api/health` của cả web/desktop trả database `ok`. `/api/status` của cả hai trả 23 lớp, 810 học sinh; API đọc trò chơi cùng lớp trả dữ liệu giống nhau.
- Web đang chạy ở `http://127.0.0.1:5173/`; giao diện trò chơi hiển thị trạng thái dùng chung, không có console warning/error trong lần quan sát. Màn hình khác đang mở có thể cần tải lại để nhận dữ liệu mới từ bản kia.
- Build Vite/NSIS thành công; scoped oxlint không có lỗi/cảnh báo. Quét secret trong stage, ASAR và thư mục đóng gói đều không có finding.
- Bộ cài `release/EduMaster-Setup.exe`: 113.336.039 byte; SHA-256 `35949060F5A35473A432D3F404C605F33C73A44475D277D0BA8C8140A7F9F2E0`.
- Bộ cài phản ánh working copy hiện tại, gồm các thay đổi sao/điểm đã có sẵn trước nhiệm vụ. Các thay đổi đó được giữ nguyên và không đưa vào commit đồng bộ này.

Đã kiểm tra toàn vẹn các snapshot và đối chiếu số dòng/tổng sao sau chuyển. Build/lint tệp thay đổi, đóng gói và quan sát giao diện được ghi trong bàn giao. Không thêm/chạy test tự động, không tạo giao dịch sao thử, không thử micro hoặc Microsoft thực tế.

API SQLite dùng theo [Node.js SQLite backup](https://nodejs.org/docs/latest-v22.x/api/sqlite.html#sqlitebackupsource-db-path-options); snapshot API hỗ trợ sao lưu nhất quán dữ liệu WAL. Cấu hình giao dịch có thời gian chờ khóa để hai tiến trình trên máy cùng truy cập.
