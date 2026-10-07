# EduMaster 1.7.1 — Cộng sao khi mở slide

## Bằng chứng và nguyên nhân

- Bản đang cài được đọc trực tiếp từ ASAR tại thư mục cài đặt: **1.7.0**. Helper sendJson trong bản này không trả về cờ route đã xử lý.
- Log desktop ngày 07/10/2026, lúc **02:24:35 UTC**, ghi `ERR_HTTP_HEADERS_SENT`, stack ở `server.js:57` (phần trả static), backend thoát với code 1. Đây là lỗi có thể làm app ngừng nhận các thao tác tiếp theo sau lần cộng sao.
- Route cộng sao trả `return sendJson(...)`; helper trước đây trả undefined. Dispatcher hiểu là chưa xử lý, sau đó server tiếp tục trả file HTML và đặt header lần nữa. Luồng này khớp vị trí crash trong log.
- Một lỗi khác ở App.handleUpdateGoodScores: sau awardStars, lưu nhật ký qua syncClassToSqlite gửi cả students từ render cũ. saveOrUpdateClass tiếp tục lưu students và ghi đè số sao mới bằng giá trị trước khi thưởng.

Không có thao tác cộng sao thử vào dữ liệu người dùng. Các kết luận dựa trên log và luồng code; chưa xác nhận lại qua giao diện sau sửa.

## Thay đổi

- sendJson trả **true** sau khi gửi JSON; các route dùng `return sendJson` kết thúc dispatch đúng cả khi thành công và khi trả lỗi.
- Server desktop và middleware Vite dừng khi response đã gửi header hoặc đã kết thúc, tránh gửi thêm phản hồi nếu một route không trả cờ handled.
- Lưu goodScores chỉ gửi metadata lớp/nhật ký, bỏ students khỏi payload; số dư từ sổ cái sao được giữ.
- Bảng thưởng sao và thẻ học sinh thu nhỏ có khóa request đang chạy, khóa nút +1/+2/+3 và chọn học sinh trong lúc thưởng. Chờ cập nhật học sinh và truyền ID lớp đã chọn khi bắt đầu request.
- Nhận diện học sinh qua String(id) để giá trị select không bị lệch kiểu; dùng dialog native bất đồng bộ khi báo lỗi. Thẻ thu nhỏ không bị cập nhật nhầm khi đã đóng/đổi học sinh trong lúc chờ.

## Bộ cài

- `release/EduMaster-Setup-1.7.1.exe`: **113125982 byte**, NSIS hoàn tất.
- SHA256: `53B2FFF585FEFCFFEE0C21C6E2CAFC302523AD351CB4DDF64F261FF7D45AFBE7`.
- Root/desktop/stage/ASAR/setup: **1.7.1**; ProductVersion của app EXE: **1.7.1.0**.
- Stage `desktop/.stage/app-1.7.1`: 41 package backend hiện có; không đổi dependency.
- ASAR trích từ setup khớp byte với win-unpacked; **164 file runtime/package** khớp stage.
- Secret scan: nguồn/version/changelog 10 file, stage 915 file, ASAR 558 file, unpacked 5 file — **0 finding**. Không đóng gói DB/uploads/cấu hình riêng.

## Kiểm tra và giới hạn

- node --check cho server/helpers/Vite plugin thành công. Oxlint các phần sửa và PresentationView không cảnh báo; App.jsx còn cảnh báo useEffect có trước ở dòng 150.
- Vite build thành công, 1961 module; còn cảnh báo chunk lớn và SQLite experimental. Build dùng snapshot riêng từ kết nối read-only với DB desktop.
- DB desktop đọc trước/sau: 23 lớp, 811 học sinh, 21 bài; 1 giao dịch sao (nguồn PRESENTATION), tổng sao 417, foreign_key_check không lỗi. Không tự điều chỉnh số dư hoặc cộng lại sao từ lần trước.
- Web tại localhost:5173 đã restart, PID 13236, log Vite ready. Không tự chạy bộ cài hoặc thay bản app đã cài trên máy.
- **Chưa thêm/chạy test hoặc thao tác thưởng sao qua UI sau sửa.** Build/payload không chứng minh runtime cộng sao đã được nghiệm thu. Người dùng cần cài 1.7.1 rồi mở bài, chọn học sinh và thử thưởng sao.

## File chính

`server/routes/helpers.js`, `server.js`, `server/vite-sqlite-plugin.js`, `src/App.jsx`, `src/components/LessonPresentation/PresentationView.jsx`.
