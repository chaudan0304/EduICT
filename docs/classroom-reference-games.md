# Tích hợp các trò chơi từ mã giáo viên cung cấp

Ngày 14/10/2026 · Nhánh `codex/classroom-reference-games`.

## Phạm vi

Chuyển phần nội dung và cách chơi trong HTML người dùng gửi sang React của EduICT. Dùng chung bộ chọn lớp, âm thanh, chế độ màn hình chơi và công cụ sao nhóm. Không nhúng trang HTML độc lập hoặc chạy mã từ nội dung người dùng.

Mở tại **Trò chơi lớp học**, hoặc nút **Trò chơi** trong tiết học/trình chiếu. Có năm trò chính: hộp quà hiện có và bốn phần tích hợp dưới đây. Các công cụ gọi tên, chuyến tàu chia nhóm, bản đồ nhiệm vụ vẫn ở **Hoạt động khác**.

## 1. Lật ảnh bí mật

- Chọn **Trắc nghiệm · Chọn đáp án**, **Hỏi miệng** hoặc chơi nhanh.
- Có 4 hoặc 12 mảnh. Tranh máy tính, chuột, bàn phím, thư mục hoặc ảnh trên máy.
- Nút **Dùng câu hỏi mẫu theo tranh** nạp bộ thiết bị hoặc thư mục. Chọn tranh không tự ghi đè bộ câu hỏi đang soạn.
- Đúng mở mảnh và được đoán; sai đổi lượt và giữ mảnh đóng. Luật điểm và thưởng sao giữ theo [bộ sân chơi trước](classroom-arcade-v2.md).
- Khi câu hỏi đang mở, chỉ hiện bảng trả lời. Các mảnh chưa mở luôn che kín ảnh, kể cả lúc bị khóa bấm, tránh quy tắc làm mờ nút của ứng dụng làm lộ tranh.
- Ảnh riêng vẫn chỉ giữ trong bộ nhớ cửa sổ, không tải lên hoặc đưa vào SQL/SQLite.

## 2. Kéo co trắc nghiệm

- **Thi đua · Hai bảng đáp án**: hai tổ cùng trả lời một câu, mỗi tổ có một lần chọn. Tổ đúng trước nhận 10 điểm và kéo dây một bước.
- Sai khóa bảng của tổ đó trong câu hiện tại. Nếu cả hai sai thì chuyển câu, không di chuyển dây. Giáo viên có thể bỏ qua câu; lượt đó không cộng điểm.
- Thắng khi cờ chạm vạch bốn bước. Sau tám lượt, vị trí cờ quyết định thắng hoặc hòa. Khi kết thúc không nhận đáp án mới.
- Hai bảng dùng trên cùng máy/bảng cảm ứng; giáo viên có thể bấm thay câu trả lời của tổ. Không phải phòng chơi nhiều thiết bị và không so tốc độ mạng.
- Vẫn có chế độ hỏi miệng theo lượt và kéo may mắn.

### Soạn trắc nghiệm

Mỗi dòng: `Câu hỏi | Đáp án A | Đáp án B | Đáp án C | B`.

Từ 2–4 lựa chọn, chữ cái cuối là đáp án đúng. Tối đa 24 câu, câu hỏi 400 ký tự, lựa chọn 240 ký tự. Dòng thiếu đáp án, đáp án vượt số lựa chọn hoặc dòng sai định dạng sẽ được báo trước khi bắt đầu. Hết bộ câu hỏi thì quay lại đầu. Văn bản được hiển thị qua React, không đưa vào HTML động.

## 3. Đoàn tàu quy trình

- Ba chặng mẫu: tắt máy, tạo thư mục, mở bài vẽ. Điều chỉnh nội dung từ mã gốc cho rõ quy trình; không giữ một chuỗi xử lý thông tin gồm bốn bước cố định vì lưu trữ không nhất thiết chỉ diễn ra cuối chuỗi.
- Tự soạn tên nhiệm vụ và 2–8 bước, mỗi bước tối đa 160 ký tự.
- Thẻ được xáo bằng Fisher–Yates. Bấm thẻ để lắp vào toa tiếp theo; bấm toa để gỡ, các toa sau dồn lại.
- Lắp đủ mới kiểm tra. Toa đúng/sai có chữ và dấu nhận biết. Đúng toàn bộ thì khóa chỉnh sửa, có thể chuyển chặng hoặc mở thưởng sao.
- Xếp lại/chuyển chặng đang dở cần xác nhận. Không dùng thông báo `alert` để báo mỗi đáp án.

## 4. Rồng ngủ trật tự

- Mặc định **Thầy cô điều khiển**, không yêu cầu micro. Thanh kéo thể hiện mức âm thanh do giáo viên chọn.
- Chế độ micro chỉ kết nối sau khi bấm **Bật micro** và cấp quyền; có **Tắt micro/Hủy kết nối**. Không tự kết nối lại sau khi tải trang.
- Chỉ phân tích biên độ âm thanh trong bộ nhớ. Không `MediaRecorder`, lưu âm thanh, truyền âm thanh hoặc phát lại qua loa.
- Mức 0–100 là chỉ báo tương đối, không phải dB. Có độ nhạy và ngưỡng điều chỉnh theo phòng học.
- Bấm **Bắt đầu tính mốc**. Phải yên tĩnh liên tục 10/20/30/60 giây để đạt một mốc. Vượt ngưỡng, tạm dừng hoặc mất nguồn đo thì tính lại từ đầu; không cộng thời gian khi ẩn trang hoặc máy ngủ.
- Rời trò chơi, đổi lớp, đóng màn hình hoặc ẩn trang sẽ dừng nguồn đo. Chuyển giữa màn hình thường/màn hình chơi cũng yêu cầu bật và bắt đầu lại.
- Không phát tiếng báo lỗi liên tục khi ồn, tránh tự làm tăng mức đo.
- Mốc là tiến độ hoạt động, không tự cộng sao học sinh. Giáo viên dùng nút **Thưởng sao cho lớp** để kiểm tra và xác nhận.

### Quyền micro trên desktop

Shell hỏi quyền bằng hộp thoại native cho mỗi yêu cầu. Chỉ nhận âm thanh từ khung chính EduICT và đúng origin backend; chặn camera, iframe và nguồn ngoài. Không lưu quyền chấp thuận vào tệp cấu hình. Nguồn tham khảo API: [Electron permission handlers](https://www.electronjs.org/docs/latest/api/session#sessetpermissionrequesthandlerhandler), [MediaAccessPermissionRequest](https://www.electronjs.org/docs/latest/api/structures/media-access-permission-request).

Trên web, micro cần môi trường được trình duyệt hỗ trợ và cấp quyền, thường là HTTPS hoặc localhost; khi bị chặn vẫn có chế độ thủ công. Tham khảo [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) và [phân tích tín hiệu âm thanh](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getByteTimeDomainData).

## Lưu trạng thái và giới hạn bàn giao

- Thiết lập và tiến độ hoạt động chỉ giữ theo lớp/ngày trong phiên trình duyệt. Không phải dữ liệu sao lưu nghiệp vụ. Sao đã xác nhận vẫn dùng sổ sao hiện có.
- Không thêm gói phụ thuộc, bảng dữ liệu, API hoặc tài khoản mới.
- Build Vite và lint tệp thay đổi thành công; kiểm tra cú pháp hai tệp shell desktop thành công. Build còn cảnh báo chunk lớn của ứng dụng.
- Đã xem bốn giao diện trong trình duyệt cục bộ 1280×720. Ảnh trong `scratch/classroom-reference-2026-10-14/`, không đưa lên Git.
- Chưa chạy test tự động, chưa chơi hết mọi nhánh, chưa đo micro thật, thử hộp cấp quyền trong Electron hoặc xác nhận giao dịch sao. Chưa kiểm chứng bố cục di động.
- Chưa tạo bộ cài EXE; cần đóng gói lại để phần mềm đã cài nhận cả giao diện mới lẫn thay đổi quyền micro.
