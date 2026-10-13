# EduMaster 1.8.0 — Cộng/trừ sao cả lớp

## Sử dụng

1. Mở Sổ điểm hoặc Sổ điểm tốt → **Cộng/trừ cả lớp**. Khi mở slide: **Thưởng sao → Cộng/trừ cả lớp**.
2. Chọn Cộng/Trừ, số sao mỗi học sinh (1–100), học kỳ và lý do nếu cần.
3. Đọc tên lớp, sĩ số và phần tóm tắt; bấm **Xác nhận cộng/trừ sao**.

Áp dụng cả lớp, không phụ thuộc bộ lọc/tìm kiếm. Lớp chưa có học sinh không thao tác được. Khi trừ, số sao hiện có của mỗi em giữ tối thiểu 0. Giao diện báo số học sinh thực sự thay đổi và tổng số sao thực tế đã cộng/trừ.

Nếu kết nối bị gián đoạn, **Thử lại cùng lượt** giữ nguyên mã yêu cầu và nội dung để tránh ghi lặp. Có thể đóng rồi mở lại ở tab khác trong cùng phiên trang. Yêu cầu đang chờ chưa được lưu ở trình duyệt qua lần tải lại trang; nếu đã tải lại sau khi mất kết nối, kiểm tra nhật ký trước khi tạo lượt mới.

## Lưu dữ liệu

- `POST /api/gamification/stars/class-adjust`: nhận `operationId`, `classId`, `amount` có dấu, `semester` (`hk1`/`hk2`), `date` theo ngày địa phương `YYYY-MM-DD`, `reason`, `expectedStudentIds` và `confirmed: true`.
- Danh sách đã xác nhận phải khớp toàn bộ roster trong SQLite, tối đa 1.000 học sinh. Sai danh sách → HTTP 409, tải lại lớp và xác nhận lại; không cập nhật một phần.
- `BEGIN IMMEDIATE` bao quanh cập nhật `students.stars`, `star_transactions`, `classes.good_scores` và biên nhận trong `app_settings`. Lỗi trước commit → rollback.
- `star_transactions.source = CLASS_BATCH`; amount là số thay đổi thực tế, kể cả 0 khi em đã hết sao. Nhật ký điểm tốt chỉ thêm bản ghi có thay đổi khác 0 vì cách đọc nhật ký cũ coi points=0 là 1.
- Mỗi nhật ký lưu ID lượt, số sao yêu cầu, ngày/học kỳ, tên học sinh và số sao thực tế. Không sửa hoặc xóa nhật ký cũ. Sổ điểm tốt vẫn tổng hợp điểm thi đua theo học kỳ; sao thưởng hiện có nằm trong hồ sơ học sinh.
- Cùng ID/cùng nội dung: trả lại kết quả thành công và số dư/nhật ký hiện tại, không áp dụng lại. Cùng ID/khác nội dung → HTTP 409.
- Frontend chỉ ghép số dư và nhật ký đã lưu vào state; không gọi lại lưu roster hoặc lớp để ghi đè dữ liệu mới.
- SQL, SQLite, JSON và Excel toàn bộ dữ liệu hiện có lấy tất cả bảng; các giao dịch và biên nhận mới thuộc dữ liệu được sao lưu. Không thêm bảng hoặc dependency.

## Bộ cài

- `release/EduMaster-Setup-1.8.0.exe`: **113128718 byte**; NSIS hoàn tất.
- SHA256: `9962C27218FCE8D9607A6A276E6E3E47E4DA59D8E414684D0D8AE6634BE9A74B`.
- Root/desktop/stage/ASAR: **1.8.0**; app EXE ProductVersion **1.8.0.0**.
- ASAR trích từ setup khớp byte với bản win-unpacked; **167 file runtime/package** khớp stage, gồm backend mới và chunk nút điều chỉnh cả lớp.
- Stage dùng 41 package backend đã cài. Secret scan: stage **918 file**, ASAR **561 file**, unpacked **5 file** — **0 finding**; không đóng gói DB, uploads hoặc cấu hình riêng.
- Bộ cài **chưa ký số**. Không tự chạy bộ cài hoặc thay bản app đang cài trên máy.

## Kiểm tra thực hiện và giới hạn

- `node --check` cho backend/service/route thành công; Oxlint phần mới/helper không cảnh báo. Các file Sổ điểm, Sổ điểm tốt và App còn cảnh báo có trước về import thừa/hook dependencies.
- Vite build thành công, **1964 module**. Build dùng snapshot `VACUUM INTO` từ kết nối SQLite read-only, không dùng DB thật làm DB build. Còn cảnh báo SQLite experimental và chunk lớn có trước.
- Đọc DB desktop trước/sau: **23 lớp, 811 học sinh, 39 bài, 1 giao dịch sao, 4 app_settings, tổng sao 417**, không đổi các số tổng này.
- Đọc DB web: **23 lớp, 811 học sinh, 91 bài, 14 giao dịch sao, 4 app_settings**. Tổng sao ở hai lần đọc là **452 → 448**. Các lệnh của đợt làm này chỉ đọc DB web và không gọi API cộng/trừ; chưa xác định nguyên nhân thay đổi, không kết luận dữ liệu web bất biến.
- Web localhost:5173 được restart để dùng backend mới.
- **Chưa thêm/chạy test, cài bản mới hoặc thao tác cộng/trừ qua UI.** Build và đối chiếu payload không chứng minh luồng runtime đã được nghiệm thu trên máy người dùng.

## File chính

`server/services/classStarAdjustment.js`, `server/routes/gamification.js`, `src/components/ClassStars/*`, `src/App.jsx`, `src/components/Gradebook.jsx`, `src/components/GoodScoresBoard.jsx`, `src/components/LessonPresentation/PresentationView.jsx`, `src/utils/starLedger.js`.
