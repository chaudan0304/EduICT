# Giao diện EduICT — đợt triển khai đầu tiên

Nhánh: `codex/ui-polish`. Baseline: `2876587`.

## Đã triển khai

- Font nội dung Plus Jakarta Sans, tiêu đề/số liệu Outfit; cả hai được đóng gói cục bộ.
- Màu thao tác chính xanh `#0369a1`, nền trắng/xám, bổ sung `radius-xl` trước đây chưa khai báo.
- Sidebar có ba nhóm Giảng dạy/Lớp học/Hoạt động; nhãn ngắn, `aria-current`, tên truy cập khi thu gọn; thêm đường vào Đổi quà đã có trong ứng dụng.
- Sidebar rộng 232 px, thu gọn 64 px; tự dùng biểu tượng ở chiều rộng <=800 px. Header xuống hàng theo không gian; nút chuyển năm học dùng kiểu phụ.
- `ClassContextBar` dùng chung ở trang chủ và các tab: năm học, lớp, sĩ số, chọn khối/lớp. Callback và lưu lựa chọn lớp theo luồng hiện có.
- Trang chủ đưa Vào/Tiếp tục tiết học lên đầu. Tổng quan lấy dữ liệu thật; bỏ fallback giả 807 học sinh/24 lớp. Công cụ có tên/biểu tượng thống nhất; danh sách lớp và thống kê từng khối được giữ ở phần dưới.
- `PageHeader` dùng ở trang chủ/thư viện. Thư viện bỏ banner lớn và padding lồng, bộ lọc dạng lưới, lọc trùng dùng disclosure, hàng card thích ứng chiều rộng, nút thao tác có thể xuống hàng.
- Có focus-visible và giảm chuyển động theo lựa chọn hệ điều hành. Máy chiếu đặt nền/surface sáng để tránh xung đột các biến màu nền.

## Bằng chứng kiểm tra

Chạy dev server với **bản sao** database trong `scratch/ui-review/edumaster.sqlite`; bản gốc nằm ngoài workspace không dùng để thao tác nghiệm thu.

| Kiểm tra | Kết quả |
| --- | --- |
| Trang chủ 1366×768 | Nút Vào tiết học từ y≈1668 xuống y≈320; công cụ đầu tiên xuất hiện trước khi cuộn |
| Chọn Khối 3 → 3A2 → Vào tiết học | Thanh lớp và bộ lọc tiết học cùng giữ 3A2 |
| Thu gọn/mở sidebar | Chiều rộng thu gọn 64 px; chức năng vẫn truy cập được |
| Đổi quà | Mở được màn hình cửa hàng qua sidebar mới; không thực hiện giao dịch sao |
| Thư viện | Tìm kiếm không có kết quả hiển thị trạng thái rỗng; mở được soạn bài và quay lại; bộ lọc trùng mở/đóng được |
| Responsive Home/Library | 1920,1366,1024,768,375,320 px: `scrollWidth <= innerWidth`, không tràn ngang |
| Máy chiếu trên trang chủ | Bật/tắt được; nền trắng, chữ lớn; không tràn ở 1366 px |
| Các tab chính tại 1366 px | Đố vui, Phòng máy, Sổ đánh giá, Điểm tốt, Đua vịt, Vòng quay, Đếm giờ tải xong và không tràn ngang |
| Console trong lượt nghiệm thu | Không có warning/error được ghi nhận; đây không phải kiểm tra toàn bộ thao tác nghiệp vụ |
| Build | Thành công; còn cảnh báo chunk >500 kB |
| Lint | Không có lỗi chặn; còn cảnh báo hiện hữu về unused và hook dependencies trong các file lớn |
| Test hiện có | 235/235 đạt khi chạy ngoài sandbox. Lần chạy sandbox: 214/235, các kiểm tra backend/native/backup bị giới hạn môi trường |

Ảnh trước/sau lưu cục bộ (thư mục ignored, không đẩy dữ liệu thử lên GitHub):

- `scratch/ui-review/home-current.png`
- `scratch/ui-review/home-after.png`
- `scratch/ui-review/library-after.png`

## Review và phần tiếp theo

- Không đổi API, cơ chế tính điểm/sao, timer hoặc lựa chọn ngẫu nhiên. Không thêm dependency.
- Review đối chiếu callback điều hướng, lọc khối và các đường vào hiện hữu; các biến màu mới có phạm vi rõ. Thay đổi Home/Sidebar giảm số inline styles lớn.
- B1/B2/B4 có nền tảng đầu tiên, chưa coi là nghiệm thu toàn dự án. B3 modal/focus chưa chuyển đổi.
- Thư viện còn cần nghiệm thu ảnh lỗi, menu/card bằng bàn phím và import/trình chiếu trước khi đóng toàn bộ D1–D4.
- Sổ đánh giá, xếp chỗ, quản lý lớp, nhập Excel, AI, backup/năm học và các màn hình chơi còn giữ bố cục hiện có; chỉ chịu ảnh hưởng tokens/font/khung chung.
- Khi mở bài soạn mới từ Khối 3, editor hiện mặc định Khối 4. Đây là hành vi cũ của editor cần xử lý khi triển khai D2; chưa thay đổi trong đợt này.
- Chưa nghiệm thu dark mode, ứng dụng Electron đã cài, PowerPoint native hay máy chiếu vật lý.

Theo dõi phần còn lại tại `tasks/todo.md`; tài liệu này mô tả đợt đầu, không xác nhận hoàn thành kế hoạch A–H.
