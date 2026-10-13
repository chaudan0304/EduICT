# Quản lý máy lỗi — EduICT 1.10.0

## Cách sử dụng

1. Mở **Sơ đồ phòng máy**. Màn hình mặc định là tình trạng 31 máy dùng chung cho toàn trường.
2. Chọn máy, chọn **Có lỗi, vẫn dùng được** hoặc **Không dùng được**, chọn loại lỗi và ghi chú nếu cần.
3. Bấm **Lưu tình trạng**. Ngày báo lỗi được ghi tự động; cập nhật lỗi giữ ngày báo đầu tiên.
4. Khi xử lý xong, chọn máy và bấm **Đã sửa**. Máy trở lại bình thường; lịch sử vẫn xem được khi mở máy.
5. Danh sách **Máy cần xử lý** tổng hợp các máy có lỗi. **Cập nhật** tải trạng thái mới từ máy chủ.
6. **Mở công cụ chỗ ngồi** giữ các công cụ cũ khi có nhu cầu sử dụng.

Không cần xác định học sinh đang dùng máy. Báo lỗi và đánh dấu đã sửa không ghi lại danh sách học sinh hoặc tự động đổi chỗ. Máy có lỗi nhẹ vẫn được dùng; máy không dùng được bị loại khỏi thao tác xếp chỗ mới.

## Dữ liệu và tương thích

- SQLite: thêm cột vào `broken_machines`, tạo `machine_fault_history`. Máy hỏng cũ giữ số máy, ghi chú/ngày báo và chuyển thành **Không dùng được**.
- Khi đổi lớp, trạng thái máy vẫn dùng chung. Trạng thái chỉ báo lưu thành công sau khi API xác nhận.
- Từng máy có phiên bản dựa trên lịch sử; dữ liệu đã thay đổi ở cửa sổ khác trả 409 và yêu cầu tải lại. Mã thao tác giúp tránh ghi lịch sử hai lần khi thử lại yêu cầu.
- Đường dẫn API: GET `/api/machines/faults`, GET `/api/machines/:number/history?before=...`, PUT `/api/machines/:number/fault`.
- Lịch sử phân trang 50 bản ghi. Không xóa lịch sử khi đánh dấu đã sửa.
- API danh sách máy hỏng cũ vẫn trả mảng máy không dùng được. Cập nhật qua API cũ giữ các lỗi vẫn dùng được và ghi lịch sử.
- Xuất toàn bộ SQL/SQLite/JSON và Excel chứa các bảng gốc nên bao gồm lịch sử máy. JSON cũ được nhập qua đường dẫn hợp nhất, có trạng thái mặc định và sự kiện nhập lại.

## Phạm vi kiểm tra

- Rà soát mã nguồn, kiểm tra cú pháp backend và lint các module mới.
- Build Vite trên bản SQLite riêng trong `scratch`, không thao tác thử trên dữ liệu lớp thật.
- Bộ cài NSIS: đối chiếu payload ASAR, quét thông tin nhạy cảm và kiểm tra phiên bản.
- Chưa chạy test tự động hoặc thử thao tác trong web/app thật. Bộ cài không ký số.

Nhánh: `codex/machine-fault-management`; phiên bản 1.10.0.

## Kết quả đóng gói

- Build Vite thành công; cảnh báo kích thước bundle hiện có.
- Các module mới lint không có cảnh báo; lint toàn dự án còn các cảnh báo cũ.
- NSIS x64 thành công: `release/EduMaster-Setup-1.10.0.exe`, 113147709 byte, phiên bản 1.10.0, chưa ký số.
- SHA256: `D285E40317ADFD29AECD6E53846E3AA75EE2EC6C997735F15260544FC3C9D799`.
- Payload EXE và ASAR trùng khớp; 176 file runtime khớp stage.
- Quét 927 file stage, 570 file ASAR và 5 file unpacked: không phát hiện thông tin nhạy cảm.
- Bản web local đã khởi động lại tại http://127.0.0.1:5173/. Chưa thử thao tác báo/sửa lỗi trong giao diện thật.
