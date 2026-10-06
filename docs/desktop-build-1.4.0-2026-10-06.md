# EduMaster 1.4.0 — Gắn PowerPoint Online hàng loạt

## Gói cài

- `release/EduMaster-Setup-1.4.0.exe`: 113109746 byte, NSIS build thành công, chưa ký số.
- SHA256: `A8222D9F6211B6124D0C3EF99E7899DAFD3BF6647CFC41EAC4BDE67AC5AEE2CD`.
- Root, desktop, stage, ASAR và ProductVersion bộ cài: 1.4.0. EXE ứng dụng: 1.4.0.0.
- ASAR trích từ chính EXE bộ cài khớp byte với bản đóng gói. 154 file runtime server/shared/dist/desktop khớp stage.
- Secret scan: stage 907 file, ASAR 550 file, unpacked 5 file; không có finding. Nội dung 9 file frontend/version/changelog đã stage cũng không có finding.

## Thay đổi và cách dùng

1. Desktop: đóng app cũ và cài EXE 1.4.0. Web trên máy: tải lại `http://localhost:5173/`.
2. Vào **Bài học & slide → Gắn Online hàng loạt**.
3. Dán mỗi mã Embed/URL nhúng vào một dòng, hoặc nhập TXT UTF-8. Có thể dùng `Tên bài | mã Embed`; hỗ trợ iframe nhiều dòng, tối đa 200 bài/đợt.
4. Chọn **Xem danh sách**, chọn khối và bài đã có hoặc đặt tên để tạo bài mới. Sửa mã, bỏ dòng thừa, xác nhận từng liên kết cần thay.
5. Chọn **Lưu … liên kết**. Danh sách lỗi/trùng hoặc bài đã thay đổi được chặn; giao dịch rollback cả đợt khi lưu lỗi. ID mới ổn định giúp gửi lại cùng danh sách sau mất phản hồi không tạo trùng bài.

Gắn vào bài đã có chỉ cập nhật URL Online, giữ thông tin, file và slide. Mã do người dùng dán không được thực thi như HTML; URL được kiểm tra bằng validator chung. Không tự tải PPTX lên Microsoft hoặc đổi quyền chia sẻ. Vẫn cần lấy mã Embed riêng cho từng bài trên Microsoft.

## Kiểm tra đã thực hiện

- `npm run build`: 1953 module, thành công; cảnh báo chunk >500KB và SQLite experimental còn như trước.
- Node syntax check: shared parser, batch service, route; oxlint các file mới/service không có cảnh báo. LessonLibrary chỉ có cảnh báo selectedTopic effect dependency đã tồn tại trước thay đổi.
- Review nguồn: dữ liệu vào được giới hạn và whitelist, câu lệnh SQL có binding; kiểm tra xung đột trong write transaction, không gọi saveLessonSlides hoặc thay metadata bài cũ. Lỗi không trả URL/SQL, không thêm dependency.
- Vite build dùng snapshot nhất quán `scratch/powerpoint-online-batch-build.sqlite` tạo từ DB thật bằng kết nối read-only + VACUUM INTO.
- Web đã restart để nạp route mới. DB thật vẫn có 88 bài, 1117 slide, 0 liên kết Online; không ghi dữ liệu batch thử vào thư viện người dùng.
- Không thêm/chạy test; chưa thử lưu hàng loạt hoặc trình chiếu bằng liên kết Microsoft thật, chưa cài EXE mới vào máy người dùng. Các kiểm tra build/payload không thay thế việc nghiệm thu tính năng thực tế.
- Không đổi dependency. Các finding audit đã ghi ở bản 1.3.0 còn chưa xử lý; xem `docs/desktop-build-1.3.0-2026-10-06.md`.

## Tài liệu Microsoft

- https://support.microsoft.com/en-us/onedrive/upload-and-save-files-and-folders-to-onedrive
- https://support.microsoft.com/en-us/powerpoint/embed-a-presentation-in-a-web-page-or-blog
