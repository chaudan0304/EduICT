# EduMaster 1.7.0 — Xuất và phục hồi đầy đủ dữ liệu

## Cách dùng

- Cơ sở dữ liệu/Sao lưu: tải **JSON**, **SQL** hoặc **SQLite**. Các bản mới lấy toàn bộ cơ sở dữ liệu đang dùng, không lọc theo lớp hay năm học trên màn hình.
- Mọi nút xuất Excel (thanh công cụ, Sổ điểm, Sổ điểm tốt) xuất toàn bộ dữ liệu; lớp đang chọn được ưu tiên trong thứ tự các sheet lớp. Nút tải **file mẫu** vẫn tạo mẫu trống để nhập danh sách, không phải sao lưu.
- Excel có bảng điểm từng lớp (cả hai học kỳ, sao, kỹ năng, nhận xét, chuyên cần), **SO_DIEM_TOT** chứa mọi trường nhật ký điểm tốt/điểm trừ, **DB_*** giữ mọi cột của các bảng. Lớp rỗng chỉ có tiêu đề, không có học sinh giả; tên sheet trùng được thêm hậu tố.
- **BACKUP_JSON** chứa toàn bộ snapshot/schema/kiểu dữ liệu, chia thành các phần JSON theo thứ tự. Ghép cột JSON để nhận lại file JSON toàn bộ. Văn bản vượt giới hạn ô Excel được chia vào **DU_LIEU_DAI**, có sheet/dòng/cột/phần để ghép lại.
- Để phục hồi toàn bộ qua giao diện, dùng **JSON hoặc SQL**. Trình nhập Excel danh sách hiện tại chỉ nhập danh sách học sinh, không phục hồi mọi bảng/điểm. Các sheet hệ thống mới được bỏ qua khi nhập danh sách.
- Nhập JSON/SQL yêu cầu xác nhận và tạo bản sao an toàn ở thư mục backup trước khi thay dữ liệu. JSON cũ dạng classes được ghép vào SQLite, giữ các bảng không có trong file; JSON mới phục hồi toàn bộ các bảng trong snapshot.

Các bản xuất giữ **dữ liệu đã lưu**. Không đóng gói file PowerPoint ngoài máy/OneDrive, token đăng nhập hay cấu hình bí mật môi trường. Giữ liên kết/thông tin bài học. Sao lưu thư mục hiện hữu của ứng dụng dành cho DB và tài nguyên đã tải vào uploads. File cũ đã thiếu dữ liệu không thể tự bổ sung; cần xuất lại từ bản mới.

## Nguyên nhân và thay đổi

- SQL cũ chỉ ghi 6 bảng và bỏ classes.good_scores/các cột metadata. Bản mới đọc schema và mọi bảng ứng dụng thực tế trong giao dịch đọc nhất quán, không dùng danh sách cột hardcode.
- JSON cũ chỉ xuất classes đang tải và máy hỏng; nhập chỉ ghi cache trình duyệt, SQLite không được cập nhật. Bản mới xuất từ backend và phục hồi vào DB.
- SQLite cũ sao chép file chính đang mở, có thể thiếu dữ liệu trong WAL. Bản mới tạo file riêng bằng **VACUUM INTO** rồi stream; dọn file tạm sau khi stream đóng, kể cả khi tải bị ngắt.
- SQL/JSON giữ NULL, số 0, Unicode, timestamp, blob và số nguyên 64 bit (tag trong JSON khi ngoài giới hạn chính xác của Number). Bản SQL toàn bộ mới chạy trong giao dịch có rollback và foreign_key_check. SQL chặn truy cập DB/file bên ngoài, extension và PRAGMA sửa schema trực tiếp. Kịch bản SQL cũ vẫn được hỗ trợ; bản an toàn được tạo trước khi chạy.
- Lưu học sinh bằng UPSERT, chỉ xóa học sinh thực sự bị gỡ. Sắp xếp bằng cập nhật rowid trong giao dịch, không DELETE/INSERT cả lớp, giữ tham chiếu theo (id,class_id) và lịch sử liên quan.
- Chỉ seed dữ liệu mẫu khi tạo DB mới. Bảng rỗng do xóa hoặc phục hồi không tự được thêm mẫu khi khởi động.
- JSON/SQL giới hạn 50 MiB; nhập cho phép body JSON 60 MiB để chứa các ký tự escape của SQL. Nếu vượt giới hạn, báo lỗi và hướng dẫn SQLite, không xuất một phần dữ liệu. Excel giữ giới hạn số dòng/cột chuẩn và báo lỗi khi vượt, không cắt dữ liệu.

Tham khảo thiết kế: [SQLite VACUUM INTO](https://www.sqlite.org/lang_vacuum.html), [SQLite transactions](https://www.sqlite.org/lang_transaction.html), [Node SQLite integer types](https://nodejs.org/api/sqlite.html).

## Bộ cài

- `release/EduMaster-Setup-1.7.0.exe`: **113125754 byte**, NSIS hoàn tất, chưa ký số.
- SHA256: `63D192BE71E83DBF652F62859FF5951F3CC2B8CFB6A9FB74C2ED95A71E68731C`.
- Root/desktop/stage/ASAR/setup: **1.7.0**. App EXE ProductVersion: **1.7.0.0**.
- Stage mới `desktop/.stage/app-1.7.0`: 41 package backend sẵn có; không đổi dependency.
- ASAR trích từ chính setup khớp byte với win-unpacked, **164 file runtime/package** khớp stage.
- Secret scan: 19 file nguồn/version/changelog, stage 915 file, ASAR 558 file, unpacked 5 file — **0 finding** ở mỗi lần scan. Không đóng gói DB, uploads hoặc cấu hình riêng.

## Kiểm tra và giới hạn

- Syntax backend và git diff --check thành công; oxlint các helper xuất/nhập mới không cảnh báo. Các component/schema còn cảnh báo có từ trước, exit 0.
- Vite build thành công: 1961 module; còn cảnh báo chunk lớn và SQLite experimental. Build dùng snapshot riêng từ kết nối read-only, không build trên DB thật.
- Đọc DB web trong lúc triển khai: 22 bảng, 23 lớp, 811 học sinh; 23 lớp có nhật ký good_scores, chưa có điểm HK1/cuối năm non-NULL, foreign_key_check 0 lỗi. Ở thời điểm build và sau restart: 3 bài/16 trang. Trước đó thư viện rỗng; dữ liệu có thể được người dùng cập nhật trong quá trình làm việc.
- Web restart tại localhost:5173, PID 3848, log xác nhận Vite ready. Không đóng ứng dụng desktop đang cài, không tự chạy bộ cài mới.
- **Chưa thêm/chạy test**, chưa thao tác xuất/nhập qua UI hoặc chạy phục hồi dữ liệu thật. Build và đối chiếu payload không chứng minh round-trip runtime; người dùng cần xuất lại và nghiệm thu bản mới. Không thể khôi phục điểm đã bị mất từ trước chỉ bằng sửa export.
- Rủi ro dependency audit của 1.5.0 còn nguyên (xlsx/source-map-js/chuỗi build desktop); không ép nâng dependency trong thay đổi này.

## File chính

`server/services/databaseExport.js`, `legacyJsonBackup.js`, `server/db/backup.js`, `classes.js`, `schema.js`, `server/routes/backup.js`, `helpers.js`, `src/services/FullDataExportService.js`, `src/utils/storage.js`, `excelImport.js`, `Navbar.jsx`, `Gradebook.jsx`, `GoodScoresBoard.jsx`.
