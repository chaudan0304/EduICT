# EduMaster 1.4.1 — Nhận mã nhúng OneDrive không có em=2

## Nguyên nhân và sửa lỗi

Ảnh người dùng cho thấy iframe có URL dạng `https://1drv.ms/p/c/<16-hex>/I<token>`, không có query `em=2`. Bộ kiểm tra cũ chỉ chấp nhận link 1drv.ms PowerPoint khi query đó bằng 2, nên trả lỗi ngay trước khi mở trình chiếu.

Shared validator thêm nhận diện đường dẫn trên. Không thay URL Microsoft hoặc fetch redirect; giữ kiểm tra HTTPS, host chính xác, không credentials/port lạ, giới hạn độ dài, không chèn raw HTML. Validator dùng chung form, batch parser, API và viewer nên URL lưu lại không bị chặn ở bước kế tiếp. Không đưa CID/token thật của người dùng vào Git hoặc log.

Microsoft hướng dẫn sao chép mã iframe qua PowerPoint for the web → File → Share → Embed. Dạng token mới được nhận diện từ bằng chứng ảnh người dùng; không coi tài liệu Microsoft là đặc tả mọi biến thể của short URL.

## Bộ cài

- `release/EduMaster-Setup-1.4.1.exe`, 113109939 byte, NSIS build thành công, chưa ký số.
- SHA256: `322E11DB0FDE81EA90A415859681236508A8EFFE0CF5B53C440399E25C3F3A40`.
- Root/desktop/stage/ASAR/setup ProductVersion: 1.4.1; app EXE: 1.4.1.0.
- ASAR lấy từ chính setup khớp byte với bản đóng gói; 154 file runtime khớp stage.
- Secret scan stage 907 file, ASAR 550 file, unpacked 5 file: không finding. Bảy file nguồn/version/docs được stage trước commit cũng không finding.

## Kiểm tra và giới hạn

- `node --check`, oxlint shared validator: thành công, không cảnh báo.
- `npm run build`: 1953 module, thành công; giữ cảnh báo chunk >500KB và SQLite experimental.
- Build dùng snapshot read-only + VACUUM INTO ở `scratch/powerpoint-embed-fix-build-1.4.1.sqlite`.
- Web đã restart để nạp shared validator trên backend. DB web thật vẫn 88 bài, 1117 slide, 0 URL Online.
- EXE đang chạy trên máy người dùng ở `D:\App_DaCaiDat\EduMaster\EduMaster.exe` vẫn là 1.4.0.0 lúc kiểm tra. Chưa chạy bộ cài mới hoặc đóng app người dùng. Cần đóng app cũ, cài 1.4.1 và dán lại nguyên iframe.
- Không thêm/chạy test. Chưa mở bài Microsoft thật hoặc xác nhận quyền xem/hiệu ứng; build/payload không chứng minh trình chiếu thực tế.
- Không thay dependency; các rủi ro audit đã ghi trong bản 1.3.0 còn nguyên.

## Nguồn

- https://support.microsoft.com/en-us/powerpoint/embed-a-presentation-in-a-web-page-or-blog
