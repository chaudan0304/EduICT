# Sân chơi lớp học — đợt 1

Ngày triển khai: 14/10/2026. Nhánh: `codex/classroom-arcade-v2`.

## Mở trò chơi

- Thanh bên → **Trò chơi lớp học** → chọn một trong ba trò.
- Trong tiết học hoặc khi trình chiếu: nút **Trò chơi** mở cùng giao diện.
- Chọn học sinh tham gia, cách chơi, tên tổ và bấm **Bắt đầu ván chơi**.
- **Màn hình chơi** mở sân khấu lớn. **Về thiết lập** trở lại màn hình thường, vẫn giữ ván.
- Công cụ gọi tên, chuyến tàu chia nhóm và bản đồ nhiệm vụ nằm trong **Hoạt động khác** ở màn hình thiết lập.

## Luật và điểm ván

| Trò chơi | Cách chơi | Kết thúc |
| --- | --- | --- |
| Hộp quà kỳ diệu | 12 hộp, 2–4 tổ thay phiên. Hộp điểm 10–40; quà chung +10 mọi tổ; vé nhân đôi nhận 10 điểm và nhân đôi hộp điểm cá nhân tiếp theo. Vé mới vẫn được giữ nếu mở tiếp vé nhân đôi. Hộp quà chung không tiêu vé. | Mở hết 12 hộp; tổ có điểm cao nhất thắng, có thể đồng hạng. |
| Kéo co kiến thức | Hai tổ. Đúng được 1 bước/10 điểm; chưa đúng đổi lượt. Chế độ may mắn kéo ngẫu nhiên 1 hoặc 2 bước. | Cờ chạm vạch 4 bước hoặc hết 8 lượt. Vị trí cờ quyết định thắng, về giữa là hòa. |
| Lật ảnh bí mật | 12 mảnh. Đúng mở một mảnh và nhận 10 điểm; tổ đó được đoán trước, rồi nhường lượt nếu chưa đoán ra. Đoán đúng được 20 điểm cộng 5 điểm/mảnh còn che. Có thể đoán trước khi mở mảnh. | Tổ đoán đúng thắng ngay. Nếu mở hết mảnh thì tổ nhiều điểm nhất thắng. **Mở ảnh và kết thúc** dừng ván, không chọn người thắng, không cộng điểm. |

Chế độ câu hỏi có 12 câu Tin học mẫu, sửa được trong thiết lập. Mỗi dòng có dạng `Câu hỏi | Gợi ý đáp án`; tối đa 24 câu. Hết danh sách thì quay lại đầu. Để trống để giáo viên hỏi miệng. Giáo viên xác nhận đúng/chưa đúng, hệ thống không tự chấm câu trả lời của học sinh.

Học sinh được chia ngẫu nhiên, chênh lệch tối đa một em giữa các tổ. Mở **Thành viên từng tổ** để xem; không cần đổi chỗ ngồi. Danh sách được chốt khi bắt đầu ván. Muốn chia lại thì tạo ván mới. Khi sửa danh sách tham gia giữa ván, phần thưởng chỉ cho phép các em còn nằm trong danh sách tham gia và lớp hiện tại.

## Sao và lưu dữ liệu

- Điểm ván tách biệt với sao học sinh, không tự ghi vào sổ điểm/sao.
- Sau khi kết thúc, nút thưởng cho tổ thắng mở công cụ sao nhóm hiện có, chọn sẵn thành viên. Giáo viên xem lại số sao và xác nhận.
- Hoàn tác giữ tối đa 8 trạng thái thao tác gần nhất của ván. Không hoàn tác sao đã xác nhận; việc hoàn tác sao dùng công cụ sao nhóm hiện có.
- Thiết lập, điểm và tiến độ được giữ tạm bằng `sessionStorage`, theo lớp và ngày bắt đầu mở phần trò chơi. Không phải dữ liệu sao lưu SQL/SQLite. Đóng phiên/cửa sổ hoặc đổi ngày có thể bắt đầu phiên mới.
- Không thêm API, bảng dữ liệu, tài khoản học sinh hay phụ thuộc mới.

## Ảnh riêng và hình minh họa

Lật ảnh có sẵn tranh máy tính, bàn phím và chuột. Giáo viên cũng có thể chọn ảnh PNG/JPEG/WebP trên máy, tối đa 3 MB và 30 triệu điểm ảnh, kèm đáp án.

Ảnh riêng chỉ giữ trong bộ nhớ cửa sổ, tối đa bốn ảnh được lưu tạm giữa các lớp. Không đưa ảnh vào `sessionStorage`, SQLite hoặc API. Khi tải lại trang hoặc ảnh bị bỏ khỏi bộ nhớ tạm, chọn lại cùng nội dung ảnh để tiếp tục; dấu nhận dạng nội dung giúp tránh dùng nhầm ảnh. Đổi ảnh thì bắt đầu ván mới.

Hình hộp quà, robot và tranh thiết bị được vẽ bằng SVG trong mã nguồn. Có đếm ngược, âm thanh bật/tắt, thông báo kết quả, hiệu ứng thắng và hỗ trợ giảm chuyển động theo hệ điều hành.

Tham khảo mô tả công khai về kéo co, lật ảnh và hoạt động ngẫu nhiên trên [Giáo Viên Đổi Mới](https://giaoviendoimoi.com/). Không truy cập trò chơi có yêu cầu đăng nhập và không sao chép mã hay tài nguyên của trang.

## Bằng chứng và giới hạn

- `npm run build` thành công; còn cảnh báo chunk lớn trên 500 kB của ứng dụng. `npm run lint` trả mã 0, có cảnh báo ở các phần khác. Lint riêng các tệp giao diện thay đổi không có cảnh báo/lỗi.
- Đã xem bố cục ba sân khấu bằng trình duyệt cục bộ tại `http://127.0.0.1:5184/`, kích thước mặc định 1280×720. Ảnh nằm trong `scratch/classroom-arcade-2026-10-14/` và không đưa lên Git.
- Chưa chạy bộ test tự động, chưa kiểm chứng mọi nhánh luật chơi, ảnh riêng, màn hình di động hoặc thao tác thưởng sao thực tế. Không tạo giao dịch sao để chụp giao diện.
- Chưa tạo bộ cài EXE mới; ứng dụng đã cài trên máy chưa nhận thay đổi này.
