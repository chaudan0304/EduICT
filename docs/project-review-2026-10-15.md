# Rà soát EduICT — 15/10/2026

> Đã triển khai khắc phục A01–A14 trong 1.11.1. Xem [hồ sơ sửa và kiểm chứng](project-audit-fixes-1.11.1.md). Nội dung bên dưới giữ nguyên bằng chứng của thời điểm rà soát trước khi sửa.

## Phạm vi và kết luận

- Mã hiện tại tại `D:\DU_AN\EduICT`, nhánh `codex/personal-local-sync`, HEAD `e986337`, phiên bản 1.11.0; có sẵn thay đổi chưa commit ở sao/điểm tốt.
- Rà soát độc lập dữ liệu, frontend, desktop; người điều phối đọc lại các đường gọi và xác nhận một số lỗi bằng dữ liệu giả trong thư mục scratch.
- Không sửa mã ứng dụng, cài lại app, khôi phục hay ghi dữ liệu học sinh thật. Chỉ thêm báo cáo này; build/test tạo đầu ra tạm.
- Dùng chung SQLite đã hoạt động, nhưng chưa đủ để bảo đảm hai giao diện cùng sửa dữ liệu mà không ghi đè nhau. Đây là ưu tiên sửa đầu tiên.

P1: nguy cơ mất/ghi đè dữ liệu hoặc làm hỏng chức năng chính. P2: kết quả sai hoặc thao tác không hoạt động trong điều kiện nêu dưới đây. Các phát hiện tĩnh chưa được xác nhận bằng thao tác trên PowerPoint, micro hay giao diện đang dùng dữ liệu thật.

## Kết quả chạy lệnh

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run build` | Thành công; chunk chính 856,22 kB, gzip 264,21 kB; còn cảnh báo chunk lớn hơn 500 kB. |
| `npm run lint` | Exit 0; 170 cảnh báo, không có lỗi. Có dependency của hook và biến/import không dùng. |
| `npm test` lần cuối ngoài sandbox | 246 test: 241 đạt, 5 không đạt; không skip/cancel. |
| Thử ghi roster cũ trên DB giả | Xác nhận mất cập nhật sao và xóa học sinh mới. |
| Thử backup/restore ảnh trên DB và uploads giả | Xác nhận bản backup không có ảnh và restore làm mất ảnh. |
| Thử trừ sao cá nhân trên DB giả | 5 sao, yêu cầu trừ 100: số dư 0 nhưng nhật ký ghi -100. |
| Giả lập HTTP 500 ở hàm lưu học sinh | Hàm hoàn tất mà không ném lỗi. |

Hai lượt test trong sandbox trước đó có thêm lỗi quyền rename/thời gian chờ backend. Lần cuối ngoài sandbox loại được các lỗi môi trường đó; không lấy 25 hoặc 9 lỗi của hai lượt đầu làm số lỗi sản phẩm.

Năm test chưa đạt:

- `phase11-desktop-native.test.js:247`: contract lỗi khi PowerPoint không khả dụng.
- `phase11-desktop-native.test.js:474`: assertion tìm `setPermissionRequestHandler` ngay trong main.cjs, trong khi main hiện gọi `installClassroomPermissions` và handler nằm ở module riêng. Đây là assertion cần cập nhật theo hành vi, không phải bằng chứng quyền micro bị bỏ.
- `phase12-packaging.test.js:641`: kỳ vọng runner được gọi trong test COM lock.
- `phase12-packaging.test.js:679`: test đóng presentation không có lần gọi runner như kỳ vọng.
- `phase12-packaging.test.js:689`: assertion tĩnh về giới hạn đường dẫn PowerPoint không khớp mã hiện tại.

Không đồng nhất năm test thất bại với năm lỗi PowerPoint thực tế; cần đối chiếu các fixture/contract đã thay đổi và kiểm tra hành vi thật sau khi sửa.

Log tại `scratch/project-audit-{build,lint}-2026-10-15.log` và `scratch/project-audit-tests-final-2026-10-15.log`.

## Các vấn đề cần sửa

### A01 — P1: Ghi roster cũ làm mất sao và học sinh vừa thêm

- Nguồn: [App.jsx](../src/App.jsx#L244), [storage.js](../src/utils/storage.js#L406), [classes.js](../server/db/classes.js#L226).
- Web và desktop cùng nạp một lớp. Sau khi web cộng sao/thêm học sinh, bên desktop chưa tải lại sửa ghi chú/điểm danh. Client gửi toàn bộ danh sách cũ; backend xóa ID không nằm trong danh sách đó và ghi lại trường stars của mọi học sinh (`classes.js:240`). Không có phiên bản dữ liệu kỳ vọng cho roster.
- **Đã tái hiện bằng DB giả:** trước lưu có 2 học sinh/tổng 5 sao; sau lưu roster cũ còn 1 học sinh/tổng 0 sao. Xóa học sinh còn có thể kéo theo lịch sử qua khóa ngoại.
- Sửa: API cập nhật từng học sinh/từng trường; xóa bằng thao tác riêng; version/CAS cho dữ liệu lớp. Không ghi lại sao từ snapshot khi chỉ sửa ghi chú/điểm danh. Tải lại khi focus giúp hiển thị, nhưng không thay thế kiểm tra xung đột ở server.

### A02 — P1: Mã phiên nhập PowerPoint chưa được giới hạn trước khi xóa thư mục

- Nguồn: [pptx.js](../server/routes/pptx.js#L125), [pptxService.js](../server/pptxService.js#L1021), [hàm xóa](../server/pptxService.js#L89).
- `path.basename('..')` vẫn là `..`. Ghép với uploads/temp cho ra chính uploads, rồi `removeDirectorySafe` xóa đệ quy. Luồng xác nhận nhập ở `pptxService.js:960` cũng ghép tempId mà không kiểm tra vùng cho phép và xóa tại dòng 1007.
- **Đã xác nhận phép tính đường dẫn; không thực hiện yêu cầu xóa.** Đây là lỗi kiểm tra đầu vào API. Không khẳng định có thể khai thác từ Internet vì mặc định máy chủ chỉ mở localhost và có kiểm tra origin.
- Sửa: chỉ nhận ID đúng mẫu do server sinh; kiểm tra đường dẫn đã resolve/realpath thuộc thư mục temp và khác thư mục gốc trước mọi thao tác đọc/xóa; từ chối ID lạ trước khi tạo thư mục đích.

### A03 — P1: Backup thiếu ảnh trò chơi; restore xóa ảnh còn đang có

- Nguồn: [backupService.js](../server/services/backupService.js#L86), [restore](../server/services/backupService.js#L204).
- Backup chỉ sao chép uploads/presentations; ảnh mới ở uploads/classroom-games bị bỏ sót. Restore xóa toàn bộ uploads rồi chỉ chép những gì có trong backup. Metadata SQLite còn nhưng liên kết ảnh hỏng.
- **Đã tái hiện bằng DB và ảnh giả:** imageInBackup=false; imageExistsAfterRestore=false.
- Archive restore có API `/api/backup/restore`; chưa tìm thấy nút frontend sản xuất gọi API này. createBackup vẫn được dùng tạo bản an toàn trước nhập SQL/JSON.
- Sửa: backup đầy đủ assets đang quản lý và manifest/checksum tệp; tương thích backup cũ bằng cách không xóa nhóm tệp mà bản cũ không có. Xuất SQLite/SQL/JSON riêng vốn không chứa ảnh nhị phân; cần gói backup có cả uploads khi di chuyển máy.

### A04 — P1: Restore/rollback nâng cấp chưa phối hợp hai backend dùng chung DB

- Nguồn: [backupService.js](../server/services/backupService.js#L196), [updateGuard.cjs](../desktop/migration/updateGuard.cjs#L77), [main.cjs](../desktop/main/main.cjs#L225).
- closeConnection chỉ đóng tiến trình nhận yêu cầu. Restore tiếp tục xóa/thay SQLite, WAL và SHM trong khi backend kia có thể giữ kết nối. Rollback cập nhật desktop có cùng giả định một backend.
- **Phát hiện tĩnh, chưa thao tác restore khi hai bản thật cùng mở.** Có thể thất bại vì khóa tệp hoặc khiến các kết nối dùng dữ liệu/tệp WAL khác nhau. SQL/JSON import dùng executeSqlDump trên kết nối đang có, không đi qua đoạn thay tệp này.
- Sửa: khóa bảo trì liên tiến trình, phát hiện/ngừng các backend trước khi thay tệp; hoặc phục hồi qua SQLite với điều phối rõ ràng. Giữ snapshot và cơ chế quay lui.

### A05 — P1: Kết quả quiz mở từ slide/tiết học không được ghi vào SQLite

- Nguồn: [PresentationView.jsx](../src/components/LessonPresentation/PresentationView.jsx#L1575), [SessionDashboard.jsx](../src/components/ClassroomSession/SessionDashboard.jsx#L824); đối chiếu [QuickQuizManager.jsx](../src/components/QuickQuiz/QuickQuizManager.jsx#L46).
- Hai đường tích hợp chỉ mở modal báo cáo hoặc ghi sự kiện tiết học, không gọi saveQuizResultsApi như màn hình Đố vui riêng. Tải lại hoặc xuất database sẽ thiếu kết quả từng câu/từng học sinh vừa thấy trên màn hình.
- **Xác nhận đường gọi tĩnh, chưa chơi quiz với dữ liệu thật.**
- Sửa: một luồng hoàn tất quiz dùng chung; lưu thành công trước khi báo hoàn tất, giữ kết quả chờ nếu lỗi; đồng bộ giao dịch sao với kết quả đã xác nhận.

### A06 — P2: Đồng hồ hoạt động có thể đứng khi chuyển bước hoặc chỉnh giờ

- Nguồn: [SessionDashboard.jsx](../src/components/ClassroomSession/SessionDashboard.jsx#L220), [chuyển hoạt động](../src/components/ClassroomSession/SessionDashboard.jsx#L487), [chỉnh giờ](../src/components/ClassroomSession/SessionDashboard.jsx#L547).
- Nút chuyển hoạt động/reset/+30s xóa anchor. Interval chỉ tính nếu anchor còn tồn tại. Effect tạo anchor lại không phụ thuộc hoạt động mới hay thời gian vừa chỉnh, nên có thể đứng đến khi pause/resume hoặc dependency khác đổi. Chọn trực tiếp một hoạt động ở dòng 510 còn không đặt lại anchor, khiến tick tiếp theo quay về thời gian hoạt động cũ.
- **Phát hiện tĩnh.** Sửa bằng thao tác cập nhật thời gian và anchor mới đồng thời; bổ sung hồi quy cho chuyển bước/reset/+giờ khi đang chạy.

### A07 — P2: Tạo quiz từ slide/tiết học bị reset chế độ và tiêu đề

- Nguồn: [CreateQuizModal.jsx](../src/components/QuickQuiz/CreateQuizModal.jsx#L32), [effect](../src/components/QuickQuiz/CreateQuizModal.jsx#L89).
- prop mặc định `preselectedQuestions = []` tạo array mới mỗi render; effect phụ thuộc array này và đặt lại MANUAL/tiêu đề. Caller từ slide/tiết học không truyền prop đó. Bấm AUTO hoặc sửa tiêu đề gây render rồi bị reset.
- **Phát hiện tĩnh.** Sửa: constant mặc định ổn định; chỉ khởi tạo lúc mở modal hoặc đổi nguồn thật sự, không chạy lại theo mọi lần nhập.

### A08 — P2: Nút phân tích quiz bằng AI đọc sai trường mã phiên

- Nguồn: [QuizPlayer.jsx](../src/components/QuickQuiz/QuizPlayer.jsx#L276), [QuizResultModal.jsx](../src/components/QuickQuiz/QuizResultModal.jsx#L83).
- Payload hoàn tất có session_id; modal lại yêu cầu summaryData.id. Vì thế báo phiên chưa lưu trước cả khi gọi Gemini, kể cả đường Đố vui riêng đã lưu kết quả.
- **Phát hiện tĩnh.** Sửa thống nhất mã session_id và chỉ bật phân tích sau khi server xác nhận lưu.

### A09 — P2: Chấm quiz bằng phím tắt có thể đọc số liệu cũ

- Nguồn: [QuizPlayer.jsx](../src/components/QuickQuiz/QuizPlayer.jsx#L290).
- Listener Space/ArrowRight giữ handleRevealAnswer cũ vì effect thiếu handler/classCounts/studentMarks. Sau khi nhập số lượng hoặc chấm học sinh, bỏ focus ô nhập rồi nhấn phím có thể tính 0 đúng/0 sai từ closure trước đó. Timer đã dùng revealRef mới nhất nhưng phím tắt chưa dùng.
- **Phát hiện tĩnh.** Sửa listener dùng cùng callback/ref hiện hành như nút bấm và timer; kiểm tra chuột/phím/timer cho kết quả giống nhau.

### A10 — P2: Quiz chế độ cả lớp báo thưởng sao nhưng không ghi thưởng

- Nguồn: [QuizPlayer.jsx](../src/components/QuickQuiz/QuizPlayer.jsx#L265), [nhãn báo cáo](../src/components/QuickQuiz/QuizResultModal.jsx#L214).
- Khi chính xác >=70%, CLASS mode tính total_stars_awarded và hiển thị tổng khen thưởng, nhưng chỉ nhánh STUDENT gọi onAwardStars. Lưu quiz chỉ lưu con số tổng kết, không cộng số dư học sinh.
- **Phát hiện tĩnh.** Sửa: phân biệt sao đề xuất với sao thực sự đã ghi; nếu thưởng cả lớp thì dùng thao tác xác nhận và API thưởng chung có chống lặp, rồi báo tổng ghi thành công.

### A11 — P2: Lưu học sinh thất bại nhưng giao diện không nhận lỗi

- Nguồn: [storage.js](../src/utils/storage.js#L406), [App.jsx](../src/App.jsx#L244). Cập nhật lớp/xóa lớp trong cùng module có kiểu xử lý tương tự.
- Hàm fetch không kiểm tra response.ok; catch cũng chỉ log. App cập nhật state trước rồi coi việc lưu là hoàn tất. HTTP 500 hoặc mất kết nối có thể làm người dùng nghĩ dữ liệu đã lưu, tải lại thì thay đổi biến mất.
- **Đã giả lập HTTP 500:** syncStudentsToSqlite không reject.
- Sửa: dùng apiClient, truyền lỗi về UI, hiển thị chưa lưu/thử lại, khôi phục state hoặc giữ hàng chờ rõ ràng.

### A12 — P2: Nhật ký trừ sao cá nhân khác thay đổi số dư thực tế

- Nguồn: [gamification.js](../server/db/gamification.js#L73), [báo cáo tháng](../server/services/classroomTools.js#L84).
- Số dư kẹp ở 0, nhưng nhật ký ghi nguyên số yêu cầu. Batch mới dùng delta thực, khiến ý nghĩa amount không thống nhất. Báo cáo tháng cộng trực tiếp amount sẽ sai so với biến động số dư.
- **Đã tái hiện trên DB giả:** số dư đầu 5, yêu cầu -100, số dư cuối 0, ledgerAmount=-100.
- Sửa: lưu delta thực trong sổ cái và requestedAmount riêng. Nếu cần thống kê điểm vi phạm theo yêu cầu, báo cột riêng với tên rõ ràng, không dùng chung với sao đã thay đổi.

### A13 — P2: Timeout Gemini chưa hủy yêu cầu đang xử lý

- Nguồn: [geminiService.js](../server/ai/geminiService.js#L157), [retry](../server/ai/geminiService.js#L213).
- Promise.race chỉ ngừng chờ; không hủy request cũ. Khi request chậm, vòng retry có thể để nhiều yêu cầu còn chạy cho một lần bấm; timer cũng không được clear khi thành công. Có nguy cơ tốn thêm hạn mức/chi phí.
- **Phát hiện tĩnh, không gọi Gemini hoặc dùng khóa thật.** Sửa: hủy request qua cơ chế SDK hỗ trợ, clear timer trong finally, giới hạn tổng thời gian/retry của thao tác.

### A14 — P2: Web và desktop chưa cùng lấy khóa PowerPoint COM

- Nguồn: [pptxService.js](../server/pptxService.js#L62), [powerpointBridge.cjs](../desktop/native/powerpointBridge.cjs#L115).
- Web bỏ qua khóa liên tiến trình nếu runtime không phải desktop, kể cả khi dùng kho dữ liệu chung. Nếu web kết xuất slide đồng thời desktop điều khiển PowerPoint, hai bên có thể đụng cùng COM application. Renderer còn gọi Quit trong finally (`server/pptx-renderer.ps1:194`).
- **Phát hiện tĩnh, chưa tái hiện với Microsoft PowerPoint thật.** Sửa: mọi bên dùng COM cùng lấy khóa tại data/locks; kiểm tra quyền sở hữu instance trước khi đóng PowerPoint.

## Thứ tự sửa đề xuất

1. **An toàn dữ liệu:** A01, A02, A03, A04, A11. Trong lúc chờ, tránh chỉnh cùng lớp ở cả hai bản khi chưa tải lại; đóng cả web backend và desktop trước khi thay tệp SQLite/restore archive.
2. **Một tiết dạy hoàn chỉnh:** A05–A10, A12. Ưu tiên lưu quiz, đồng hồ, cấu hình ngẫu nhiên và AI phân tích.
3. **Độ ổn định tích hợp:** A13, A14; chỉnh 5 test chưa đạt theo contract/hành vi hiện tại, bổ sung hồi quy cho các lỗi đã xác nhận.
4. **Hoàn thiện:** xử lý cảnh báo hook trước cảnh báo biến không dùng; tách chunk nặng để giảm thời gian mở, đo trên máy giáo viên trước khi đặt mục tiêu hiệu năng.

Không có căn cứ từ lượt này để khẳng định toàn bộ UI/PowerPoint Online/micro đều đã được kiểm tra thực tế. Các thay đổi sao/điểm tốt đang có trước lượt rà soát được giữ nguyên, chưa commit/push thêm.
