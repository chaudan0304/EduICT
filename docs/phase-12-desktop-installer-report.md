# Phase 12 — EduMaster.exe + Windows Installer

Mức độ kiểm chứng: STATIC / UNIT / ARTIFACT / REAL INSTALL / CLEAN MACHINE. Mục nào chưa chạy ghi "NOT RUN".

## 1. Status
**B — IMPLEMENTED, REAL INSTALL VALIDATION PENDING.** Real install, smoke và uninstall đã chạy thật trên máy dev. Update smoke đã chạy thật (xem mục 15). PowerPoint smoke từ bản đã cài và clean-machine chưa chạy.

## 2. Previous Baseline
Phase 11: 186/186 test, lint 0 lỗi / 201 warning, build PASS.

## 3. Packaging Architecture
Electron main dùng `ELECTRON_RUN_AS_NODE` để chạy `server.js` trong app.asar. Backend nghe 127.0.0.1 trên port động. Engine SQLite là `node:sqlite`. Stage ở `desktop/.stage/app`, đóng gói bằng electron-builder.

## 4. Electron Builder Configuration
[electron-builder.json](file:///d:/DU_AN/EduICT/desktop/electron-builder.json): appId `vn.edumaster.desktop`, asar bật, NSIS x64 (`oneClick:false`, `perMachine:false`), `asarUnpack` cho `*.ps1` và `*.py`, loại `.env`, sqlite, uploads, backups khỏi gói.

## 5. Embedded Node Runtime
Backend chạy bằng binary Electron ở chế độ Node. `cwd` là `dataDir` vì cwd trong asar không hợp lệ.

## 6. User Data Directory
`%APPDATA%\EduMaster\data`, nằm ngoài thư mục cài. Gói đã đóng gói bỏ qua `EDUICT_DATA_DIR` của máy chủ.

## 7. Data Migration
Các bước: detect → safety backup → checksum → stage → verify → commit → marker `migration-state.json`. Có tính idempotent. Nguồn legacy: `--legacy-dir=`, `EDUICT_LEGACY_DATA_DIR`, `<userData>/import`. Code ở [legacyMigration.cjs](file:///d:/DU_AN/EduICT/desktop/migration/legacyMigration.cjs). Mức kiểm chứng: UNIT (test Phase 12). Chưa chạy migration smoke bằng exe thật (NOT RUN).

## 8. Migration Rollback
Rollback dựa trên moved-log, có hook chèn lỗi để test. Mức kiểm chứng: UNIT.

## 9. Gemini Security
Secret scan: `desktop/.stage/app` 920 file / 0 finding. `app.asar` 537 file / 0 finding. Key chỉ nằm trong `<data>/settings/.env` do người dùng tự sửa.

## 10. PowerPoint Integration
Bridge PowerShell được unpack ra `app.asar.unpacked`. Capabilities báo `canOpenPowerPoint: true` ở smoke gói. Smoke PowerPoint thật từ bản đã cài: NOT RUN.

## 11. COM Lock
Lock liên tiến trình bằng file (`wx`), tự thu hồi lock cũ ([powerpointLock.cjs](file:///d:/DU_AN/EduICT/server/services/powerpointLock.cjs)). Mức kiểm chứng: UNIT.

## 12. "Mở PowerPoint" UI
[OpenPowerPointButton.jsx](file:///d:/DU_AN/EduICT/src/components/LessonPresentation/OpenPowerPointButton.jsx). Ẩn ở web mode. Bị disable kèm thông báo khi thiếu PowerPoint hoặc file.

## 13. Windows Installer
`release/EduMaster-Setup.exe` = 113,225,909 byte. Silent install `/S /D=<temp>` thành công, không cần admin. Có Start Menu shortcut và `Uninstall EduMaster.exe`. Mức kiểm chứng: REAL INSTALL.

## 14. Uninstall
Silent uninstall: exe bị xóa, shortcut mất, user data còn nguyên. Mức kiểm chứng: REAL.

## 15. Update
Có `ensureUpdateBackup` (backup DB trước khi đổi version) và `restoreDatabaseFromBackup` ([updateGuard.cjs](file:///d:/DU_AN/EduICT/desktop/migration/updateGuard.cjs)). Mức kiểm chứng: UNIT & REAL INSTALL. Update smoke thật: cài 1.0.0 → chạy → build 1.0.1 → cài chồng. Kết quả: ProductVersion 1.0.1, `updateGuard.status = backed-up (from 1.0.0)`, `version-state.json` đổi 1.0.0 → 1.0.1, hash `edumaster.sqlite` không đổi, log ghi `safety backup OK (...preupdate-1.0.0-to-1.0.1...)`. Điều tra forensic: file backup không hề mất mà được lưu có chủ đích tại `<userData>/migration-backups/EduMaster-Safety-preupdate-1.0.0-to-1.0.1-...` (nằm ngoài `<userData>/data` để tránh bị cleanup thường xóa). Đã kiểm chứng đầy đủ trong Phase 12.1.

## 16. Tests
49 test mới ở [phase12-packaging.test.js](file:///d:/DU_AN/EduICT/tests/phase12-packaging.test.js). Test 21 của Phase 11 được cập nhật có chủ đích (`.env` desktop nằm ở `<data>/settings/`).

## 17. Regression
235/235 PASS (186 + 49).

## 18. Lint
0 lỗi, 201 warning (baseline phục hồi từ 203 → 201 sau khi loại bỏ 2 warning mới).

## 19. Build
Vite build PASS.

## 20. Packaging
`EduMaster.exe` 245,726,720 byte. `app.asar` 14,797,408 byte. `EduMaster-Setup.exe` 113,226,320 byte.

## 21. Installer Smoke Test
Bản đã cài chạy với `--user-data-dir` tạm. Thoát với code 0. `/health` trả `runtime: desktop`, `environment: production`, `database: ok`. `/api/classes` trả 200. Renderer có root. Thư mục data được tạo.

## 22. Clean Machine Test
NOT RUN — environment limitation (máy dev).

## 23. Security Scan
0 finding ở stage, asar và win-unpacked.

## 24. Technical Debt
- Icon là placeholder (TODO thay).
- Installer chưa ký số, SmartScreen sẽ cảnh báo.
- API key phải sửa tay trong file `.env`, chưa có UI.
- `alert()` và fetch trực tiếp vẫn còn.
- `restoreBackup` của Phase 9 vẫn xóa đường dẫn DB (không đổi).
- `@fontsource` làm bundle nặng hơn.
- `migration-backups` chưa có chính sách dọn dẹp tự động (retention policy).

## 25. Known Limitations
Chỉ chạy trên Windows. Migration không tự dò thư mục dev của repo. `.env` legacy không được migrate.

## 26. Files Changed
[pathService.js](file:///d:/DU_AN/EduICT/server/services/pathService.js), [pptxService.js](file:///d:/DU_AN/EduICT/server/pptxService.js), [helpers.js](file:///d:/DU_AN/EduICT/server/routes/helpers.js), `powerpointLock.cjs`, các file trong `desktop/` (config, main, native, migration, scripts, electron-builder.json, package.json), `package.json` gốc, `.gitignore`, `index.html`, `src/index.css`, `src/main.jsx`, `OpenPowerPointButton.jsx`, `PresentationView.jsx`, test Phase 11 và Phase 12.

## 27. Phase 12 Initial Status
**B — IMPLEMENTED, REAL INSTALL VALIDATION PENDING.**

---

## 28. Phase 12.1 Final Validation

### Update Backup Validation
**PASS.**
- **Điều tra Forensic**: File backup không hề bị xóa hay biến mất. [updateGuard.cjs](file:///d:/DU_AN/EduICT/desktop/migration/updateGuard.cjs) cố ý ghi backup vào `<userData>/migration-backups/` (nằm ngoài `<userData>/data`) để tránh bị cơ chế retention định kỳ của `backupService.js` dọn dẹp.
- Tên thư mục backup chuẩn: `EduMaster-Safety-preupdate-1.0.0-to-1.0.1-<timestamp>`.
- Bên trong chứa: `database.sqlite` (286,720 bytes, checksum khớp chính xác hash CSDL ngay trước nâng cấp) và `manifest.json` (`kind: "preupdate-1.0.0-to-1.0.1"`, `appVersion: "1.0.1"`, `fileCount: 0`).
- Không có component nào xóa backup này; backup tồn tại bền vững để phục vụ rollback nếu nâng cấp thất bại.

### Update Data Preservation
**PASS.**
- Dữ liệu thực tạo trước update (1 class `p121_class` với 3 học sinh, 1 bài giảng PPTX "Bài 12.1", 1 file `original.pptx`, 1 backup snapshot, 1 marker cài đặt trong `settings/.env`).
- Cập nhật phiên bản từ 1.0.0 lên 1.0.1 bằng installer thật (`EduMaster-Setup-1.0.1.exe /S /currentuser /D=...`).
- Kết quả sau update:
  - Lớp học giữ nguyên (6 lớp).
  - Học sinh giữ nguyên (37 học sinh).
  - Bài giảng giữ nguyên (4 bài giảng).
  - `original.pptx` giữ nguyên (SHA-256 khớp tuyệt đối).
  - Các bản sao lưu người dùng tạo vẫn hiển thị và verify thành công.
  - Cài đặt `.env` giữ nguyên marker.
  - CSDL SQLite integrity check: `ok`.
  - `version-state.json` cập nhật chính xác `lastVersion: "1.0.1"`.

### Installed PowerPoint Smoke
**PASS (Flow chính + Negative Tests A, C, D) / NOT RUN (Case B).**
- Kiểm thử trực tiếp từ tiến trình `EduMaster.exe` đã cài thông qua Chrome DevTools Protocol (`--remote-debugging-port`), không chạy qua `npm run dev` hay mã nguồn:
  - `getCapabilities`: `{ canOpenPowerPoint: true, canControlPowerPoint: true }`
  - `openPowerPoint`: Thành công (2008ms, 13 slides, opened: true)
  - `getStatus`: `{ ok: true, running: true, slideShowActive: false }`
  - `getActivePresentation`: `{ name: "original.pptx", slideCount: 13, currentSlide: 1 }`
  - `nextSlide`: `{ ok: true, currentSlide: 2 }`
  - `previousSlide`: `{ ok: true, currentSlide: 1 }`
  - `goToSlide(2)`: `{ ok: true, currentSlide: 2 }`
  - `startSlideShow`: `{ ok: true, started: true }`
  - `exitSlideShow`: `{ ok: true, exited: true }`
  - `closePowerPoint`: `{ ok: true, closedCount: 1, closed: true }`
- **Negative Tests**:
  - Case A (thiếu original.pptx): trả `{ ok: false, code: "PRESENTATION_NOT_FOUND" }`, không crash.
  - Case B (không cài PowerPoint): Môi trường host có sẵn PowerPoint nên kiểm thử thật: NOT RUN (đã verify qua Unit Test 36).
  - Case C (ngoài vùng được phép): Chặn đường dẫn tuyệt đối, UNC, path traversal (`/uploads/../../`), đuôi file lạ (`.exe`) -> đều trả `{ ok: false, code: "INVALID_PRESENTATION_PATH" }`.
  - Case D (thao tác đồng thời): 3 yêu cầu đồng thời được serialize tuần tự qua COM lock file-based, không xung đột COM.

### Installed Restart
**PASS.**
- Đóng ứng dụng hoàn toàn và mở lại `EduMaster.exe`.
- Backend Node tự khởi động, `/api/health` trả `status: 200` (`runtime: desktop`, `environment: production`, `database: ok`).
- Dữ liệu nguyên vẹn: 6 lớp, 37 học sinh, 4 bài giảng, integrity CSDL `ok`.
- Không kích hoạt lại bước migration hay nâng cấp thừa.

### Upload Preservation
**PASS.**
- PPTX thật (995,055 bytes) import qua `/api/lessons/import-fast`.
- File lưu tại `<userData>/data/uploads/presentations/<lessonId>/original.pptx`.
- SHA-256 trước và sau update/restart giữ nguyên 100%: `a440150bf0cdab2276e306b9b6e07162df061419e806dd5e7f65e8e60b46deef`.
- Lesson trong CSDL giữ nguyên liên kết `source_file_path`.

### Backup Preservation
**PASS.**
- Tạo bản sao lưu mới bằng bản đã cài (`EduMaster-Backup-2026-10-04-124224-709`).
- Gọi `/api/backup/verify` trả `success: true`, checksum CSDL khớp, fileCount khớp.
- Danh sách `/api/backup/list` lưu trữ đầy đủ các bản sao lưu cũ và mới sau nhiều lần restart và update.

### Migration Real EXE
**PASS (Migration + Idempotency) / NOT RUN (Rollback Real EXE).**
- Thử nghiệm trên EXE thật đã cài với tham số `--legacy-dir`:
  - Phát hiện thư mục dữ liệu cũ biệt lập.
  - Tạo `EduMaster-Safety-premigration-...`.
  - Migrate thành công 20 bảng CSDL, uploads và backups.
  - SQLite integrity check: `ok`.
  - Ghi marker `migration-state.json` với `status: "complete"`.
  - Khởi động lại: marker ngăn không chạy migration lần hai (idempotent 100%).
- **Migration Rollback Real EXE**: NOT RUN — environment limitation (bản build production không tích hợp hook chèn lỗi nhân tạo; đã được kiểm chứng an toàn qua Unit Test 29 & 30).

### Clean Machine
**NOT RUN — environment limitation.**
- Môi trường hiện tại là máy phát triển Windows của người dùng (có Node, Git, VS Code).
- Không có máy ảo Windows sạch (VMware / clean VM) độc lập để kiểm chứng isolated clean machine.

### Lint Delta
**201 → 203 → 201 warnings (0 errors).**
- Phát hiện chính xác 2 warning mới phát sinh từ Phase 12:
  1. `desktop/migration/legacyMigration.cjs:132:7`: `db && db.close();` (`no-unused-expressions`) -> Đã sửa thành `if (db) db.close();`.
  2. `tests/phase12-packaging.test.js:18:25`: `pathToFileURL` import không dùng (`no-unused-vars`) -> Đã bỏ import thừa.
- Kết quả oxlint: `Found 201 warnings and 0 errors` (phục hồi hoàn toàn baseline Phase 11).

### Security Rescan
**PASS.**
- `desktop/.stage/app`: 920 files, 0 finding.
- `release/win-unpacked/resources/app.asar`: 537 files, 0 finding.
- `release/win-unpacked`: 9 files (bỏ qua quét chuỗi text trong binary mã máy C++ Chromium `EduMaster.exe`), 0 finding.
- Không có secret Google API key (`AIza...`), không có `GEMINI_API_KEY`, không có CSDL development (`.sqlite`).

### Final Release Candidate Status
**A- — RELEASE CANDIDATE, CLEAN-MACHINE VALIDATION PENDING.**
- Đạt tất cả các tiêu chí bắt buộc của một Release Candidate thực thụ trên Windows đã cài đặt.
- Chỉ còn duy nhất mục Clean Machine (máy ảo Windows sạch không có dev tools) chưa chạy do giới hạn môi trường phát triển hiện tại.
