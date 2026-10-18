# Phục hồi tiết học và bản nháp chung — 1.16.0

## Sử dụng

- Khi nhật ký tương tác chưa được máy chủ xác nhận, cảnh báo ghi rõ số bản ghi chờ. Bấm **Thử lưu lại** khi có kết nối; chỉ gửi lại nhật ký với cùng mã, không phát lại giao dịch sao.
- Khi tiết học đổi ở cửa sổ khác, chọn **Đối chiếu bản đang sửa và bản chung**. Xem ghi chú, trạng thái, mốc thời gian, mục tiêu và các hoạt động trước khi chọn. Nội dung thay đổi sau khi mở đối chiếu phải được đọc lại.
- **Giữ bản chung** lưu nội dung đang sửa thành bản nháp chung trước khi bỏ thay đổi tại đây. **Áp dụng bản đang sửa đã đối chiếu** vẫn kiểm tra phiên bản mới nhất khi gửi.
- Mở **Công cụ → Bản nháp** để xem, tiếp tục, bỏ tạm hoặc khôi phục. Bản đề xuất AI cần chọn tiết học nhận tiến trình. Bài/câu hỏi/lớp gốc đã xóa được báo lỗi và giữ nội dung để xem.

## Lưu trữ và hợp đồng

- Metadata tiết học và tiến trình có hai mã SHA-256 riêng. Client mới gửi phiên bản gốc; backend dùng giao dịch SQLite và trả 409 khi khác. Gửi lại cùng nội dung sau khi mất xác nhận được chấp nhận. API cũ không gửi phiên bản vẫn được hỗ trợ, nên bảo vệ này cần cả web và desktop đã cập nhật.
- POST nhật ký dùng mã cố định, kiểm tra tiết học/lớp học sinh và chấp nhận cùng mã/cùng nội dung; cùng mã khác nội dung trả 409. Không sửa sao từ API nhật ký.
- Bản chờ tiết học và bản sao dự phòng của biểu mẫu còn nằm trong localStorage của từng môi trường. Không tự gửi lại giao dịch sao/quiz khi phục hồi.
- Bản nháp chung nằm trong `app_settings`, khóa `editor_draft:<scope>`, theo cơ chế xuất SQLite/SQL/JSON và sao lưu đầy đủ hiện có. API `/api/editor-drafts` chỉ chấp nhận máy cục bộ, giới hạn 1 MB/nội dung và 500 bản đang soạn. Bỏ tạm giữ dữ liệu, không xóa vĩnh viễn.
- Đồng bộ sau khoảng 600 ms và chỉ báo đã đồng bộ khi nhận xác nhận. Có bộ đệm cục bộ khi mất kết nối. Đóng trình duyệt trước khi gửi xong có thể cần mở lại đúng môi trường để gửi tiếp. Kho chung chỉ hoạt động khi hai bản cùng dùng cơ sở dữ liệu trên máy này, không phải đồng bộ qua Internet.
- Một bản nháp hiện hành trên mỗi biểu mẫu/phạm vi; không phải lịch sử mọi phiên bản. Nội dung đang mở không bị thay ngay khi cửa sổ khác lưu; phát hiện xung đột khi gửi hoặc mở lại.

## Bằng chứng kiểm chứng

- Dữ liệu thử riêng tại `scratch/recovery-1160-data`, hai bản web 5196/5197, không dùng dữ liệu học sinh thật để thử thao tác sửa.
- Qua giao diện: soạn câu hỏi ở 5196, mở Công cụ/Bản nháp ở 5197, tiếp tục đúng nội dung và đáp án. Hai cửa sổ sửa khác nhau: hiện hai bản, chọn bản chung khôi phục đúng nội dung. Ảnh `scratch/recovery-1160-draft-conflict.png`.
- Qua giao diện: giờ 07:05–07:50 giữ nguyên khi POST thời khóa biểu trả 503, lưu lại thành công khi bỏ lỗi. Đảo chiều giờ kết thúc 06:50 bị cảnh báo và vô hiệu hóa nút lưu. Kiểm thử SQLite đóng/mở lại xác nhận khung giờ tùy chỉnh.
- Qua giao diện: một lần Xung phong khi POST tiết học trả 503 hiện 2 nhật ký chờ. Thử lưu lại thành công, cảnh báo hết; API đọc lại đúng 1 event và 1 participation, mã duy nhất, không phát sinh thưởng sao. Ảnh `scratch/recovery-1160-history-retry.png`.
- Qua giao diện: hai cửa sổ sửa cùng hoạt động, API giữ bản B; sau tải lại vẫn giữ bản A chờ đối chiếu. Chọn bản chung tạo bản phục hồi trong danh sách chung; bỏ tạm và khôi phục đều giữ nội dung. Ảnh `scratch/recovery-1160-session-conflict.png`. Khi thử biểu mẫu hoạt động trả 503, ô nhập và lỗi được giữ, thử lại thành công mới đóng biểu mẫu.
- Kiểm thử tự động bao gồm: lưu lớp/giờ nguyên tử, reload, lịch chồng/đảo giờ, thiếu phiên bản, 409 hai client; nhật ký idempotent; outbox giữ lỗi; đối chiếu/áp dụng có kiểm tra phiên bản; bản nháp đóng/mở SQLite, archive/restore, tải chậm, lưu đang chạy và giới hạn dữ liệu; HTTP thực tế qua router.
- Toàn bộ bộ kiểm thử trên working copy hiện tại: **293/293**, 22 suites, không bỏ qua; log `scratch/recovery-1160-full-final.log`. Lint sạch; Vite build đạt, bootstrap 478,31 kB (gzip 138,30 kB). Các sửa sao/điểm có sẵn trong working copy được giữ ngoài commit nhiệm vụ.
- OneDrive và micro không được kiểm chứng trong lần này; người dùng sẽ tự thử như đã thống nhất.

## Đóng gói và cập nhật

- Bộ cài NSIS hoàn tất: `release/EduMaster-Setup.exe`, 113.382.966 byte, SHA-256 `26D9762B3EACA193E90E0FFB86F265EE8E09F9CC2D8F2D8AA8DB20BBEB9EBAE2`. Bộ cài 1.15.0 giữ trong scratch, SHA khớp bản trước.
- Quét stage 979 tệp, ASAR 596 tệp, unpacked 11 tệp: 0 finding. Năm tệp backend thay đổi và 97 tệp frontend khớp stage; metadata stage là 1.16.0.
- Trước cập nhật đã tạo/verify `EduMaster-Backup-2026-10-18-114445-456-70fd75c7`, gồm 23 lớp, 810 học sinh, 91 bài, 53 câu hỏi. Sao lưu phụ chưa bật.
- Bản cài `D:\App_DaCaiDat\EduMaster` có ProductVersion 1.16.0.0 và ASAR khớp release. Chỉ một đăng ký EduMaster 1.16.0, trỏ ổ D.
- Khởi động mới tạo safety backup nâng cấp 1.15.0 → 1.16.0. Web 5173 và backend desktop 62418 đều trả 1.16.0, health/database OK, 23 lớp/810 học sinh, roster SHA-256 `23c3725c271b11348bc2b3d2717d9dc4820bfc19ca6cf688c6ecb3d6c1a6dc5c` và revision lịch `7097dea75afe08284490e82c60c6634d49d2933fb679d864d0e317e117861cd2` khớp trước cập nhật; SQLite integrity_check OK. Kho thật chưa có bản nháp chung, không tạo nội dung thử vào đó. Log đối chiếu `scratch/recovery-1160-after-install.json`.
