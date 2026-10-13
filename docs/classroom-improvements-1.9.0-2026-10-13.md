# EduICT 1.9.0 — Công cụ lớp học

## Phối hợp Claude
Đã gọi Claude Code CLI 2.1.292 thực tế, với nhiệm vụ T101 và allowlist chỉ ghi màn hình mới/báo cáo. Lần đầu API 503 (`all nodes exhausted`); lần hai chưa trả kết quả hoặc tạo mã. Codex dừng phiên T101 và tiếp quản theo yêu cầu người dùng. Không có phần code được nhận là do Claude viết. Chi tiết ở `.agent-work/reports/T101-claude.md`.

## Cách sử dụng
1. Thanh trên → **Công cụ** → **Gemini**: bật AI, chọn model, nhập khóa mới rồi Lưu. Để trống giữ khóa cũ; chọn xác nhận xóa để bỏ khóa. Kiểm tra kết nối đã lưu kiểm tra quyền đọc model, không gửi dữ liệu học sinh/tạo nội dung. Có đường dẫn Cấu hình Gemini ngay trong Trợ giảng AI.
2. Sổ điểm, Sao thi đua hoặc Thưởng sao khi trình chiếu → **Sao nhóm / Hoàn tác**. Chọn học sinh, nhập số sao có dấu và xác nhận. Nhập tên để lưu nhóm; cùng tên cập nhật thành viên. Nhóm được lưu theo lớp trong SQLite và đi theo bản sao lưu đầy đủ.
3. Cùng hộp thoại, xem lượt cả lớp/nhóm gần nhất chưa hoàn tác rồi xác nhận hoàn tác. Hệ thống ghi bút toán bù theo số sao thực tế của lượt gốc. Sao nhận sau đó vẫn giữ; nếu làm số dư âm hoặc mất học sinh/nhật ký gốc, cả lượt bị từ chối. Lịch sử cũ không bị xóa. Các lượt đơn lẻ từ trò chơi vẫn dùng lịch sử cũ và chưa nằm trong chức năng hoàn tác này.
4. Công cụ → **Trước giờ dạy**: chọn bài rồi kiểm tra SQLite, kết nối Microsoft, nguồn slide và cấu hình Gemini. Bài Online luôn cần mở thử để xác nhận quyền truy cập/hiệu ứng; kiểm tra này không giả rằng iframe đã tải.
5. Chọn lớp trên thanh trên → Công cụ → **Tiến bộ học sinh**: chọn học sinh/tháng, xem báo cáo và Xuất PDF. Desktop tạo PDF bằng Chromium và mở hộp thoại lưu file; web mở bản in, chọn Lưu thành PDF. Báo cáo chứa lịch sử sao tháng (giờ Việt Nam), tổng sao, kỹ năng/điểm và nhận xét hiện tại. Dữ liệu cũ không có nhật ký không được suy diễn thành tiến bộ tháng; chưa lưu lịch sử kỹ năng theo tháng.
6. Công cụ → **Phiên bản**: hiển thị phiên bản thực tế đang chạy. Desktop kiểm tra GitHub Releases khi mở ứng dụng và có nút thông báo nếu tìm được bản mới có EXE. Chưa có release công khai/mạng bị lỗi/kho riêng tư được báo rõ. Không tự tải, cài hoặc xuất bản release.

## Hợp đồng và lưu dữ liệu
- API mới `/api/classroom-tools/*`: cấu hình AI, kiểm tra model, preflight, báo cáo JSON/bản in HTML, phiên bản hiện tại và kiểm tra release.
- Đổi/xóa khóa chỉ cho socket loopback + Host localhost + Origin cùng Host, JSON tối đa 4 KB. File cấu hình riêng của runtime được thay nguyên tử; không trả/log khóa, không đưa khóa vào SQLite, localStorage hay bộ cài.
- Sao nhóm dùng `/api/gamification/stars/class-adjust` với `selectedStudentIds` và roster đầy đủ để phát hiện lớp thay đổi. Nguồn `GROUP_BATCH`; cả lớp giữ `CLASS_BATCH`.
- Hoàn tác dùng `latest-batch`, `undo-batch`; nguồn bút toán `BATCH_UNDO`. Receipt chống lặp cả chỉnh và hoàn tác nằm trong `app_settings`. Pending request giữ ID trong sessionStorage và bộ nhớ để retry sau lỗi mạng/tải lại trang cùng phiên.
- Nhóm dùng `groups`, version để ngăn ghi đè cấu hình nhóm đã thay đổi. Không thêm bảng/schema, không ghi lại toàn bộ roster/điểm sau batch.
- PDF IPC chỉ cửa sổ chính được gọi; URL backend cố định, không nhận HTML hoặc đường dẫn lưu tùy ý từ renderer. Tên/nội dung học sinh được escape; trang in không có script hoặc tài nguyên ngoài.

## Kiểm tra trong lượt này
- Không thêm/chạy tests theo hướng dẫn hiện hành; không thao tác sao/điểm trên dữ liệu thật để thử.
- Rà soát tĩnh, lint và production build thực hiện. Lint không lỗi; còn cảnh báo cũ của dự án. Build còn cảnh báo chunk lớn.
- NSIS x64 hoàn tất. Stage 923 tệp, ASAR 566 tệp, phần unpacked 5 tệp, nguồn thay đổi 35 tệp: đều 0 finding. ASAR trích từ EXE trùng ASAR packaged; 172 tệp runtime khớp stage.
- Chưa xác nhận thực tế thao tác sao, đăng nhập, PDF hoặc hiệu ứng PowerPoint trên ứng dụng đã cài. Không chạy bộ cài thay người dùng.

## Bộ cài
- `release/EduMaster-Setup-1.9.0.exe` — 113143384 byte, ProductVersion/FileVersion 1.9.0.
- SHA256: `0E86EA81DFB405A166613A91B9BBB80DAE4512613BDDD3B1D473AC43CF13C2758`.
- Bộ cài chưa ký số. Không chứa khóa API, SQLite hoặc thư viện slide cá nhân.
- Nhánh `codex/classroom-improvements`. EXE được lưu cục bộ; Git chứa source/tài liệu, không chứa bộ cài.
- Đã khởi động lại Vite của đúng workspace trên 127.0.0.1:5173 để nạp API mới.

## Tài liệu nguồn
- [Gemini API keys](https://ai.google.dev/gemini-api/docs/api-key): khóa gửi bằng header, chỉ backend sử dụng.
- [GitHub Releases API](https://docs.github.com/en/rest/releases/releases?apiVersion=latest): đọc release công khai mới nhất.
- [Electron webContents.printToPDF](https://www.electronjs.org/docs/latest/api/web-contents#contentsprinttopdfoptions): xuất PDF trong main process.
