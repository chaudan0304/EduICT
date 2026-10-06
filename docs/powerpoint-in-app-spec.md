# PowerPoint gốc trong khung EduICT Desktop

## Mục tiêu đã được người dùng xác nhận

Ngày 06/10/2026: người dùng muốn Desktop giống giao diện web, slide nằm ngay trong khung EduICT và các nút/công cụ vẫn nhìn thấy. Tiếp tục dùng file `.pptx`/`.ppt` trên máy, chỉ lưu đường dẫn và metadata. Hiệu ứng, transition, trigger và media do Microsoft PowerPoint phát từ file gốc.

Cập nhật theo ảnh người dùng gửi: slide phải phủ vùng trình chiếu, tiêu đề/lịch/nút thoát nằm nổi phía trên và thanh công cụ dạng viên thuốc nằm nổi phía dưới. Không chừa hàng hoặc cột riêng làm slide nhỏ lại. Đây là yêu cầu cho bản 1.2.1, thay bố cục 1.2.0.

Giả định: Windows có Microsoft PowerPoint; giao diện React, lớp và công cụ sư phạm hiện có được dùng chung. Không thêm dịch vụ đám mây, không upload slide và không thay bằng ảnh/PDF/video đã xuất.

## Thiết kế

- Dùng lại `PresentationView` cho bài `linked_powerpoint`; giữ nguyên các công cụ và lớp/tiết học đang chọn.
- PowerPoint chạy slideshow dạng cửa sổ (`ppShowTypeWindow`), giữ các thiết lập hiệu ứng/timing/âm thanh của bài. Các thiết lập cửa sổ tạm thời được phục hồi trong bộ nhớ, không Save file.
- Native host bỏ viền và neo cửa sổ slideshow vào hình chữ nhật của vùng slide. Cửa sổ được đặt owner là cửa sổ EduICT; không dùng SetParent qua hai process vì Microsoft ghi nhận vấn đề DPI với cách đó. Đây là cửa sổ PowerPoint thật, không phải nội dung PowerPoint trong DOM.
- Bridge đọc HWND qua COM (có getter tường minh), chờ tối đa 5 giây để native window sẵn sàng. Khi cần, tìm cửa sổ mới theo snapshot, đúng tiến trình PowerPoint/lớp slideshow và tên bài; từ chối trường hợp mơ hồ hoặc tên bài trùng. Một worker PowerShell cố định nhận lệnh JSON whitelist để gắn/di chuyển/ẩn/khôi phục HWND đã xác thực. Main process giữ HWND, kiểm tra process PowerPoint và chủ cửa sổ; renderer chỉ nhận session ID và metadata.
- Renderer gửi bounds của vùng slide; main xác thực, giới hạn trong content bounds và đổi DIP sang pixel màn hình theo API Electron. Main cập nhật khi cửa sổ di chuyển, resize, maximize/fullscreen hoặc đổi DPI.
- Vùng slide chiếm toàn viewport trình chiếu, không có padding trên/dưới, thanh trạng thái cố định hoặc cột học sinh làm giảm diện tích. Tiêu đề/lịch/nút thoát, dock và thẻ học sinh giữ dạng nổi trên slide.
- Vì native window nằm trên DOM, renderer đo từng capsule tương tác; main xác thực tối đa 12 vùng và đổi sang pixel theo DPI. Worker dùng SetWindowRgn với RGN_DIFF để dành đúng các vùng bo góc đó cho UI EduICT bên dưới. Kích thước cửa sổ slide vẫn bằng toàn vùng trình chiếu; PowerPoint tự giữ tỷ lệ nội dung. Các capsule dùng nền đặc để vùng clip khớp hình dạng điều khiển; native window tiếp tục nhận click/trigger ở phần slide.
- Vùng clip cập nhật theo resize hoặc thay đổi hình học UI, có cache để không tạo lại GDI region khi không đổi. Windows sở hữu region sau SetWindowRgn thành công; region tạm được giải phóng, region gốc được khôi phục khi detach. Nếu áp dụng region lỗi, ẩn native window để vẫn dùng được nút thoát.
- Trước khi mở modal sư phạm, ẩn native slide; đóng modal hiện lại cùng vị trí trình chiếu. Thanh điều khiển giữ luôn hiện. Thẻ học sinh nổi trên slide, không làm slide thu nhỏ.
- Esc/kết thúc show cập nhật trạng thái; thoát màn trình chiếu dừng/giải phóng phiên native. Chỉ đóng bài do EduICT mở, giữ bài đã mở sẵn và các bài khác.
- Khi không có PowerPoint/native host, báo điều kiện rõ trong khung EduICT, không báo giả đã giữ hiệu ứng.

## Phạm vi mã

- `desktop/native/powerpoint-bridge.ps1`, `powerpointBridge.cjs`: mở show dạng cửa sổ và lấy handle nội bộ.
- `desktop/native/powerpoint-show-window.ps1`: đọc COM HWND và tìm đúng cửa sổ native mới, hỗ trợ trường hợp đọc HWND trực tiếp trả 0.
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
- [SetWindowRgn](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowrgn), [CombineRgn](https://learn.microsoft.com/en-us/windows/win32/api/wingdi/nf-wingdi-combinergn) và [CreateRoundRectRgn](https://learn.microsoft.com/en-us/windows/win32/api/wingdi/nf-wingdi-createroundrectrgn).
- [EnumWindows](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-enumwindows).
