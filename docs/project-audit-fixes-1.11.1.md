# Khắc phục báo cáo rà soát — EduICT 1.11.1

Ngày 15/10/2026 · Nhánh `codex/fix-project-audit`.

## Đã sửa theo báo cáo

| Mục | Sửa đổi | Bằng chứng |
| --- | --- | --- |
| A01 | Roster có studentsVersion từ server; so sánh trong BEGIN IMMEDIATE; danh sách cũ nhận 409. Giữ số sao hiện tại từ DB khi sửa roster. Client xếp hàng các lần lưu liên tiếp. | Hồi quy DB giả: sửa ghi chú giữ 5 sao; roster thiếu học sinh mới bị từ chối, học sinh mới còn nguyên. API cũ thiếu phiên bản cũng bị chặn. |
| A02 | Kiểm tra mẫu tempId, ID bài và vùng đường dẫn trước khi thao tác/xóa; từ chối thư mục gốc và liên kết vượt vùng quản lý. | Các ID `..`, `.`, đường dẫn lạ bị từ chối, tệp sentinel giữ nguyên; không gửi yêu cầu xóa tới dữ liệu thật. |
| A03 | Backup toàn bộ uploads; manifest checksum từng tệp. Restore backup cũ chỉ thay presentations để giữ nhóm ảnh mới. | Backup/verify/restore ảnh giả thành công. |
| A04 | Đăng ký tiến trình dùng SQLite và khóa bảo trì dùng chung; archive restore và rollback nâng cấp từ chối nếu backend khác còn kết nối. | Tiến trình con giữ lease: cả archive restore và rollback nhận DATABASE_IN_USE. |
| A05 | QuizPlayer dùng một luồng lưu kết quả chung cho mọi nơi mở quiz; bỏ trả thành công offline giả; chỉ báo hoàn tất sau server lưu. | Hồi quy lưu quiz/retry; trình duyệt chạy quiz từ SessionDashboard, SQLite có COMPLETED, một kết quả, ba giao dịch và tổng kết tiết +3 sao. |
| A06 | Tạo anchor mới ngay khi chuyển/chọn/reset hoạt động hoặc chỉnh giờ; gia hạn đúng chế độ thời khóa biểu. | Trình duyệt với dữ liệu giả: sau +30s vẫn đếm từ 05:05 xuống 04:20; sau Tiếp đếm từ 05:00 xuống 02:16 ở hoạt động mới. |
| A07 | Giá trị array mặc định ổn định; chỉ khởi tạo modal khi mở/đổi nguồn thật sự. | Trình duyệt: chọn AUTO vẫn hiện bộ lọc; tiêu đề tự nhập giữ nguyên qua chuyển chế độ. |
| A08 | Phân tích AI dùng session_id đúng, kiểm tra trạng thái lưu và xóa kết quả phân tích cũ khi đổi phiên. | Trình duyệt gửi phân tích được cho phiên đã lưu; backend thử chủ động tắt Gemini nên trả AI_DISABLED, không còn lỗi thiếu mã phiên. |
| A09 | Phím tắt lấy callback mới nhất qua ref; dùng chung hàm chấm cho nút, phím và lúc kết thúc. | Trình duyệt: nhập 3 học sinh chọn A, bấm Space hiển thị 3/3 và 100%. |
| A10 | Server ghi kết quả và sao đã xác nhận trong một transaction; id sao cố định theo quiz/học sinh. Báo cáo lấy tổng sao thực đã ghi. | Quiz cả lớp ghi đúng sao một lần; retry không cộng lại; từ chối thưởng thì tổng sao ghi bằng 0. |
| A11 | Hàm lưu lớp/học sinh/xóa lớp ném lỗi HTTP; banner báo chưa lưu; thêm/xóa lớp chỉ đổi giao diện sau khi server thành công. | Giả lập HTTP 500: hàm lưu học sinh, tạo quiz, lưu kết quả đều reject. |
| A12 | amount là delta thực; requested_amount giữ yêu cầu gốc. Không sửa lịch sử cũ. | Có 5 sao, yêu cầu -100: số dư 0; amount=-5, requested_amount=-100. |
| A13 | AbortSignal tới SDK, dọn timer; timeout không tự retry. | Hàm giả hết hạn: signal bị abort đúng một lần; hàm thành công dọn timer. |
| A14 | Web và desktop cùng lấy khóa PowerPoint; renderer chỉ Quit khi không còn presentation. | Web renderer chờ khóa filesystem đang giữ; fixture bridge được mở bài trước khi kiểm tra khóa/đóng. Chưa chạy COM thật. |

## Các điểm vận hành

- Cần cập nhật cả hai backend lên mã mới. Chương trình cũ chưa đăng ký lease không được bảo vệ đầy đủ bởi khóa bảo trì; đóng các phiên cũ trước lần chạy bản mới và trước thao tác thay tệp SQLite.
- HTTP ghi roster từ frontend cũ không có studentsVersion sẽ nhận 409 và yêu cầu tải lại; đây là chủ ý để tránh ghi đè. Hàm nội bộ cho import/seed vẫn hỗ trợ dữ liệu tin cậy.
- Nếu hai cửa sổ cùng sửa roster, cửa sổ cũ phải tải dữ liệu mới và thực hiện lại thao tác. Số sao được giữ theo sổ cái, không lấy từ snapshot cũ của client.
- Kết quả quiz và thưởng sao lưu nguyên tử; khi có lỗi, kết quả vẫn giữ trong trình phát cùng nút thử lưu lại. Hộp HTML dialog trong EduICT có lựa chọn **Lưu và thưởng sao**, **Chỉ lưu kết quả**, **Quay lại**, giữ focus và tránh hộp confirm của trình duyệt.
- Backup SQL/JSON/SQLite chứa bản ghi, không đóng gói ảnh nhị phân; muốn mang đầy đủ ảnh sang máy khác phải giữ uploads hoặc bản backup gồm tệp.
- AbortSignal chỉ hủy việc chờ phía client; nhà cung cấp có thể vẫn hoàn tất và tính hạn mức cho yêu cầu đã nhận. Không tự retry khi timeout để tránh gửi chồng.
- Migration requested_amount chỉ bổ sung cột khi cần. Lịch sử sao cũ được giữ nguyên vì không thể suy ra chính xác mọi số dư trước đây.

## Kiểm chứng

- Bộ kiểm thử toàn working copy: **257/257 đạt**, không skip/cancel. Gồm 11 hồi quy mới; năm test PowerPoint/security cũ được cập nhật fixture theo contract hiện tại, vẫn giữ kiểm tra quyền/đường dẫn và khóa liên tiến trình.
- Build Vite thành công. Lint exit 0, 157 cảnh báo, không lỗi (trước sửa: 170 cảnh báo). Còn cảnh báo bundle lớn; không tuyên bố lint toàn dự án sạch cảnh báo.
- Thử trình duyệt bằng component thật, backend riêng ở cổng 5188 và SQLite giả trong scratch; không tạo bài hoặc giao dịch sao vào dữ liệu trường thật.
- Đã thử luồng hoàn tất và xác nhận thưởng qua HTML dialog: 100%, tổng thưởng 3 sao, ba giao dịch SQLite, ba dòng participation. Sau nạp lại, tiết học vẫn hiện +3 sao. Đã gọi phân tích tới backend tắt AI, chưa gọi Gemini thật.
- Có lỗi HMR và cảnh báo createRoot của trang harness tạm trong lúc sửa; đã nạp phiên trình duyệt mới từ mã hoàn chỉnh. Không lấy log của harness làm lỗi chạy bản đóng gói. Vite hiện bỏ qua dist/release/scratch/desktop/.stage để đóng gói không tự tải lại tiết đang mở.
- Không kiểm tra PowerPoint COM, micro hay Microsoft Online thật trong lượt này.
- Working copy có sẵn các thay đổi sao nhóm/điểm tốt ngoài nhiệm vụ, cùng test tương ứng. Chúng được giữ nguyên và có trong số test 257; không đưa vào các commit sửa này. Bộ cài từ working copy bao gồm các thay đổi đang có đó.

## Cảnh báo dependency ngoài 14 mục ban đầu

`npm audit --omit=dev` ngày 15/10/2026 trả một dependency mức high: xlsx 0.18.5, với [prototype pollution](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6) và [ReDoS](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9). Registry báo không có bản sửa qua npm audit fix. Chưa nâng/thay thư viện nhập xuất Excel trong lượt sửa này; cần một đợt nâng cấp có kiểm tra tương thích XLS/XLSX riêng. Không tuyên bố dependency audit sạch.

Log: scratch/audit-fix-final-tests.log; ảnh quan sát: scratch/audit-fix-verified.jpg. Bộ cài 1.11.1 build/NSIS thành công, stage/ASAR/win-unpacked quét secret không có finding. EXE 113.339.781 byte; SHA-256 `1C9F2BBFDBA5CA1AE8614F63F7938F3106DB4C91858743A539534EEDBA8DADEE`.

## Trạng thái bàn giao trên máy

- Bản web đã khởi động từ checkout này tại http://127.0.0.1:5173/, `/api/health` trả database ok. API đọc đủ 23 lớp, 810 học sinh; cả 23 lớp có studentsVersion. Chỉ đọc số liệu tổng hợp, không sửa dữ liệu trường trong bước kiểm tra này.
- Backend thử nghiệm ở cổng 5188 đã dừng; các tab harness đã đóng.
- Chưa cập nhật thành công bản desktop đã cài ở `D:\App_DaCaiDat\EduMaster`: chạy bộ cài với `/S` và `/CURRENTUSER` vẫn đứng chờ; đã dừng tiến trình cài do tác vụ tạo. File EXE đã cài còn ProductVersion 1.11.0.0. Không coi build NSIS thành công là bằng chứng cài thành công. Bộ cài 1.11.1 nằm ở `release/EduMaster-Setup.exe`, cần kiểm tra cài đặt tương tác riêng.
- Không thay thủ công thư mục cài, không khôi phục SQLite và không ghi đè dữ liệu dùng chung để vượt qua lỗi cài đặt.
