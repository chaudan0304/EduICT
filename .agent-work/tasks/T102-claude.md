# T102 — Kiểm tra kết nối Claude trước khi phối hợp

Trước khi giao phần Bản đồ kho báu cho Claude, chứng minh CLI có thể đọc file thật.

## Tác vụ được phép
Chỉ dùng Read để đọc `D:/DU_AN/EduICT/package.json`, trả đúng JSON name và version.
Không đọc memory, cấu hình, môi trường, file khác; không sửa mã, không Bash.
Giới hạn tối đa 3 lượt. Nếu model không truy cập được hoặc không có tool Read thực,
dừng tác vụ; Codex tiếp tục thực hiện tính năng theo quyền dự phòng của người dùng.

## Báo cáo
`.agent-work/reports/T102-claude.md`; do Codex ghi nhận kết quả quan sát của CLI.
