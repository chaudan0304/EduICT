# PowerPoint liên kết file — yêu cầu cập nhật 06/10/2026

## Cập nhật giao diện Desktop 1.2.1

Người dùng đã xác nhận slide phải nằm trong khung EduICT, với các công cụ giống bản web. Theo ảnh cập nhật, slide phủ vùng trình chiếu; tiêu đề/lịch/nút thoát và dock nằm nổi trên slide, không chừa hàng/cột làm slide nhỏ lại. Bài liên kết dùng `PresentationView`; PowerPoint gốc được neo vào toàn vùng slide và clip theo hình các capsule UI. Slide tạm ẩn khi mở modal, vị trí/clip cập nhật theo cửa sổ EduICT. Chi tiết: [PowerPoint trong khung ứng dụng](powerpoint-in-app-spec.md). Bản 1.2.1 có bộ cài EXE; khả năng tương thích Office/DPI/hiệu ứng còn cần nghiệm thu thực tế.

## Mục tiêu do người dùng xác định

Giáo viên chọn bài PowerPoint và trình chiếu với hiệu ứng gốc. EduICT hỗ trợ quản lý tiết học, lớp, đồng hồ, hoạt động và thi đua. EduICT chỉ lưu tham chiếu tới bài PowerPoint, không sao chép nội dung bài vào thư mục ứng dụng và không tạo một bộ ảnh slide để trình chiếu.

Yêu cầu này thay thế hướng thiết kế mặc định cho PowerPoint trong kế hoạch giao diện trước đây. Các bài soạn native là luồng riêng, không bị đổi sang PowerPoint.

## Hành vi đích

1. Thao tác chính đổi từ **Nhập PowerPoint** sang **Liên kết PowerPoint**.
2. Giáo viên chọn file gốc; bài học lưu metadata và đường dẫn, không gửi binary PPTX qua API, không sao chép file, không render PNG/PDF nền.
3. Giáo viên có thể sửa tên bài, khối, chủ đề, thời lượng, ghi chú và liên kết lại file.
4. Nút **Trình chiếu PowerPoint** mở và chạy bài gốc bằng Microsoft PowerPoint Desktop. Hiệu ứng được PowerPoint thực thi theo file và thiết lập trình chiếu gốc; không tái tạo hiệu ứng trong React.
5. Thư viện dùng biểu tượng PowerPoint và metadata. Không yêu cầu thumbnail hay danh sách ảnh slide để mở bài.
6. EduICT tiếp tục cung cấp điều khiển tiết học và công cụ hỗ trợ. Đồng hồ hoặc thưởng sao không làm thay đổi file PowerPoint.
7. Nếu thiếu file/thiếu PowerPoint, hiển thị nguyên nhân và thao tác **Chọn lại file** phù hợp. Không thay bài bằng ảnh tĩnh mà gọi đó là trình chiếu giữ hiệu ứng.

## Hai loại tham chiếu cần phân biệt

- **Đường dẫn file trên máy:** phù hợp với ứng dụng Windows + PowerPoint Desktop, làm phương án mặc định cho thiết kế hiện tại. USB/ổ đồng bộ được dùng khi file tồn tại trên máy.
- **URL OneDrive/Google Drive:** cần xác định riêng cách mở trong PowerPoint Desktop, quyền truy cập và offline. Không tự coi link chia sẻ là đường dẫn file Windows hay cam kết cùng mức hỗ trợ hiệu ứng trên web.

Người dùng đã chọn **file trên máy**. Luồng mới triển khai cho EduICT Desktop trên Windows, hỗ trợ `.pptx` và `.ppt`; URL cloud chưa thuộc phạm vi triển khai này.

## Lưu trữ và quyền đối với file

- SQLite chỉ lưu thông tin bài và tham chiếu nguồn; định dạng dữ liệu phân biệt file liên kết với file do ứng dụng quản lý.
- File thuộc quyền quản lý của giáo viên. Xóa bài khỏi thư viện chỉ xóa bản ghi tham chiếu, không xóa file ngoài ứng dụng.
- File được sửa ở PowerPoint sẽ được dùng ở lần mở sau. EduICT không giữ bản nội dung cũ thay thế nguồn.
- Native picker lấy đường dẫn mà không đọc toàn bộ file vào renderer. Bridge chỉ mở các file được người dùng cho phép; giữ kiểm tra đuôi file, file tồn tại, đường dẫn và phạm vi quyền.
- Lệnh đóng bài chỉ tác động bài đã được EduICT mở/kiểm soát, không đóng toàn bộ PowerPoint hay các bài riêng của giáo viên.
- Backup của EduICT giữ metadata/đường dẫn; file PowerPoint liên kết không nằm trong backup này. Chuyển máy cần mang file gốc theo và liên kết lại nếu đường dẫn thay đổi.
- Các bài đã import trước đây vẫn mở được từ dữ liệu cũ. Không tự xóa PPTX/ảnh đang lưu; việc giải phóng dung lượng cũ cần một luồng chuyển đổi riêng, có kiểm tra file nguồn.

## Hiện trạng trước thay đổi

- `server/routes/pptx.js` nhận binary, gọi render preview và commit bản sao PPTX vào vùng ứng dụng.
- `LessonLibrary.jsx` vẫn mở `PresentationView` với slide render cho các bài imported.
- `PresentationService.js` và Desktop Bridge đã có khả năng mở file, chạy slideshow và điều khiển PowerPoint.
- `desktop/native/pathValidation.cjs` hiện chỉ cho phép file trong vùng `uploads/presentations`; cần thiết kế quyền cho file liên kết bên ngoài, không bỏ toàn bộ kiểm tra này.
- `desktop/main/ipc.cjs` và `FileDialogService` hiện đọc binary để trả File; cần thêm luồng chọn tham chiếu không đọc nội dung.

## Thứ tự triển khai

- LP1: chốt loại tham chiếu và hợp đồng dữ liệu, tách rõ `linked` và `managed`.
- LP2: native picker trả tham chiếu; lưu/đọc metadata; không tạo bản sao/render/cache slide.
- LP3: thư viện và thông tin bài có Liên kết/Chọn lại file/Mở bằng PowerPoint, với trạng thái thiếu file.
- LP4: tiết học mở bài bằng PowerPoint gốc; điều khiển và đóng đúng bài, giữ các công cụ EduICT.
- LP5: kiểm tra lưu/restart, đổi tên/chuyển file, xóa tham chiếu, backup/restore và hiệu ứng thật trên bản Desktop.

## Tiêu chí nghiệm thu

- Đăng ký bài mới không tạo PPTX, PNG, PDF hay slide content trong vùng dữ liệu EduICT; chỉ thêm metadata/tham chiếu.
- Chọn file không truyền nội dung file vào renderer/API upload.
- Bài mẫu có animation, transition, trigger và media chạy bằng PowerPoint Desktop. Phân biệt giới hạn phiên bản PowerPoint/font/media với lỗi của EduICT; chỉ báo đạt phần đã chạy thực tế.
- Sửa file bên ngoài rồi mở lại cho thấy nội dung mới.
- Đổi tên/chuyển file được báo rõ; chọn lại đường dẫn không làm mất liên kết tiết học.
- Xóa bản ghi không làm thay đổi/xóa file gốc; đóng bài không ảnh hưởng bài khác đang mở trong PowerPoint.
- Backup/restore chỉ mang tham chiếu với bài linked; bài managed cũ giữ hành vi tương thích.
- Web báo rõ khả năng mở PowerPoint Desktop khi không có native bridge; không giả báo trình chiếu giữ hiệu ứng thành công.

Tham khảo API PowerPoint: [Presentations.Open](https://learn.microsoft.com/en-us/office/vba/api/powerpoint.presentations.open), [SlideShowSettings.Run](https://learn.microsoft.com/en-us/office/vba/api/powerpoint.slideshowsettings.run).

## Runtime đã triển khai

- Dùng `lessons.type = 'linked_powerpoint'` để phân biệt tham chiếu với bài imported do ứng dụng quản lý; không cần đổi schema SQLite. Bài linked không có slide content, thumbnail, hash nội dung hay file đính kèm.
- IPC `selectPresentationFile` mở hộp thoại PowerPoint và chỉ trả `{path, name, size}`. Quyền mở đúng file được lưu dưới dạng đường dẫn trong `settings/linked-presentations.json` và được kiểm tra lại qua realpath ở lần mở sau. Không cấp quyền cả thư mục và không expose API đọc path tùy ý.
- API chỉ lưu metadata; thao tác lưu/xóa linked báo lỗi thật từ backend, không giả thành công bằng cache local. Lệnh tạo thumbnail/render/ghi slide bị chặn cho linked. Quét trùng nội dung bỏ qua linked vì không đọc nội dung file.
- Thư viện dùng card riêng, có sửa thông tin/chọn lại file/xóa liên kết. Bộ lọc PowerPoint gồm imported cũ và linked mới. Tiết học vẫn gắn bài theo ID; chọn lại đường dẫn cập nhật cùng bản ghi.
- Library và SessionDashboard cùng dispatch bài linked vào bảng điều khiển PowerPoint gốc. Bảng có mở slideshow, trước/tiếp, dừng, ghi chú và ẩn để quay về công cụ tiết học.
- Bridge nhắm đúng đường dẫn đã mở cho status/control/close; không điều khiển bài bất kỳ đang active. Bài mở sẵn trước EduICT không bị đóng bởi nút dừng. Bài EduICT mở được mở read-only; lệnh không ghi lại file gốc.
- `Next` dùng GetClickIndex/GetClickCount/GotoClick cho bước animation; sau bước cuối mới Next sang slide. Trigger theo đối tượng vẫn tương tác trực tiếp trong PowerPoint. Tham khảo: [GotoClick](https://learn.microsoft.com/en-us/office/vba/api/powerpoint.slideshowview.gotoclick), [GetClickCount](https://learn.microsoft.com/en-us/office/vba/api/powerpoint.slideshowview.getclickcount), [MsoClickState](https://learn.microsoft.com/en-us/office/vba/api/powerpoint.msoclickstate).
- Backup hiện có chỉ sao chép SQLite và `uploads/presentations`, không đi theo đường dẫn linked để sao chép file ngoài ứng dụng. Khi restore sang máy khác cần chọn lại file để cấp quyền trên máy đó. Bài imported cũ tiếp tục giữ file/ảnh và hành vi preview cũ.

## Phần đã kiểm tra và còn cần nghiệm thu

- Build production thành công trên CSDL bản sao `scratch/ui-review/edumaster.sqlite`.
- Lint không có lỗi; dự án vẫn có các warning tồn tại trước thay đổi.
- Parser PowerShell và Node syntax checks thành công.
- Đã quan sát hộp thoại liên kết trong trình duyệt và kiểm tra thông báo cần Desktop khi chọn file ở web.
- Chưa chạy bộ test tự động cho đợt này; chưa chạy nghiệm thu PowerPoint COM/animation/trigger/media thật, lưu quyền qua restart, backup/restore và bản EXE đã cài. Không coi build hoặc quan sát web là bằng chứng cho các mục này.

**Trạng thái:** LP1–LP4 đã triển khai trong mã nguồn; LP5 còn cần nghiệm thu trên EduICT Desktop + Microsoft PowerPoint.

Bộ cài thử nghiệm **1.1.0** đã đóng gói ngày 06/10/2026. Kiểm tra nội dung/phiên bản và hướng dẫn cài thử: [Báo cáo bộ cài 1.1.0](desktop-build-1.1.0-2026-10-06.md).

Sau phản hồi PowerPoint che phần mềm, bản **1.1.1** thêm cửa sổ công cụ nổi native, gọi cửa sổ EduICT lên trước và trở về slideshow. Đã đóng gói; thứ tự cửa sổ toàn màn hình và nhiều màn hình còn cần nghiệm thu thực tế. Xem [báo cáo bộ cài 1.1.1](desktop-build-1.1.1-2026-10-06.md).
