# Checklist chỉnh sửa toàn bộ giao diện EduICT

Nhánh: `codex/ui-polish`. Chi tiết nghiệm thu, phụ thuộc và kiểm tra: [plan.md](./plan.md).

## Chuẩn bị Git đã hoàn thành

- [x] Đẩy trạng thái `feature/new-idea` lên GitHub trước khi sửa giao diện.
- [x] Tạo nhánh `codex/ui-polish` từ `2876587` và đẩy lên GitHub.
- [x] Lập báo cáo hiện trạng của các màn hình đã kiểm tra.
- [x] Lập kế hoạch và checklist toàn dự án.

## A — Hiện trạng và mẫu thiết kế

- [ ] A1. Kiểm kê đầy đủ màn hình, modal, menu và các trạng thái.
- [ ] A2. Làm mẫu trang chủ, thư viện và sổ đánh giá.
- [ ] Checkpoint A: thống nhất thiết kế đại diện.

## B — Hệ thống giao diện và khung ứng dụng

- [ ] B1. Chuẩn hóa tokens, font, spacing và theme.
- [ ] B2. Chuẩn hóa nút, nhãn và tiêu đề.
- [ ] B3. Chuẩn hóa modal/drawer và focus.
- [ ] B4. Sắp xếp sidebar/navbar và responsive.
- [x] B5. Thống nhất thanh chọn lớp.
- [ ] Checkpoint B: kiểm tra các tab, breakpoint và modal mẫu.

## C — Trang chủ và quản lý lớp

- [x] C1. Thiết kế lại trang chủ theo thao tác dạy học.
- [ ] C2. Sắp xếp quản lý lớp/học sinh.
- [ ] C3. Chuẩn hóa quy trình nhập Excel.
- [ ] Checkpoint C: kiểm tra chọn lớp, vào tiết học và nhập dữ liệu mẫu.

## D — Bài giảng và trình chiếu

- [ ] D1. Thu gọn thư viện, bộ lọc và card bài giảng.
- [ ] D2. Tổ chức trình soạn bài giảng.
- [ ] D3. Chuẩn hóa nhập/so sánh PowerPoint.
- [ ] D4. Tối ưu slide, toolbar, ghi chú và nút PowerPoint.
- [ ] Checkpoint D: kiểm tra luồng bài giảng và trình chiếu.

## E — Tiết học, thời khóa biểu và đố vui

- [ ] E1. Sắp xếp danh sách và tạo tiết học.
- [ ] E2. Tổ chức bảng điều khiển tiết học.
- [ ] E3. Chuẩn hóa hoạt động, tham gia và tổng kết.
- [ ] E4. Làm rõ thời khóa biểu và hồ sơ giáo viên liên quan.
- [ ] E5. Chuẩn hóa ngân hàng câu hỏi và tạo quiz.
- [ ] E6. Tối ưu màn hình chơi/kết quả quiz.
- [ ] Checkpoint E: đối chiếu thời gian, trạng thái và sao trong luồng tiết học.

## F — Đánh giá, chỗ ngồi và thi đua

- [ ] F1. Tối ưu sổ đánh giá cho các khối và học kỳ.
- [ ] F2. Tổ chức sơ đồ phòng máy và vùng chưa xếp.
- [ ] F3. Tối ưu trình chiếu chỗ ngồi.
- [ ] F4. Chuẩn hóa điểm tốt và nội quy.
- [ ] F5. Chuẩn hóa cửa hàng, đường vào và đổi sao.
- [ ] Checkpoint F: kiểm tra bảng điểm, xếp chỗ, thưởng/đổi sao.

## G — Hoạt động, AI và quản trị

- [ ] G1. Làm gọn Đua vịt.
- [ ] G2. Làm gọn Vòng quay.
- [ ] G3. Chuẩn hóa đồng hồ.
- [ ] G4. Chuẩn hóa AI hub và các màn hình phân tích.
- [ ] G5. Chuẩn hóa AI tạo câu hỏi/tiến trình.
- [ ] G6. Tổ chức sao lưu và phục hồi.
- [ ] G7. Chuẩn hóa năm học và cài đặt.
- [ ] Checkpoint G: kiểm tra hoạt động, AI và quản trị trên dữ liệu mẫu.

## H — Hoàn thiện và nghiệm thu

- [ ] H1. Rà trạng thái, bàn phím và responsive.
- [ ] H2. Kiểm tra sáng/tối/máy chiếu và tương phản.
- [ ] H3. Nghiệm thu web/Electron và các hành động native.
- [ ] H4. Review, cập nhật DESIGN.md, ảnh trước/sau và bàn giao.
- [ ] Build/lint và các test phù hợp đạt tại checkpoint cuối.
- [ ] Bảy hành trình ở mục 5 của kế hoạch được nghiệm thu.
- [ ] Các mục chưa xác minh vì thiếu thiết bị/môi trường được ghi rõ.
- [ ] Các commit triển khai đã push lên `codex/ui-polish`.

## Nhật ký thực hiện

06/10/2026: hoàn thành tài liệu kế hoạch. Các nhiệm vụ triển khai A–H chưa bắt đầu.

06/10/2026 — đợt đầu: đã triển khai khung điều hướng, tokens/font, PageHeader, trang chủ, ClassContextBar và bố cục thư viện. B1/B2/B4/D1 đang thực hiện, chưa đóng nghiệm thu toàn bộ. A2 đã có bản chạy Home/Library, còn mẫu sổ đánh giá. Chi tiết kiểm tra và giới hạn: [báo cáo triển khai](../docs/ui-implementation-2026-10-06.md).
