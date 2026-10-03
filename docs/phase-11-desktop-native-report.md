# PHASE 11 — DESKTOP NATIVE LAYER + DESKTOP BRIDGE

## 1. Status
**A — COMPLETE.** Desktop Shell (Electron) bao quanh EduMaster hiện tại; Web mode giữ nguyên; không rewrite.

## 2. Baseline
Phase 10: 164/164 tests, lint 0 errors / 201 warnings, build PASS.

## 3. Electron vs Tauri Evaluation
Tổng điểm Electron 60 / Tauri 48 (bảng 14 tiêu chí trong `phase-11-desktop-native-architecture.md` §1). Bằng chứng đo thực tế: Electron 44.5.1 nhúng Node 24.21.0 chạy được `node:sqlite`; máy dev không có MSVC `link.exe` (rủi ro cho Tauri); Tauri cần Node sidecar ~80MB.

## 4. Framework Decision
**Electron.** Quyết định dựa trên kiến trúc (`node:sqlite` + `server.js` + PowerShell/COM), không dựa benchmark chung. Electron cô lập trong `desktop/package.json` (devDependency); `package.json` gốc không phụ thuộc Electron. Đánh đổi: RAM/khởi động kém Tauri. Contract Phase 10 không đổi nên vẫn thay được bằng Tauri.

## 5. Files Changed
Sửa: `server.js` (IPC shutdown/disconnect), `server/services/pathService.js` (tạo data dir cho DB mặc định), `server/ai/envLoader.js` (không cho `.env` ghi đè biến hạ tầng), `src/main.jsx`, `src/services/DialogService.js`, `FileDialogService.js`, `PresentationService.js`, `package.json` (4 npm script).
Mới: `desktop/**` (main, preload, native, config, smoke), `src/services/nativeAdapterBootstrap.js`, `tests/phase11-desktop-native.test.js`, 2 tài liệu Phase 11.
Không sửa: React UI/components, schema, routes, Backup, Gemini, `pptxService`, test cũ.

## 6. Desktop Shell
`desktop/main/main.cjs`: single-instance, cửa sổ ẩn đến `ready-to-show`, chặn điều hướng/popup lạ, chặn permission, lifecycle powerMonitor. Chế độ `--smoke` tự kiểm tra rồi thoát.

## 7. Node Backend Lifecycle
Cổng trống động trên `127.0.0.1` → spawn `server.js` bằng Node nhúng của Electron (`ELECTRON_RUN_AS_NODE`) → poll `GET /api/health` (timeout 30s; phát hiện backend thoát sớm) → mở cửa sổ. Lỗi → thông báo thân thiện, chi tiết trong `<data>/logs/desktop.log`. Tắt: IPC `{type:'shutdown'}` → HTTP + SQLite đóng → exit 0 (SIGTERM trên Windows là kill cưỡng bức nên chỉ dùng dự phòng); quá 8s mới kill; mất IPC ⇒ backend tự thoát.

## 8. Native Adapter
`installNativeAdapter()` đăng ký qua `DesktopCapabilityService.registerNativeAdapter()` (no-op trên web). Capability thật: `isDesktop, platform:windows, canOpenFile/SelectFile/SelectFolder/ShowNativeDialog:true, canOpenPowerPoint/ControlPowerPoint = PowerPoint có cài, canAccessNativeFilesystem:false`.

## 9. File Dialog
Native `openFile` (trả `File` như web), `saveFile`, `selectFolder` — chỉ thao tác trên path do **người dùng chọn** trong hộp thoại; giới hạn 300MB; filter được sanitize. Web không đổi.

## 10. Dialog Service
Thêm `confirmAsync/alertAsync/errorAsync/promptAsync` (native khi có adapter, ngược lại web). API đồng bộ cũ giữ nguyên. `prompt` không có native trong Electron → fallback web (ghi nhận giới hạn).

## 11. PowerPoint Bridge
Hiện thực đủ 9 phương thức contract (`powerpointBridge.cjs` + `powerpoint-bridge.ps1`). COM chỉ ở Native Layer; script cố định (`ValidateSet`), args mảng, `shell:false`; file gốc mở read-only; `Close` chỉ đóng bài trong vùng presentations; lời gọi tuần tự hóa; lỗi chuẩn `{ok:false, code, message}` không lộ stack. Path validation chặn traversal/UNC/ADS/sai đuôi/symlink/ngoài vùng. Preview renderer (`pptxService`) không đổi và tách luồng với bridge.

## 12. Presentation Service
Ủy quyền cho bridge qua adapter, có cổng capability; thêm `nextSlide/previousSlide/goToSlide/exitSlideShow/getActivePresentation`. Không có adapter/capability → `DESKTOP_BRIDGE_UNAVAILABLE`, không gọi bridge.

## 13. Data Directory
`EDUICT_DATA_DIR=<userData>/data` (`%APPDATA%\EduMaster\data`); DB, uploads, backups, logs nằm đây — không trong thư mục ứng dụng. Test và smoke xác nhận DB ở user data.

## 14. Backup
Không đổi. Create/list/verify/delete PASS trong desktop runtime (test 18 + smoke); backup nằm trong `<data>/backups`.

## 15. Gemini
Không đổi, vẫn server-side. Không có key trong `src/`, `dist/`, `desktop/`, preload (test 14). Log che mẫu `AIza…`.

## 16. Offline
Không thêm phụ thuộc mạng; backend/DB/backup/PowerPoint cục bộ. Gemini lỗi → có kiểm soát (test xác nhận backend vẫn sống). Font Google CDN vẫn là nợ cũ.

## 17. Security
Electron: `contextIsolation`, `sandbox`, `nodeIntegration:false`, `webSecurity`, `webviewTag:false` (khóa bằng test); preload tối thiểu; IPC whitelist + kiểm tra origin sender; URL ngoài chỉ `https:`; permission allowlist. **Phát hiện HIGH — đã sửa:** `.env` chứa `EDUICT_DB_PATH` trỏ DB thật và `envLoader` ghi đè môi trường ⇒ phá cô lập dữ liệu của shell. Đã chặn `.env` ghi đè biến hạ tầng của launcher (test 21; web giữ hành vi cũ).
**Lưu ý trung thực:** lần smoke đầu tiên (trước khi sửa lỗi trên) backend đã mở DB thật tại `EDUICT_DB_PATH` ở chế độ app bình thường và chạy các truy vấn đọc + tạo/xóa một backup (backup nằm ở thư mục tạm). Tôi không phát hiện thay đổi dữ liệu; nên giữ bản sao lưu `EduICT_PRIVATE_DATA_BACKUP` như thường lệ. Mọi lần chạy sau đều dùng dữ liệu tạm.

## 18. Tests
`tests/phase11-desktop-native.test.js`: **22/22 PASS** (framework config, web không cần native, desktop runtime, đăng ký adapter, file dialog, dialog, lifecycle, contract, path validation, PowerPoint unavailable, PresentationService↔bridge, không native API trong React, không shell tùy ý, secret scan, health, timeout, user data, backup, graceful shutdown, security, envLoader, regression).

## 19. Regression
`npm test`: **186/186 PASS** (164 cũ + 22 mới); không xóa/sửa test cũ. **PASS.**

## 20. Lint
0 errors; 201 warnings (đúng baseline). **PASS.**

## 21. Build
`vite build` PASS. Desktop dev build: không cần bước riêng (Electron chạy trực tiếp từ nguồn); installer thuộc Phase 12.

## 22. Desktop Smoke Test
**PASS** (Electron thật, dữ liệu tạm): backend lên → `/api/health` ok, `runtime:"desktop"` → cửa sổ mở → UI render (root có nội dung) → `/api/classes`, `/api/lessons` 200 → SQLite đọc/ghi (DB tạo trong user data) → backup create/verify/list/delete OK → renderer không có `require/process` → đóng app → backend `graceful=true, code=0` → **không còn process backend/Electron**.

## 23. PowerPoint Smoke Test
**PASS 13/13** (Microsoft PowerPoint thật, bản sao tạm của một `original.pptx`, 13 slide): từ chối path ngoài vùng; open; getStatus; getActivePresentation; nextSlide; previousSlide; goToSlide(2); goToSlide(9999) bị từ chối; startSlideShow; slideShowActive; exitSlideShow; closePowerPoint; PowerPoint thoát sạch (không còn `POWERPNT`).

## 24. Technical Debt
- MEDIUM: chưa gắn nút "Mở PowerPoint" vào UI; renderer PPTX (COM ẩn) và bridge dùng chung `PowerPoint.Application` (chưa khóa chéo).
- MEDIUM: `.env` (khóa Gemini) vẫn đọc từ thư mục ứng dụng; chưa migration DB hiện có sang user data (dùng Backup/Restore hoặc `EDUICT_DATA_DIR`).
- LOW: `prompt` không native; ~60 `alert()` cũ; fetch trực tiếp ở ~8 module; font CDN; chỉ Windows.

## 25. Phase 12 Readiness
Sẵn sàng cho Phase 12 (installer/đóng gói): electron-builder/NSIS, `asar` + backend/`node:sqlite`, `.env`/settings vào user data, migration dữ liệu, code signing, auto-update, UI "Mở PowerPoint", font local, khóa chéo COM.

## 26. Final Status
```text
Phase 11: PASS
Framework: Electron
Tests: 186/186 PASS (22/22 Phase 11)
Regression: PASS
Lint: PASS (0 errors, 201 warnings = baseline)
Build: PASS
Desktop Smoke: PASS
PowerPoint Smoke: PASS
Security: PASS
Rating: A
```
