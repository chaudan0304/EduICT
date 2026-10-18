# Lịch sử thay đổi

## 1.16.0 — 18/10/2026

- Nhật ký tương tác và phát biểu chỉ báo đã lưu sau xác nhận máy chủ. Bản chờ được giữ cục bộ, có nút thử lại và mã bản ghi cố định để không tạo trùng; thử lại nhật ký không phát lại thưởng sao.
- Tiết học kiểm tra phiên bản trước khi lưu ghi chú, trạng thái và tiến trình. Khi xung đột, giáo viên đối chiếu hai bản rồi chọn; bản đang sửa được giữ vào Bản nháp trước khi dùng bản chung.
- Công cụ → Bản nháp cho phép xem, tiếp tục soạn, bỏ tạm và khôi phục. Biểu mẫu câu hỏi, tiến trình AI, tạo tiết học, sửa hoạt động và thời khóa biểu dùng kho bản nháp chung giữa web/desktop trên máy này; phát hiện xung đột thay vì ghi đè.
- Bổ sung kiểm thử phục hồi, thời khóa biểu, gửi lại lịch sử và chỉnh sửa đồng thời trên SQLite riêng.

Chi tiết và giới hạn: docs/session-recovery-drafts-1.16.0.md.

## 1.15.0 — 17/10/2026

- Lịch giảng dạy có nút Chỉnh lớp & giờ học: chọn lớp/nghỉ/trống theo thứ và tiết, sửa giờ bắt đầu/kết thúc cho 4 tiết sáng và 3 tiết chiều. Khung giờ dùng chung thứ Hai–thứ Sáu; khoảng nghỉ tự tính giữa các tiết.
- Lưu lớp và khung giờ trong cùng giao dịch, kiểm tra giờ chồng lấn/đảo chiều và xung đột phân lớp. Phát hiện lịch đã sửa ở cửa sổ khác, giữ bản nháp và chặn ghi đè.
- Web/desktop đọc lại lịch khi quay về cửa sổ và mỗi 15 giây khi đang hiển thị. Đồng hồ của cửa sổ tiết đang dạy giữ khung giờ đã chọn; mở lại tiết học dùng lịch mới. Tạo tiết học theo lịch lấy đúng thời lượng khung giờ mới.

Chi tiết và phạm vi kiểm chứng: docs/timetable-editing-1.15.0.md.

## 1.14.0 — 17/10/2026

- Tạo tiết học chỉ đóng biểu mẫu khi máy chủ xác nhận; giữ mã tạo để thử lại không tạo trùng. Xóa tiết học thất bại giữ nguyên hàng và có nút thử lại.
- Thay đổi trạng thái và tiến trình chưa lưu hiện cảnh báo, được giữ cục bộ và có nút thử lưu lại. Chỉ gửi lại PUT của tiết học, không tự phát lại giao dịch thưởng sao/quiz.
- Tổng kết dùng thời gian bắt đầu/kết thúc thực tế, trừ thời gian tạm dừng và đếm hoạt động đã hoàn thành; bản cũ thiếu mốc thời gian hiện rõ chưa có dữ liệu.
- Tự lưu bản nháp câu hỏi thủ công, AI tạo câu hỏi, AI đề xuất tiến trình và biểu mẫu/hoạt động tiết học. Bản nháp riêng cho trình duyệt/app đang soạn.
- Cho chọn thư mục khác trên máy để giữ thêm gói sao lưu đầy đủ; đối chiếu SHA-256 và không ghi đè tệp trùng tên khác nội dung. Người dùng sẽ chọn thư mục trong app sau, hiện chưa bật.

Chi tiết và giới hạn kiểm chứng: docs/session-reliability-1.14.0.md.

## 1.13.0 — 16/10/2026

- Bỏ tệp temp/cache không được database tham chiếu khỏi bản sao lưu; giữ tệp còn dùng. Các snapshot dùng lại tài nguyên không đổi bằng hardlink khi ổ đĩa hỗ trợ, không liên kết tới file đang sử dụng. Mỗi bản vẫn xuất/khôi phục được riêng; nhãn năm học lấy đúng thiết lập hiện tại.
- Thư viện kiểm tra file PowerPoint liên kết, hiện cảnh báo mất file/khác dung lượng. Có chọn lại từng file và tìm theo tên trong thư mục mới trên Desktop; xác nhận trước khi lưu, chặn ghi đè liên kết đã sửa ở cửa sổ khác.
- Sửa nút tạo tiết học truyền sự kiện bấm vào mã lớp làm lỗi lưu SQLite. Slide soạn bằng chữ/câu hỏi/hoạt động có thể trình chiếu ngay, không bị chờ chuyển ảnh như PowerPoint nhập.
- Kiểm tra hồi quy, xuất–nhập–khôi phục trên dữ liệu riêng; thử luồng tiết học có slide, sao và quiz, cùng PowerPoint thật trên bản chép tạm. Chi tiết và giới hạn: docs/teaching-recovery-1.13.0.md.

## 1.12.0 — 16/10/2026

- Web và desktop đọc lại dữ liệu lớp khi quay lại cửa sổ và định kỳ; bỏ phản hồi cũ nếu có thao tác sửa trong lúc tải. Tạm dừng làm mới khi đang nhập/lưu hoặc có thay đổi chưa lưu.
- Không lấy lớp mẫu/bộ nhớ đệm làm dữ liệu đã kết nối. Danh sách rỗng được giữ rỗng; lỗi API hiện trạng thái mất kết nối và nút làm mới.
- Hiển thị trạng thái lưu và thời điểm đọc dữ liệu, thêm lối vào/tiếp tục tiết dạy từ màn hình hiện tại.
- Sao lưu hằng ngày khi ứng dụng chạy, giữ 7 bản tự động; web và desktop cùng kho không tạo trùng. Bản thủ công và điểm phục hồi an toàn được giữ riêng.
- Màn hình sao lưu/kiểm tra/phục hồi; tải và nhập gói EduICT gồm database và tài nguyên. Nhập gói chỉ thêm vào danh sách sao lưu, không tự thay dữ liệu đang dùng. Các kiểu xuất database ghi rõ không kèm tệp.
- Bộ cài giữ chế độ cài hiện có và chặn ép đổi chế độ/tình huống hai đăng ký cùng trỏ một thư mục. Quá trình build web không khởi tạo hay đối chiếu database người dùng.

Chi tiết và giới hạn kiểm chứng: docs/local-reliability-improvements.md.

## 1.11.2 — 15/10/2026

- Nâng SheetJS lên 0.20.3 từ nguồn chính thức; giữ nhập XLS/XLSX và sửa hàm nhập bảng điểm thiếu bộ chuẩn hóa ngày sinh/giới tính.
- Chỉ tải thư viện Excel khi nhập/xuất; giảm gói khởi động xuống khoảng 439 kB, hết cảnh báo bundle lớn.
- Hủy yêu cầu và bỏ phản hồi AI cũ khi đổi bài/lớp hoặc đóng modal; sửa timeout HTTP khi có signal bên ngoài và khi đang đọc response body.
- Vòng quay giữ lịch sử và danh sách loại trừ khi cập nhật sao; đổi sang lớp trống dừng đua vịt. Đổi slide đặt lại đáp án đang mở.
- Dọn toàn bộ cảnh báo lint, sửa dependency hook và callback cũ mà không tắt quy tắc kiểm tra.
- NSIS kiểm tra quyền ghi trước khi nâng cấp; cài im lặng thiếu quyền trả mã 5 và ghi installer.log, tránh kẹt ở bước gỡ bản cũ.

Kiểm chứng và trạng thái cài trên máy: docs/project-audit-followup-1.11.2.md.

## 1.11.1 — 15/10/2026

- Chặn lưu danh sách học sinh cũ giữa web/desktop; thao tác sửa ghi chú, điểm danh không ghi đè số sao từ sổ cái. Lỗi lưu được báo trên giao diện.
- Kiểm tra ID và đường dẫn trước khi dọn phiên nhập PowerPoint; mọi backend dùng chung khóa COM và không đóng PowerPoint khi còn bài khác đang mở.
- Backup gồm ảnh trò chơi, checksum tệp và giữ ảnh mới khi khôi phục backup cũ. Restore/rollback bị chặn khi backend khác đang dùng kho dữ liệu.
- Quiz từ slide, tiết học và màn hình Đố vui đều lưu trước khi báo hoàn tất. Thưởng sao có xác nhận, ghi cùng giao dịch kết quả và chống cộng lặp khi thử lưu lại.
- Sửa chế độ chọn câu ngẫu nhiên, giữ tiêu đề quiz, phím Space/Arrow, mã phiên phân tích AI, đồng hồ sau chuyển bước/chỉnh giờ và tùy chọn không giới hạn thời gian.
- Nhật ký trừ sao cá nhân lưu thay đổi thực tế và giữ số yêu cầu riêng. Timeout Gemini dừng chờ có tín hiệu hủy, không tự gửi lại yêu cầu đã hết hạn.

Chi tiết sửa và ranh giới kiểm chứng: docs/project-audit-fixes-1.11.1.md.

## 1.11.0 — 15/10/2026

- Web và desktop trên máy cá nhân có thể dùng chung SQLite, tệp bài học và thiết lập AI; đã sao lưu và chuyển dữ liệu web làm nguồn chính trên máy này.
- Thiết lập, câu hỏi, tổ tham gia và tiến độ trò chơi lưu theo lớp, giữ qua lần mở lại và có trạng thái lưu/phát hiện xung đột giữa cửa sổ.
- Ảnh lật mảnh ghép lưu cục bộ để hai bản cùng dùng; micro vẫn không ghi âm hoặc gửi âm thanh.
- Bộ cài bao gồm sân chơi mới: hộp quà, kéo co trắc nghiệm, lật ảnh, đoàn tàu quy trình và rồng ngủ.

Chi tiết: docs/personal-local-sync.md.

## 1.10.0 — 13/10/2026

### Quản lý máy lỗi

- Sơ đồ phòng máy mặc định hiển thị 31 máy, không cần xếp chỗ học sinh.
- Ghi nhận lỗi vẫn dùng được hoặc không dùng được, loại lỗi, ghi chú và ngày báo tự động.
- Danh sách máy cần xử lý, nút “Đã sửa” và lịch sử từng máy dùng chung giữa các lớp.
- Giữ các máy hỏng cũ và bỏ tự động chuyển học sinh khi báo lỗi. Công cụ chỗ ngồi vẫn mở được khi cần.
- Lịch sử máy nằm trong bản xuất toàn bộ dữ liệu; nhập JSON cũ tương thích các cột mới.

Chi tiết: docs/machine-fault-management-1.10.0.md.

## 1.9.0 — 13/10/2026

### Công cụ lớp học

- Nhập/thay/xóa khóa Gemini, bật/tắt và chọn model ngay trong Công cụ; kiểm tra kết nối model riêng, không gửi nội dung học sinh.
- Cộng/trừ sao cho nhóm học sinh, lưu nhóm theo lớp, xác nhận phạm vi và giữ receipt chống lặp khi retry.
- Hoàn tác lượt sao cả lớp/nhóm gần nhất bằng bút toán bù; giữ lịch sử và sao nhận sau đó, từ chối cả lượt nếu số dư âm hoặc thiếu dữ liệu gốc.
- Kiểm tra trước giờ dạy: SQLite, kết nối Microsoft, nguồn slide và cấu hình AI; quyền truy cập/hiệu ứng bài Online cần mở thử riêng.
- Báo cáo học sinh theo tháng với nhật ký sao và kỹ năng/điểm/nhận xét hiện tại. Desktop có xuất PDF trực tiếp qua hộp thoại lưu file; web dùng bản in/Lưu thành PDF.
- Hiển thị phiên bản đang chạy, kiểm tra GitHub Releases và thông báo bộ cài mới trên desktop. Không tự cài đặt.

Claude Code đã được gọi nhưng gặp 503 và không trả kết quả ở lần thử lại; Codex tiếp quản theo yêu cầu người dùng. Không thêm/chạy tests trong lượt này; lint/build và đóng gói được ghi trong `docs/classroom-improvements-1.9.0-2026-10-13.md`.

## 1.8.1 — 13/10/2026

### Cấu hình Gemini trên desktop

- Sửa hướng dẫn Trợ giảng AI: desktop đọc cấu hình riêng trong `%APPDATA%/EduMaster/data/settings/.env`, web đọc `.env` ở dự án.
- Thêm nút “Kiểm tra lại”, giới hạn chờ trạng thái 8 giây và bỏ kết quả cũ sau khi đóng/mở bảng AI. Hiển thị riêng AI đang tắt, thiếu khóa và máy chủ không phản hồi; có khóa chỉ báo đã cấu hình.
- Mẫu desktop ghi rõ `gemini-3.5-flash-lite`. Khóa API vẫn do người dùng cấu hình riêng, không nằm trong Git hoặc bộ cài.

Trên máy này, cấu hình desktop còn khóa mẫu trong khi web đã có khóa. Đã đồng bộ riêng ba thiết lập Gemini vào cấu hình desktop và đọc metadata mô hình từ Google thành công (HTTP 200). Chưa gọi tạo nội dung AI hoặc thêm/chạy test.

## 1.8.0 — 13/10/2026

### Cộng/trừ sao cả lớp

- Nút “Cộng/trừ cả lớp” trong Sổ điểm, Sổ điểm tốt và bảng Thưởng sao khi trình chiếu. Chọn cộng hoặc trừ, 1–100 sao mỗi học sinh, học kỳ và lý do; xem tên lớp/sĩ số trước khi xác nhận.
- Áp dụng toàn bộ danh sách lớp, kể cả học sinh đang bị ẩn bởi bộ lọc. Sao hiện có không xuống dưới 0; nhật ký ghi số thay đổi thực tế cho từng em.
- API lưu số dư, giao dịch sao, nhật ký điểm tốt và mã lượt trong cùng transaction SQLite. Kiểm tra danh sách lớp đã xác nhận; thử lại cùng mã không cộng/trừ lặp.
- Đồng bộ kết quả server vào giao diện, không lưu lại danh sách học sinh cũ. Các định dạng sao lưu toàn bộ hiện có giữ cả giao dịch và mã lượt.

Đã build web và đóng gói NSIS 1.8.0, đối chiếu payload và quét secret. Chưa chạy thao tác cộng/trừ thử trên học sinh thật hoặc thêm/chạy test. Chi tiết: `docs/desktop-build-1.8.0-2026-10-13.md`.

## 1.7.1 — 07/10/2026

### Sửa cộng sao khi trình chiếu

- Helper trả JSON báo route đã xử lý để API cộng sao/đổi thưởng không rơi vào phần trả trang web và làm backend desktop tắt với ERR_HTTP_HEADERS_SENT. Server và Vite cũng dừng khi phản hồi đã được gửi.
- Lưu sổ điểm tốt chỉ gửi thông tin lớp/nhật ký, không gửi danh sách học sinh cũ ghi đè số sao vừa tăng.
- Bảng thưởng sao và thẻ học sinh thu nhỏ khóa nút khi đang xử lý, chờ cập nhật học sinh, dùng đúng ID lớp khi lưu. Bảng chọn nhận diện ID dạng chuỗi/số; thông báo lỗi dùng dialog desktop bất đồng bộ.

Đã build và đối chiếu bộ cài/payload; chưa chạy lại thao tác cộng sao qua giao diện hoặc thêm/chạy test. Không tự cộng lại sao từ lần bấm trước khi app lỗi.

## 1.7.0 — 07/10/2026

### Sửa xuất và phục hồi toàn bộ dữ liệu

- SQL và JSON đọc schema/mọi bảng/mọi cột trong cùng một snapshot, gồm điểm HK1/cuối năm, sao, classes.good_scores, lịch sử tiết học/quiz/đổi thưởng, năm học và cài đặt. Không bị giới hạn bởi lớp/năm học đang xem.
- SQLite tải từ VACUUM INTO, giữ dữ liệu đã commit trong WAL thay vì sao chép riêng file chính đang mở.
- Mọi nút xuất Excel lấy toàn bộ SQLite: bảng điểm từng lớp, SO_DIEM_TOT, các bảng DB_* và BACKUP_JSON. Văn bản quá dài được chia phần thay vì cắt mất; không thêm học sinh mẫu vào lớp rỗng.
- JSON phục hồi vào SQLite thay vì chỉ cache trình duyệt. SQL/JSON tạo bản sao an toàn trước khi nhập; bản toàn bộ mới phục hồi trong giao dịch, kiểm tra khóa ngoại. JSON cũ được ghép vào dữ liệu hiện tại.
- Lưu/sắp xếp học sinh bằng UPSERT và cập nhật rowid, không xóa rồi chèn lại học sinh đang có, giữ các lịch sử liên quan. Dữ liệu mẫu chỉ được tạo cho cơ sở dữ liệu mới, tránh thêm lại bài vào thư viện đã xóa sạch hoặc bản phục hồi rỗng.

Bản xuất dữ liệu giữ thông tin/liên kết slide, không đóng gói file nguồn ngoài EduICT. Chưa chạy thử xuất/nhập hoặc phục hồi trên dữ liệu thật; kiểm tra syntax/lint/build và payload bộ cài được ghi trong báo cáo 1.7.0. File cũ đã thiếu dữ liệu không tự khôi phục phần đã mất; cần xuất lại từ ứng dụng cập nhật.

## 1.6.0 — 07/10/2026

### Thêm

- Thư viện có **Chọn nhiều bài**, ô chọn cho mọi loại bài, chọn tất cả bài đang hiển thị (tối đa 200) và xóa nhóm sau xác nhận tên/số bài.
- Đổi khối hoặc bộ lọc bỏ chọn; trong chế độ chọn, thẻ bài không mở trình chiếu/chỉnh sửa khi bấm. Bài liên kết trên máy và Online chỉ bị gỡ khỏi EduICT, giữ file gốc.
- API xóa nhóm yêu cầu xác nhận và lưu trong một giao dịch. Bài đang nhập/render phải hoàn tất trước khi xóa. Lỗi máy chủ không chuyển thành thành công ở local cache; báo riêng lỗi dọn thư mục sau khi đã xóa bài.

Không thêm/chạy test và không xóa dữ liệu bài thật trong quá trình triển khai. Kiểm tra syntax/lint/build/payload được ghi trong báo cáo bộ cài.

## 1.5.0 — 06/10/2026

### Thêm

- Nút **Chọn thư mục OneDrive**: kết nối tài khoản cá nhân, mở thư mục, đọc tên/file PowerPoint qua Microsoft Graph, chọn tối đa 200 file và khối lớp trước khi nhập.
- Tạo link Embed tự động sau xác nhận, có tiến độ và dừng đợt nhập. Giữ file trên OneDrive, không tải nội dung PPTX vào ứng dụng.
- Chọn bài đã có hoặc tạo bài mới; ghép tên trùng theo yêu cầu, nhận diện file OneDrive đã nhập bằng drive/item ID. Backup giữ nhận diện; đổi link thủ công hoặc nhân bản không gán nhầm file nguồn.
- Hướng dẫn đăng ký Microsoft Entra/client ID trong hộp thoại. Đăng nhập trên Microsoft bằng device code, token chỉ giữ trong bộ nhớ backend theo phiên, cookie HttpOnly/SameSite, giới hạn origin/phiên/file và HTTPS cho web ngoài localhost.

Cần Application (client) ID với public client flow và quyền Files.ReadWrite. Graph chỉ tạo Embed tự động cho OneDrive cá nhân. Đã build/kiểm tra payload; chưa kết nối Microsoft thật vì người dùng chưa đăng ký client ID. Chi tiết cấu hình và giới hạn ở `docs/onedrive-folder-import.md`.

## 1.4.1 — 06/10/2026

### Sửa

- Bộ kiểm tra từ chối iframe PowerPoint Online dạng `1drv.ms/p/c/<CID>/I<token>` không có `em=2`, đúng dạng người dùng đã dán trong ảnh báo lỗi.
- Dùng cùng nhận diện ở form một bài, danh sách hàng loạt, API và trình xem; giữ nguyên URL từ Microsoft, không bổ sung tham số hoặc đưa mã HTML vào trang.

Build và payload được kiểm tra; chưa xác nhận quyền xem hoặc hiệu ứng của bài trên Microsoft.

## 1.4.0 — 06/10/2026

### Thêm

- Gắn PowerPoint Online hàng loạt: dán nhiều mã Embed hoặc nhập file TXT, xem và sửa danh sách trước khi lưu, tối đa 200 bài mỗi đợt.
- Mỗi dòng có thể tạo bài Online mới hoặc gắn vào bài đã có, chọn khối và xác nhận thay liên kết cũ. Giữ lịch dạy, file gốc, slide và ghi chú của bài hiện tại.
- API lưu cả đợt trong một giao dịch; kiểm tra link/bài trùng, bài đã thay đổi và chống tạo lại bài mới khi gửi lại sau mất phản hồi.

Không tự tải file lên Microsoft. Người dùng tải nhiều file/cả thư mục lên OneDrive rồi lấy mã Embed riêng từng bài. Build và payload được kiểm tra; chưa chạy thử lưu hàng loạt hoặc trình chiếu với liên kết Microsoft thật.

## 1.3.0 — 06/10/2026

### Thêm

- PowerPoint Online trong màn trình chiếu EduICT: lưu URL Embed OneDrive/SharePoint và dùng trình xem Microsoft thay cho ảnh slide.
- Thêm bài Online mới hoặc gắn liên kết Online cho bài đã nhập, giữ ID bài và liên kết tiết học. Có thể gỡ liên kết ở bài cũ để trở về cách trình chiếu trước đó.
- Giữ Thưởng sao, Vòng quay, Đua vịt, Quick Quiz, Ghi chú và Lịch dạy; ẩn/hiện thanh EduICT để dùng điều khiển Microsoft. Điều hướng slide thuộc trình xem Microsoft.
- Hướng dẫn tải file lên OneDrive, lấy mã Embed, tải file gốc của bài đã nhập; xử lý URL không hợp lệ, mất mạng, nạp chậm, tải lại và mở bài trên Microsoft.
- API/browser dùng chung validator URL nhúng; không thực thi HTML dán vào, không tải PPTX từ server. Backup SQLite/SQL và nhân bản giữ liên kết Online.

Bộ cài Windows 1.3.0 đã build và kiểm tra payload. Chưa có URL Embed thật của người dùng để xác nhận trình chiếu/hiệu ứng. Người dùng cần tải bài lên tài khoản Microsoft và lấy Embed; phiên bản này chưa có OAuth/Graph để tự tải 88 bài. PowerPoint Online cần Internet và có giới hạn trigger/hiệu ứng theo Microsoft.

## 1.2.2 — 06/10/2026

### Sửa

- Lỗi `No slideshow window handle` trên bản cài 1.2.1: thay việc đọc HWND một lần bằng getter COM rõ ràng, đọc lại cửa sổ của đúng bài và chờ tối đa 5 giây.
- Thêm tìm cửa sổ native khi getter chưa trả HWND hợp lệ: kiểm tra tiến trình PowerPoint, lớp slideshow, snapshot cửa sổ trước khi Run và tên bài. Không chọn khi mơ hồ hoặc nhiều bài trùng tên.
- Giữ bố cục slide phủ vùng trình chiếu và công cụ nổi của 1.2.1. Không thay đổi file PowerPoint gốc.

Bộ cài NSIS đã tạo và kiểm tra payload. Chưa chạy lại PowerPoint thật với bản sửa; cần nghiệm thu trên máy người dùng.

## 1.2.1 — 06/10/2026

### Sửa

- Bố cục PowerPoint Desktop theo ảnh người dùng: slide phủ vùng trình chiếu; tiêu đề/lịch/nút thoát và thanh công cụ dạng viên thuốc nằm nổi trên slide.
- Bỏ khoảng trống trên/dưới, thanh trạng thái chiếm chiều cao và cột học sinh khiến slide bị nhỏ ở bản 1.2.0. Thẻ học sinh nổi trên slide, không đổi kích thước khung.
- Native window giữ toàn vùng slide; clip đúng các capsule điều khiển để UI hiện và nhận click. Cập nhật clip theo UI/resize/DPI và khôi phục region gốc khi dừng.

Tiếp tục dùng PowerPoint gốc để phát hiệu ứng từ file liên kết. Native clipping, thao tác trên slide và DPI còn cần nghiệm thu thực tế với Microsoft PowerPoint.

## 1.2.0 — 06/10/2026

### Thay đổi

- Bài PowerPoint liên kết dùng chung màn trình chiếu web: điều hướng, lớp/tiết học, ghi chú, Thưởng sao, Vòng quay, Đua vịt và Quick Quiz.
- Thêm nút **Trình chiếu trong EduICT**: PowerPoint phát file gốc dạng cửa sổ, native host bỏ viền và neo vào vùng slide giữa giao diện.
- Ẩn cửa sổ slide trước khi mở công cụ, hiện lại khi đóng; cập nhật vị trí theo resize, fullscreen và DPI. Thẻ học sinh có vùng riêng cạnh slide.
- Chỉ lưu đường dẫn/metadata; không sao chép slide, không chuyển thành ảnh, không Save các thiết lập trình chiếu tạm thời vào file gốc.

Bản ứng dụng Windows x64 1.2.0 có bộ cài NSIS EXE và ZIP chạy trực tiếp. Lỗi `Illegal System DLL Relocation` khi chạy `makensis.exe` không còn tái hiện sau khi quyền thực thi của môi trường được mở; đã dựng EXE thành công bằng các công cụ trong cache. Build/lint/cú pháp/nội dung gói đã kiểm tra; hiển thị native, hiệu ứng và tương tác PowerPoint thật còn cần thử trên máy người dùng.

## 1.1.1 — 06/10/2026

### Sửa

- PowerPoint toàn màn hình che bảng điều khiển EduICT: thêm cửa sổ công cụ nổi riêng khi bắt đầu slideshow.
- Có Trước/Tiếp, Hiện EduICT, Về slide, Dừng và lối tắt Đếm giờ/Điểm tốt/Vòng quay; kéo để di chuyển, thu gọn/mở rộng.
- Khi kết thúc slideshow hoặc bấm Esc, thanh nổi đóng và EduICT được đưa trở lại. Trạng thái luôn nổi của cửa sổ chính được phục hồi sau khi dừng.
- Có nút mở lại thanh nổi trong bảng điều khiển bài liên kết.

Bộ cài thử nghiệm Windows x64; đã kiểm tra build, cú pháp, lint và nội dung gói cài. Hiển thị trên PowerPoint toàn màn hình, nhiều màn hình và nâng cấp thực tế còn cần thử trên máy người dùng.

## 1.1.0 — 06/10/2026

Bộ cài Windows x64 phục vụ thử nghiệm trên máy người dùng.

### Thêm

- Liên kết file PowerPoint `.pptx`/`.ppt` trên máy; EduICT lưu đường dẫn và thông tin bài, không nhập nội dung file vào ứng dụng.
- Chọn lại file khi đường dẫn thay đổi, giữ ID bài và các liên kết tiết học.
- Bảng điều khiển PowerPoint gốc trong thư viện và tiết học: mở slideshow, trước/tiếp, dừng và ghi chú dạy học.

### Thay đổi

- Trang chủ, thanh điều hướng, thanh chọn lớp và thư viện bài học có bố cục gọn hơn, hỗ trợ màn hình hẹp.
- Bài PowerPoint mới dùng luồng liên kết; bài imported cũ tiếp tục dùng dữ liệu đã lưu.
- Xóa liên kết chỉ xóa bản ghi bài học; file nguồn vẫn nằm ở nơi giáo viên lưu. Backup EduICT chỉ mang đường dẫn của bài liên kết; khi chuyển máy cần mang file gốc theo và chọn lại file.

### Điều kiện thử nghiệm

- Trình chiếu file liên kết cần EduICT Desktop trên Windows và Microsoft PowerPoint.
- Bộ cài chưa ký số. Kiểm thử cài đặt/nâng cấp, restart và hiệu ứng/trigger/media trên bản EXE 1.1.0 còn cần thực hiện.
