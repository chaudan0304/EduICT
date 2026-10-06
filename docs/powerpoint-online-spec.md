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

## Nguồn

- https://support.microsoft.com/en-us/powerpoint/embed-a-presentation-in-a-web-page-or-blog
- https://support.microsoft.com/en-us/powerpoint/animation-effects-available-in-powerpoint-for-the-web
- https://support.microsoft.com/en-us/powerpoint/compare-powerpoint-features-on-different-platforms

## Nghiệm thu

Build/lint và kiểm tra gói cài trước khi giao. Không chạy test khi người dùng chưa yêu cầu. Cần một URL Embed thật do người dùng cung cấp để xác nhận tải bài và hiệu ứng thực tế; không đưa URL có quyền truy cập vào Git/log.
