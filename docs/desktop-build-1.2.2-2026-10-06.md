# EduMaster 1.2.2 — lỗi HWND PowerPoint

Ngày 06/10/2026, nhánh `codex/ui-polish`.

## Bằng chứng và nguyên nhân đã khoanh vùng

Ảnh người dùng cho thấy lỗi đưa PowerPoint vào khung và vùng slide trống. Log cục bộ `desktop.log` ghi `StartEmbeddedShow failed: No slideshow window handle`, lặp lại trên cả 1.2.0 và 1.2.1. Bản đã cài tại `D:\App_DaCaiDat\EduMaster` có EXE/ASAR 1.2.1 và script vẫn dùng `$handle = [long]$window.HWND` một lần ngay sau `Run()`.

Code đó chuyển null/0 thành 0 rồi dừng slideshow, không thử getter COM rõ ràng, không chờ HWND sẵn sàng và không tìm cửa sổ native. Đây là điểm thất bại thực tế trước khi worker attach/layout chạy; thay bố cục CSS không xử lý được lỗi này.

Đã đọc metadata của type library Office `MSPPT.OLB` trên máy (không khởi chạy PowerPoint): SlideShowWindow, DocumentWindow và Application đều có thuộc tính HWND. Không kết luận Office thiếu API HWND. Chưa phân biệt được bằng runtime liệu giá trị 0 đến từ adapter PowerShell hay thời điểm cửa sổ khởi tạo; bản sửa xử lý cả hai trường hợp.

## Bản sửa

- Helper cố định `powerpoint-show-window.ps1` chỉ được dot-source bởi hành động StartEmbeddedShow, được unpack bên cạnh bridge trong EXE.
- Đọc thuộc tính trực tiếp và bằng COM `InvokeMember(GetProperty)`; đọc lại `Presentation.SlideShowWindow`, chờ tối đa 50 lần x 100ms.
- Lấy đúng PID PowerPoint từ HWND editor/app đã xác thực; chỉ dùng process duy nhất khi chưa lấy được HWND editor. Nếu nhiều process và không xác định được đúng instance, từ chối.
- Snapshot các cửa sổ đang hiện trước Run; fallback chỉ lấy cửa sổ slideshow mới, cùng PID, có `screenClass` ở root/child và caption khớp tên bài. Không dựa vào cửa sổ foreground hoặc caption bản địa hóa cố định.
- Getter COM của đúng show được ưu tiên; root frame phải mới nếu chứa screen con, không dock editor đang hiện. Từ chối nhiều candidate hoặc bài trùng tên thay vì chọn tùy tiện.
- Ghi log ngắn về nhánh phân giải handle và số candidate khi timeout; HWND vẫn chỉ nằm trong native/main, không expose cho renderer.
- Giữ nguyên clip/công cụ nổi/toàn vùng slide của 1.2.1, ownership, read-only và phục hồi thiết lập trong bộ nhớ. Không Save/copy file nguồn.

`screenClass` là quy tắc nhận dạng native của helper; cần nghiệm thu với phiên bản Office thực tế. API liệt kê cửa sổ: [Microsoft EnumWindows](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-enumwindows).

## Bộ cài

- `D:\DU_AN\EduICT\release\EduMaster-Setup-1.2.2.exe`.
- Dung lượng: **113,101,678 bytes**.
- SHA256: `C9FBA0C8180315C23EAB494924CEB714EC4F9A66B05E839BEFC59C845A35EFE5`.
- Setup FileVersion/ProductVersion: **1.2.2 / 1.2.2**, chữ ký `NotSigned`.
- Checksum: `release/EduMaster-Setup-1.2.2.exe.sha256`.

## Kiểm tra đóng gói

| Mục | Kết quả |
| --- | --- |
| Production build | Thành công |
| Parser ba PowerShell và biên dịch C# discovery | Thành công; không gọi Win32 để thao tác cửa sổ |
| NSIS x64 | Thành công, exit code 0 |
| Root/desktop package + lockfile, stage, ASAR | Đều 1.2.2 |
| ASAR trích từ chính Setup | Khớp byte với gói ứng dụng |
| Native/main/IPC/preload và ba PowerShell | 10 file khớp byte với source |
| Frontend trong Setup | 84 file khớp byte với dist |
| Secret scan stage / ASAR / unpacked payload | 902 / 545 / 5 file; 0 finding |

Stage `desktop/.stage/app-1.2.2`, output `release/build-1.2.2`; giữ 41 package backend đã cài, không đổi dependency/schema. Build dùng CSDL bản sao trong scratch, không mang dữ liệu cá nhân vào gói.

Không thêm/chạy test tự động, không khởi chạy PowerPoint, không cài/nâng cấp ứng dụng trong lượt này. Metadata và compiler không thay thế thử slideshow thật. Bản sửa chưa được xác nhận runtime rằng HWND đã lấy thành công trên máy người dùng; chưa nghiệm thu clipping/hit testing/animation/trigger/media/DPI.

Để thử: đóng app cũ, cài 1.2.2 vào thư mục hiện có, mở đúng bài liên kết và bấm **Trình chiếu trong EduICT**. Nếu vẫn lỗi, log mới sẽ cho biết đang thất bại ở getter/discovery hay worker attach/layout.
