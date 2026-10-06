# EduMaster Desktop 1.2.0 — PowerPoint trong khung EduICT

Ngày: 06/10/2026. Nhánh làm việc: `codex/ui-polish`.

## Thay đổi đã thực hiện

Theo xác nhận của người dùng, bài `linked_powerpoint` dùng chung màn trình chiếu web. Các công cụ Thưởng sao, Vòng quay, Đua vịt, Quick Quiz, ghi chú và thời khóa biểu tiếp tục dùng lớp/tiết học hiện tại.

PowerPoint chạy file gốc dạng cửa sổ. Worker native kiểm tra HWND/process, bỏ viền và đặt owner là cửa sổ EduICT, neo cửa sổ show vào vùng slide giữa giao diện. Đây là cửa sổ PowerPoint thật; không chuyển slide thành ảnh hoặc nội dung DOM. Hiệu ứng do PowerPoint thực thi. Thiết lập show tạm thời được phục hồi trong bộ nhớ, không Save file nguồn.

Main process giữ handle nội bộ, renderer chỉ nhận session ID/metadata. IPC xác thực sender, bounds và lệnh whitelist. Host cập nhật vị trí theo resize/fullscreen/DPI; ẩn slide trước khi mở modal, hiện lại khi đóng. Điều hướng dùng bridge animation hiện có. Đóng màn trình chiếu giải phóng phiên; bài đã mở sẵn được giữ theo quy tắc ownership của bridge.

Thiết kế và nguồn kỹ thuật: [powerpoint-in-app-spec.md](powerpoint-in-app-spec.md).

## Gói chạy trực tiếp

- ZIP: `D:\DU_AN\EduICT\release\EduMaster-1.2.0-chay-truc-tiep.zip`.
- Dung lượng: **165,719,925 bytes**.
- SHA256: `7C4C7F370601B2DE784CC50B1EBFB4204D7C981B11AD957403743E0880766C60`.
- EXE: `release/build-1.2.0/win-unpacked/EduMaster.exe`, ProductVersion **1.2.0.0**.
- Giữ bộ cài 1.1.1 để dùng lại khi cần. ZIP chứa toàn bộ thư mục ứng dụng, không được tách riêng EXE.

### Cách thử

1. Đóng EduMaster đang chạy. Giải nén ZIP ra một thư mục mới trên máy; chạy `win-unpacked/EduMaster.exe` từ thư mục đã giải nén.
2. Mở bài PowerPoint liên kết và bấm **Trình chiếu trong EduICT**. Máy cần Microsoft PowerPoint.
3. Slide phải nằm trong vùng giữa; thanh điều khiển và các công cụ EduICT ở xung quanh. Thử Trước/Tiếp, trigger trực tiếp, âm thanh/video và transition.
4. Mở/đóng từng công cụ; thử resize, maximize, fullscreen và đổi màn hình/DPI. Thử Dừng, Esc, mở lại và giữ bài PowerPoint khác đang mở.

Ứng dụng dùng vùng dữ liệu EduMaster hiện có theo cấu hình desktop; gói không mang CSDL hoặc slide cá nhân. Không chạy ứng dụng từ trong trình xem ZIP.

## Kết quả kiểm tra build và nội dung gói

| Mục | Kết quả |
| --- | --- |
| Production Vite build | Thành công, 1944 modules |
| Lint file thay đổi, Node syntax | Không lỗi |
| Parser hai script PowerShell | Không lỗi |
| Biên dịch C# helper bằng Add-Type | Thành công; không gọi Win32 để điều khiển cửa sổ |
| Root/desktop package và lockfile, staged/ASAR package | 1.2.0 |
| Native/main/IPC/preload và hai PowerShell đã đóng gói | 9 file khớp byte với source |
| Frontend trong ASAR | 84 file khớp byte với dist |
| Secret scan stage / ASAR / unpacked | 901 / 544 / 10 file; 0 finding |
| App EXE ProductVersion | 1.2.0.0 |

Staging offline dùng 41 package backend đã cài, kiểm tra dependency/peer theo semver và giữ cấu trúc module. Stage cuối là `desktop/.stage/app-1.2.0`, output cuối là `release/build-1.2.0`; các thư mục build trung gian khác không phải bản giao.

Không thêm hoặc chạy test tự động trong lượt này. Không cài ứng dụng hoặc điều khiển PowerPoint thật. Native docking, animation/transition/trigger/media, nhiều màn hình và hành vi file nguồn vẫn cần nghiệm thu trên máy người dùng; kết quả build không xác nhận các mục đó. Build còn cảnh báo bundle lớn và SQLite experimental.

## Bộ cài NSIS chưa hoàn thành

Công cụ `makensis.exe` trong cache NSIS 3.0.4.1 không khởi chạy được: Windows báo `Illegal System DLL Relocation`; electron-builder báo `spawn UNKNOWN`. Đã dùng cache NSIS/resources/7zip cục bộ để tránh tải mạng nhưng lỗi thực thi còn tồn tại. Không tạo file `EduMaster-Setup-1.2.0.exe` và không đổi tên ZIP/EXE chạy trực tiếp thành bộ cài.

Hệ thống duyệt quyền tự động cũng từ chối lệnh dọn thư mục đóng gói, và phiên hiện tại không cho phép xin quyền bổ sung. Vì vậy stage/output mới được tạo trong thư mục mới, giữ bộ cài 1.1.1. Bộ cài 1.2.0 cần được dựng lại trong môi trường có NSIS chạy bình thường.

## GitHub

Lần đóng gói đầu, `git add -A` bị từ chối khi tạo `.git/index.lock` (`Permission denied`) vì `.git` chỉ được đọc. Sau đó người dùng cấp quyền đẩy Git và môi trường cho phép ghi; thay đổi 1.2.0 được đưa vào commit trên nhánh `codex/ui-polish` để push lên `origin`. Gói chạy trực tiếp nằm trong `release/` và được gitignore; commit chứa source, phiên bản và tài liệu build.
