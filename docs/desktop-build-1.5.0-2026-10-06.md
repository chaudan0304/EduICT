# EduMaster 1.5.0 — Nhập thư mục OneDrive cá nhân

## Tính năng

- Thư viện bài học có nút **Chọn thư mục OneDrive**: kết nối Microsoft, duyệt thư mục, chọn PowerPoint, sửa tên bài, chọn khối và xác nhận nhập hàng loạt.
- Tối đa 200 file mỗi đợt, đọc file trực tiếp trong thư mục đang mở. Người dùng mở thư mục con để nhập các bài bên trong.
- Đọc metadata và tạo link Embed qua Microsoft Graph; không tải hoặc lưu nội dung PowerPoint vào EduICT. Cần xác nhận tạo link mà người có link có thể xem không cần đăng nhập.
- Có thể gắn file vào bài đã có, giữ thông tin bài và lịch dạy. Mã drive/item giúp nhận diện file đã nhập trong các lần sau. Đợt nhập chỉ lưu thư viện khi toàn bộ file thành công; link đã tạo trên Microsoft có thể còn tồn tại nếu dừng/lỗi.
- Hướng dẫn đăng ký ứng dụng Microsoft nằm ngay trong hộp thoại và trong [onedrive-folder-import.md](onedrive-folder-import.md). Cần Application (client) ID của ứng dụng có hỗ trợ tài khoản cá nhân, public client flow và quyền delegated Files.ReadWrite. Không cần mật khẩu hoặc client secret trong EduICT.

## Bộ cài

- `release/EduMaster-Setup-1.5.0.exe`: **113120490 byte**, NSIS build thành công, chưa ký số.
- SHA256: `1C3F3EAB907FAAFAA8EC483BC42247E2C16B3391D7500B7EC17FF8877112FB2C`.
- Root/desktop/stage/ASAR/setup ProductVersion: **1.5.0**; app EXE: **1.5.0.0**.
- ASAR giải nén từ chính bộ cài khớp byte với bản win-unpacked; **158 file runtime** khớp với stage cuối cùng.
- Secret scan stage: 911 file, 0 finding; ASAR từ setup: 554 file, 0 finding; unpacked: 5 file, 0 finding.
- Gói cài không chứa SQLite, uploads, settings, token Microsoft hoặc client ID thật. Token chỉ tồn tại trong bộ nhớ backend đến khi phiên kết thúc/hết hạn.

## Kiểm tra và giới hạn

- `npm run build` thành công, 1956 module. Giữ cảnh báo chunk >500 KB và Node SQLite experimental.
- `node --check` backend mới và DB sửa đổi thành công; oxlint phần OneDrive mới không cảnh báo. LessonLibrary còn cảnh báo useEffect selectedTopic đã có trước thay đổi.
- Build dùng snapshot read-only qua VACUUM INTO: `scratch/onedrive-folder-build-1.5.0.sqlite`.
- Web đã restart tại `http://localhost:5173/`. Kiểm tra SQLite read-only sau khởi động: **88 bài, 1117 slide**, có hai cột nguồn OneDrive mới, **0 bài đã nhập từ OneDrive**.
- Chưa thêm/chạy test, chưa cài bộ EXE lên máy người dùng. Kiểm tra build/payload không chứng minh đăng nhập, quyền cloud, createLink hoặc hiệu ứng trình chiếu thực tế.
- Người dùng chưa đăng ký client ID; chưa kết nối OneDrive thật. Cần hoàn tất hướng dẫn đăng ký rồi đăng nhập và nhập một thư mục thực tế để xác nhận hoạt động trên tài khoản của người dùng.
- Microsoft Graph tạo Embed tự động chỉ hỗ trợ OneDrive cá nhân. Khả năng phát hiệu ứng/định dạng thuộc PowerPoint Online.

## Dependency audit

Không thay dependency trong bản này. Kết quả audit đã lưu tại `scratch/onedrive-root-audit.json` và `scratch/onedrive-desktop-audit.json`:

- Root: 2 high, 0 critical — source-map-js (chuỗi build PostCSS; có bản sửa theo audit), xlsx 0.18.5 (chức năng nhập Excel hiện hữu; audit chưa có bản sửa).
- Desktop: 1 high, 8 moderate, 0 critical — high http-cache-semantics thuộc chuỗi tải/build, không nằm trong backend stage.
- Đây là các rủi ro hiện hữu, chưa được khắc phục trong bản 1.5.0. Mốc rà soát tiếp theo: 2026-10-13. Kết quả build/secret scan không phải chứng nhận an toàn cho toàn bộ dự án.

## Nguồn Microsoft

- https://learn.microsoft.com/en-us/graph/api/driveitem-createlink?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/graph/api/driveitem-list-children?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-device-code
- https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app
- https://learn.microsoft.com/en-us/entra/identity-platform/scenario-desktop-app-configuration
