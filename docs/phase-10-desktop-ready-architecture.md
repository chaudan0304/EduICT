# Phase 10 — Desktop-Ready Architecture

> Mục tiêu: tách rõ **Web Layer — Application Layer — Service Layer — Native Layer** để sau này biến EduMaster thành ứng dụng Windows mà **không phải viết lại hệ thống**. Phase 10 *không* đóng gói `.exe`, *không* cài Electron/Tauri, *không* điều khiển PowerPoint.

## 1. Current Architecture

```text
React 19 (Vite)  ──fetch/apiClient──►  Node HTTP server (server.js / vite plugin)
                                          ├─ routes/*  (API)
                                          ├─ db/*      (node:sqlite)
                                          ├─ ai/*      (Gemini — server-side only)
                                          ├─ pptxService.js (PowerShell/COM/LibreOffice renderer — Phase 4)
                                          └─ services/ pathService, backupService, corsConfig, runtimeConfig
```

Frontend gọi API bằng URL **tương đối** (same-origin) → không phụ thuộc host/port.

## 2. Desktop-ready Architecture

```text
              EduMaster
        ┌───────┴────────┐
   React Frontend    Node Backend ── SQLite / Services
        │  DesktopCapabilityService   │ PathService · RuntimeConfig · /api/health
        │  FileDialogService          │
        │  PresentationService (mock) │
        │  DialogService · StorageService · AppLifecycleService
        └──────── Future Native Adapter (registerNativeAdapter) ── Desktop Bridge ── PowerPoint
```

React chỉ biết **capability** (`canOpenFile`, `canControlPowerPoint`, …), không biết Electron/Tauri/COM/Windows API.

## 3. Runtime Modes

Hai trục độc lập, đọc bởi [`server/services/runtimeConfig.js`](../server/services/runtimeConfig.js):

| Trục | Giá trị | Nguồn |
|---|---|---|
| `environment` | `development` \| `production` \| `test` | `EDUICT_ENV` → `NODE_ENV` → `NODE_TEST_CONTEXT` → mặc định `development` |
| `runtime` | `web` \| `desktop` | `EDUICT_RUNTIME` (mặc định `web`) |

Biến môi trường liên quan: `EDUICT_APP_ROOT`, `EDUICT_DATA_DIR`, `EDUICT_DB_PATH`, `EDUICT_API_BASE_URL` (rỗng = same-origin), `PORT`, `EDUICT_HOST`.
`getRuntimeConfig()` **không** trả secret và **không** trả đường dẫn tuyệt đối.

## 4. Service Boundaries

| Layer | Thành phần | Ghi chú |
|---|---|---|
| Web (frontend) | `apiClient`, `StorageService`, `DialogService`, `FileDialogService`, `AppLifecycleService`, `DesktopCapabilityService`, `PresentationService` | Không import `fs`/`child_process`/Electron/Tauri |
| Application | `server/routes/*` | Không đổi |
| Service (backend) | `pathService`, `runtimeConfig`, `backupService`, `geminiService`, `pptxService` | Đường dẫn chỉ qua `pathService` |
| Native (tương lai) | Adapter đăng ký bằng `DesktopCapabilityService.registerNativeAdapter()` | Phase 11 |

## 5. Path Architecture

`pathService` là nguồn duy nhất: `getAppDataDir`, `getDatabasePath`, `getUploadsDir`, `getPresentationsDir`, `getBackupDir`, `getTempDir`, `getLogsDir`, `getSettingsDir`, `getPathsSummary`.

Thay đổi Phase 10: `getUploadsDir()` giờ nằm dưới **data dir** (trước đây dưới app root). Mặc định data dir = app root nên web mode **không đổi hành vi**; Desktop chỉ cần đặt `EDUICT_DATA_DIR` sang thư mục user data.

```text
Application dir (read-only)      User Data dir (EDUICT_DATA_DIR)
 ├─ executable                    ├─ edumaster.sqlite
 ├─ dist/ (frontend assets)       ├─ uploads/ (presentations, temp, cache)
 └─ server/ (server assets)       ├─ backups/
                                  ├─ logs/
                                  └─ settings/
```

`backupService` dùng `pathService.getBackupDir()` (đã bỏ logic trùng lặp).

## 6. Storage Architecture

`StorageService` giữ nguyên: adapter trên Web Storage (chuỗi thô, không tự JSON). Nó **không** được mở rộng thành API file `read/write/copy/move` vì sẽ là abstraction giả (file I/O hiện nằm hoàn toàn ở backend qua `pathService`). Desktop có thể thay implementation bằng file-backed storage mà không đổi call site.

## 7. Dialog Architecture

- `DialogService`: `confirm`, `alert`, `notify`, **`error`**, **`prompt`** (mới; Web = hộp thoại trình duyệt, an toàn khi không có `window`).
- `FileDialogService` (mới): `openFile`, `saveFile`, `selectFolder`. Web = `<input type="file">` / `<a download>`; `selectFolder` = `null`. Nếu có native adapter thì ủy quyền cho adapter. Các modal import hiện có **không bị đổi**.

## 8. App Lifecycle

`AppLifecycleService`: `reloadApplication` (giữ nguyên) + `initialize`, `shutdown`, `beforeExit(cb)`, `onResume(cb)`, `onSuspend(cb)`, `onShutdown(cb)`. Web chỉ dùng `visibilitychange`/`beforeunload`; không giả lập shutdown native. Backend: `server.js` tắt êm khi nhận `SIGINT`/`SIGTERM`; `GET /api/health` → `{ ok, app, runtime, environment, database }`.

## 9. Presentation Boundary

`original.pptx` là **nguồn sự thật**; PNG/PDF chỉ là bản dẫn xuất. `PresentationService` (`openPresentation`, `closePresentation`, `showPresentation`, `getPresentationStatus`) hiện là **mock**: trả `{ ok:false, code:'DESKTOP_BRIDGE_UNAVAILABLE' }`, không gọi PowerPoint. Nếu native adapter có `bridge` đúng hợp đồng thì ủy quyền.

## 10. Future Desktop Bridge

Hợp đồng tại [`src/services/desktopBridgeContract.js`](../src/services/desktopBridgeContract.js):

```text
openPowerPoint(filePath)  closePowerPoint()  getStatus()  getActivePresentation()
nextSlide()  previousSlide()  goToSlide(index)  startSlideShow()  exitSlideShow()
```

`webDesktopBridge` là mock ném lỗi có cấu trúc; `implementsDesktopBridge(obj)` kiểm tra tuân thủ. Phase 11 hiện thực hợp đồng này bằng Electron **hoặc** Tauri — contract không phụ thuộc framework nào.

## 11. Security Boundary

- Gemini: `React → Node API → geminiService → Gemini`. `GEMINI_API_KEY` không bao giờ vào frontend (test quét `src/` và `dist/`).
- `/api/health` và `runtimeConfig` không lộ secret/đường dẫn tuyệt đối; `/api/status` đã bỏ trường `dbPath`.
- `.gitignore`: `.env*`, `dist`, `*.sqlite*`, `*.db*`, `*.wal`, `*.shm`, `uploads/**`, `backups/`, `settings/`.
- Giữ nguyên bảo vệ Phase 9: Backup ID validation, chống path traversal ở `/uploads/`.
- Server mặc định bind `127.0.0.1`.

## 12. What Phase 10 Does NOT Implement

Electron/Tauri/Neutralino, `.exe`/installer, điều khiển PowerPoint (COM/PowerShell mới), Registry/Windows API, đổi DB/schema, ZIP backup, Backup UI, chuyển cloud, rewrite bất kỳ module nào.

## 13. Technical Debt

| Mức | Mục |
|---|---|
| MEDIUM | `pptxService.js` dùng `powershell.exe`/COM trực tiếp (Phase 4, Windows-only) — Phase 11 cần chuyển sau Desktop Bridge hoặc giữ như renderer server-side |
| LOW | ~60 lệnh `alert()` thô trong component/`excelImport` (legacy) → dần chuyển sang `DialogService` |
| LOW | ~8 module gọi `fetch` trực tiếp thay vì `apiClient` (URL tương đối nên vẫn đúng) |
| LOW | `index.css` nạp Google Fonts từ CDN → cần bundle font local để chạy offline |
| LOW | `server.js` chưa dùng `getRuntimeConfig` cho banner khởi động; `static-file-handler` tính `UPLOADS_DIR` lúc import |
| LOW | Chưa có Backup Control UI. Khuyến nghị: UI **web** dùng chung (gọi `/api/backup/*`) cho cả hai runtime; Desktop chỉ bổ sung `FileDialogService.selectFolder/saveFile` để xuất/nhập bản sao lưu |

## 14. Phase 11 Prerequisites

Đã đủ điều kiện bắt đầu **Phase 11 — Desktop Native Layer + Desktop Bridge**:

- [x] Runtime config + `EDUICT_RUNTIME=desktop`
- [x] `PathService` single source + user-data tách khỏi app dir
- [x] Capability layer + `registerNativeAdapter`
- [x] FileDialog / Dialog / Lifecycle abstraction
- [x] Desktop Bridge contract + `PresentationService`
- [x] `/api/health` + graceful shutdown để shell chờ server sẵn sàng
- [ ] Phase 11 quyết định **Electron hay Tauri** (Phase 10 không chọn) và cách đóng gói Node/`node:sqlite`
