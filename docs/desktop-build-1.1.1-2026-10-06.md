# Bộ cài thử nghiệm EduMaster 1.1.1

Ngày: 06/10/2026. Nhánh: `codex/ui-polish`.

## Lỗi được xử lý

Ảnh người dùng cho thấy PowerPoint chiếm toàn màn hình. Bản 1.1.0 đặt bảng điều khiển trong DOM của cửa sổ EduICT, nên bảng bị che bởi cửa sổ PowerPoint dù có z-index cao.

Bản 1.1.1 tạo BrowserWindow riêng, luôn nổi khi slideshow bắt đầu. Cửa sổ này chỉ chạy `PowerPointToolbar`, không mount thêm App, tiết học hoặc đồng hồ thứ hai. Nút Hiện EduICT đưa cửa sổ chính lên trước; Về slide thu cửa sổ chính xuống. Các lối tắt đi tới tab Đếm giờ, Điểm tốt và Vòng quay trên cửa sổ chính, giữ lớp đang chọn.

Thanh nổi có kéo di chuyển và thu gọn. Status polling tuần tự mỗi 4 giây phát hiện slideshow kết thúc/Esc; thanh đóng và trả EduICT ra trước. Khi dừng, quyền luôn nổi tạm thời của cửa sổ chính được phục hồi. Đóng ứng dụng hủy thanh nổi. Nút Dừng gọi exit và close trong main process trước khi hủy cửa sổ thanh công cụ; vẫn giữ nguyên quy tắc không đóng bài PowerPoint đã mở sẵn.

IPC chỉ nhận các thao tác cố định và ba tab trong whitelist, kiểm tra cùng origin backend. Cửa sổ nổi dùng sandbox/context isolation, không expose fs/shell/lệnh tùy ý. Luồng file liên kết và việc phát hiệu ứng bằng PowerPoint gốc được giữ nguyên.

API tham khảo: [Electron BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window) cho `setAlwaysOnTop`, `showInactive` và `moveTop`; [vùng kéo cửa sổ](https://www.electronjs.org/docs/latest/tutorial/custom-window-interactions) cho `app-region: drag` / `no-drag`.

## Bộ cài

- `D:\DU_AN\EduICT\release\EduMaster-Setup-1.1.1.exe`
- Dung lượng: **113,227,330 bytes**.
- SHA256: `55714F34C54B128F304836F5BFA78F52AF35FE0CE03B31755C872C99D3CE54D8`.
- Checksum: `release/EduMaster-Setup-1.1.1.exe.sha256`.
- `release/EduMaster-Setup.exe` có cùng nội dung. Bản 1.1.0 có tên phiên bản vẫn được giữ lại.
- Bộ cài chưa ký số (`NotSigned`).

## Kết quả kiểm tra đóng gói

| Mục | Kết quả |
| --- | --- |
| Production build, NSIS x64 | Thành công |
| Lint file thay đổi, Node syntax, PowerShell parser | Không lỗi |
| Setup FileVersion / ProductVersion | `1.1.1` / `1.1.1` |
| App EXE ProductVersion | `1.1.1.0` |
| Root/desktop package và lockfile, staged/ASAR package | `1.1.1` |
| Manager cửa sổ, main, IPC, preload trong ASAR | Khớp byte với source |
| PowerShell trong ASAR unpacked | Khớp byte với source |
| Frontend JS/CSS trong ASAR | 28 file khớp byte với dist |
| Quét stage / ASAR / unpacked | 923 / 540 / 9 file, 0 finding |
| Checksum Setup có tên phiên bản | Khớp Setup mặc định |

Build dùng CSDL bản sao `scratch/ui-review/edumaster.sqlite`; gói cài không chứa CSDL hoặc cấu hình riêng. Còn cảnh báo bundle lớn, SQLite experimental và warning useEffect tồn tại trước thay đổi trong App.jsx. Không chạy bộ test tự động, cài bộ cài hoặc điều khiển PowerPoint thật trong đợt này. Thử mở preview localhost bằng công cụ trình duyệt bị lỗi kết nối; không dùng kết quả đó để khẳng định giao diện hoặc thứ tự cửa sổ native đã đạt.

## Thử trên máy

1. Đóng EduMaster đang chạy, cài `EduMaster-Setup-1.1.1.exe` vào thư mục cài hiện có, rồi mở lại.
2. Mở một bài PowerPoint liên kết, bấm Trình chiếu PowerPoint. Thanh EduICT phải xuất hiện phía trên slide; kéo thanh hoặc thu gọn nếu che nội dung.
3. Bấm Hiện EduICT hoặc Đếm giờ/Điểm tốt/Vòng quay, dùng công cụ với lớp đang chọn. Bấm Về slide để tiếp tục slideshow.
4. Thử Trước/Tiếp với animation, bấm trigger trực tiếp trong PowerPoint. Thử Dừng và Esc, mở lại bài, giữ các bài PowerPoint khác đang mở.
5. Nếu dùng hai màn hình, thử màn hình slideshow được chọn trong PowerPoint và kéo thanh sang màn hình cần dùng. Cần nghiệm thu riêng vị trí thanh, DPI và thứ tự cửa sổ trên cấu hình thực tế.

Hiệu ứng, trigger, media, cài/nâng cấp và nhiều màn hình còn cần nghiệm thu trên EduICT Desktop + Microsoft PowerPoint.
