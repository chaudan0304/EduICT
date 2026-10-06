# Lịch sử thay đổi

## 1.4.1 — 06/10/2026

### Sửa

- Bộ kiểm tra từ chối iframe PowerPoint Online dạng `1drv.ms/p/c/<CID>/I<token>` không có `em=2`, đúng dạng người dùng đã dán trong ảnh báo lỗi.
- Dùng cùng nhận diện ở form một bài, danh sách hàng loạt, API và trình xem; giữ nguyên URL từ Microsoft, không bổ sung tham số hoặc đưa mã HTML vào trang.

Build và payload được kiểm tra; chưa xác nhận quyền xem hoặc hiệu ứng của bài trên Microsoft.

## 1.4.0 — 06/10/2026

### Thêm

- Gắn PowerPoint Online hàng loạt: dán nhiều mã Embed hoặc nhập file TXT, xem và sửa danh sách trước khi lưu, tối đa 200 bài mỗi đợt.
- Mỗi dòng có thể tạo bài Online mới hoặc gắn vào bài đã có, chọn khối và xác nhận thay liên kết cũ. Giữ lịch dạy, file gốc, slide và ghi chú của bài hiện tại.
- API lưu cả đợt trong một giao dịch; kiểm tra link/bài trùng, bài đã thay đổi và chống tạo lại bài mới khi gửi lại sau mất phản hồi.

Không tự tải file lên Microsoft. Người dùng tải nhiều file/cả thư mục lên OneDrive rồi lấy mã Embed riêng từng bài. Build và payload được kiểm tra; chưa chạy thử lưu hàng loạt hoặc trình chiếu với liên kết Microsoft thật.

## 1.3.0 — 06/10/2026

### Thêm

- PowerPoint Online trong màn trình chiếu EduICT: lưu URL Embed OneDrive/SharePoint và dùng trình xem Microsoft thay cho ảnh slide.
- Thêm bài Online mới hoặc gắn liên kết Online cho bài đã nhập, giữ ID bài và liên kết tiết học. Có thể gỡ liên kết ở bài cũ để trở về cách trình chiếu trước đó.
- Giữ Thưởng sao, Vòng quay, Đua vịt, Quick Quiz, Ghi chú và Lịch dạy; ẩn/hiện thanh EduICT để dùng điều khiển Microsoft. Điều hướng slide thuộc trình xem Microsoft.
- Hướng dẫn tải file lên OneDrive, lấy mã Embed, tải file gốc của bài đã nhập; xử lý URL không hợp lệ, mất mạng, nạp chậm, tải lại và mở bài trên Microsoft.
- API/browser dùng chung validator URL nhúng; không thực thi HTML dán vào, không tải PPTX từ server. Backup SQLite/SQL và nhân bản giữ liên kết Online.

Bộ cài Windows 1.3.0 đã build và kiểm tra payload. Chưa có URL Embed thật của người dùng để xác nhận trình chiếu/hiệu ứng. Người dùng cần tải bài lên tài khoản Microsoft và lấy Embed; phiên bản này chưa có OAuth/Graph để tự tải 88 bài. PowerPoint Online cần Internet và có giới hạn trigger/hiệu ứng theo Microsoft.

## 1.2.2 — 06/10/2026

### Sửa

- Lỗi `No slideshow window handle` trên bản cài 1.2.1: thay việc đọc HWND một lần bằng getter COM rõ ràng, đọc lại cửa sổ của đúng bài và chờ tối đa 5 giây.
- Thêm tìm cửa sổ native khi getter chưa trả HWND hợp lệ: kiểm tra tiến trình PowerPoint, lớp slideshow, snapshot cửa sổ trước khi Run và tên bài. Không chọn khi mơ hồ hoặc nhiều bài trùng tên.
- Giữ bố cục slide phủ vùng trình chiếu và công cụ nổi của 1.2.1. Không thay đổi file PowerPoint gốc.

Bộ cài NSIS đã tạo và kiểm tra payload. Chưa chạy lại PowerPoint thật với bản sửa; cần nghiệm thu trên máy người dùng.

## 1.2.1 — 06/10/2026

### Sửa

- Bố cục PowerPoint Desktop theo ảnh người dùng: slide phủ vùng trình chiếu; tiêu đề/lịch/nút thoát và thanh công cụ dạng viên thuốc nằm nổi trên slide.
- Bỏ khoảng trống trên/dưới, thanh trạng thái chiếm chiều cao và cột học sinh khiến slide bị nhỏ ở bản 1.2.0. Thẻ học sinh nổi trên slide, không đổi kích thước khung.
- Native window giữ toàn vùng slide; clip đúng các capsule điều khiển để UI hiện và nhận click. Cập nhật clip theo UI/resize/DPI và khôi phục region gốc khi dừng.

Tiếp tục dùng PowerPoint gốc để phát hiệu ứng từ file liên kết. Native clipping, thao tác trên slide và DPI còn cần nghiệm thu thực tế với Microsoft PowerPoint.

## 1.2.0 — 06/10/2026

### Thay đổi

- Bài PowerPoint liên kết dùng chung màn trình chiếu web: điều hướng, lớp/tiết học, ghi chú, Thưởng sao, Vòng quay, Đua vịt và Quick Quiz.
- Thêm nút **Trình chiếu trong EduICT**: PowerPoint phát file gốc dạng cửa sổ, native host bỏ viền và neo vào vùng slide giữa giao diện.
- Ẩn cửa sổ slide trước khi mở công cụ, hiện lại khi đóng; cập nhật vị trí theo resize, fullscreen và DPI. Thẻ học sinh có vùng riêng cạnh slide.
- Chỉ lưu đường dẫn/metadata; không sao chép slide, không chuyển thành ảnh, không Save các thiết lập trình chiếu tạm thời vào file gốc.

Bản ứng dụng Windows x64 1.2.0 có bộ cài NSIS EXE và ZIP chạy trực tiếp. Lỗi `Illegal System DLL Relocation` khi chạy `makensis.exe` không còn tái hiện sau khi quyền thực thi của môi trường được mở; đã dựng EXE thành công bằng các công cụ trong cache. Build/lint/cú pháp/nội dung gói đã kiểm tra; hiển thị native, hiệu ứng và tương tác PowerPoint thật còn cần thử trên máy người dùng.

## 1.1.1 — 06/10/2026

### Sửa

- PowerPoint toàn màn hình che bảng điều khiển EduICT: thêm cửa sổ công cụ nổi riêng khi bắt đầu slideshow.
- Có Trước/Tiếp, Hiện EduICT, Về slide, Dừng và lối tắt Đếm giờ/Điểm tốt/Vòng quay; kéo để di chuyển, thu gọn/mở rộng.
- Khi kết thúc slideshow hoặc bấm Esc, thanh nổi đóng và EduICT được đưa trở lại. Trạng thái luôn nổi của cửa sổ chính được phục hồi sau khi dừng.
- Có nút mở lại thanh nổi trong bảng điều khiển bài liên kết.

Bộ cài thử nghiệm Windows x64; đã kiểm tra build, cú pháp, lint và nội dung gói cài. Hiển thị trên PowerPoint toàn màn hình, nhiều màn hình và nâng cấp thực tế còn cần thử trên máy người dùng.

## 1.1.0 — 06/10/2026

Bộ cài Windows x64 phục vụ thử nghiệm trên máy người dùng.

### Thêm

- Liên kết file PowerPoint `.pptx`/`.ppt` trên máy; EduICT lưu đường dẫn và thông tin bài, không nhập nội dung file vào ứng dụng.
- Chọn lại file khi đường dẫn thay đổi, giữ ID bài và các liên kết tiết học.
- Bảng điều khiển PowerPoint gốc trong thư viện và tiết học: mở slideshow, trước/tiếp, dừng và ghi chú dạy học.

### Thay đổi

- Trang chủ, thanh điều hướng, thanh chọn lớp và thư viện bài học có bố cục gọn hơn, hỗ trợ màn hình hẹp.
- Bài PowerPoint mới dùng luồng liên kết; bài imported cũ tiếp tục dùng dữ liệu đã lưu.
- Xóa liên kết chỉ xóa bản ghi bài học; file nguồn vẫn nằm ở nơi giáo viên lưu. Backup EduICT chỉ mang đường dẫn của bài liên kết; khi chuyển máy cần mang file gốc theo và chọn lại file.

### Điều kiện thử nghiệm

- Trình chiếu file liên kết cần EduICT Desktop trên Windows và Microsoft PowerPoint.
- Bộ cài chưa ký số. Kiểm thử cài đặt/nâng cấp, restart và hiệu ứng/trigger/media trên bản EXE 1.1.0 còn cần thực hiện.
