# Tìm tên tiếng Việt — 1.16.1

## Nguyên nhân và thay đổi

Bộ lọc cũ chỉ chuyển chữ thường rồi dùng `includes`, nên dấu huyền trên `u` hoặc `y` tạo hai chuỗi khác nhau dù cùng tên gọi.

Hàm tìm kiếm mới chuẩn hóa Unicode NFD, bỏ dấu kết hợp, đổi đ/Đ thành d, chuyển chữ thường và gộp khoảng trắng. Chỉ dùng chuỗi chuẩn hóa để tìm; không ghi lại họ tên hay thay dữ liệu. Dấu câu trong mã học sinh vẫn giữ nguyên.

Áp dụng tại bảng thi đua/nhật ký Điểm tốt & nội quy, Sổ đánh giá và danh sách tương tác trong tiết học. Tìm mã học sinh và số máy vẫn hoạt động. Bộ lọc học kỳ/loại điểm/giới tính/đánh giá/tham gia và sắp xếp giữ nguyên.

## Kiểm chứng

- `tests/student-search.test.js`: cách đặt dấu khác nhau, tên không dấu, chữ hoa, Unicode tổ hợp, khoảng trắng thừa, đ/Đ, mã có dấu câu, số máy, tìm rỗng và không khớp nhầm với tên khác. Dữ liệu kiểm thử là giả.
- Toàn bộ kiểm thử working copy: **296/296**, 22 suites, không bỏ qua (`scratch/student-search-full.log`). Lint sạch; build Vite thành công.
- Qua giao diện cổng 5211 với SQLite riêng: gõ `Thùy Linh` hoặc `thuy linh` tìm đúng hàng `Bạn Thuỳ Linh`, không hiện hàng `Bạn Tú Linh`. Ảnh `scratch/student-search-fixed.png`; không dùng dữ liệu thật để thao tác sửa.
- Giữ các thay đổi sao/điểm có sẵn ngoài commit nhiệm vụ; phần sửa tìm kiếm trong GoodScoresBoard được stage riêng.
- Sổ kỹ năng & sao cũng tìm đúng hàng mẫu bằng `Thùy Linh`; console không có lỗi trong lượt thử.

## Bộ cài và dữ liệu

- NSIS hoàn tất: `release/EduMaster-Setup.exe`, 113.383.177 byte, SHA-256 `F5675C9644F9BA9993F13F5907E3B1A85EC9D4293404DBDFC2A86F304EC27B52`. Bộ cài 1.16.0 được giữ riêng trong scratch và đối chiếu SHA trước khi build.
- Stage 979 tệp, ASAR 596 tệp, unpacked 11 tệp: 0 finding. Frontend dist khớp toàn bộ stage; stage là 1.16.1.
- Trước cài đã tạo/verify `EduMaster-Backup-2026-10-19-101104-931-b7395323`. Người dùng xác nhận đóng EduMaster và chấp thuận UAC; bản cài tại `D:\App_DaCaiDat\EduMaster` là 1.16.1.0, ASAR khớp release, chỉ một đăng ký EduMaster 1.16.1.
- Khởi động bản mới tạo safety backup 1.16.0 → 1.16.1, backend báo sẵn sàng; sau đó ứng dụng đóng bình thường theo log. Đối chiếu SQLite chỉ đọc sau cài: integrity_check OK, toàn bộ 23 bảng khớp bản sao lưu, gồm 810 học sinh và các giao dịch sao. Ba cách tìm Thùy/Thuỳ/không dấu đều khớp đúng một học sinh trong lớp được báo lỗi. Chi tiết riêng không đưa lên Git: `scratch/student-search-data-check.json`.
