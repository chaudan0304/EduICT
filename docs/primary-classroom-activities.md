# Trò chơi lớp học — EduICT

## Cách sử dụng
Mở **Hoạt động → Trò chơi lớp học**, hoặc nút **Trò chơi** trong tiết học / thanh trình chiếu.

1. Chọn lớp đang dạy. Mở **Học sinh tham gia**, bỏ chọn học sinh vắng.
2. Chọn một trong ba trò. Có thể bật/tắt âm thanh riêng khi âm thanh ứng dụng được bật.
3. Chuẩn bị luật/nhiệm vụ rồi chọn **Màn hình chơi** để ẩn thiết lập.
4. **Về thiết lập** mở lại phần chuẩn bị; Esc đóng khung chơi hoặc trở về bài học.

### Hộp quà bí mật
- Chọn gọi tên học sinh hoặc mở nhiệm vụ. Nhập nhiệm vụ, mỗi dòng một câu, tối đa 12 câu khác nhau.
- Mở một trong 6 hộp. Không gọi lại học sinh/nhiệm vụ đã mở trong cùng vòng.
- Hết 6 hộp nhưng vẫn còn người/nhiệm vụ: bày 6 hộp tiếp theo, giữ lịch sử không lặp.
- Hết vòng: **Vòng mới** xóa lịch sử trò này sau khi giáo viên xác nhận.

### Chuyến tàu lớp học
- **Gọi học sinh**: chọn 1–6 bạn mỗi lượt; lượt cuối lấy số bạn còn lại nếu ít hơn.
- **Chia nhóm ngẫu nhiên**: chọn 2–8 nhóm; mỗi học sinh tham gia thuộc một nhóm.
  Số thành viên giữa các nhóm chênh tối đa một; số nhóm thực tế không vượt số học sinh.
- Chia nhóm lại thay thế các toa hiện tại. Chia nhóm không tiêu thụ danh sách gọi tên.
- **Vòng mới** xóa danh sách đã gọi, các toa và lịch sử; không xóa sao.

### Bản đồ kho báu
- Soạn tối đa 12 nhiệm vụ khác nhau, mỗi dòng một chặng; dùng 12 dòng khác nhau đầu tiên.
  Nội dung khóa khi đã có tiến độ.
- Giáo viên bấm **Xác nhận hoàn thành chặng**. Không chấm đúng/sai tự động.
- Có thể lùi một chặng hoặc bắt đầu bản đồ mới. Khi hoàn thành, hiện nút thưởng sao
  với danh sách học sinh tham gia đã chọn sẵn.

## Sao và dữ liệu
- Gọi tên, chia nhóm, mở hộp, hoàn thành chặng không tự thay đổi sao.
- Nút thưởng mở công cụ **Sao nhóm / Hoàn tác** có sẵn; giáo viên kiểm tra người nhận,
  số sao, học kỳ và lý do rồi xác nhận. Công cụ này cũng hỗ trợ trừ và hoàn tác.
- Sao thưởng nhóm đi qua `/api/gamification/stars/class-adjust`: ghi sổ cái,
  số dư và nhật ký điểm tốt trong giao dịch hiện có. Dùng `ClassStarContext` đồng bộ
  kết quả server; không lưu lại toàn bộ danh sách học sinh bằng số dư cũ.
- Khi chưa nhận kết quả, công cụ giữ operationId để thử lại cùng lượt. Sau khi đã
  thành công, xác nhận thưởng lần nữa là một lượt thưởng mới do giáo viên quyết định.
- Lùi chặng / vòng mới không hoàn tác sao. Hoàn tác sao dùng công cụ sao riêng.
- Tiến độ trò chơi, lựa chọn tham gia, nhiệm vụ và lịch sử giữ tạm trong sessionStorage
  theo lớp/ngày mở, có bộ nhớ dự phòng khi storage bị chặn. Khóa ngày được chọn khi
  mở trò chơi. Đây không phải dữ liệu trong SQL/SQLite hoặc xuất sao lưu.
- Chỉ lưu ID học sinh trong lịch sử; lấy tên từ danh sách hiện tại.
- Sao qua công cụ nhóm chưa gắn session_id; không tự tính thành lượt tham gia tiết học.

## Tích hợp và khả năng truy cập
- Sidebar, trang chủ, SessionControlBar và PresentationView đều có lối mở.
- Dialog native giữ focus trong khung chơi, trả focus khi đóng. Tab trò chơi hỗ trợ
  trái/phải, Home/End; các nút có nhãn và kết quả dùng vùng thông báo.
- `prefers-reduced-motion` tắt rung/chuyển động và thời gian chờ.
- Trình chiếu PowerPoint dùng openTool hiện có để ẩn bề mặt native; phím trò chơi
  không đồng thời chuyển slide.
- Lớp rỗng / không chọn người tham gia có hướng dẫn; hộp nhiệm vụ vẫn dùng được khi lớp rỗng.

## Bằng chứng và giới hạn (2026-10-13)
- Build production thành công; lint các component mới và component tích hợp không có cảnh báo.
  App.jsx có cảnh báo dependency useEffect cũ, không thuộc phần trò chơi.
- Đã xem ba giao diện trong trình duyệt đang chạy và lưu ảnh vào
  `scratch/primary-activities-2026-10-13/`.
- Không chạy test tự động; chưa xác minh giao dịch thưởng sao thực tế hoặc trình chiếu
  PowerPoint native trên desktop. Không thay dữ liệu học sinh để xem giao diện.
- Chưa đóng gói EXE: nguồn mới cần `npm run desktop:installer` khi yêu cầu cập nhật bộ cài.
- Claude Code đã thử qua proxy hiện có; models API có kết quả nhưng CLI từ chối
  Opus 5 / Sonnet 5. Không có mã nào được Claude viết; Codex tự triển khai theo quyền dự phòng.
