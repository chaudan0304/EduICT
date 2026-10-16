# Tiết dạy, sao lưu và tìm lại PowerPoint — 1.13.0

## Phạm vi

Ba việc được chọn: thử một luồng tiết dạy, giảm dung lượng sao lưu và hỗ trợ liên kết PowerPoint bị chuyển vị trí. Không phục hồi thử hoặc tạo giao dịch sao trên dữ liệu trường. Các thay đổi sao/điểm tốt có sẵn trong working copy được giữ nguyên, không đưa vào commit nhiệm vụ này.

## Sao lưu

- Chỉ loại các thư mục/tệp dưới `uploads/temp` và `uploads/cache` không được chuỗi dữ liệu trong SQLite tham chiếu. Giữ cả thư mục có tham chiếu, kể cả tên URI encoded hoặc đường dẫn Windows có chữ hoa/dấu #. Không xóa tệp gốc.
- Snapshot đầu chép tài nguyên; snapshot sau dùng hardlink tới tài nguyên có cùng SHA-256 trong snapshot cũ khi filesystem cho phép. Không hardlink tới file sống. Kiểm tra lại ứng viên trước khi dùng; bị xóa/hỏng hoặc không hỗ trợ thì chép mới.
- Mỗi snapshot có đủ cây `files/`, giữ manifest format 1. Xóa một snapshot không làm mất bản khác; `.eduict` vẫn xuất nội dung thường. Đây là tiết kiệm lưu trữ trên cùng ổ đĩa, không thay thế một bản sao trên thiết bị khác: can thiệp trực tiếp vào file hardlink có thể ảnh hưởng các snapshot dùng chung; verify/export/restore kiểm tra checksum.
- Giao diện hiển thị dung lượng logic, phần ghi mới/tái sử dụng và phần temp/cache bỏ qua. Năm học lấy `current_school_year`, sửa cả manifest an toàn trước phục hồi.
- Bản trên dữ liệu hiện tại: `EduMaster-Backup-2026-10-16-200314-732-3e786352`, 1 tệp, 1.118.208 byte gồm database, bỏ qua 1.487.014.046 byte temp/cache không tham chiếu. Trước tối ưu: 1.488.132.254 byte / 2.397 tệp. Database hiện có 90 bài Online và 1 bài native; gói giữ liên kết Online, không tải file OneDrive. Toàn vẹn SQLite đạt, 0 lỗi khóa ngoại, 23 lớp / 810 học sinh / 91 bài.

## Tìm lại PowerPoint

- Kiểm tra file trên backend tại máy đang giữ dữ liệu; trạng thái tồn tại, khác dung lượng, thiếu, không đọc được hoặc đường dẫn không hợp lệ. Không kết luận nội dung/hiệu ứng còn nguyên từ riêng dung lượng.
- Chọn lại file riêng dùng baseline đường dẫn cũ để phát hiện xung đột. Sửa theo thư mục lưu tối đa 200 liên kết trong một giao dịch SQLite; có một mục lỗi thì không cập nhật mục nào.
- Desktop chọn thư mục, quét theo tên, giới hạn 10.000 mục, sâu 8 cấp, tối đa 500 file phù hợp, bỏ symlink/junction và UNC. Không cấp quyền mở file trong bước quét; chỉ grant các file đã thấy trong lần quét và được người dùng xác nhận. Tên trùng yêu cầu chọn đường dẫn.
- Web xem được cảnh báo; chọn thư mục dùng native API của Desktop mới. File đổi tên dùng nút chọn lại từng bài.

## Kiểm chứng

- 274 test đạt, 22 suite, 0 fail/skip; gồm các test mới cho loại tệp tạm, snapshot độc lập khi xóa bản cũ, chỉnh file sống không đổi snapshot, ứng viên hỏng, đúng năm học, xuất–nhập `.eduict` và phục hồi thực sự trên SQLite thử riêng. Các kiểm tra hardlink/rename chạy ngoài sandbox vì sandbox Windows không hỗ trợ đầy đủ thao tác này.
- Test liên kết gồm trạng thái file, rollback cả đợt, xung đột đường dẫn, native scan không grant khi chưa xác nhận và từ chối file không thuộc kết quả. Kiểm tra thêm mã lớp không nhận click event và slide native không cần ảnh trong khi PowerPoint nhập vẫn chờ ảnh.
- Browser với server thật cổng 5193, dữ liệu riêng trong `scratch/lesson-flow-review-data`: tạo tiết học, mở/chuyển slide chữ, thưởng 1 sao từ slide, Quick Quiz 1 câu cho 8 học sinh giả và xác nhận thưởng 8 sao, tạm dừng/tiếp tục đồng hồ, đánh dấu 5/5 hoạt động và kết thúc. SQLite xác nhận 1 phiên COMPLETED, 5 hoạt động COMPLETED, 9 ghi nhận/9 sao và 1 quiz/8 sao. Lượt thử đầu còn phát hiện và dẫn tới sửa lỗi click event ở nút tạo phiên.
- PowerPoint COM thật: 13/13 bước đạt trên bản chép tạm của một bài 10 slide: probe/open/status/next/previous/goto/start/exit/close và từ chối đường dẫn ngoài vùng/số slide không hợp lệ. Không sửa slide gốc. Có thể truyền `EDUICT_SMOKE_PPTX` để chọn mẫu rõ ràng.
- `npm run lint`, `npm run build` đạt. Log và ảnh trong `scratch/` được giữ cục bộ, không commit dữ liệu thử/ảnh màn hình.

## Bộ cài và bản đang dùng

- NSIS kết thúc thành công. `release/EduMaster-Setup.exe`: 113.368.891 byte, SHA-256 `98A0F66ED5FD675AD044C125390E257C4CDB367D6B276D87DB7CDED86C595DFC`. Bộ cài 1.12.0 được giữ ở `scratch/EduMaster-Setup-1.12.0.exe`, mã băm khớp bản cũ.
- `npm audit --omit=dev`: 0 vulnerability tại thời điểm kiểm tra. Quét stage 974 tệp, ASAR 591 tệp và unpacked 11 tệp: 0 finding. Các nguồn backend/shared quan trọng đối chiếu stage đều khớp; package stage 1.13.0. Bộ cài bao gồm working copy có các chức năng sao/điểm tốt cá nhân được giữ nguyên; các commit nhiệm vụ không chứa phần sửa có sẵn đó.
- Trước cài đã tạo và verify `EduMaster-Backup-2026-10-16-201016-875-cecbd03e`. Người dùng xác nhận đã đóng EduMaster và chọn Yes ở UAC. Installer exit 0; EXE tại `D:\App_DaCaiDat\EduMaster` có ProductVersion 1.13.0.0. Chỉ có một đăng ký EduMaster 1.13.0 tại HKCU, không có bản trùng tại HKLM.
- Khởi động mới tạo safety backup nâng cấp 1.12.0 → 1.13.0 thành công. Web cổng 5173 và desktop cổng 52683 đều trả 1.13.0, health `ok=true`, database `ok`, 23 lớp/810 học sinh. Mã SHA-256 của JSON danh sách lớp ở hai API cùng là `23c3725c271b11348bc2b3d2717d9dc4820bfc19ca6cf688c6ecb3d6c1a6dc5c` (chỉ so sánh cùng lượt, không so với mã băm chuẩn hóa khác ở báo cáo cũ).
- Chạy lại toàn bộ test trên 1.13.0 sau rà soát: 274/274 đạt, 22 suite, 0 fail/skip; lint đạt. Log: `scratch/teaching-recovery-final-{tests,lint}.log`, `scratch/teaching-recovery-installer.log`, `scratch/teaching-recovery-secret-scan.log`.

## Giới hạn

- Người dùng chọn tự thử đăng nhập OneDrive và micro sau; không xác nhận hai luồng đó đã nghiệm thu.
- COM smoke xác minh điều khiển PowerPoint, không chứng minh mọi hiệu ứng/hyperlink/video của mọi bài hoặc vùng nhúng cửa sổ hoạt động trên mọi cấu hình màn hình.
- Native picker có kiểm tra helper/IPC; chưa tự thao tác hộp chọn thư mục Windows trên bản cài trong lượt này. Không thử phục hồi vào kho dữ liệu trường, không thử gói sát giới hạn 4 GB hoặc tình huống mất điện thật.
