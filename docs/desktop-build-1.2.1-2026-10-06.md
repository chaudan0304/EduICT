# EduMaster Desktop 1.2.1 — công cụ nổi trên slide

Ngày 06/10/2026, nhánh `codex/ui-polish`.

## Yêu cầu từ ảnh người dùng

Slide phải chiếm vùng trình chiếu như bản web; tiêu đề bài, nhãn PowerPoint, lịch giảng dạy và nút thoát nằm nổi phía trên. Dock dạng viên thuốc gồm điều hướng, số/chọn slide, Thưởng sao, Vòng quay, Đua vịt, Quick Quiz, ghi chú và fullscreen nằm nổi phía dưới. Người dùng không muốn chừa khoảng trống cho UI khiến slide bị thu nhỏ như bố cục 1.2.0.

## Thay đổi

- `PresentationView`: bài liên kết dùng toàn viewport, bỏ padding trên/dưới, giới hạn 88vh và cột 360px. Thẻ học sinh giữ dạng nổi; thêm badge PowerPoint cho bài liên kết.
- `NativePowerPointSurface`: canvas tuyệt đối phủ container; trạng thái chỉ hiện thành capsule nổi khi bận/lỗi. Đo bounds/radius của các capsule UI bằng DOM; ResizeObserver/MutationObserver cập nhật khi hình học thay đổi, cache tránh gửi layout trùng.
- `presentationHost.cjs`: chỉ nhận hình học từ main renderer tin cậy; tối đa 12 vùng, bounds/radius hữu hạn và giới hạn kích thước. Chuyển tọa độ theo zoom/DPI, gửi vùng clip tương đối với cửa sổ slide.
- Native worker: cửa sổ PowerPoint giữ kích thước toàn vùng; `SetWindowRgn`/`RGN_DIFF` dành đúng các vùng bo góc của UI cho React bên dưới. Vùng slide còn lại vẫn do PowerPoint gốc nhận click/trigger và phát hiệu ứng. Cache region, quản lý quyền sở hữu GDI, khôi phục region gốc khi detach; ẩn native nếu áp dụng clip thất bại để dùng được nút thoát.
- Capsule dùng nền đặc, tiêu đề sáng/dock tối theo ảnh. Tắt animation hình học của thẻ học sinh trong chế độ native để vùng clip không lệch trong lúc hiện thẻ.
- Giữ luồng file liên kết/metadata, điều hướng animation và tạm ẩn PowerPoint trước khi mở modal. Không đổi schema/dependency, không sao chép nội dung bài hoặc Save file nguồn.

Thiết kế/nguồn Win32: [powerpoint-in-app-spec.md](powerpoint-in-app-spec.md).

## Bộ cài

- `D:\DU_AN\EduICT\release\EduMaster-Setup-1.2.1.exe`.
- Dung lượng: **113,099,580 bytes**.
- SHA256: `52AD0C9730E75AEE1858D9040FCC7CF8D4AE33CAB530EE8F9B63F49F36CFEDDF`.
- File checksum: `release/EduMaster-Setup-1.2.1.exe.sha256`.
- Setup FileVersion/ProductVersion: **1.2.1 / 1.2.1**; app EXE ProductVersion **1.2.1.0**.
- Chữ ký `NotSigned`. Bộ cài trước được giữ để dùng lại khi cần.

## Kiểm tra build và payload

| Mục | Kết quả |
| --- | --- |
| Production build | Thành công, 1944 modules |
| Lint các file JS/JSX/CJS thay đổi, Node syntax, diff check | Không lỗi |
| Parser PowerShell và biên dịch C# helper | Thành công; không gọi Win32 để điều khiển cửa sổ |
| NSIS x64 | Thành công, exit code 0 |
| Root/desktop package và lockfile, stage, ASAR package | Đều 1.2.1 |
| ASAR trích từ chính Setup | Khớp byte với gói ứng dụng |
| Native/main/IPC/preload/PowerShell trích từ Setup | 9 file khớp byte với source |
| Frontend trích từ Setup | 84 file khớp byte với dist |
| Secret scan stage / ASAR / unpacked payload | 901 / 544 / 4 file; 0 finding |

Stage cuối `desktop/.stage/app-1.2.1-final`, output cuối `release/build-1.2.1-final`. Staging dùng 41 package backend đã cài, kiểm tra dependency/peer theo semver; không kéo dependency mới. Build frontend dùng CSDL bản sao trong scratch; gói không mang CSDL hoặc cấu hình cá nhân. Build còn cảnh báo bundle lớn/SQLite experimental. Các thư mục build 1.2.1 không có hậu tố final là trung gian, không phải bản giao.

## Cách thử và phần chưa nghiệm thu

Đóng EduMaster đang chạy, cài `EduMaster-Setup-1.2.1.exe` vào thư mục cài hiện có, mở bài PowerPoint liên kết rồi bấm **Trình chiếu trong EduICT**. Máy cần Microsoft PowerPoint.

Đối chiếu ảnh: slide phủ vùng trình chiếu; tiêu đề/lịch/nút thoát và dock nổi đúng vị trí; mở thẻ học sinh không làm slide nhỏ lại. Thử click các nút, chọn slide, mở/đóng từng công cụ, animation/transition/trigger/media trực tiếp trên slide. Thử resize/fullscreen/DPI/màn hình thứ hai, Dừng/Esc/nút thoát, mở lại và giữ bài PowerPoint khác.

Không thêm/chạy test tự động, không cài ứng dụng hoặc điều khiển PowerPoint thật trong lượt này. Chưa xác nhận bằng ảnh runtime native rằng vùng clip/hit testing và hiệu ứng hoạt động trên cấu hình Office của người dùng. Build, compiler và đối chiếu payload không thay thế nghiệm thu đó.
