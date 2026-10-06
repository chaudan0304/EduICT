# Bộ cài thử nghiệm EduMaster 1.1.0

Ngày đóng gói: 06/10/2026. Nhánh: `codex/ui-polish`. Mã tính năng liên kết PowerPoint: `d9f1f29`.

## File để cài

- `D:\DU_AN\EduICT\release\EduMaster-Setup-1.1.0.exe`
- Dung lượng: **113,224,536 bytes** (khoảng 113 MB).
- SHA256: `E31079B382C4CCA0DD39DC0D57F92AEAAC8A05F66E47C17FBE61ECA4277D3B30`.
- File checksum: `release/EduMaster-Setup-1.1.0.exe.sha256`.
- `release/EduMaster-Setup.exe` cũng đã cập nhật và có cùng checksum.
- Bộ cài cũ được giữ tại `release/EduMaster-Setup-1.0.0-before-ui.exe`.

## Nội dung

- Các thay đổi giao diện đã hoàn thành trên nhánh hiện tại.
- Liên kết PowerPoint trên máy, chỉ lưu metadata/đường dẫn, mở slideshow bằng PowerPoint Desktop.
- Chọn lại file, xóa liên kết và bảng điều khiển trong tiết học.
- Phiên bản root package, desktop package, hai lockfile và staged package đều là `1.1.0`.
- Giữ nguyên appId, tên ứng dụng và cấu hình thư mục dữ liệu hiện có. Cơ chế backup trước nâng cấp đã có trong Desktop Shell; chưa kiểm thử nâng cấp thực tế cho bản này.

## Kiểm tra đóng gói đã thực hiện

| Mục | Kết quả |
| --- | --- |
| Production build | Thành công; còn cảnh báo bundle lớn và SQLite experimental |
| Stage | Thành công, 922 file được quét, 0 finding |
| NSIS Windows x64 | Thành công |
| Setup FileVersion / ProductVersion | `1.1.0` / `1.1.0` |
| App EXE FileVersion / ProductVersion | `1.1.0` / `1.1.0.0` |
| `app.asar/package.json` | `1.1.0` |
| Mã linked picker, metadata service, preload, bridge trong ASAR | Khớp từng byte với source hiện tại |
| Script PowerPoint trong `app.asar.unpacked` | SHA256 khớp source |
| Quét ASAR | 539 file, 0 finding |
| Quét thư mục unpacked | 9 file, 0 finding |
| Bản Setup có tên phiên bản | Checksum khớp `EduMaster-Setup.exe` |
| Chữ ký số | `NotSigned` |

Lượt build trong sandbox bị chặn DNS npm. Lượt build được cấp quyền truy cập mạng sau đó đã hoàn tất. Build sử dụng CSDL bản sao `scratch/ui-review/edumaster.sqlite`; staging loại bỏ CSDL, uploads và cấu hình riêng khỏi gói cài.

Không chạy bộ test tự động, không cài bộ cài hoặc mở PowerPoint để kiểm thử bản này trong đợt đóng gói. Các kết quả runtime trong báo cáo Phase 12.2 là kết quả lịch sử cho bản cũ, không chứng minh bản 1.1.0 đã qua nghiệm thu.

## Hướng dẫn thử trên máy

1. Đóng EduMaster đang chạy; mở `EduMaster-Setup-1.1.0.exe` và chọn thư mục cài đặt đang sử dụng nếu nâng cấp bản cũ.
2. Mở EduMaster, vào **Bài học & slide → Liên kết PowerPoint → Chọn file trên máy**.
3. Chọn `.pptx` hoặc `.ppt`, lưu liên kết, bấm **Trình chiếu → Trình chiếu PowerPoint**. Microsoft PowerPoint cần được cài trên máy.
4. Dùng bài có animation, transition, trigger và media. Kiểm tra nút Tiếp/Trước; trigger được bấm trực tiếp trên slide trong PowerPoint. Dùng hai màn hình nếu cần vừa chiếu PowerPoint vừa thao tác công cụ tiết học trong EduICT.
5. Đóng/mở lại EduMaster và mở lại bài. Sau khi đổi tên hoặc di chuyển file, chọn lại file và kiểm tra tiết học vẫn gắn đúng bài.
6. Thử xóa một liên kết thử nghiệm và kiểm tra file gốc còn nguyên. Khi dừng trình chiếu, kiểm tra các bài PowerPoint khác đang mở vẫn được giữ.

Khi backup/restore hoặc chuyển máy, file PowerPoint liên kết không được mang theo trong backup EduICT. Mang file gốc theo và chọn lại file để cấp quyền trên máy mới.
