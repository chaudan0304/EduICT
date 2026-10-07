# EduMaster 1.6.0 — Xóa nhiều bài trong Thư viện

## Cách dùng

**Thư viện → Chọn nhiều bài → tích các bài cần xóa hoặc Chọn tất cả đang hiện → Xóa N bài đã chọn → xác nhận**.

- Mọi loại bài có ô chọn: bài soạn, PowerPoint đã nhập, liên kết trên máy và Online. Mỗi đợt tối đa 200 bài.
- Đổi khối, chủ đề, tìm kiếm, loại bài hoặc mức độ trùng sẽ bỏ chọn. Chỉ gửi các bài còn hiện trong danh sách; sắp xếp không đổi mã bài đã chọn.
- Chế độ chọn khóa thao tác mở/sửa/trình chiếu ở nội dung thẻ. Checkbox và nút thao tác có nhãn, dùng được bằng bàn phím.
- Xác nhận nêu số bài, tối đa 10 tên cùng số bài còn lại và phạm vi xóa. Bài liên kết không xóa file gốc trên máy/OneDrive/SharePoint; không gọi API xóa cloud. Slide lưu trong EduICT của các bài được xóa theo cascade. Lịch dạy lưu tên bài vẫn được giữ.
- Chỉ cập nhật giao diện/cache sau khi nhận xác nhận máy chủ. Lỗi giữ danh sách lựa chọn, có hướng dẫn tải lại nếu trạng thái chưa rõ. Không chuyển lỗi máy chủ thành xóa thành công ở local cache.

## API và dữ liệu

- `POST /api/lessons/batch-delete` với `{ ids: [lessonId], confirm: true }`.
- Nhận từ 1 đến 200 ID duy nhất, kiểm tra độ dài/ký tự, yêu cầu xác nhận. Route collection được xử lý trước CRUD tổng quát.
- Kiểm tra toàn bộ bài trong `BEGIN IMMEDIATE`; thiếu bài hoặc có bài đang IMPORTING/processing trả 409 và rollback trước khi xóa bất kỳ bài nào. Dùng hành vi deleteLesson hiện hữu để giữ tham chiếu/tên lịch dạy.
- Trả `{ deletedIds, deleted, referencedSessions, cleanupWarnings }`. SQL được commit cùng nhau; thư mục render/import dọn sau commit và báo lỗi riêng vì filesystem không thuộc giao dịch SQLite.
- Hàm dọn thư mục kiểm tra đường dẫn tuyệt đối chỉ nằm dưới uploads/presentations, không được trỏ vào gốc hoặc thư mục cha. Bài linked_powerpoint/powerpoint_online không dọn file nguồn.

## Bộ cài

- `release/EduMaster-Setup-1.6.0.exe`: **113122203 byte**, NSIS thành công, chưa ký số.
- SHA256: `0EB472E44B0A4A6E52477201318AB97D46A974E09D0BD8EBB65EFCB9811C2DB7`.
- Root/desktop/stage/ASAR/setup ProductVersion **1.6.0**; app EXE **1.6.0.0**.
- Stage cuối: `desktop/.stage/app-1.6.0-final`, 41 package backend hiện có. Không thay dependency.
- ASAR lấy từ chính setup khớp byte với win-unpacked; **160 file runtime** khớp stage cuối.
- Secret scan: nguồn/version/changelog 13 file, stage 913 file, ASAR 556 file, unpacked 5 file — 0 finding ở mỗi lần scan. Không đóng gói DB/uploads/settings/token.

## Kiểm tra và giới hạn

- `node --check` backend mới, routes và pptxService thành công. Oxlint phần mới không cảnh báo; LessonLibrary còn cảnh báo selectedTopic/useEffect có trước thay đổi.
- `npm run build`: thành công, 1960 module; giữ cảnh báo chunk >500 KB và SQLite experimental. Build dùng snapshot read-only qua VACUUM INTO tại `scratch/library-bulk-delete-build-1.6.0.sqlite`.
- Web restart tại `http://localhost:5173/` để nhận route mới. SQLite read-only trước/sau triển khai vẫn **70 bài, 858 slide**. Không gửi yêu cầu xóa dữ liệu thật.
- Chưa thêm/chạy test hoặc thử xóa qua giao diện, chưa chạy bộ cài trên máy người dùng. Build/payload không chứng minh hành vi runtime xóa nhóm. Người dùng cần cài 1.6.0 hoặc tải lại web để dùng tính năng.
- Rủi ro dependency audit của 1.5.0 còn nguyên (source-map-js, xlsx, chuỗi build desktop); xem báo cáo 1.5.0. Không chạy lại audit hoặc ép nâng dependency trong tính năng này.

## Các file chính

- `server/services/lessonBatchDelete.js`, `server/routes/lessons.js`, `server/pptxService.js`.
- `src/services/LessonBatchService.js`, `LessonLibrary.jsx`, `useLibrarySelection.js`, `LibrarySelection.jsx`, `LibrarySelection.css`.
