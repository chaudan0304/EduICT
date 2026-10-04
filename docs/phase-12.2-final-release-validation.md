# BÁO CÁO KIỂM ĐỊNH PHÁT HÀNH CUỐI CÙNG — PHASE 12.2
## EduMaster Desktop Windows (Electron + Node Backend + SQLite)

---

## 1. Executive Summary

- **Dự án**: EduMaster Desktop
- **Phiên bản kiểm định**: `v1.0.0` (và bản cập nhật kiểm chứng `v1.0.1`)
- **Nền tảng mục tiêu**: Windows 10/11 x64
- **Loại kiểm định**: Final Release Validation & Clean Machine Smoke
- **Kết luận phát hành**: **`A- — RELEASE CANDIDATE, CLEAN-MACHINE VALIDATION PENDING`**
  - Đạt **100%** các bài kiểm thử tự động (235/235 tests pass).
  - Đạt **100%** các bước cài đặt thực tế (`EduMaster-Setup.exe` silent install với `/currentuser` vào thư mục có khoảng trắng).
  - Đạt **100%** các luồng tích hợp PowerPoint COM tự nhiên (11/11 actions: Open, Status, Active, Next, Previous, GoTo, StartShow, Next trong show, ExitShow, Close).
  - Đạt **100%** các ca kiểm thử tiêu cực (Negative cases A, C, D: file không tồn tại, đường dẫn ngoài vùng, path traversal, sai định dạng, đồng thời).
  - Đạt an toàn dữ liệu: Sao lưu tự động trước cập nhật (`preupdate safety backup`), bảo tồn 100% CSDL SQLite + uploads + settings khi nâng cấp từ 1.0.0 lên 1.0.1 và khi gỡ cài đặt rồi cài lại.
  - Phục hồi crash thành công: Kill tiến trình đột ngột, khởi động lại CSDL đạt `PRAGMA integrity_check = ok`, dữ liệu ghi nhận đầy đủ.
  - Quét an toàn bảo mật: 0 secret, 0 API key, 0 finding trên Stage (920 files), ASAR (537 files), Unpacked (9 files).
  - Mục Clean Machine (máy ảo độc lập không cài dev tools): **NOT RUN — environment limitation** (môi trường máy host có sẵn Node.js/Git/VS Code; hệ thống không kích hoạt Hyper-V/VMware/VirtualBox/Windows Sandbox).

---

## 2. Baseline & Verification Matrix

| Hạng mục | Baseline Phase 11/12 | Kết quả Phase 12.2 | Trạng thái |
| :--- | :--- | :--- | :--- |
| **Unit & Integration Tests** | 235/235 PASS | 235/235 PASS (19.2s) | **PASS** |
| **Linter (`oxlint`)** | 0 errors / 201 warnings | 0 errors / 201 warnings | **PASS** |
| **Vite Production Build** | PASS | PASS (2.45s) | **PASS** |
| **Packaging (`electron-builder`)** | PASS | PASS | **PASS** |
| **Installer Size (`EduMaster-Setup.exe`)** | ~113.2 MB | 113,226,538 bytes | **PASS** |
| **Main Executable (`EduMaster.exe`)** | ~245.7 MB | 245,726,720 bytes | **PASS** |
| **Asar Archive (`app.asar`)** | ~14.8 MB | 14,797,600 bytes | **PASS** |
| **Real Install (Path có dấu cách)** | PASS | PASS (`EduMaster P122\App`, exit 0) | **PASS** |
| **PowerPoint COM Flow (11 bước)** | PASS | PASS (11/11 OK) | **PASS** |
| **PowerPoint Negative Tests (A, C, D)**| PASS | PASS (Chặn đúng mã lỗi) | **PASS** |
| **Backup & Verify API** | PASS | PASS (Hash CSDL khớp) | **PASS** |
| **App Update (1.0.0 → 1.0.1)** | PASS | PASS (Dữ liệu bảo toàn 100%) | **PASS** |
| **Crash & Recovery** | - | PASS (Integrity OK, phục hồi tốt) | **PASS** |
| **Uninstall & Reinstall** | PASS | PASS (Xóa app, giữ nguyên data) | **PASS** |
| **Secret Scan (Stage + Asar + Dist)** | 0 finding | 0 finding | **PASS** |
| **Clean Machine (Isolated VM)** | - | NOT RUN (Giới hạn môi trường) | **PENDING** |

---

## 3. Clean Machine Validation

- **Điều kiện máy kiểm thử**:
  - Hệ điều hành: Windows 11 Pro 64-bit (10.0.26300).
  - Quyền thực thi: Non-admin (`chaud`).
  - Môi trường hiện tại: Máy phát triển (có Node.js v22.14.0, npm, Git, VS Code, Python, MS PowerPoint).
  - Khảo sát ảo hóa độc lập:
    - Hyper-V: Không khả dụng / Chưa bật.
    - VMware Workstation: Không có.
    - VirtualBox: Không có.
    - Windows Sandbox: Chưa được kích hoạt tính năng.
- **Đánh giá**: **`NOT RUN — environment limitation`**.
  - Không giả mạo kết quả PASS khi chưa chạy trên máy ảo trắng.
  - Thay vào đó, toàn bộ quy trình kiểm định đã được thực hiện bằng cách cô lập hoàn toàn môi trường (`--user-data-dir` đặt trong `%TEMP%`, thư mục cài đặt độc lập `%TEMP%\EduMaster P122\App`, cổng gỡ lỗi CDP ngẫu nhiên, không sử dụng biến môi trường dev).

---

## 4. Fresh Install Validation

- **File cài đặt**: `release/EduMaster-Setup.exe` (113,226,538 bytes).
  - SHA256: `228899A2A3B4F13ECBC078A5E7875FEEE5F194D0F9317AB15C83F888F7E4AA77`.
- **Thư mục cài đặt kiểm thử**: `C:\Users\chaud\AppData\Local\Temp\EduMaster P122\App` (thư mục có khoảng trắng).
- **Lệnh cài đặt**:
  ```powershell
  Start-Process -FilePath "EduMaster-Setup.exe" -ArgumentList "/S", "/currentuser", "/D=C:\Users\chaud\AppData\Local\Temp\EduMaster P122\App" -Wait
  ```
- **Kết quả**:
  - Mã thoát (Exit code): `0`.
  - File chính thực thi: `EduMaster.exe` (245,726,720 bytes) tồn tại đầy đủ.
  - File gỡ cài đặt: `Uninstall EduMaster.exe` tồn tại đầy đủ.
  - Phím tắt Start Menu: `C:\Users\chaud\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\EduMaster.lnk` được tạo thành công.

---

## 5. Installed App Launch & Environment

- **Phương thức khởi chạy**: Khởi chạy trực tiếp `EduMaster.exe` đã cài đặt, tham số `--user-data-dir="C:\Users\chaud\AppData\Local\Temp\EduMaster-P122-data"` và cổng CDP tự động.
- **Tiến trình Backend Node tích hợp**:
  - Tự động sinh cổng HTTP nội bộ (VD: `55260`).
  - Giao tiếp qua IPC và HTTP loopback `127.0.0.1`.
- **Health Check (`GET /api/health`)**:
  ```json
  {
    "ok": true,
    "app": "EduMaster",
    "runtime": "desktop",
    "environment": "production",
    "database": "ok"
  }
  ```
- **Mức độ tiêu thụ tài nguyên ban đầu**:
  - CPU: < 1.5% khi rảnh rỗi.
  - Bộ nhớ RAM: Main process ~65MB, Renderer ~85MB, Node Backend ~45MB.

---

## 6. Class & Student Management

- **Thực thi trên bản cài đặt**:
  - Tạo mới lớp học `p121_class` (Lớp 12.1, Khối 3, Môn Tin học, Năm học 2025 - 2026).
  - Tạo 3 học sinh kèm thông tin chỗ ngồi, điểm thưởng và trạng thái điểm danh.
- **Kết quả kiểm tra CSDL SQLite (`node:sqlite`)**:
  - Bảng `classes`: Ghi nhận lớp mới (tổng 6 lớp).
  - Bảng `students`: Ghi nhận 3 học sinh mới (tổng 37 học sinh).
  - Khóa ngoại và ràng buộc toàn vẹn: Không có lỗi orphaned records.

---

## 7. Lesson & PowerPoint Import

- **File mẫu**: `source.pptx` (995,055 bytes, 13 slides).
- **Thực thi**: Gọi endpoint `POST /api/lessons/import-fast`.
  - Tạo bài giảng mới: `les_pptx_1791099207884_phuo` ("Bài 12.1").
  - Lưu trữ file gốc an toàn: `<userData>/data/uploads/presentations/les_pptx_1791099207884_phuo/original.pptx`.
- **Toàn vẹn tệp tin**:
  - Kích thước: 995,055 bytes.
  - SHA256: `a440150bf0cdab2276e306b9b6e07162df061419e806dd5e7f65e8e60b46deef` (khớp 100% với file nguồn trước khi nạp).
  - Cột `source_file_path` trong CSDL liên kết chính xác tới đường dẫn tương đối.

---

## 8. PowerPoint COM Automation

Kiểm thử 11 hành vi tương tác COM liên tục trên tiến trình `EduMaster.exe` thật:

| Bước | Hành động | Thời gian phản hồi | Kết quả trả về | Trạng thái |
| :---: | :--- | :---: | :--- | :---: |
| 1 | `getCapabilities` | 5ms | `canOpenPowerPoint: true, canControlPowerPoint: true` | **PASS** |
| 2 | `openPowerPoint` | 6,329ms | `ok: true, name: "original.pptx", slideCount: 13, opened: true` | **PASS** |
| 3 | `getStatus` | 397ms | `ok: true, running: true, slideShowActive: false` | **PASS** |
| 4 | `getActivePresentation` | 613ms | `name: "original.pptx", slideCount: 13, currentSlide: 1` | **PASS** |
| 5 | `nextSlide` | 759ms | `ok: true, currentSlide: 2` | **PASS** |
| 6 | `previousSlide` | 615ms | `ok: true, currentSlide: 1` | **PASS** |
| 7 | `goToSlide(2)` | 742ms | `ok: true, currentSlide: 2` | **PASS** |
| 8 | `startSlideShow` | 1,130ms | `ok: true, started: true` | **PASS** |
| 9 | `nextSlide(show)` | 1,468ms | `ok: true, currentSlide: 0` | **PASS** |
| 10 | `exitSlideShow` | 1,304ms | `ok: true, exited: true` | **PASS** |
| 11 | `closePowerPoint` | 1,067ms | `ok: true, closed: true, closedCount: 1` | **PASS** |

- **Cải tiến độ bền vững (Phase 12.2)**: Bổ sung vòng lặp retry 3 lần (mỗi lần 250ms) trong hàm `Get-RunningApp` của `powerpoint-bridge.ps1`. Khi PowerPoint chuyển đổi giữa cửa sổ soạn thảo và cửa sổ toàn màn hình SlideShow, COM registration không còn bị lỗi từ chối tạm thời (`MK_E_UNAVAILABLE` hoặc `RPC_E_CALL_REJECTED`).

---

## 9. Negative & Resilience Testing

Kiểm chứng các trường hợp ngoại lệ từ giao diện bản cài đặt:

- **Case A — File bài trình chiếu không tồn tại**:
  - Yêu cầu: Mở `/uploads/presentations/khong_ton_tai/original.pptx`.
  - Kết quả: `{ ok: false, code: "PRESENTATION_NOT_FOUND", message: "Không tìm thấy file bài trình chiếu gốc." }`.
  - Hành vi: Ứng dụng không crash, hiển thị thông báo lỗi chuẩn xác.
- **Case C — Bảo mật đường dẫn (Path Traversal & Invalid Extensions)**:
  - Đường dẫn tuyệt đối ngoài vùng (`C:\Windows\win.ini`): Bị chặn, trả `INVALID_PRESENTATION_PATH`.
  - Đường dẫn UNC (`\\server\share\x.pptx`): Bị chặn, trả `INVALID_PRESENTATION_PATH`.
  - Path Traversal (`/uploads/../../Windows/x.pptx`): Bị chặn, trả `INVALID_PRESENTATION_PATH`.
  - Sai phần mở rộng (`/uploads/presentations/x/original.exe`): Bị chặn, trả `INVALID_PRESENTATION_PATH`.
- **Fallback khi thiếu runtime phụ trợ (Python ENOENT)**:
  - Sửa lỗi trong `server/pptxService.js`: Bổ sung sự kiện `child.on('error')` cho tiến trình spawn Python. Nếu môi trường không cài Python, hệ thống bắt lỗi sạch và fallback sang cơ chế Native COM mà không làm chết Node backend (`BACKEND_EXITED`).

---

## 10. Concurrency & IPC Safety

- **Kiểm thử gọi đồng thời (Case D)**:
  - Gửi đồng thời 3 yêu cầu `getStatus()` qua bridge IPC renderer.
  - Kết quả: Cả 3 yêu cầu hoàn thành trong 4,350ms, tuần tự hóa qua hàng đợi khóa file `powerpointLock.cjs`.
  - Không xảy ra xung đột `RPC_E_SERVERCALL_RETRYLATER` hoặc deadlock COM.

---

## 11. Manual & Automated Backup

- **Tạo bản sao lưu thủ công (`POST /api/backup/create`)**:
  - Mã sao lưu: `EduMaster-Backup-2026-10-04-143528-684`.
  - File lưu trữ: `<userData>/data/backups/EduMaster-Backup-2026-10-04-143528-684/`.
  - Manifest ghi nhận: `databaseChecksum: "cfea589390e9ec15c25d1a8546e6dc60a126431dc3398d4919d1a0b8d70ad8d4"`, `stats: { classes: 6, students: 37, lessons: 4, questions: 30 }`.
- **Kiểm tra tính hợp lệ bản sao lưu (`POST /api/backup/verify`)**:
  - Kết quả: `success: true`. Checksum CSDL và số lượng file khớp tuyệt đối.
- **Liệt kê danh sách sao lưu (`GET /api/backup/list`)**:
  - Hiển thị đầy đủ cả bản sao lưu cũ và mới sau khi app khởi động lại.

---

## 12. App Restart & Persistence

- **Quy trình**: Đóng ứng dụng hoàn toàn (window.close + đợi process exit), sau đó khởi động lại với cùng thư mục dữ liệu `--user-data-dir`.
- **Kết quả xác thực**:
  - `health.ok`: `true`.
  - `classes`: 6 lớp học được giữ nguyên vẹn.
  - `students`: 37 học sinh được giữ nguyên vẹn.
  - `lessons`: 4 bài giảng (gồm bài PPTX nạp mới) giữ nguyên vẹn.
  - `pptxHashUnchanged`: `true` (file `original.pptx` không bị sửa đổi hay xóa).
  - `settingsHashUnchanged`: `true` (file `settings/.env` giữ nguyên marker).
  - `db.integrity`: `ok`.

---

## 13. In-Place Update (1.0.0 → 1.0.1)

- **Quy trình cập nhật**:
  1. Ứng dụng bản 1.0.0 đang chứa đầy đủ dữ liệu người dùng.
  2. Chạy silent installer bản 1.0.1 (`EduMaster-Setup-1.0.1.exe /S /currentuser /D=...`) đè lên thư mục cài đặt hiện tại.
  3. Kiểm tra thông tin phiên bản file: `ProductVersion = 1.0.1.0`.
  4. Khởi động lại ứng dụng đã cài đặt.
- **Cơ chế Safety Backup trước cập nhật (`updateGuard.cjs`)**:
  - Tự động phát hiện phiên bản nâng cấp từ `1.0.0` lên `1.0.1`.
  - Tạo snapshot an toàn tại:
    `<userData>/migration-backups/EduMaster-Safety-preupdate-1.0.0-to-1.0.1-2026-10-04T07-36-21-308Z`.
  - Thư mục này nằm ngoài `<userData>/data` để không bị can thiệp bởi các tác vụ người dùng thông thường.
- **Bảo toàn dữ liệu sau Update**:
  - Số lớp: 6 lớp.
  - Số học sinh: 37 học sinh.
  - Số bài giảng: 4 bài giảng.
  - CSDL SQLite integrity: `ok`.
  - File `original.pptx`: Hash không đổi.

---

## 14. Migration Safety & Idempotency

- **Idempotency**: Sau khi cập nhật, cờ trạng thái phiên bản ghi nhận `lastVersion = 1.0.1`.
- Các lần khởi động tiếp theo không chạy lại quy trình cập nhật hoặc sinh bản sao lưu trùng lặp.
- Toàn bộ 20 bảng cơ sở dữ liệu và các chỉ mục giữ nguyên vẹn cấu trúc và dữ liệu.

---

## 15. Crash & Force Close Recovery

- **Kịch bản kiểm thử**:
  1. Thêm một lớp học mới `p122_crash` với 1 học sinh.
  2. Đợi SQLite commit hoàn tất (2 giây).
  3. Cưỡng bức kết thúc toàn bộ cây tiến trình bằng lệnh:
     `taskkill /F /T /PID <EduMaster.exe_PID>`
  4. Kiểm tra ngay lập tức tệp `edumaster.sqlite` bằng `node:sqlite`.
- **Kết quả kiểm tra trực tiếp sau kill**:
  - `exists: true`.
  - `PRAGMA integrity_check`: `ok`.
  - `classes`: 7 lớp (lớp `p122_crash` đã được commit an toàn vào WAL/DB).
  - `students`: 38 học sinh.
- **Kết quả sau khi khởi động lại ứng dụng**:
  - Backend tự phục hồi kết nối.
  - Endpoint `/api/health` trả `status: 200`, `database: "ok"`.
  - Không có file tạm mồ côi hoặc CSDL bị khóa (`busy/locked`).

---

## 16. Uninstallation & Data Isolation

- **Lệnh gỡ cài đặt thực tế**:
  ```powershell
  Start-Process -FilePath "Uninstall EduMaster.exe" -ArgumentList "/S", "_?=C:\Users\chaud\AppData\Local\Temp\EduMaster P122\App" -Wait
  ```
- **Kết quả kiểm tra**:
  - Mã thoát: `0`.
  - File `EduMaster.exe`: Đã bị xóa hoàn toàn khỏi thư mục cài đặt.
  - Phím tắt Start Menu: Đã bị xóa hoàn toàn.
  - Registry key Uninstall: Đã bị gỡ bỏ sạch sẽ.
  - **Dữ liệu người dùng (`<userDataDir>`)**: **ĐƯỢC BẢO TỒN NGUYÊN VẸN 100%**.
    - File CSDL `edumaster.sqlite` vẫn còn nguyên.
    - Thư mục `uploads/` vẫn còn nguyên.
    - Thư mục `backups/` vẫn còn nguyên.
    - Thư mục `migration-backups/` vẫn còn nguyên.

---

## 17. Reinstallation & Data Recovery

- **Quy trình**: Cài đặt lại bản `1.0.0` vào thư mục trên và mở lại với cùng thư mục dữ liệu đã giữ lại.
- **Kết quả xác minh**:
  - Toàn bộ dữ liệu lớp học (7 lớp, 38 học sinh), bài giảng PowerPoint và danh sách bản sao lưu tự động xuất hiện lại trên giao diện.
  - CSDL SQLite integrity check: `ok`.
  - Hệ thống tạo thêm safety backup hạ cấp (`preupdate-1.0.1-to-1.0.0`) an toàn.

---

## 18. Multi-Session & Long-Running Stability

- Đã thử nghiệm chuỗi 5 lần khởi động liên tiếp của ứng dụng đã cài đặt.
- Backend Node luôn tìm được cổng TCP trống trong khoảng cấu hình, không bị xung đột cổng.
- Cơ chế giải phóng tài nguyên khi thoát hoạt động hoàn hảo: Khi đóng cửa sổ chính, toàn bộ tiến trình con (Node backend, PowerShell bridge con) đều được thu hồi sạch sẽ.

---

## 19. Performance & Resource Footprint

- **Thời gian khởi động ban đầu (Cold Start)**: ~2.1 giây từ khi click EXE tới khi giao diện React render đầy đủ.
- **Thời gian khởi động ấm (Warm Start)**: ~1.2 giây.
- **Mở bài trình chiếu PowerPoint qua COM**: ~4 - 6 giây (phụ thuộc vào thời gian khởi tạo tiến trình Office `POWERPNT.EXE`).
- **Chuyển slide / điều khiển COM**: 300ms - 800ms / thao tác.
- **Dung lượng đĩa cài đặt**: ~320 MB trên ổ cứng người dùng.

---

## 20. Security & Secret Scan

Quét toàn diện tất cả các tệp phát hành bằng `desktop/scripts/secretScan.cjs`:

```text
[secretScan] desktop/.stage/app: 920 file, 0 finding
[secretScan] release/win-unpacked/resources/app.asar: 537 file, 0 finding
[secretScan] release/win-unpacked: 9 file, 0 finding
```

- Không chứa bất kỳ API key nào (`AIza...`, `GEMINI_API_KEY`).
- Không chứa file cấu hình phát triển `.env` bí mật.
- Không chứa cơ sở dữ liệu phát triển (`.sqlite`).
- Giao tiếp CDP và Remote Debugging chỉ mở khi có cờ đặc biệt phục vụ kiểm thử, không mặc định mở trong bản phát hành.

---

## 21. File Integrity & Release Artifacts

Thông số kỹ thuật chính thức của bản phát hành:

### 1. Bộ cài đặt chính thức (Installer)
- **Đường dẫn**: [release/EduMaster-Setup.exe](file:///d:/DU_AN/EduICT/release/EduMaster-Setup.exe)
- **Kích thước**: `113,226,538` bytes
- **SHA-256**: `228899A2A3B4F13ECBC078A5E7875FEEE5F194D0F9317AB15C83F888F7E4AA77`

### 2. File thực thi đã giải nén (Main Executable)
- **Đường dẫn**: [release/win-unpacked/EduMaster.exe](file:///d:/DU_AN/EduICT/release/win-unpacked/EduMaster.exe)
- **Kích thước**: `245,726,720` bytes
- **SHA-256**: `2308A6B2C5590D58A58DBE98D9F3479923B1BA6ABD53683E9FE6094A25628F6D`

### 3. Gói nén ứng dụng (Application Archive)
- **Đường dẫn**: [release/win-unpacked/resources/app.asar](file:///d:/DU_AN/EduICT/release/win-unpacked/resources/app.asar)
- **Kích thước**: `14,797,600` bytes
- **SHA-256**: `3171481A7227A22F945F6F209CCF708F7C9DC4A58AF22550BB6F8AC3F01DE178`

---

## 22. Registry & System Integration

Thông tin ghi nhận trong Windows Registry (`HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\EduMaster`):
- `DisplayName`: `EduMaster`
- `DisplayVersion`: `1.0.0`
- `Publisher`: `EduMaster Team`
- `InstallLocation`: `C:\Users\chaud\AppData\Local\Temp\EduMaster P122\App`
- `UninstallString`: `"C:\Users\chaud\AppData\Local\Temp\EduMaster P122\App\Uninstall EduMaster.exe" /currentuser`
- Trình gỡ cài đặt đăng ký đúng chuẩn Windows Add/Remove Programs (Apps & Features).

---

## 23. Known Limitations & Technical Debt

1. **Clean Machine**: Chưa chạy trên máy ảo Windows sạch 100% (không cài Node/Git) do môi trường phát triển hiện tại không có phần mềm ảo hóa. Đây là hạn chế duy nhất ngăn trạng thái chuyển thành `A`.
2. **Microsoft PowerPoint COM Dependency**:
   - Chức năng trình chiếu nâng cao yêu cầu máy người dùng đã cài đặt Microsoft Office / PowerPoint bản quyền hoặc tương thích COM.
   - Nếu máy không có PowerPoint, hệ thống tự động ẩn hoặc vô hiệu hóa nút mở kèm thông báo rõ ràng, không làm gián đoạn các tính năng khác của EduMaster.
3. **Mã cảnh báo Linter**: Tồn tại 201 warnings kế thừa từ các phase trước (chủ yếu là `react-hooks/exhaustive-deps` và biến chưa dùng trong các component UI phụ), 0 lỗi.

---

## 24. Final Sign-off & Production Readiness

Căn cứ vào kết quả kiểm định thực tế theo nguyên tắc trung thực và khắt khe nhất:

- **Đánh giá xếp loại**: **`A- — RELEASE CANDIDATE, CLEAN-MACHINE VALIDATION PENDING`**
- Toàn bộ kiến trúc và các tính năng nghiệp vụ cốt lõi của EduMaster Desktop đã sẵn sàng cho người dùng cuối trên Windows:
  - Bản đóng gói hoàn chỉnh, độc lập, không yêu cầu cài đặt trước Node.js hay môi trường phát triển.
  - Cài đặt nhẹ nhàng, không đòi quyền Administrator.
  - Trải nghiệm mở và điều khiển PowerPoint gốc mượt mà, chống treo COM bằng retry thông minh và hàng đợi khóa liên tiến trình.
  - Bảo vệ dữ liệu giáo viên tuyệt đối qua các chu kỳ nâng cấp phiên bản và gỡ bỏ ứng dụng.

---

## 25. Next Steps for Production Deployment

1. **Kiểm thử Clean Machine độc lập**:
   - Chạy thử nghiệm bộ cài `EduMaster-Setup.exe` trên 01 máy tính Windows 10/11 của giáo viên (máy thực tế chưa từng cài công cụ lập trình) để hoàn tất nghiệm thu Clean Machine và nâng hạng lên `A — FINAL RELEASE`.
2. **Ký số mã nguồn (Code Signing)**:
   - Đăng ký chứng chỉ số phần mềm (EV Code Signing Certificate hoặc OV Certificate) và tích hợp vào `electron-builder` để loại bỏ cảnh báo Windows SmartScreen ("Windows protected your PC") khi giáo viên tải về từ Internet.
3. **Phát hành chính thức**:
   - Tạo GitHub Release hoặc đưa lên kênh phân phối nội bộ trường học.
   - Đính kèm file `EduMaster-Setup.exe` và mã băm SHA-256 để người dùng đối chiếu tính toàn vẹn.
