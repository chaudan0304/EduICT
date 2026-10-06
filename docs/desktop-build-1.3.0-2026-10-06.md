# EduMaster 1.3.0 — PowerPoint Online

## Kết quả

- Bộ cài: `release/EduMaster-Setup-1.3.0.exe`.
- Dung lượng: 113105619 byte.
- SHA256: `E0172CDEB17C018E72186DFA77447F2C34A439879FFE19505F1B40C7A8A6178C`.
- NSIS build thành công bằng cache NSIS 3.04 và 7zip. Bộ cài chưa ký số.
- Root, desktop, stage, ASAR và EXE cùng version 1.3.0.
- Payload ASAR lấy từ chính EXE khớp bản đóng gói; 151 file runtime (server/shared/dist/desktop) khớp stage.
- Secret scan: stage 904 file, ASAR 547 file, unpacked 5 file; 0 finding.
- `npm run build`: 1951 module, thành công. Còn cảnh báo chunk >500KB và SQLite experimental như trước.
- Oxlint các component/service/helper mới và PresentationView/TeacherNotesDrawer/LinkedPowerPointCard: không có cảnh báo. Lint thêm DB/Library chỉ có cảnh báo có sẵn về catch không dùng và selectedTopic effect dependency.
- Không thêm/chạy test. Chưa chạy bài Microsoft Online thật; cần URL Embed do người dùng cung cấp, quyền xem và mạng.

## Dữ liệu và web trên máy

- Trước khi build/restart, tạo snapshot SQLite nhất quán ở `scratch/powerpoint-online-build.sqlite` từ DB web hiện tại bằng kết nối read-only + VACUUM INTO. Vite build dùng snapshot, không dùng DB thật.
- Web được khởi động lại ở `http://localhost:5173/` để nạp backend/schema mới. DB thật thêm trường `online_embed_url`; sau khởi động vẫn có 88 bài và 1117 slide, 0 URL Online đã được gắn.
- Không tải 88 file lên Microsoft; chưa có tài khoản/link Embed. File/ảnh hiện tại phục vụ bài cũ vẫn nằm trên máy.

## Cách sử dụng

1. Đóng app cũ và cài EXE 1.3.0 nếu dùng Desktop. Nếu dùng web đang chạy trên máy, tải lại trang.
2. Trong **Bài học & slide**, chọn **PowerPoint Online** để tạo bài mới, hoặc **Online** ở bài hiện có để gắn link đúng bài.
3. Tải PPTX lên OneDrive của bạn. Với bài đã nhập, hộp thoại có **Tải file gốc**.
4. Mở PowerPoint Online → File → Share/Chia sẻ → Embed/Nhúng → Copy. Dán toàn bộ iframe hoặc URL `src` vào EduICT và lưu. URL chia sẻ thông thường bị từ chối; không tự chuyển link chưa được kiểm chứng.
5. Trình chiếu trong EduICT, dùng điều khiển của Microsoft để đổi slide. Thanh EduICT giữ công cụ lớp học; nút ẩn công cụ giúp thao tác trên slide, nút **Hiện công cụ EduICT** đưa thanh trở lại.
6. Khi Microsoft yêu cầu quyền/đăng nhập hoặc không hiện bài, dùng **Mở bài** để kiểm tra trên Microsoft. Iframe load không chứng minh bài đã được phép xem.

## Review và dependency audit

Luồng mới không thêm package, không thay cấu hình bảo mật Electron, không thêm OAuth/credentials hoặc tự cấp quyền chia sẻ. URL được kiểm tra HTTPS, host và đường dẫn Embed ở API và browser. Chỉ URL được lưu; không render HTML raw, không server-fetch URL. Iframe sandbox không cấp top navigation/fullscreen; fullscreen dùng EduICT để giữ công cụ.

Audit toàn lockfile vẫn có findings từ dependency sẵn có: root 2 high (`source-map-js`, `xlsx`); desktop 1 high (`http-cache-semantics`) và 8 moderate. Không chạy audit fix hoặc đổi dependency trong thay đổi Online.

- `source-map-js` thuộc chuỗi PostCSS/build; source map bên ngoài không được nhận trong luồng Online mới. Không nằm trong production backend stage.
- `http-cache-semantics` thuộc công cụ download/build Electron. Build này dùng các binary trong cache; không thuộc runtime backend được ship.
- `xlsx` 0.18.5 có advisory prototype pollution/ReDoS, còn có thể được gọi ở nhập Excel của giao diện cũ. Đây là rủi ro hiện hữu, chưa được sửa bởi tính năng Online. Bản này là bộ cài thử nghiệm chức năng, không phải xác nhận an toàn toàn bộ dự án.

Theo dõi nâng cấp SheetJS và dependencies build trong một thay đổi riêng (owner Codex, rà soát tiếp trước phát hành production; mốc xem lại 13/10/2026). Audit JSON đầy đủ ở scratch, không chứa dữ liệu người dùng và không đưa vào gói cài.

## Nguồn

- https://support.microsoft.com/en-us/powerpoint/embed-a-presentation-in-a-web-page-or-blog
- https://support.microsoft.com/en-us/powerpoint/compare-powerpoint-features-on-different-platforms
