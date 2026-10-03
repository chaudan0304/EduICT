# PHASE 10 — DESKTOP-READY ARCHITECTURE REPORT

## 1. Status
**A — COMPLETE.** Không rewrite; chỉ thêm abstraction/boundary tối thiểu. Không cài Electron/Tauri, không điều khiển PowerPoint.

## 2. Baseline
Trước Phase 10: 149/149 tests PASS, lint 0 errors / 201 warnings, build PASS.

## 3. Audit Result
| Phân loại | Kết quả |
|---|---|
| SAFE | `pathService` là nguồn đường dẫn duy nhất; frontend không có `localhost`/`fs`/`window.require`/Electron; Gemini chỉ server-side; backup dùng `pathService`; server bind `127.0.0.1` |
| NEEDS ABSTRACTION (đã xử lý) | uploads nằm dưới app root (MEDIUM); `backupService` trùng logic `getBackupDir` (LOW); thiếu `/api/health`, RuntimeConfig, capability/file-dialog/presentation/lifecycle (LOW); `/api/status` lộ `dbPath` tuyệt đối (LOW) |
| DESKTOP-ONLY | `pptxService.js` (`powershell.exe`/COM, renderer Phase 4) — giữ nguyên |
| WEB-ONLY | `vite-sqlite-plugin` (dev API) |
| TECHNICAL DEBT | xem §18 |

Không phát hiện BLOCKER/HIGH.

## 4. Files Changed
Sửa: `server/services/pathService.js`, `server/services/backupService.js`, `server/routes/index.js`, `server.js`, `src/services/AppLifecycleService.js`, `src/services/DialogService.js`, `.gitignore`.
Mới: `server/services/runtimeConfig.js`, `src/services/DesktopCapabilityService.js`, `FileDialogService.js`, `PresentationService.js`, `desktopBridgeContract.js`, `tests/phase10-desktop-ready.test.js`, 2 tài liệu docs Phase 10.
UI/component: **không đổi**.

## 5. Runtime Architecture
`runtimeConfig`: `environment` (development/production/test) × `runtime` (web/desktop); `apiBaseUrl` (rỗng = same-origin); `paths` dạng tương đối. Không chứa secret.

## 6. Service Abstractions
`DesktopCapabilityService` (web mặc định toàn false; `registerNativeAdapter` cho Phase 11), `FileDialogService`, `DialogService` (+`error`,`prompt`), `AppLifecycleService` (+`initialize/shutdown/beforeExit/onResume/onSuspend`), `PresentationService`.

## 7. Path Architecture
Thêm `getSettingsDir`, `getPathsSummary`; `getUploadsDir` → data dir (mặc định = app root ⇒ web không đổi). Application dir và User Data dir tách bằng `EDUICT_DATA_DIR`.

## 8. Storage Architecture
`StorageService` giữ nguyên (đã đáp ứng; không thêm API file giả).

## 9. Backup Compatibility
Format (`manifest.json`, `database.sqlite`, `files/`) và 5 endpoint không đổi; `backupService` dùng `pathService.getBackupDir()`. Test Phase 9 và test 9 của Phase 10 PASS.

## 10. Gemini Compatibility
Không đổi. Test 7 quét `src/` + `dist/` + không import `@google/genai` ở frontend.

## 11. PowerPoint Boundary
`original.pptx` vẫn là nguồn sự thật. `PresentationService` là mock, không có COM/PowerShell/child_process.

## 12. Desktop Bridge Contract
9 phương thức trong `desktopBridgeContract.js` + `webDesktopBridge` (mock) + `implementsDesktopBridge`.

## 13. Security
`/api/status` không còn `dbPath`; `/api/health` và `runtimeConfig` không lộ secret/đường dẫn tuyệt đối; `.gitignore` bổ sung `*.db*`, `*.wal`, `*.shm`, `backups/`, `settings/`; bảo vệ traversal/backup ID giữ nguyên.

## 14. Tests
`tests/phase10-desktop-ready.test.js`: 15 test (RuntimeConfig, web detect, capability false, không Electron/Tauri, PathService, DB path, secret scan, no hard-code URL/native, backup, health, Presentation mock, bridge contract, security, dialog/lifecycle an toàn, hiện diện test Phase 1–9) — **Phase 10: PASS**.

## 15. Regression
`npm test`: **164/164 PASS** (149 cũ + 15 mới). **Regression: PASS**.

## 16. Lint
0 errors; warning giữ baseline 201 (sau khi bỏ import thừa trong test).

## 17. Build
`vite build`: **PASS**.

## 18. Technical Debt
- MEDIUM: `pptxService` gắn PowerShell/COM (Windows-only).
- LOW: ~60 `alert()` thô legacy; ~8 module `fetch` trực tiếp thay vì `apiClient`; Google Fonts qua CDN (offline); `server.js` chưa dùng `getRuntimeConfig` cho banner; chưa có Backup Control UI (khuyến nghị UI web dùng chung + `FileDialogService` cho xuất/nhập ở Desktop).

## 19. Phase 11 Readiness
Sẵn sàng bắt đầu **Desktop Native Layer + Desktop Bridge**; Phase 11 tự chọn Electron hoặc Tauri. Còn mở: cách đóng gói Node/`node:sqlite`.

## 20. Final Status
```text
Phase 10: PASS
Regression: PASS
Lint: PASS
Build: PASS
Security: PASS
Rating: A — COMPLETE
```
