# PowerPoint gốc trong khung EduICT Desktop

## Mục tiêu đã được người dùng xác nhận

Ngày 06/10/2026: người dùng muốn Desktop giống giao diện web, slide nằm ngay trong khung EduICT và các nút/công cụ vẫn nhìn thấy. Tiếp tục dùng file `.pptx`/`.ppt` trên máy, chỉ lưu đường dẫn và metadata. Hiệu ứng, transition, trigger và media do Microsoft PowerPoint phát từ file gốc.

Giả định: Windows có Microsoft PowerPoint; giao diện React, lớp và công cụ sư phạm hiện có được dùng chung. Không thêm dịch vụ đám mây, không upload slide và không thay bằng ảnh/PDF/video đã xuất.

## Thiết kế

- Dùng lại `PresentationView` cho bài `linked_powerpoint`; giữ nguyên các công cụ và lớp/tiết học đang chọn.
- PowerPoint chạy slideshow dạng cửa sổ (`ppShowTypeWindow`), giữ các thiết lập hiệu ứng/timing/âm thanh của bài. Các thiết lập cửa sổ tạm thời được phục hồi trong bộ nhớ, không Save file.
- Native host bỏ viền và neo cửa sổ slideshow vào hình chữ nhật của vùng slide. Cửa sổ được đặt owner là cửa sổ EduICT; không dùng SetParent qua hai process vì Microsoft ghi nhận vấn đề DPI với cách đó. Đây là cửa sổ PowerPoint thật, không phải nội dung PowerPoint trong DOM.
- Một worker PowerShell cố định nhận lệnh JSON whitelist để gắn/di chuyển/ẩn/khôi phục đúng HWND slideshow do COM trả về. Main process giữ HWND, kiểm tra process PowerPoint và chủ cửa sổ; renderer chỉ nhận session ID và metadata.
- Renderer gửi bounds của vùng slide; main xác thực, giới hạn trong content bounds và đổi DIP sang pixel màn hình theo API Electron. Main cập nhật khi cửa sổ di chuyển, resize, maximize/fullscreen hoặc đổi DPI.
- Trước khi mở modal sư phạm, ẩn native slide; đóng modal hiện lại cùng vị trí trình chiếu. Thanh điều khiển giữ luôn hiện. Thẻ học sinh thu nhỏ có vùng riêng để không bị slide native che.
- Esc/kết thúc show cập nhật trạng thái; thoát màn trình chiếu dừng/giải phóng phiên native. Chỉ đóng bài do EduICT mở, giữ bài đã mở sẵn và các bài khác.
- Khi không có PowerPoint/native host, báo điều kiện rõ trong khung EduICT, không báo giả đã giữ hiệu ứng.

## Phạm vi mã

- `desktop/native/powerpoint-bridge.ps1`, `powerpointBridge.cjs`: mở show dạng cửa sổ và lấy handle nội bộ.
- `desktop/native/powerpoint-window-host.ps1`, `powerpointWindowHost.cjs`: worker và protocol native cố định.
- `desktop/main/presentationHost.cjs`, `ipc.cjs`, `main.cjs`: lifecycle, bounds, IPC xác thực.
- `desktop/preload/preload.cjs`, `src/services/nativeAdapterBootstrap.js`, `NativePresentationService.js`: API optional ngoài contract bridge chín phương thức.
- `NativePowerPointSurface.jsx`, `PresentationView.jsx`, `LessonPresentation.jsx`: dùng chung màn web và vùng slide native.

## Lệnh và quy ước

- Dev: `npm run dev -- --host 127.0.0.1` với `EDUICT_DB_PATH` trỏ CSDL bản sao trong scratch.
- Build: `npm run build`; bộ cài: `npm run desktop:installer`.
- Lint: `npm run lint -- <các file thay đổi>`; cú pháp native: `node --check <file.cjs>` và PowerShell Parser.ParseFile.
- React dùng service, không require Electron/fs/COM. Native CommonJS dùng dependency injection và lỗi `{ok:false,code,message}`. Không thêm dependency hoặc đổi schema SQLite.

## Thứ tự thực hiện và nghiệm thu

1. Native show dạng cửa sổ và worker host, kiểm tra cú pháp.
2. Main/preload/service, lifecycle và bounds.
3. Dùng chung UI web, modal và điều hướng animation; production build/lint.
4. Đóng gói EXE mới, kiểm tra phiên bản/checksum/nội dung gói. Giữ bộ cài 1.1.1 cho đến khi bản mới tạo thành công.

Không thêm/chạy test tự động vì người dùng chưa yêu cầu và hướng dẫn phiên làm việc không cho phép. Các mục cần thử trên máy thực: animation/transition/trigger/media; giữ công cụ quanh slide; modal không bị che; resize/DPI/màn hình thứ hai; Esc/đóng/mở lại; không sửa file gốc và không đóng các bài khác. Build và kiểm tra source không thay thế nghiệm thu PowerPoint thật.

## Nguồn kỹ thuật

- [PowerPoint ShowType](https://learn.microsoft.com/en-us/office/vba/api/powerpoint.slideshowsettings.showtype).
- [PowerPoint SlideShowSettings](https://learn.microsoft.com/en-us/office/vba/api/powerpoint.slideshowsettings).
- [Win32 owned windows](https://learn.microsoft.com/en-us/windows/win32/winmsg/window-features#owned-windows).
- [SetParent và DPI](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setparent).
- [Electron screen, DIP/pixel](https://www.electronjs.org/docs/latest/api/screen).
