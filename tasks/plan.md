# Kế hoạch chỉnh sửa toàn bộ giao diện EduICT

Ngày lập: 06/10/2026. Nhánh triển khai: `codex/ui-polish`.

## 1. Mục tiêu và điểm xuất phát

Tạo giao diện nhất quán, gọn và dễ sử dụng cho giáo viên Tin học tiểu học: chọn lớp nhanh, mở bài giảng nhanh, điều khiển tiết học rõ ràng và đọc được trên máy chiếu. Các màn hình quản lý ưu tiên dữ liệu; các màn hình dành cho học sinh giữ sự vui nhộn và màu sắc phù hợp.

Nhánh `feature/new-idea` đã được đẩy lên GitHub trước khi chuẩn bị sửa giao diện. Nhánh mới `codex/ui-polish` cũng đã được đẩy, bắt đầu tại commit `2876587`. Báo cáo hiện trạng: `docs/ui-review-2026-10-06.md`.

Đã quan sát trực tiếp trang chủ, danh sách tiết học, thư viện bài học, sổ kỹ năng, phòng máy và hộp thoại quản lý lớp. Các màn hình khác cần được chụp và kiểm tra trước khi sửa. Nội dung trong `DESIGN.md` là tài liệu tham khảo; khi khác với giao diện thực tế, ghi lại khác biệt trước khi quyết định thay đổi.

Phạm vi công việc là giao diện và cách tổ chức thao tác. Dữ liệu và quy tắc hiện có về đánh giá, sao thưởng, thời gian tiết học, đáp án và chuyển năm học là các bất biến cần đối chiếu trong nghiệm thu. Nếu một đề xuất đòi hỏi sửa API hoặc nghiệp vụ, tách thành công việc riêng có mô tả ảnh hưởng cụ thể.

## 2. Hướng thiết kế thống nhất

| Hạng mục | Quy chuẩn đề xuất |
| --- | --- |
| Màu chủ đạo | Xanh `#0284c7`, nền nhấn nhạt `#e0f2fe`; kiểm tra tương phản theo từng cặp màu thực tế |
| Bề mặt | Nền `#f8fafc`, panel trắng, viền nhẹ; bóng nhỏ cho menu/modal, hạn chế bóng trên mọi card |
| Màu ngữ nghĩa | Xanh lá: hoàn thành; vàng: sao/cảnh báo; đỏ: lỗi/xóa; mỗi trạng thái có nhãn hoặc icon |
| Phông chữ | Plus Jakarta Sans cho nội dung; Outfit cho tiêu đề và số lớn; dùng font đã đóng gói ngoại tuyến |
| Cỡ chữ | Nội dung 14–16 px, nhãn phụ tối thiểu 12 px, tiêu đề trang 24–28 px; màn hình máy chiếu dùng thang riêng |
| Khoảng cách | 4/8/12/16/24/32 px; bo góc nút 8–10 px, panel 12–16 px |
| Hành động | Một hành động nổi bật trong mỗi vùng thao tác; hành động phụ dạng outline/menu |
| Ngôn ngữ | Nhãn tiếng Việt ngắn; thuật ngữ tiếng Anh chỉ xuất hiện khi thực sự giúp hiểu chức năng |
| Trạng thái | Đang tải, rỗng, lỗi, đang lưu và đã lưu được thể hiện đúng theo kết quả xử lý hiện có |
| Chuyển động | Nhẹ và ngắn; hỗ trợ giảm chuyển động; hiệu ứng trò chơi theo ngữ cảnh |

Khung ứng dụng dùng sidebar chia nhóm: **Dạy học**, **Quản lý lớp**, **Hoạt động**. Trang chủ là điểm vào công việc; thanh lớp thống nhất hiển thị năm học, khối, lớp và sĩ số. Các thao tác ít dùng như chuyển năm và phục hồi dữ liệu nằm trong khu vực quản lý/cài đặt rõ ràng.

Tên thương hiệu hiển thị cần được thống nhất trước khi thay toàn cục: dự án hiện dùng cả EduICT và EduMaster. Bản mẫu bước đầu dùng tên đang hiển thị trên giao diện; quyết định tên không ngăn cản các công việc về bố cục.

## 3. Cách triển khai

- Làm mẫu trang chủ, thư viện và sổ đánh giá trước khi áp dụng diện rộng, với dữ liệu thực tế hoặc dữ liệu mẫu đại diện.
- Tạo các thành phần dùng chung theo nhu cầu thực tế: Button, PageHeader, FilterBar, Badge, Modal/Drawer, EmptyState và phản hồi thao tác. Không thêm thư viện giao diện nếu stack hiện tại đã đáp ứng.
- Chuyển các style tĩnh về CSS/component theo từng màn hình; giữ style động cần thiết cho canvas, tiến trình và trạng thái.
- Các file lớn như Navbar, Gradebook, SeatingChart được tách theo vùng chức năng khi chỉnh vùng đó. Mỗi phần phải giữ luồng sử dụng hoạt động sau khi hoàn thành.
- Mỗi nhiệm vụ dưới đây là một thay đổi có thể review riêng. Chia nhỏ thêm nếu thực tế chạm quá 5 file hoặc thay đổi nhiều vùng độc lập.
- Commit theo từng nhiệm vụ hoặc nhóm nhỏ cùng mục đích, push trên `codex/ui-polish`; checkpoint sau mỗi giai đoạn. Hợp nhất về nhánh gốc sau khi toàn bộ phạm vi đã nghiệm thu.

## 4. Danh sách nhiệm vụ

Các đường dẫn ở bảng tính từ gốc repository. `ui/*` là các component mới dự kiến đặt tại `src/components/ui/`; `tasks/*` và `docs/*` là tài liệu. Phụ thuộc chỉ rõ công việc cần hoàn thành trước. Mã kiểm tra V/B/P/K/D được giải thích ở mục 5.

### Giai đoạn A — Hiện trạng và mẫu thiết kế

| ID | Công việc | File/vùng dự kiến | Phụ thuộc | Tiêu chí nghiệm thu | Kiểm tra |
| --- | --- | --- | --- | --- | --- |
| A1 | Kiểm kê màn hình và trạng thái | `tasks/plan.md`, `tasks/todo.md`, `docs/ui-review-2026-10-06.md` | Không | Có danh sách màn hình, modal/menu ẩn, trạng thái tải/rỗng/lỗi và đường vào cửa hàng; đánh dấu màn hình đã quan sát/chưa quan sát | V |
| A2 | Làm mẫu ba màn hình đại diện | Bản mẫu riêng trong `scratch/ui-review/`, tài liệu thiết kế mới | A1 | Có mẫu trang chủ, thư viện và sổ đánh giá ở 1366×768; thể hiện trạng thái dữ liệu dài và màn hình hẹp | V |

Checkpoint A: đối chiếu mẫu với thao tác dạy học; ghi các lựa chọn thiết kế được thống nhất trước khi áp dụng rộng.

### Giai đoạn B — Hệ thống giao diện và khung ứng dụng

| ID | Công việc | File/vùng dự kiến | Phụ thuộc | Tiêu chí nghiệm thu | Kiểm tra |
| --- | --- | --- | --- | --- | --- |
| B1 | Chuẩn hóa màu, font và spacing | `src/index.css`, `src/main.jsx`, tài liệu thiết kế | A2 | Tokens ngữ nghĩa đủ cho sáng/tối/máy chiếu; chữ tiếng Việt và font ngoại tuyến hiển thị đúng | V, B, P |
| B2 | Chuẩn hóa nút, nhãn và tiêu đề | `ui/Button.jsx`, `ui/Badge.jsx`, `ui/PageHeader.jsx`, CSS tương ứng | B1 | Kích thước và variant nhất quán; có disabled/loading/focus; nút icon có tên truy cập | V, K, B |
| B3 | Chuẩn hóa modal và drawer | `ui/Modal.jsx`, `ui/Drawer.jsx`, CSS, một modal đại diện | B1 | Focus vào đúng chỗ khi mở và trả lại khi đóng; Tab ở trong modal, Escape theo luồng; header/footer không mất khi cuộn | V, K, B |
| B4 | Sắp xếp sidebar và navbar | `Sidebar.jsx`, `Navbar.jsx`, `App.jsx`, CSS khung | B2, B3 | Nhãn không bị cắt ở laptop; navigation có nhóm; sidebar thu gọn/drawer ở màn hình hẹp; chọn chức năng giữ đúng ngữ cảnh lớp | V, K, B |
| B5 | Thống nhất thanh chọn lớp | `App.jsx`, component thanh lớp được tách, `HomeDashboard.jsx`, CSS | B4 | Năm học/khối/lớp/sĩ số rõ trên các màn hình; lớp không biến đổi ngoài thao tác người dùng hoặc luồng hiện có | V, K, B |

Checkpoint B: đi qua tất cả tab để phát hiện ảnh hưởng CSS toàn cục; kiểm tra laptop, màn hình hẹp và modal mẫu trước khi tiếp tục.

### Giai đoạn C — Trang chủ và quản lý lớp

| ID | Công việc | File/vùng dự kiến | Phụ thuộc | Tiêu chí nghiệm thu | Kiểm tra |
| --- | --- | --- | --- | --- | --- |
| C1 | Thiết kế lại trang chủ | `HomeDashboard.jsx`, component con/CSS theo nhu cầu | B5 | Lớp đang chọn và ba thao tác dạy học xuất hiện trước khi cuộn ở 1366×768; thống kê các khối cân đối; trạng thái rỗng có hướng dẫn | V, K, B |
| C2 | Sắp xếp quản lý lớp và học sinh | Modal quản lý lớp tách từ `Navbar.jsx`, `Navbar.jsx`, CSS | B3, B5 | Có tìm/lọc lớp gọn; chọn lớp và thêm/xóa lớp vẫn đúng; hành động xóa có mô tả rõ lớp bị ảnh hưởng | V, K, B |
| C3 | Chuẩn hóa nhập Excel | `ImportExcelModal.jsx`, modal quản lý lớp, CSS | C2 | Chọn file → xem trước/ánh xạ → xác nhận rõ từng bước; lỗi dòng không che dữ liệu; có thể hủy và chọn lại file | V, K, B, D |

Checkpoint C: thử hành trình chọn lớp → vào tiết học → quay lại trang chủ và nhập danh sách trên bản sao dữ liệu.

### Giai đoạn D — Bài giảng và trình chiếu

| ID | Công việc | File/vùng dự kiến | Phụ thuộc | Tiêu chí nghiệm thu | Kiểm tra |
| --- | --- | --- | --- | --- | --- |
| D1 | Thu gọn thư viện bài học | `LessonLibrary.jsx`, card/bộ lọc tách khi cần, CSS | B2, B5 | Tìm kiếm/bộ lọc gọn; hàng bài giảng đầu thấy ở 1366×768; tiêu đề dài và ảnh lỗi có cách hiển thị; vẫn truy cập được quét/lọc trùng | V, K, B |
| D2 | Tổ chức trình soạn bài giảng | `LessonEditor.jsx`, `EditImportedLessonModal.jsx`, CSS | B3, D1 | Danh sách slide, vùng sửa và xem trước có phân cấp; thông tin lưu/lỗi phản ánh kết quả thật; đổi slide không làm mất nội dung ngoài hành vi đã có | V, K, B |
| D3 | Chuẩn hóa nhập và so sánh PowerPoint | `ImportPptxModal.jsx`, `DuplicateComparisonModal.jsx`, `LessonManager.jsx`, CSS | B3, D1 | Chọn file, tiến trình, kết quả/lỗi và quyết định xử lý trùng dễ hiểu; xem trước hai bài không tràn màn hình hẹp | V, K, B, D |
| D4 | Tối ưu trình chiếu | `PresentationView.jsx`, `SlideRenderer.jsx`, `TeacherNotesDrawer.jsx`, `OpenPowerPointButton.jsx`, CSS | D2, D3 | Slide giữ tỉ lệ phù hợp, toolbar không che bài; trước/sau/fullscreen/ghi chú dùng được bằng bàn phím; nút PowerPoint hiển thị theo khả năng runtime | V, K, B, P, D |

Checkpoint D: thư viện → nhập PowerPoint → thông tin bài → trình chiếu → ghi chú → thoát; phân biệt lỗi file thật với lỗi giao diện.

### Giai đoạn E — Tiết học, thời khóa biểu và đố vui

| ID | Công việc | File/vùng dự kiến | Phụ thuộc | Tiêu chí nghiệm thu | Kiểm tra |
| --- | --- | --- | --- | --- | --- |
| E1 | Sắp xếp danh sách và tạo tiết học | `SessionList.jsx`, `CreateSessionModal.jsx`, `SessionManager.jsx`, CSS | B3, B5 | Trạng thái đang dạy/dự thảo/kết thúc rõ; tạo tiết học và bộ lọc không chọn sai lớp/bài | V, K, B |
| E2 | Tổ chức bảng điều khiển tiết học | `SessionDashboard.jsx`, `SessionHeader.jsx`, `SessionControlBar.jsx`, `SessionTimerDisplay.jsx`, CSS | E1 | Thời gian, hoạt động hiện tại và bắt đầu/tạm dừng/kết thúc ở vùng dễ nhìn; trạng thái RUNNING/PAUSED/ENDED thể hiện đúng | V, K, B, P |
| E3 | Chuẩn hóa hoạt động và tổng kết tiết | `LessonFlowList.jsx`, `StudentParticipationGrid.jsx`, `SessionSummaryModal.jsx`, `QuickToolModal.jsx`, CSS | E2 | Tiến trình và học sinh tham gia đọc nhanh; thao tác thưởng sao không phát sinh lặp do giao diện; tổng kết khớp dữ liệu hiện có | V, K, B |
| E4 | Làm rõ thời khóa biểu | `TimetableModal.jsx`, vùng hồ sơ giáo viên hiện có, CSS | B3, E1 | Hiển thị buổi/tiết/lớp rõ; ngày hiện tại dễ nhận biết; xung đột và lỗi lưu không chỉ biểu diễn bằng màu | V, K, B |
| E5 | Chuẩn hóa ngân hàng câu hỏi và tạo quiz | `QuestionBankView.jsx`, `QuestionFormModal.jsx`, `CreateQuizModal.jsx`, `QuickQuizManager.jsx`, CSS | B3, B5 | Tìm/lọc/chọn câu hỏi gọn; đáp án đúng và loại câu hỏi rõ; sửa câu hỏi/tạo quiz giữ nguyên payload và ý nghĩa dữ liệu | V, K, B |
| E6 | Tối ưu màn hình chơi và kết quả quiz | `QuizPlayer.jsx`, `QuizResultModal.jsx`, CSS | E5 | Câu hỏi/đáp án đọc được ở máy chiếu; đáp án có ký tự và màu; kết quả đúng/sai, chuyển câu và thưởng sao không thay đổi nghiệp vụ | V, K, B, P |

Checkpoint E: tạo tiết → bắt đầu → tạm dừng/tiếp tục → ghi nhận → quiz → kết thúc; kiểm tra thời gian và số sao trước/sau trên dữ liệu thử.

### Giai đoạn F — Đánh giá, chỗ ngồi và thi đua

| ID | Công việc | File/vùng dự kiến | Phụ thuộc | Tiêu chí nghiệm thu | Kiểm tra |
| --- | --- | --- | --- | --- | --- |
| F1 | Tối ưu sổ đánh giá | `Gradebook.jsx`, phần bảng/bộ lọc được tách, CSS | B2, B5 | Header và tên học sinh giữ rõ khi cuộn; nhóm cột dễ chọn; kiểm tra khối 1–2 và 3–5, cả hai học kỳ, nhập/xuất và nhận xét | V, K, B |
| F2 | Tổ chức lại sơ đồ phòng máy | `SeatingChart.jsx`, panel chưa xếp/toolbar được tách, CSS | B2, B5 | Sơ đồ nhận diện nhanh; trạng thái trống/hỏng/ghép rõ; kéo thả và gán bằng lựa chọn hiện có cùng hoạt động | V, K, B |
| F3 | Tối ưu trình chiếu chỗ ngồi | `SeatingDisplayMode.jsx`, CSS | F2 | Tên dài đọc được; hướng nhìn GV/HS và số máy đúng; chế độ chiếu tập trung vào vị trí học sinh | V, K, B, P |
| F4 | Chuẩn hóa điểm tốt và nội quy | `GoodScoresBoard.jsx`, form nội quy/học sinh tách khi cần, CSS | B3, B5 | Phân biệt cộng/trừ sao bằng ký hiệu và chữ; sửa nội quy, lịch sử, bảng thi đua truy cập rõ; số sao đối chiếu đúng | V, K, B |
| F5 | Chuẩn hóa cửa hàng và đổi sao | `RewardShop.jsx`, `StarExchangeModal.jsx`, điểm vào từ giao diện hiện có, CSS | B3, F4 | Có đường vào cửa hàng dễ tìm; giá/số sao/trạng thái đủ sao rõ; xác nhận đổi quà hiển thị học sinh và phần quà chính xác | V, K, B |

Checkpoint F: sửa đánh giá → đổi học kỳ → kiểm tra xuất Excel; xếp máy → chiếu sơ đồ; cộng/trừ sao → đổi quà → đối chiếu lịch sử.

### Giai đoạn G — Hoạt động, AI và công cụ quản trị

| ID | Công việc | File/vùng dự kiến | Phụ thuộc | Tiêu chí nghiệm thu | Kiểm tra |
| --- | --- | --- | --- | --- | --- |
| G1 | Làm gọn giao diện Đua vịt | `DuckRace.jsx`, CSS | B2 | Chọn người chơi, bắt đầu, kết quả có phân cấp; vùng đua đủ rộng; kết quả ngẫu nhiên và thưởng giữ đúng hành vi | V, B, P |
| G2 | Làm gọn giao diện Vòng quay | `LuckyWheel.jsx`, CSS | B2 | Tên dài, danh sách tham gia và kết quả hiển thị tốt; điều khiển chính rõ; cơ chế loại người đã gọi giữ đúng | V, K, B, P |
| G3 | Chuẩn hóa đồng hồ đếm giờ | `ClassroomTimer.jsx`, CSS | B2 | Mốc thời gian, bắt đầu/tạm dừng/đặt lại rõ; số lớn ở máy chiếu; điều khiển bàn phím và âm thanh hoạt động như hiện có | V, K, B, P |
| G4 | Chuẩn hóa AI hub và phân tích | `AiAssistantModal.jsx`, `AiClassAnalysisModal.jsx`, `AiLessonAnalysisModal.jsx`, CSS | B3 | Đang xử lý, chưa cấu hình, offline và lỗi có hướng dẫn; kết quả dài có phân cấp; người dùng hiểu dữ liệu/phạm vi phân tích trước khi thực hiện | V, K, B |
| G5 | Chuẩn hóa tạo câu hỏi và tiến trình bằng AI | `AiQuestionGeneratorModal.jsx`, `AiLessonFlowModal.jsx`, CSS | G4, E3, E5 | Có xem trước/sửa/chọn trước khi áp dụng; trạng thái lưu và lỗi rõ; kết quả tạo không bị áp dụng lặp do thao tác giao diện | V, K, B |
| G6 | Tổ chức sao lưu và phục hồi | Modal sao lưu tách từ `Navbar.jsx`, `Navbar.jsx`, CSS | B3 | Ngày, dữ liệu và thao tác bản sao lưu rõ; xác nhận phục hồi chỉ rõ ảnh hưởng; progress/thành công/lỗi phản ánh kết quả thật | V, K, B, D |
| G7 | Chuẩn hóa năm học và cài đặt liên quan | `AcademicYearSettingsModal.jsx`, `SchoolYearTransitionModal.jsx`, `NewSchoolYearDetectedModal.jsx`, `Navbar.jsx`, CSS | B3, G6 | Cài đặt/chuyển năm dễ tìm; bước xem trước và xác nhận rõ; hủy modal không gây chuyển năm | V, K, B |

Checkpoint G: chạy hoạt động lớp ở web; kiểm tra AI bằng dữ liệu mẫu/phản hồi giả lập khi cần; thử phục hồi/chuyển năm trên database dùng cho kiểm thử.

### Giai đoạn H — Hoàn thiện và nghiệm thu toàn bộ

| ID | Công việc | File/vùng dự kiến | Phụ thuộc | Tiêu chí nghiệm thu | Kiểm tra |
| --- | --- | --- | --- | --- | --- |
| H1 | Rà trạng thái, bàn phím và responsive | `ErrorBoundary.jsx`, component trạng thái dùng chung, tài liệu audit; sửa theo từng màn hình nhỏ | C–G | Tải/rỗng/lỗi rõ; focus có dấu hiệu; modal và nội dung dài dùng được ở kích thước kiểm tra; lỗi ngoài ý muốn không làm màn hình trắng | V, K, B |
| H2 | Kiểm tra sáng/tối/máy chiếu | CSS tokens, CSS các màn hình cần sửa, tài liệu audit | H1 | Không còn chữ/nút mất tương phản do màu cứng; tương phản chữ thường ≥4.5:1 và chữ lớn ≥3:1; trình chiếu không bị toolbar che | V, P |
| H3 | Nghiệm thu web và Electron | Luồng UI + FileDialog/Presentation/Dialog services hiện có; tests và tài liệu khi cần | H2 | Chọn/lưu file native, fullscreen, PowerPoint hoặc trạng thái không hỗ trợ đều rõ; web không phụ thuộc cầu nối Electron | D, K, B |
| H4 | Review, tài liệu và bàn giao | `DESIGN.md`, `docs/*`, `tasks/todo.md`, Git diff | H3 | Kiểm tra phù hợp đều đạt hoặc ghi rõ lỗi còn lại; ảnh trước/sau đủ cho các màn hình; checklist khớp thực tế; nhánh có các commit dễ review | V, B, D |

## 5. Quy trình kiểm tra và điều kiện hoàn thành

| Mã | Nội dung |
| --- | --- |
| V | Quan sát trong trình duyệt thật; chụp trước/sau; kiểm tra tên dài, danh sách đông, trạng thái rỗng/lỗi; đọc console/network khi liên quan |
| B | Chạy `npm run build`, `npm run lint` ở checkpoint; chạy nhóm test hiện có phù hợp nếu thay đổi logic/state. Không viết test chỉ để lặp lại CSS |
| K | Tab/Shift+Tab, Enter/Space, Escape, focus khi mở/đóng modal; tên truy cập của nút icon và label của input |
| P | Chế độ máy chiếu, toàn màn hình, màn hình 1366×768/1920×1080; quan sát tỷ lệ slide, chữ dài và các controls. Khả năng đọc ở cuối lớp cần xác nhận trên máy chiếu thật |
| D | Luồng desktop native trên môi trường có Electron; kiểm tra PowerPoint khi máy có cài đặt, và kiểm tra trạng thái không hỗ trợ khi không có |

Kích thước cần nghiệm thu: laptop 1366×768 và 1024×768; màn hình lớn 1920×1080; tablet rộng 768 px; điện thoại 375 px và biên 320 px. Với bảng điểm/sơ đồ phức tạp, dùng cuộn có kiểm soát hoặc chế độ xem phù hợp, thay vì ép toàn bộ vào một cột.

Luồng cuối cùng phải đạt:

1. Chọn năm học → khối → lớp → bắt đầu/tiếp tục tiết học.
2. Nhập/chọn bài giảng → trình chiếu web/native → ghi chú → thoát về đúng màn hình.
3. Tạo/chạy quiz → xem kết quả → kiểm tra sao và lịch sử.
4. Sửa đánh giá → đổi học kỳ → xuất file và đối chiếu giá trị.
5. Xếp/gán học sinh vào máy → đổi hướng → chiếu sơ đồ.
6. Nội quy/cộng trừ sao → cửa hàng → đổi quà và kiểm tra lịch sử.
7. Nhập Excel, tạo/xác minh/phục hồi sao lưu và chuyển năm trên dữ liệu kiểm thử.

Các thao tác tạo/sửa/xóa/phục hồi trong nghiệm thu dùng bản sao dữ liệu hoặc dữ liệu mẫu. Kiểm tra offline của nghiệp vụ cục bộ; AI hiển thị đúng trạng thái khi không có mạng. Nếu kiểm tra chưa làm được vì thiếu PowerPoint/máy chiếu/môi trường, ghi đúng phạm vi chưa xác minh.

## 6. Rủi ro và cách xử lý

| Rủi ro | Cách xử lý |
| --- | --- |
| CSS toàn cục thay đổi nhiều màn hình | Đổi tokens trước; chuyển từng màn hình; checkpoint đi qua toàn bộ tab |
| Inline style nhiều, file lớn | Tách từng vùng chức năng đang sửa; giữ CSS mới có phạm vi; không thêm lớp override chồng chéo |
| Ghim cột/toolbar làm che dữ liệu | Kiểm tra cuộn ngang/dọc, z-index, header cố định và chế độ máy chiếu |
| Đổi bố cục gây mất state hoặc gọi API hai lần | Đối chiếu trạng thái và request của luồng trước/sau; giữ id, key và hợp đồng callback |
| Modal dùng chung xung đột native/fullscreen | Chuyển dần từng loại; kiểm tra focus và lớp phủ trong cả web và Electron |
| Đánh giá/sao/ngẫu nhiên bị đổi khi sửa UI | Tách logic nghiệp vụ; dùng dữ liệu biết trước để đối chiếu; kiểm tra phù hợp khi logic bị chạm |
| DESIGN.md khác bản chạy | Lấy bằng chứng runtime và mã hiện tại; cập nhật tài liệu theo giao diện đã hoàn thành |
| Không có máy chiếu hoặc PowerPoint để nghiệm thu | Ghi giới hạn kiểm tra; hoàn thành phần web và trạng thái fallback, để mục xác nhận thiết bị riêng |

## 7. Cách nghiệm thu và ưu tiên

Ưu tiên triển khai: **A → B → C → D**, sau đó **E → F → G**, cuối cùng **H**. Kết quả đầu tiên để review là mẫu thiết kế và bản chạy của khung ứng dụng/trang chủ/thư viện. Mỗi giai đoạn có ảnh so sánh và checklist hoàn thành; chỉ đánh dấu nhiệm vụ xong khi tiêu chí của nó đã đạt.

Kế hoạch hiện là tài liệu chuẩn bị thực hiện, chưa phải các thay đổi giao diện đã triển khai. Mức độ công việc được theo dõi bằng nhiệm vụ và checkpoint; chưa đưa lịch ngày hoàn thành khi các màn hình chưa kiểm tra đầy đủ.
