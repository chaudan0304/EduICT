# Khôi phục bộ cài NSIS 1.2.0

Ngày 06/10/2026, nhánh `codex/ui-polish`.

## Chẩn đoán

Lỗi trước đây nằm ở bước khởi chạy compiler NSIS, trước khi xử lý script cài đặt: electron-builder báo `spawn UNKNOWN`; chạy trực tiếp `makensis.exe /VERSION` báo `Illegal System DLL Relocation`. Source ứng dụng, stage và gói Windows đã tạo thành công trước bước này.

Sau khi người dùng cấp quyền và môi trường chuyển sang thực thi đầy đủ, chạy lại **cùng binary** trả về `v3.04`. Cùng cấu hình/công cụ trong cache tạo bộ cài thành công với exit code 0. Bằng chứng cho thấy lỗi phụ thuộc môi trường thực thi; không cần thay source, cấu hình NSIS hoặc compiler để tạo bản này. Chưa xác định được DLL cụ thể gây lỗi trong môi trường cũ.

## Lệnh dựng lại từ gói ứng dụng 1.2.0

Chạy trong `D:\DU_AN\EduICT\desktop`. Cấu hình scratch là bản sao `desktop/electron-builder.json`, chỉ đổi app sang `.stage/app-1.2.0` và output sang `../release/build-1.2.0`.

```powershell
$env:ELECTRON_BUILDER_NSIS_DIR='C:\Users\chaud\AppData\Local\electron-builder\Cache\nsis\nsis-3.0.4.1-nsis-3.0.4.1'
$env:ELECTRON_BUILDER_NSIS_RESOURCES_DIR='C:\Users\chaud\AppData\Local\electron-builder\Cache\nsis\nsis-resources-3.4.1-nsis-resources-3.4.1'
$env:ELECTRON_BUILDER_7ZIP_PATH='C:\Users\chaud\AppData\Local\electron-builder\Cache\7zip@1.0.0\7zip-win-x64-a34pt\bin\7za.exe'
node node_modules/electron-builder/cli.js --config ../scratch/electron-builder-1.2.0.json --win nsis --prepackaged ../release/build-1.2.0/win-unpacked
```

Các đường dẫn trên thuộc máy build này. Khi dựng từ source mới, dùng luồng stage/build thông thường trước, không tái sử dụng `win-unpacked` cũ. Nếu lỗi khởi chạy compiler tái diễn, kiểm tra `/VERSION` trước để phân biệt lỗi môi trường với lỗi script; không sửa header PE hoặc bỏ cơ chế bảo vệ Windows.

## Kết quả

- Bộ cài: `release/EduMaster-Setup-1.2.0.exe`, **113,098,210 bytes**.
- SHA256: `D04C58886398D9F736A2ACF6CFFD520F6EF52D828BED64D8D48F2EB741C14FB9`.
- Setup FileVersion/ProductVersion: **1.2.0 / 1.2.0**, chữ ký `NotSigned`.
- Đã trích payload từ chính EXE, không chạy bộ cài: ASAR khớp byte với gói ứng dụng; package trong ASAR là 1.2.0; 9 file native/main/IPC/preload/PowerShell và 84 file frontend khớp byte với source/dist.
- Secret scan payload đầy đủ: ASAR 544 file, unpacked 4 file, 0 finding.
- Lần scan đầu thiếu hai file server vì chỉ trích phần native để đối chiếu; đã trích nốt toàn bộ unpacked và scan lại thành công. Không phải file thiếu trong bộ cài.
- 7-Zip báo dữ liệu phía sau archive do đọc archive nhúng trong EXE NSIS; trích payload thành công.

Không thêm/chạy test tự động, không cài ứng dụng hoặc điều khiển PowerPoint thật. Cài/nâng cấp, native docking, hiệu ứng, trigger/media và DPI/màn hình vẫn cần nghiệm thu trên máy người dùng. Bản 1.1.1 được giữ để dùng lại khi cần.
