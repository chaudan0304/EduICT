# Sửa các vấn đề còn lại — EduICT 1.11.2

Ngày 15/10/2026 · cập nhật cài đặt 16/10/2026 · Nhánh `codex/fix-project-audit` · tiếp nối [đợt 1.11.1](project-audit-fixes-1.11.1.md).

## Thay đổi và bằng chứng

| Mục | Đã sửa | Kiểm chứng |
| --- | --- | --- |
| Dependency Excel | SheetJS 0.18.5 → 0.20.3 theo [nguồn phát hành chính thức](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/); URL cố định và SHA-512 trong lockfile. | Audit production trả 0 vulnerability. XLS và XLSX qua bộ parser thật giữ tên tiếng Việt, ngày sinh, giới tính. |
| Nhập bảng điểm | `importFromExcel` trước đây dùng parseExcelDate/normalizeGender mà chỉ re-export, chưa import binding. Bổ sung import, báo lỗi đọc tệp và lỗi tải parser về callback. | Hồi quy nhập workbook vào hàm thật, kiểm tra đủ tên/ngày sinh/giới tính. |
| Tải khởi động | XLSX tải động qua một loader dùng chung, cho thử lại nếu tải chunk lỗi. Xuất mẫu có xử lý lỗi. | Build: index 438,66 kB (gzip 125,09 kB), XLSX 492,27 kB tải khi cần; không tăng ngưỡng cảnh báo và không còn chunk trên 500 kB. Trước tách index 923,33 kB. |
| Phản hồi AI cũ | Hook phân tích dùng AbortController; request đã hủy không được cập nhật kết quả/loading/error/cache. Hai API chuyển tiếp signal. | Trình duyệt: chọn A rồi B, hoàn tất B trước A vẫn chỉ hiện B; đóng AI rồi hoàn tất request giữ kết quả trống. Test chuyển tiếp signal cho cả lớp và bài. |
| HTTP timeout | Signal của caller trước đây thay signal timeout; timer cũng dừng ngay khi nhận headers. Nay phối hợp hủy và timeout tới khi đọc xong body, dọn listener/timer trong finally. | Hồi quy: signal caller vẫn chịu timeout; hủy được phân biệt với timeout; signal đã hủy và body treo đều xử lý đúng. |
| Trạng thái trò chơi/slide | Vòng quay chỉ đặt lại theo roster, không đặt lại khi đổi sao; hiển thị số dư mới và hủy animation khi rời component. Đua vịt dừng khi đổi lớp kể cả lớp trống. Đổi slide bỏ đáp án cũ. | Trình duyệt: quay 3 học sinh còn 2 ứng viên, cập nhật sao vẫn còn 2 ứng viên và lịch sử 1 lượt; số sao người thắng đổi thành 3. Đổi lớp trong khi đua về 0/0 và nút bắt đầu bị khóa. Slide thứ hai trở về nút Xem Đáp Án. |
| Lint/hook | Bỏ import/binding không dùng, functional setter để tránh snapshot cũ, ổn định callback và dependency thật. | Lint từ 157 cảnh báo xuống 0; không tắt rule hay thêm suppression để đạt kết quả. |
| NSIS | Kiểm tra ghi trực tiếp trong thư mục cài trước khi gỡ phiên bản cũ. Lưu trạng thái lỗi trước khi kiểm tra lại vì [IfErrors xóa cờ lỗi](https://nsis.sourceforge.io/Reference/IfErrors). Cài im lặng thiếu quyền thoát mã 5 và ghi log. | Macro thật trong EXE tối giản: exit 5, 171 ms. Bộ cài đầy đủ: exit 5, 1.158 ms, bản đã cài còn 1.11.0.0. Không xóa/thay ứng dụng hoặc dữ liệu khi kiểm tra thiếu quyền. |

## Nguyên nhân cài desktop thất bại

- `D:\App_DaCaiDat\EduMaster` do Administrators sở hữu; ACL cho Administrators/SYSTEM toàn quyền, Everyone đọc/chạy. Tiến trình cài thông thường không elevated.
- Thử tạo tệp giả trong thư mục cài trả Access denied. Nhật ký NSIS chẩn đoán xác nhận trình gỡ cũ trả exit 2, lặp lại rồi chờ hộp lỗi.
- Đã thử giả thuyết TEMP ở ổ C khác ổ D; chuyển TEMP sang D vẫn không khắc phục. Kết luận dựa trên ACL và phép thử ghi, không kết luận do khác ổ đĩa.
- Đã sao lưu toàn bộ thư mục cài trước khi thử cập nhật vào `scratch/installed-1.11.0-before-followup`.
- Lần chạy RunAs trước trả “The operation was canceled by the user”; người dùng cho biết không thấy UAC. Ngày 16/10 đã chạy lại, người dùng xác nhận chọn Yes: bộ cài thoát mã 0, EXE tại vị trí cài hiện tại có ProductVersion **1.11.2.0**. Không đổi ACL.
- Log thiếu quyền nằm ở `%LOCALAPPDATA%\EduMaster\installer.log`; không chứa khóa hoặc dữ liệu học sinh.

## Xác nhận sau cài đặt — 16/10/2026

- Đã mở EXE đang cài tại `D:\App_DaCaiDat\EduMaster\EduMaster.exe`. Log ghi khởi động EduMaster v1.11.2 lúc `2026-10-16T11:40:06.966Z`; backend sẵn sàng, không ghi nhận lỗi ở lượt khởi động này.
- Ứng dụng tạo thành công bản sao lưu `EduMaster-Safety-preupdate-1.11.0-to-1.11.2-2026-10-16T11-40-06-988Z` trước khi khởi động backend.
- Desktop và web đều mở kho `C:\Users\chaud\AppData\Roaming\EduMaster\data\edumaster.sqlite`. Đã khởi động lại web tại `http://127.0.0.1:5173/`; desktop dùng cổng động 57366 trong lượt kiểm tra này.
- API `/api/health` của cả hai trả `ok: true`, `database: ok`. `/api/classes?schoolYear=all` đều có **23 lớp, 810 học sinh**, đủ `studentsVersion` cho 23 lớp. Mã SHA-256 của toàn bộ phản hồi danh sách sau chuẩn hóa khớp nhau: `4281b3981b3ddd3b72bf484468fcc7361939d04069b5445abe789c4a5b794f7c`.
- Kết nối SQLite `readOnly: true`: `PRAGMA integrity_check` trả `ok`, `PRAGMA foreign_key_check` trả 0 dòng lỗi. Không tạo giao dịch điểm/sao để thử trên dữ liệu thật.
- Đây là kiểm tra phiên bản EXE, khởi động, API và kho dữ liệu sau cài. Chưa xác nhận giao diện desktop trực tiếp hay các tương tác PowerPoint/micro/đăng nhập Microsoft. Không chạy lại bộ test/build đã ghi bên dưới vì lượt tiếp tục này chỉ cài bộ EXE đã dựng.

## Kết quả cuối

- `npm test`: **266/266 đạt**, không skip/cancel, trên working copy gồm các test sao/điểm tốt có sẵn. Đợt này thêm 9 test so với 257 của đợt trước.
- `npm run lint`: **0 lỗi, 0 cảnh báo**. `git diff --check`: đạt.
- `npm run build`: đạt, không cảnh báo bundle lớn.
- `npm audit --omit=dev`: **0 vulnerability**; kết quả chỉ phản ánh cơ sở advisory hiện tại, không phải chứng nhận phần mềm không có mọi lỗ hổng.
- Gemini thật: một yêu cầu kiểm tra JSON `{ok:true}` với model cấu hình hiện tại thành công trong 2.702 ms, qua SDK và timeout của ứng dụng. Không gửi dữ liệu lớp/học sinh, không in API key. Chưa gọi mọi chức năng sinh/phân tích với dữ liệu thật.
- Trang harness dùng component/hook thật và state giả, không ghi giao dịch vào SQLite trường; console trang thử không có error/warn. Các tab đã đóng. Ảnh: `scratch/remaining-wheel-proof.png`.
- PowerPoint smoke: **NOT EXECUTED**, không có original.pptx mẫu ở vùng thử. Chưa nghiệm thu hiệu ứng/COM thực tế, micro hay Microsoft Online đăng nhập.
- NSIS build thành công; stage, ASAR 585 file và win-unpacked 11 file quét secret 0 finding. `release/EduMaster-Setup.exe`: **113.357.529 byte**, SHA-256 `19F3955A0E56F3F411A82753D8A3D2CFD2EED232D20D2330C36BE7836AAADC3A`.

Các thay đổi sao nhóm/điểm tốt ngoài nhiệm vụ đang có được giữ nguyên. Riêng GoodScoresBoard chỉ commit phần bỏ import thừa và functional setter bằng nội dung dựng từ HEAD, giữ diff tính năng có sẵn ở working copy. Bộ cài được dựng từ toàn working copy nên bao gồm cả các thay đổi cá nhân đó.

Log kiểm tra nằm trong scratch: remaining-tests-final.log, remaining-lint-final.log, remaining-build-pass2.log, remaining-dependency-audit.json, remaining-gemini-live.log, remaining-installer-final.log và remaining-secret-scan.log.
