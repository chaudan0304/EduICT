# EduMaster 1.8.1 — Khắc phục Gemini trên desktop

## Nguyên nhân được xác nhận

- ASAR tại thư mục cài đặt hiện là **1.7.0**; bản này dùng `pathService.getEnvPath()` và đọc khóa ở backend.
- `.env` của web có khóa Gemini, enabled=true và model `gemini-3.5-flash-lite`.
- Cấu hình desktop tại `%APPDATA%/EduMaster/data/settings/.env` vẫn chứa `YOUR_GEMINI_API_KEY_HERE`, enabled=true và chưa có model tường minh. Vì vậy API status của desktop báo chưa cấu hình dù web có khóa.
- Giao diện AI trước đây hướng dẫn thêm khóa vào thư mục gốc dự án cho cả desktop, dẫn tới chỉnh sai file. Nhãn “Sẵn sàng hoạt động” chỉ dựa vào việc có khóa, không thể hiện lỗi kết nối/hạn mức bên Google.

## Xử lý trên máy người dùng

- Chỉ đồng bộ `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_ENABLED` từ cấu hình web vào cấu hình desktop. Các thiết lập còn lại giữ nguyên; file mẫu cũ đã được sao lưu riêng trước khi thay.
- Khóa được đọc/ghi nội bộ, không xuất ra log, Git, tài liệu hoặc installer. File private nằm ngoài thư mục dự án và cài đặt.
- GET metadata mô hình qua HTTPS đến `generativelanguage.googleapis.com`, dùng header `x-goog-api-key`: **HTTP 200**, model accessible=true và `supportedGenerationMethods` có `generateContent`.
- Chỉ đọc metadata, không gọi generateContent, không gửi dữ liệu học sinh/bài giảng. Kết quả này xác nhận khóa được Google nhận và mô hình đọc được, không xác nhận hạn mức tạo nội dung hoặc toàn bộ luồng AI trong app.

## Sửa giao diện

- Hướng dẫn đúng file theo desktop/web. Trong desktop: Win + R → `%APPDATA%\EduMaster\data\settings` → sửa `.env`; lưu và bấm **Kiểm tra lại**.
- Nút kiểm tra trạng thái dùng `apiClient`, timeout 8 giây; phản hồi cũ bị bỏ khi bảng đóng hoặc một lượt kiểm tra mới bắt đầu.
- Phân biệt “Đang kiểm tra cấu hình”, “Không kết nối được máy chủ AI”, “Trợ giảng AI đang tắt”, “Chưa thiết lập khóa API” và “Đã thiết lập khóa API”. Không gắn nhãn kết nối Google thành công chỉ vì có khóa.
- Mẫu desktop mới thêm `GEMINI_MODEL=gemini-3.5-flash-lite`; không thêm dependency hoặc đổi cơ chế gửi yêu cầu tạo nội dung.

## Kiểm tra và giới hạn

- Syntax check `aiService.js`, Oxlint hai file AI và `git diff --check` thành công; phần sửa không còn cảnh báo lint.
- Vite build thành công, **1964 module**; dùng snapshot riêng của DB, không sửa DB desktop/web thật trong đợt này. Còn cảnh báo SQLite experimental và chunk lớn.
- Cấu hình riêng trên máy đã được sửa. Không tự khởi động/cài app; người dùng mở lại app để đọc cấu hình hoặc cài 1.8.1 để có hướng dẫn/trạng thái mới.
- **Chưa thêm/chạy test hoặc gọi tác vụ tạo nội dung qua giao diện.** Model metadata HTTP 200 không phải nghiệm thu luồng AI phân tích lớp/tạo câu hỏi.

## Tài liệu chính thức đã đối chiếu

- [Google: Gemini 3.6 Flash và 3.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/generate-content/whats-new-gemini-3.6) xác nhận model ID và ví dụ `GoogleGenAI.models.generateContent`.
- [Google: xử lý lỗi Gemini API](https://ai.google.dev/gemini-api/docs/troubleshooting) phân biệt cấu hình/quyền, hạn mức và lỗi nhà cung cấp.

## Bộ cài

- `release/EduMaster-Setup-1.8.1.exe`: **113129269 byte**, NSIS hoàn tất; ProductVersion/FileVersion **1.8.1**. Bộ cài chưa ký số.
- SHA256: `2A9823762BDD38E17A57BF343A152DC153D2F0254807B97BE54DAA4071C25BF6`.
- Root/desktop/stage/ASAR đều **1.8.1**. ASAR trích từ setup khớp bản win-unpacked; **168 file runtime/package** khớp stage.
- Stage gồm 41 package backend hiện có. Secret scan: stage **919 file**, ASAR **562 file**, unpacked **5 file** — **0 finding**.
- Đọc cấu hình bằng `getGeminiConfig()` trong môi trường desktop sau sửa: **enabled=true, configured=true, model=gemini-3.5-flash-lite**. Chỉ xuất ba trường này; không xuất apiKey.
- Bộ cài gồm cả chức năng cộng/trừ sao cả lớp từ 1.8.0 và các sửa lỗi trước đó. Cấu hình API riêng đã lưu trên máy vẫn nằm ngoài installer và được giữ khi nâng cấp.
