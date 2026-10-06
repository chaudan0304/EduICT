# PowerPoint Online trong EduICT

## Mục tiêu và phạm vi

Giữ màn trình chiếu web và các công cụ Thưởng sao, Vòng quay, Đua vịt, Quick Quiz, Ghi chú, Lịch dạy. PowerPoint Online phát bài trong iframe Microsoft; EduICT lưu URL nhúng và metadata, không tải hoặc render file PPTX mới.

Người dùng tải file lên OneDrive/SharePoint trong tài khoản của mình, mở PowerPoint Online và lấy mã Embed. Bản này không có Microsoft OAuth/Graph để tự tải 88 bài lên tài khoản. Việc đăng nhập, upload và quyền chia sẻ phải được thực hiện trên Microsoft.

## Luồng dữ liệu

- Bài mới: `type=powerpoint_online`, `online_embed_url`, tiêu đề, khối, chủ đề, thời lượng, ghi chú. Không tạo ảnh slide.
- Bài đã nhập: thêm `online_embed_url` qua PUT bài hiện tại; giữ ID, file gốc, ảnh cũ và các liên kết tiết học. Khi có URL thì ưu tiên trình chiếu Online; xóa URL trở về chế độ hiện tại.
- CRUD, nhân bản và backup phải giữ URL. Xóa bài Online không tác động đến file trên Microsoft.
- Validator dùng chung API/browser: chỉ HTTPS, host/path Embed OneDrive hoặc SharePoint; lấy `src` từ iframe, không chèn HTML do người dùng dán. Không fetch URL từ server.

## Giao diện và giới hạn

- Iframe chiếm vùng slide; capsule tiêu đề/công cụ EduICT nổi phía trên. Có lựa chọn ẩn công cụ và hiện lại để dùng điều khiển Microsoft.
- Điều hướng slide bằng trình xem Microsoft. Không giả lập nút Trước/Tiếp hoặc số trang EduICT vì iframe khác origin không cung cấp API điều khiển được tài liệu hóa.
- Ghi chú Online là ghi chú cấp bài, không gán nhầm cho slide ảnh cũ.
- Giữ iframe khi mở/đóng công cụ để không khởi động lại bài. Có trạng thái mất mạng, nạp chậm, tải lại và mở Microsoft ở tab/trình duyệt khác.
- `load` của iframe không chứng minh bài được phép xem: lỗi quyền hoặc yêu cầu đăng nhập có thể hiển thị bên trong iframe, EduICT không đọc được nội dung đó.
- Cần Internet và quyền xem trên Microsoft. Mã Embed có thể cho phép người có link xem bài; người dùng quyết định quyền chia sẻ. Không cam kết hiệu ứng/trigger tương đương PowerPoint Desktop.

## Gắn Online hàng loạt

- Trong thư viện chọn **Gắn Online hàng loạt**, dán mỗi URL/mã Embed vào một dòng hoặc nhập file TXT UTF-8. Hỗ trợ iframe xuống nhiều dòng và định dạng `Tên bài | mã Embed`. Tối đa 200 bài/đợt; không nhận link thư mục thay cho mã từng bài.
- Bước xem danh sách cho phép sửa mã, tên, khối, bỏ dòng và chọn bài đang có. Không tự ghép bài theo tên. Chọn bài đã có chỉ thay URL Online, giữ ID, file, slide, lịch dạy và ghi chú. Tạo bài mới dùng thời lượng 35 phút và chủ đề Chung.
- Liên kết/bài trùng trong một đợt bị chặn. Thay URL đã có cần tích xác nhận từng bài. Khi bài thay đổi kể từ lúc tải danh sách, yêu cầu tải lại và kiểm tra lại xác nhận.
- `POST /api/lessons/powerpoint-online/batch`: JSON `{ items: [...] }`, 1–200 phần tử. Dòng gắn bài cũ: `{ lesson_id, online_embed_url, expected_url, expected_updated_at, replace_existing }`. Dòng tạo bài: `{ new_id: UUIDv4, title, grade: 1..5, online_embed_url }`. ID mới được server đặt tiền tố `online_`; không nhận metadata/file/slide tùy ý trong batch.
- Thành công HTTP 200: `{ lessons, created, updated, unchanged }`. Lỗi theo hợp đồng hiện tại `{ error: string }`: 400 dữ liệu không hợp lệ, 409 bài bị xóa/thay đổi hoặc ID mới xung đột, 413 body vượt 10 MB, 500 lỗi lưu chung. Không trả nội dung SQL/URL trong lỗi.
- Giao dịch SQLite `BEGIN IMMEDIATE` kiểm tra toàn bộ mục tiêu, sau đó lưu một lần; lỗi rollback cả đợt. UUID ổn định theo dòng giúp gửi lại sau mất phản hồi không tạo bài mới lần nữa. Đợt đã lưu được gửi lại sẽ trả `unchanged`.
- Không tải file lên Microsoft qua API, không tự cấp quyền chia sẻ. Người dùng có thể tải nhiều file/cả thư mục qua OneDrive rồi lấy mã Embed riêng từng bài.

## Nguồn

- https://support.microsoft.com/en-us/powerpoint/embed-a-presentation-in-a-web-page-or-blog
- https://support.microsoft.com/en-us/powerpoint/animation-effects-available-in-powerpoint-for-the-web
- https://support.microsoft.com/en-us/powerpoint/compare-powerpoint-features-on-different-platforms
- https://support.microsoft.com/en-us/onedrive/upload-and-save-files-and-folders-to-onedrive

## Nghiệm thu

Build/lint và kiểm tra gói cài trước khi giao. Không chạy test khi người dùng chưa yêu cầu. Cần một URL Embed thật do người dùng cung cấp để xác nhận tải bài và hiệu ứng thực tế; không đưa URL có quyền truy cập vào Git/log.
