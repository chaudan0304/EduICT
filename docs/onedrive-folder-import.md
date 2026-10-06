# Nhập thư mục OneDrive cá nhân

## Luồng

**Chọn thư mục OneDrive → Kết nối Microsoft → mở thư mục → chọn file → xem tên bài/khối/bài đã có → xác nhận tạo Embed và nhập**.

EduICT đọc metadata qua Microsoft Graph, không tải PPTX hoặc render ảnh. Mỗi đợt chọn tối đa 200 file. Đọc file trực tiếp trong thư mục đã mở; muốn nhập thư mục con thì mở thư mục con. Các trang danh sách được đọc tiếp đến tối đa 5.000 mục/30 trang; UI báo khi danh sách bị giới hạn. Nhận .pptx, .ppt, .ppsx, .pps, .pptm, .ppsm; việc phát định dạng/hiệu ứng thuộc Microsoft.

Tạo `type=embed` bằng Graph chỉ hỗ trợ OneDrive cá nhân. Không dùng URL preview ngắn hạn hoặc link sharing thường làm link trình chiếu lâu dài. Giữ nguyên mã/URL Microsoft trả về và kiểm tra qua shared validator.

## Đăng ký một lần trên Microsoft

1. Mở https://entra.microsoft.com/ → **Entra ID → App registrations → New registration**. Tên ứng dụng: **EduICT OneDrive**.
2. Supported account types: **Personal Microsoft accounts only** (hoặc lựa chọn có bao gồm personal Microsoft accounts). Chọn **Register**.
3. Trong **Authentication → Advanced settings**, đặt **Allow public client flows = Yes**, rồi Save. Luồng device code không cần redirect URI/client secret.
4. Trong **API permissions → Add a permission → Microsoft Graph → Delegated permissions**, thêm **Files.ReadWrite**. Đây là quyền cần để Graph tạo link Embed, cũng cho phép đọc/ghi file của người dùng; EduICT chỉ đọc metadata và tạo link cho các file đã xác nhận. Không dùng Application permissions hoặc Files.ReadWrite.All.
5. Trong Overview, sao chép **Application (client) ID**. Dán vào hộp thoại OneDrive của EduICT; không cung cấp client secret hoặc mật khẩu.
6. Chọn Kết nối: EduICT hiện mã đăng nhập tạm. Mở trang Microsoft từ hộp thoại, nhập đúng mã này, đăng nhập tài khoản cá nhân và đồng ý quyền ứng dụng. Chỉ dùng mã do phiên EduICT của bạn vừa tạo.

Microsoft hiện yêu cầu tài khoản Azure có subscription đang hoạt động, tenant và quyền ít nhất Application Developer để đăng ký ứng dụng. Nếu tài khoản không mở được App registrations, cần người có quyền đăng ký trong tenant thực hiện bước 1–5. Không cần gửi mật khẩu cho Codex/EduICT.

Client ID là thông tin cấu hình công khai, được lưu ở `settings/onedrive.json` ngoài thư mục gói cài. Có thể cấu hình `EDUICT_ONEDRIVE_CLIENT_ID` trên máy chủ. Không đóng gói ID thật hoặc dữ liệu OneDrive vào mã nguồn.

## API và trạng thái

- `GET /api/onedrive/status`: trạng thái kết nối, client ID cấu hình, tên drive và đợt nhập đang chạy.
- `POST /api/onedrive/connect { clientId }`: trả userCode, verificationUrl, expiresAt, pollAfterMs; cookie phiên HttpOnly. Không trả device_code/token.
- `POST /api/onedrive/poll {}`: pending/pollAfterMs hoặc connected; tuân thủ interval/slow_down từ Microsoft.
- `POST /api/onedrive/disconnect {}`: kết thúc phiên EduICT, hủy job đang chạy. Không thu hồi quyền/link trên Microsoft.
- `GET /api/onedrive/folder?id=…`: folders/files/driveId/truncated; server giữ danh sách file đã đọc trong phiên.
- `POST /api/onedrive/imports { confirmEmbed: true, items: [{ file_id, title, grade, lesson_id?, expected_url?, expected_updated_at?, replace_existing? }] }`: trả job. Bài mới dùng UUID do server tạo cho file trong phiên.
- `GET /api/onedrive/imports/:id`: tiến độ/result/errors; `POST` cùng URL yêu cầu dừng.
- Import chạy hai file đồng thời, tạo/reuse link Embed, rồi dùng giao dịch batch để lưu toàn bộ bài một lần. Nếu có lỗi, chưa lưu bài nào trong đợt; link đã tạo trên Microsoft có thể vẫn tồn tại. Dừng job ngăn bước lưu thư viện, không xóa link đã tạo.
- Lưu drive/item ID cùng bài để lần sau chọn đúng bài đã nhập. Gắn vào bài cũ giữ tên, khối, slide, ghi chú, lịch dạy. Đổi link thủ công gỡ association OneDrive. Nhân bản bài không sao chép association; backup giữ association của bài gốc.

## Ranh giới bảo mật

OAuth device authorization theo endpoint consumers cố định. Token opaque chỉ trong bộ nhớ backend đến hết phiên/tối đa khoảng một giờ; không offline_access, không refresh token, không log/DB/localStorage/backup token. Cookie ngẫu nhiên theo origin, HttpOnly/SameSite=Strict, Secure trên HTTPS. Phiên tách theo browser; tối đa 25 phiên, tối đa 10.000 metadata file/phiên.

API OneDrive chỉ nhận POST JSON từ chính origin; không thay CORS toàn ứng dụng. Desktop/localhost dùng HTTP loopback. Web ngoài localhost phải có HTTPS và `EDUICT_ONEDRIVE_PUBLIC_ORIGIN=https://…`; proxy/CORS hiện tại cần cấu hình origin đó trong `EDUICT_CORS_ORIGIN`. Không dùng trên HTTP LAN.

Graph chỉ gọi HTTPS graph.microsoft.com/v1.0/me/drive hoặc /drives/{drive hiện tại} để theo các trang danh sách, không theo redirect, không fetch nội dung/download URL. Phản hồi Microsoft có timeout/giới hạn kích thước; lỗi OAuth/Graph không đưa raw response, token hoặc stack trace ra UI. Tạo Embed anonymous cần xác nhận rõ vì người có link có thể xem bài; giữ inherited permissions.

## Nghiệm thu

Build/lint/source/payload trước khi giao. Không thêm/chạy test khi chưa được yêu cầu. Cần đăng ký client ID và đăng nhập Microsoft thật để xác nhận account, quyền, danh sách folder, createLink và hiệu ứng thực tế. Hướng dẫn cấu hình không thay thế nghiệm thu này.

## Nguồn Microsoft

- https://learn.microsoft.com/en-us/graph/api/driveitem-list-children?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/graph/api/driveitem-createlink?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-device-code
- https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app
- https://learn.microsoft.com/en-us/entra/identity-platform/scenario-desktop-app-configuration
