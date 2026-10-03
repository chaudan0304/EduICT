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
Có `ensureUpdateBackup` (backup DB trước khi đổi version) và `restoreDatabaseFromBackup` ([updateGuard.cjs](file:///d:/DU_AN/EduICT/desktop/migration/updateGuard.cjs)). Mức kiểm chứng: UNIT. Update smoke thật (REAL INSTALL): cài 1.0.0 → chạy → build 1.0.1 (`EDUMASTER_BUILD_VERSION`) → cài chồng. Kết quả: ProductVersion 1.0.1, `updateGuard.status = backed-up (from 1.0.0)`, `version-state.json` đổi 1.0.0 → 1.0.1, hash `edumaster.sqlite` không đổi, log ghi `safety backup OK (...preupdate-1.0.0-to-1.0.1...)`. Lưu ý: sau lần chạy smoke, không còn thấy file backup trong thư mục user data (chưa điều tra nguyên nhân; có thể do bước dọn backup của smoke). Cần xác minh thêm. Chưa thử uploads/backups do người dùng tạo.

## 16. Tests
49 test mới ở [phase12-packaging.test.js](file:///d:/DU_AN/EduICT/tests/phase12-packaging.test.js). Test 21 của Phase 11 được cập nhật có chủ đích (`.env` desktop nằm ở `<data>/settings/`).

## 17. Regression
235/235 PASS (186 + 49).

## 18. Lint
0 lỗi, 203 warning (mốc 201, **+2**).

## 19. Build
Vite build PASS.

## 20. Packaging
`EduMaster.exe` 245,726,720 byte. `app.asar` 14,795,291 byte. `EduMaster-Setup.exe` 113,225,909 byte.

## 21. Installer Smoke Test
Bản đã cài chạy với `--user-data-dir` tạm. Thoát với code 0. `/health` trả `runtime: desktop`, `environment: production`, `database: ok`. `/api/classes` trả 200. Renderer có root. Thư mục data được tạo.

## 22. Clean Machine Test
NOT RUN — environment limitation (máy dev).

## 23. Security Scan
0 finding ở stage và asar (xem mục 9).

## 24. Technical Debt
- Icon là placeholder (TODO thay).
- Installer chưa ký số, SmartScreen sẽ cảnh báo.
- API key phải sửa tay trong file `.env`, chưa có UI.
- `alert()` và fetch trực tiếp vẫn còn.
- `restoreBackup` của Phase 9 vẫn xóa đường dẫn DB (không đổi).
- `@fontsource` làm bundle nặng hơn.

## 25. Known Limitations
Chỉ chạy trên Windows. Migration không tự dò thư mục dev của repo. `.env` legacy không được migrate. Lint +2 warning.

## 26. Files Changed
[pathService.js](file:///d:/DU_AN/EduICT/server/services/pathService.js), [pptxService.js](file:///d:/DU_AN/EduICT/server/pptxService.js), `powerpointLock.cjs`, các file trong `desktop/` (config, main, native, migration, scripts, electron-builder.json, package.json), `package.json` gốc, `.gitignore`, `index.html`, `src/index.css`, `src/main.jsx`, `OpenPowerPointButton.jsx`, `PresentationView.jsx`, test Phase 11 và Phase 12.

## 27. Final Status
**B.** Cần thêm update smoke, PowerPoint smoke từ bản đã cài và clean-machine để lên A.
