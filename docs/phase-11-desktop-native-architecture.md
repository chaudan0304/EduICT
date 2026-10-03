# Phase 11 — Desktop Native Layer + Desktop Bridge: Architecture

> Desktop Shell **bao quanh** EduMaster hiện tại (React + Node + SQLite). Không rewrite, không project desktop tách rời, Web mode giữ nguyên.

## 1. Electron vs Tauri evaluation

Căn cứ đo trên **repo + máy thực tế** (không dựa benchmark chung):

| Sự thật từ repo/máy | Ảnh hưởng |
|---|---|
| Backend dùng `node:sqlite` (cần Node ≥ 22.5), server là `server.js` HTTP thuần | Cần một runtime Node đi kèm app |
| Máy mục tiêu của giáo viên không có sẵn Node | Phải *đóng gói* Node cùng app |
| Đã chạy thử: Electron 44.5.1 nhúng **Node 24.21.0**, `require('node:sqlite')` chạy được (`ELECTRON_RUN_AS_NODE=1`) | Electron tự mang Node có `node:sqlite` |
| `pptxService.js` + bridge cần PowerShell/COM | Cả hai framework đều spawn được `powershell.exe` |
| Máy dev: Rust 1.95 có, nhưng **không thấy MSVC `link.exe`**; WebView2 154 có | Tauri build chưa chắc chạy ngay |

| Tiêu chí | Electron | Tauri | Lý do (EduMaster) |
|---|---:|---:|---|
| Node.js integration | 5 | 2 | Electron = Node sẵn; Tauri phải kèm Node *sidecar* riêng |
| `node:sqlite` | 5 | 3 | Đã chứng minh trong Electron; Tauri phải tự đóng gói Node ≥22.5 (~80MB) |
| Existing server architecture | 5 | 3 | `server.js` chạy nguyên vẹn qua `ELECTRON_RUN_AS_NODE`; Tauri cần sidecar + cấu hình |
| PowerShell/COM | 4 | 4 | Hai bên đều spawn được; Electron dùng Node `child_process` quen thuộc |
| Filesystem | 4 | 4 | Hộp thoại native do main xử lý, renderer không có fs |
| Native dialogs | 5 | 4 | `dialog.*` có sẵn |
| Process management | 5 | 3 | Node `spawn` + kênh IPC (shutdown êm trên Windows); Tauri sidecar kém linh hoạt |
| Packaging | 4 | 3 | electron-builder/forge trưởng thành; Tauri cần MSVC toolchain + Rust build |
| Startup | 3 | 5 | Tauri nhanh hơn |
| RAM | 2 | 5 | Tauri nhẹ hơn (Chromium tách riêng vs WebView2 dùng chung) |
| Security | 4 | 5 | Cả hai cần cấu hình đúng; Electron cần contextIsolation/sandbox (đã ép bằng test) |
| Complexity | 4 | 2 | Tauri thêm tầng Rust + sidecar |
| Migration effort | 5 | 2 | Gần như không đổi code hiện có |
| EduMaster suitability | 5 | 3 | Một runtime JS duy nhất, ít bề mặt lỗi |
| **Tổng** | **60** | **48** | |

## 2. Framework decision

```text
RECOMMENDATION: Electron
```

Lý do quyết định là **kiến trúc**, không phải thói quen: backend cần `node:sqlite` ⇒ cần Node ≥ 22.5 đi kèm; Electron *đã là* Node 24 + Chromium trong một gói và đã được chứng minh chạy `node:sqlite` + backend hiện tại. Tauri làm được nhưng buộc thêm Node sidecar + Rust/MSVC mà không đem lại tính năng nào EduMaster đang cần. Đánh đổi chấp nhận: RAM/khởi động kém hơn Tauri.

Electron được **cô lập** trong `desktop/package.json` (devDependency). `package.json` gốc **không** phụ thuộc Electron ⇒ Web mode & CI web không cần Electron. Contract Phase 10 không đổi nên vẫn có thể thay bằng Tauri sau này.

## 3. Desktop architecture

```text
desktop/
├── package.json            (electron — chỉ ở đây)
├── config/desktopConfig.cjs   cấu hình + WEB_PREFERENCES khóa bảo mật + buildBackendEnv
├── main/
│   ├── main.cjs            vòng đời app, cửa sổ, smoke mode
│   ├── backendProcess.cjs  cổng động + spawn server.js + health + tắt êm
│   ├── healthCheck.cjs     poll GET /api/health (timeout)
│   ├── ipc.cjs             handler IPC tối thiểu (DI, test được)
│   ├── security.cjs        kiểm tra sender / điều hướng / URL / filter
│   └── logger.cjs          <data>/logs/desktop.log (che API key)
├── preload/preload.cjs     window.eduMaster.desktop (contextBridge)
├── native/
│   ├── powerpointBridge.cjs   hiện thực Desktop Bridge Contract
│   ├── powerpoint-bridge.ps1  COM, hành động cố định
│   ├── pathValidation.cjs     kiểm tra đường dẫn bài giảng
│   └── bridgeMethods.cjs      9 phương thức + mã lỗi
└── smoke/powerpoint-smoke.cjs   smoke thật (chạy tay)

src/services/nativeAdapterBootstrap.js   đăng ký adapter vào DesktopCapabilityService (no-op trên web)
```

```text
React → PresentationService → DesktopCapabilityService → [native adapter] → window.eduMaster.desktop
      → (IPC, kiểm tra sender) → main → powerpointBridge → powershell.exe (script cố định) → PowerPoint
```

## 4. Startup lifecycle

`app.whenReady` → tạo logger/bridge → chọn **cổng trống động** trên `127.0.0.1` → spawn `server.js` (`EDUICT_RUNTIME=desktop`, `EDUICT_DATA_DIR=<userData>/data`) → poll **`GET /api/health`** (Phase 10, không tạo cơ chế thứ hai) tới `ok && database==='ok'` → đăng ký IPC → tạo cửa sổ → nạp `http://127.0.0.1:<port>`. **Cửa sổ chỉ mở sau khi backend sẵn sàng.** Timeout 30s (`BACKEND_START_TIMEOUT`) hoặc backend thoát sớm (`BACKEND_EXITED`) → hộp thoại: *"Không thể khởi động máy chủ EduMaster. Vui lòng thử lại hoặc kiểm tra log."* (không stack trace; chi tiết vào log).

## 5. Shutdown lifecycle

Đóng cửa sổ → `window-all-closed` → `before-quit` (chặn một lần) → gửi lifecycle `beforeExit`/`shutdown` cho renderer → `backend.stop()` → thoát.

> **Lệch có chủ đích so với yêu cầu "SIGTERM":** trên Windows `child.kill('SIGTERM')` là **kill cưỡng bức** (handler không chạy ⇒ SQLite không được đóng sạch). Vì vậy shell gửi `{type:'shutdown'}` qua **kênh IPC của child process**; `server.js` đóng HTTP server + SQLite rồi `exit(0)`. SIGTERM chỉ là dự phòng (POSIX). Quá 8s mới kill. Nếu shell chết, kênh IPC đóng ⇒ backend tự thoát (không process mồ côi).

## 6. Node backend lifecycle

`server.js` hiện có, đổi tối thiểu: lắng nghe `message {type:'shutdown'}` + `disconnect`. Chạy bằng `process.execPath` + `ELECTRON_RUN_AS_NODE=1` (Node 24 nhúng ⇒ máy người dùng không cần cài Node). Bind `127.0.0.1` (không `0.0.0.0`).

## 7. Native adapter

`installNativeAdapter()` (gọi trong `main.jsx`) đọc `window.eduMaster.desktop`, kiểm tra đủ hình dạng (kể cả `implementsDesktopBridge`), rồi `registerNativeAdapter()`. Không có API ⇒ trả `false`, Web hoạt động như cũ. `getCapabilities()` trả `isDesktop:true, platform:'windows', canOpenPowerPoint/canControlPowerPoint` = PowerPoint có cài (probe registry `PowerPoint.Application`). `canAccessNativeFilesystem:false` (nguyên tắc tối thiểu quyền).

## 8. File dialogs

`FileDialogService` giữ API Phase 10. Native: `openFile` (người dùng chọn → main đọc → trả `{name,size,type,data}` → chuyển thành `File` như bản web; giới hạn 300MB), `saveFile` (main hiện hộp thoại và ghi vào nơi người dùng chọn), `selectFolder`. Renderer **không** có API đọc/ghi path tùy ý. Message dialog: `DialogService.confirmAsync/alertAsync/errorAsync` dùng `dialog.showMessageBox`; `prompt` không có native trong Electron ⇒ fallback web.

## 9. Desktop bridge

`powerpointBridge.cjs` hiện thực đủ 9 phương thức của `desktopBridgeContract.js`. Mọi kết quả: thành công `{ok:true,…}` hoặc lỗi `{ok:false, code, message}`; không throw ra UI. Lời gọi **tuần tự hóa** (COM không an toàn song song). Mã lỗi: `DESKTOP_BRIDGE_UNAVAILABLE, POWERPOINT_NOT_INSTALLED, POWERPOINT_UNAVAILABLE, POWERPOINT_START_FAILED, POWERPOINT_BUSY, POWERPOINT_NOT_RUNNING, POWERPOINT_CONTROL_FAILED, PRESENTATION_NOT_FOUND, INVALID_PRESENTATION_PATH, INVALID_SLIDE_INDEX, DESKTOP_PERMISSION_DENIED, FILE_TOO_LARGE`.

## 10. PowerPoint bridge

- **Hai luồng tách biệt:** *Preview* = `original.pptx → pptxService (renderer hiện có, không đổi) → PDF/PNG`; *Mở PowerPoint* = `original.pptx → PresentationService → adapter → bridge → PowerPoint`. Không bao giờ PNG/PDF → PowerPoint.
- File gốc mở **read-only** (`Presentations.Open(path, ReadOnly=true)`), không bị sửa.
- `Close` chỉ đóng bài nằm trong `<data>/uploads/presentations` (không đóng file khác của người dùng) và chỉ `Quit` PowerPoint nếu do đó không còn bài nào.
- **Path security** (`pathValidation.cjs`): chỉ nhận `/uploads/presentations/<id>/original.pptx` hoặc đường dẫn tuyệt đối *nằm trong* `presentations`; chặn traversal (kể cả mã hóa %2e), UNC/device, ADS (`:`), sai đuôi (chỉ `.pptx`/`.ppt`), không tồn tại, không phải file thường, symlink thoát vùng (so sánh `realpath`).
- **Không có shell tùy ý:** script `.ps1` cố định với `ValidateSet` hành động; Node truyền tham số qua mảng args, `shell:false`; không `-Command`/`Invoke-Expression`; thông điệp tiếng Việt nằm ở Node (script chỉ trả mã).

## 11. Security model (Electron)

`contextIsolation:true`, `nodeIntegration:false`, `sandbox:true`, `webSecurity:true`, `webviewTag:false` (khóa bằng test). Preload chỉ expose `window.eduMaster.desktop` (đóng băng) — không `require/process/ipcRenderer/fs/shell`. IPC: whitelist kênh, **kiểm tra origin sender** (chỉ `127.0.0.1:<port>`), whitelist 9 phương thức bridge, validate tham số, tùy chọn dialog được sanitize. `will-navigate` chặn origin lạ; `window.open` chỉ mở `https:` bằng trình duyệt hệ thống; permission request chỉ cho `fullscreen`, `clipboard-sanitized-write`. Log che mẫu API key.

## 12. Data directory

`EDUICT_DATA_DIR = <userData>/data` (`%APPDATA%\EduMaster\data`), ghi đè được bằng biến môi trường `EDUICT_DATA_DIR`. Chứa `edumaster.sqlite`, `uploads/`, `backups/`, `logs/`. Thư mục ứng dụng chỉ chứa mã/asset.

> **Phát hiện quan trọng (đã sửa):** `.env` của repo đặt `EDUICT_DB_PATH` trỏ tới dữ liệu thật; `envLoader` trước đây **ghi đè** `process.env` bằng `.env` ⇒ backend desktop bị đưa về DB thật dù shell đã cô lập. Nay `envLoader` không cho `.env` ghi đè các biến hạ tầng do launcher điều khiển (`EDUICT_DB_PATH/DATA_DIR/APP_ROOT/RUNTIME/HOST/API_BASE_URL/PORT`): trong desktop runtime thì bỏ qua hoàn toàn; trong web chỉ dùng khi biến chưa được đặt (hành vi cũ). Khóa Gemini vẫn nạp/hot-reload như trước.

## 13. Backup

Không đổi. Kiểm thử trong desktop runtime: create/list/verify/delete, backup nằm trong `<data>/backups`, không trong thư mục ứng dụng; chống path traversal giữ nguyên.

## 14. Gemini

Không đổi: `React → Node → geminiService → Gemini`. Shell/preload/renderer không chứa `GEMINI_API_KEY` (test quét `src/`, `dist/`, `desktop/`). Key vẫn đọc từ `.env` phía backend.

## 15. Offline

Không thêm phụ thuộc Internet. Backend/DB/uploads/backup/PowerPoint đều cục bộ. Gemini không có mạng ⇒ lỗi có kiểm soát, không crash. Font Google (CSS `@import`) vẫn là nợ kỹ thuật (rơi về font hệ thống).

## 16. Testing

`tests/phase11-desktop-native.test.js` — 22 test (Node thuần; backend thật khởi động bằng đúng `backendProcess.cjs` trên dữ liệu tạm). Smoke Electron tự động: `npm run desktop:smoke`. Smoke PowerPoint thật: `npm run desktop:smoke:powerpoint`.

## 17. Known limitations

- Chưa có nút "Mở PowerPoint" trong UI (service đã sẵn, chưa gắn vào giao diện Lesson Library).
- `.env` (khóa Gemini) vẫn đọc từ thư mục ứng dụng — bản đóng gói cần đưa vào user data (Phase 12).
- Desktop dùng DB mới trong user data; **chưa có migration** từ DB hiện có (dùng Backup/Restore hoặc đặt `EDUICT_DATA_DIR`).
- `prompt` không có native thật. `pptxService` (renderer) vẫn spawn PowerShell trực tiếp (không đổi).
- Renderer PPTX (COM ẩn) và PowerPoint bridge dùng chung `PowerPoint.Application`: chạy đồng thời có thể tranh chấp (chưa có khóa chéo).
- Chỉ Windows; macOS/Linux trả `DESKTOP_BRIDGE_UNAVAILABLE`.

## 18. Phase 12 prerequisites

Đóng gói/installer (electron-builder hoặc forge, NSIS), chuyển `.env`/settings vào user data, migration dữ liệu, `asar` + `node:sqlite` khi đóng gói, code signing, auto-update, gắn UI "Mở PowerPoint", khóa chéo COM giữa renderer và bridge, bundle font local, icon/tên ứng dụng.
