# Cửa sổ AI tạo câu hỏi

## Thay đổi

- Thiết lập và duyệt câu hỏi đặt cạnh nhau trên desktop; màn hình dưới 760 px chuyển thành hai bước.
- Chọn khối, tìm tên bài, tên hiển thị bỏ tiền tố file; mặc định ưu tiên khối của lớp hiện tại.
- Hiển thị và cho sửa kiến thức sẽ gửi đến Gemini, thêm yêu cầu của giáo viên.
- Bài PowerPoint Online chỉ có link cần bổ sung kiến thức nếu dữ liệu không có văn bản.
- Duyệt từng câu bằng checkbox, sửa nội dung, 4 phương án, đáp án, mức độ và giải thích trước khi lưu.
- Chuẩn hóa mức độ tiếng Việt; giải thích có thể thu gọn.
- Câu hỏi lưu theo bài tại thời điểm tạo. Thay thiết lập không đổi bài nguồn của bộ câu đã tạo.
- Chỉ xác nhận lưu khi API thành công. Câu đã lưu khóa chỉnh sửa và được loại khỏi lần lưu tiếp theo; lỗi một phần được báo trong cửa sổ.
- Hủy chờ hoặc đóng cửa sổ ngăn phản hồi cũ thay đổi kết quả. Các thao tác xung đột bị khóa khi tạo/lưu.
- Dialog dùng cơ chế focus và Escape của trình duyệt; giữ thanh lưu bên ngoài vùng cuộn.

## Hợp đồng API

`GET /api/ai/question-source/:lessonId` trả `{ success, data: { content, kind, slideCount, truncated } }`.

Nguồn lấy văn bản từ tối đa 30 trang đầu, hoặc mục tiêu/tóm tắt đã lưu. Không tải nội dung từ link Online. Nội dung giới hạn 12.000 ký tự.

`POST /api/ai/generate-questions` bổ sung hai trường tùy chọn: `sourceContent` (tối đa 12.000 ký tự) và `instructions` (tối đa 800 ký tự). Các trường hiện có giữ nguyên. Nếu không có nội dung căn cứ, trả lỗi để giáo viên bổ sung thay vì chỉ dựa vào tên bài.

Khóa bộ nhớ kết quả dùng đầy đủ nội dung và yêu cầu thêm để phân biệt các lần tạo.

`createQuestionApi` nhận tùy chọn `allowLocalFallback: false` cho cửa sổ này. Các nơi gọi cũ giữ cách hoạt động hiện có.

## Phạm vi bàn giao

Mã nguồn dùng chung web và desktop. Lượt này cập nhật mã và giao diện web tại localhost; không tạo bộ cài EXE mới.

Đã biên dịch Vite và chạy lint. Đã mở giao diện thực tại 1366 × 768, ghi ảnh trong `scratch/quiz-ui-review-2026-10-13/ai-generator-updated.jpg`.

Chưa gọi Gemini thật hoặc ghi câu hỏi vào dữ liệu đang dùng; luồng tạo/sửa/lưu và các kích thước màn hình khác chưa được kiểm thử trong lượt này.
