# Thiết kế tiến trình bằng AI — giao diện mới (2026-10-14)

## Thay đổi trải nghiệm
- Dialog native giữ focus, hỗ trợ Esc và trả focus về nút mở; bỏ footer nền tối
  không khớp giao diện sáng. Cửa sổ có chiều cao ổn định, vùng cuộn riêng.
- Máy tính: cột chuẩn bị bên trái, cột xem lại bên phải. Cửa sổ nhỏ: xếp một cột.
- Chọn đúng bài gắn với tiết học; có thể chọn bài khác và thời lượng 35/40/45 phút.
- Không tự gọi Gemini khi mở. Trạng thái đầu hướng dẫn bấm Tạo đề xuất, tránh
  trường hợp modal mở trước khi danh sách bài được nạp rồi để phần nội dung trống.
- Loading có thông báo và nút Dừng chờ; lỗi có hướng dẫn. Dừng chờ/đóng bỏ phản hồi
  cũ ở trình duyệt, không cam kết hủy tác vụ đã được server xử lý.
- Mỗi hoạt động có thể sửa tên, loại, số phút và cách tổ chức. Tổng số phút được
  tính từ các hoạt động thực tế, không tin riêng totalDuration do AI báo.
- Chỉ áp dụng khi tên và thời lượng hợp lệ, tổng khớp thời lượng tiết học và giáo
  viên xác nhận thay thế toàn bộ tiến trình hiện tại.
- Tạo lại bị lỗi/dừng chờ giữ bản cũ; đổi bài hoặc thời lượng xóa bản cũ như hướng dẫn.

## Lưu và tích hợp
- Chuẩn hóa LESSON → PRESENTATION, PRACTICE → ACTIVITY; giữ SUMMARY thay vì đổi
  nhầm thành bài giảng. Dùng danh mục ACTIVITY_TYPES của ứng dụng.
- Chờ onApplyFlow hoàn tất mới đóng. Lỗi lưu giữ bản chỉnh sửa và ID để thử lại.
- Nhánh áp dụng AI dùng saveActivitiesApi với allowLocalFallback:false, thông qua
  apiClient có timeout. Không thông báo thành công chỉ nhờ localStorage.
- Sau khi server lưu thành công, chọn hoạt động đầu và đặt lại đồng hồ hoạt động
  theo thời lượng mới. Các hoạt động mới có trạng thái PENDING; không gọi callback
  chọn hoạt động dùng mảng cũ, tránh ghi đè tiến trình AI bằng tiến trình trước đó.
- Các luồng lưu thông thường vẫn dùng cơ chế fallback hiện có; không sửa schema,
  sao, điểm hay prompt/backend Gemini.

## Bằng chứng và giới hạn
- Build production thành công; lint các file modal, helper, card, client API,
  LessonFlowList và sessionStorage không có cảnh báo.
- Đã xem dialog trên tiết học hiện có tại localhost:5184; bài được chọn đúng theo
  lesson_id, phần hướng dẫn và nút tạo hiện rõ. Ảnh:
  scratch/ai-lesson-flow-2026-10-14/ai-lesson-flow.jpg.
- Chưa gọi Gemini thật, chưa áp dụng/ghi tiến trình vào dữ liệu tiết học để xác
  minh. Không tạo/chạy test tự động và chưa đóng gói EXE.
- SessionDashboard còn các cảnh báo import/dependency có từ trước, ngoài phần sửa.
