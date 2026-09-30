# GIAI ĐOẠN 1C — BÁO CÁO KIỂM CHỨNG & GIA CỐ CUỐI CÙNG

> Tài liệu này KHÔNG thay thế `docs/phase-1-refactor-report.md` (báo cáo Giai đoạn 1A/1B vẫn giữ nguyên).
> Mục tiêu 1C: xác nhận toàn bộ refactor 1A + 1B vẫn chạy đúng, không vỡ tính năng / API / DB / secret / PPTX,
> và kho mã đủ ổn định để chuẩn bị Giai đoạn 2. KHÔNG thêm tính năng mới. KHÔNG commit. KHÔNG push.

## 0. Thông tin phiên kiểm chứng

| Mục | Giá trị |
|---|---|
| Ngày | 2026-09-28 |
| Nhánh | `feature/new-idea` |
| HEAD | `387d43e` (refactor: Giai đoạn 1B — Core Refactor & Desktop Readiness) |
| Cây làm việc | Sạch (clean) trước và sau kiểm chứng |
| Node | v22.19.0 · npm 10.9.3 |
| React / Vite | 19.2.8 / 8.2.2 (rolldown) · oxlint 1.79 |
| DB engine | `node:sqlite` `DatabaseSync` (KHÔNG đổi) |

### Môi trường công cụ thực tế (phát hiện trong 1C)
- **PowerPoint Desktop**: CÓ (`/c/Program Files/Microsoft Office/root/Office16/POWERPNT.EXE`)
- **Python**: CÓ (3.13)
- **LibreOffice**: KHÔNG có
- **Fixtures PPTX**: CÓ tại `uploads/presentations/*/original.pptx`

---

## 1. BASELINE (STEP 0–1)

| Kiểm tra | Kết quả |
|---|---|
| `node --test tests/smoke.test.js` | ✅ 9/9 PASS (764 ms) |
| `npm run lint` (oxlint) | ✅ 0 error / **180 warning** (đúng baseline) |
| `npm run build` | ✅ exit 0 |

Không có regression so với mốc kết thúc Giai đoạn 1B.

---

## 2. CÔ LẬP CƠ SỞ DỮ LIỆU (STEP 2) — ✅ PASS

Đường dẫn DB thật: `D:\DU_AN\EduICT\edumaster.sqlite` (249856 bytes).

Cơ chế cô lập xác nhận trong `server/services/pathService.js` + `server/db/connection.js`:
`EDUICT_DB_PATH` (ưu tiên cao nhất) → `EDUICT_DATA_DIR` → `EDUICT_APP_ROOT` → mặc định `process.cwd()`.

Kịch bản test ghi DB vào thư mục tạm `os.tmpdir()/eduict_phase1c_*`, đặt cả `EDUICT_APP_ROOT`
(nên `.env` thật KHÔNG được nạp) + `EDUICT_DATA_DIR` + `EDUICT_DB_PATH`.
- `getDatabasePath()` phân giải về file tạm, KHÁC đường dẫn DB thật (đã assert).
- Sau toàn bộ test: DB thật **không đổi** (size 249856 → 249856, mtime giữ nguyên).

---

## 3. ENVLOADER (STEP 3) — GIỮ NGUYÊN → Technical Debt TD-01

`server/ai/envLoader.js` `loadEnv()` gán **vô điều kiện** `process.env[key] = val` cho mọi khóa trong `.env`
(dòng ~25). Đây là chủ ý để **live-reload** cấu hình `GEMINI_*` khi file `.env` đổi (mtime khác).
Sửa thành "chỉ set nếu chưa có" sẽ PHÁ tính năng live-reload. → **KHÔNG SỬA trong 1C**, ghi TD-01.

---

## 4. AUDIT BẢO MẬT GEMINI / SECRET (STEP 4) — ✅ PASS

- Quét toàn kho (trừ `node_modules`) mẫu khóa Google `AIza[0-9A-Za-z\-_]{25,}`: **KHÔNG tìm thấy** khóa thật.
- `.env` thật: tồn tại cục bộ nhưng **KHÔNG được git theo dõi**; `.gitignore` chặn `.env` + `.env.*`
  và chỉ giữ `!.env.example`.
- File duy nhất theo dõi liên quan: `.env.example` (khuôn mẫu, không chứa khóa thật).
- `dist/` sau build: không lộ mẫu khóa.

*Không in bất kỳ giá trị secret nào ra terminal/report (theo ràng buộc 1C).* Không phát hiện SECRET EXPOSURE.

---

## 5. BẢO MẬT NHẬP SQL (STEP 5)

`validateSqlDump()` (`server/db/backup.js:154`) **còn nguyên vẹn, KHÔNG sửa/xóa**. Xác nhận runtime:
- Chấp nhận dump hợp lệ do app xuất (CREATE IF NOT EXISTS + INSERT OR REPLACE).
- Chặn 4/4 lệnh nguy hiểm đã thử: `ATTACH DATABASE`, `load_extension()`, `VACUUM INTO`, `PRAGMA writable_schema`.
- Giới hạn kích thước > 50 MB → từ chối; chuỗi rỗng → từ chối.

`executeSqlDump()` gọi `validateSqlDump()` trước rồi mới `db.exec()` — thứ tự an toàn đúng.

⚠️ `POST /api/sql/import-script` (`server/routes/backup.js`) **không có xác thực** → **TD-02** (nợ kỹ thuật,
là hành vi có sẵn từ trước, không do refactor gây ra; không sửa trong 1C).

---

## 6. BACKUP / RESTORE trên DB TẠM (STEP 6) — ✅ PASS

Round-trip trên DB tạm (KHÔNG chạm DB thật):
- Seed: 1 lớp + 2 học sinh (tên tiếng Việt có dấu, có ký tự nháy đơn `O'Brien` / `O'An`).
- `generateSqlScriptDump()` → 32 039 bytes; chứa `INSERT OR REPLACE`; escape nháy đơn đúng (`O''Brien`).
- Mô phỏng mất dữ liệu: `DELETE FROM students; DELETE FROM classes;` → students = 0.
- `executeSqlDump(dump)` → khôi phục lại 1 lớp + 2 học sinh; `S1.name` = "Nguyễn Văn O'An" (nguyên vẹn).
- **ROUND_TRIP_OK = true.** DB thật không đổi sau test.

⚠️ Phạm vi dump chỉ gồm `classes / students / broken_machines / lessons / lesson_slides / question_bank`.
KHÔNG gồm `app_settings / school_years / classroom_sessions / session_activities / session_events /
student_participation`. Là hành vi có sẵn từ trước → **TD-03** (restore không phục hồi cấu hình & phiên học).

---

## 7. REGRESSION EXCEL (STEP 7) — ✅ PASS (đọc tĩnh)

`src/utils/excelImport.js` (client-side, không đổi API/DB):
- Đa sheet: 1 file = nhiều sheet = nhiều lớp; bỏ qua sheet `HUONG_DAN`/`template`/`mẫu`…
- Tự dò dòng tiêu đề (quét ≤30 dòng): Họ tên (bắt buộc) + ≥1 trong (Ngày sinh / Giới tính / STT).
- Ngày sinh: hỗ trợ Excel serial (UTC, tránh lệch timezone GMT+7), `dd/mm/yyyy`, `yyyy-mm-dd`.
- Giới tính: `Nam/Nữ/m/f/male/female` → chuẩn hóa; giá trị lạ → đánh dấu không hợp lệ.
- Chống trùng: theo khóa `tên|ngày sinh` với DB hiện có VÀ trong cùng sheet; cùng tên khác ngày sinh vẫn nhận.
- Bỏ dòng trống & dòng chữ ký/chân trang (GVCN, hiệu trưởng…).

---

## 8. PPTX — MUTEX COM (STEP 8–9) — ✅ PASS (mutex) · ⚠️ MANUAL VERIFICATION REQUIRED (render thật)

`server/pptxService.js`:
- `withComLock(fn)` serial hóa promise-chain: giữ khóa đúng 1 lần spawn, không nuốt lỗi, chain tiếp tục
  ở cả nhánh thành/bại (không đứng hàng đợi), `comLockActive` bất biến 0/1.
- Mọi bước COM đều bọc khóa: `renderPptxToPdf`, `renderPptxWithPowerPoint`, nhánh COM của
  `renderSingleSlideFallback`. `renderPptxMultiEngine` gọi các bước COM `await` tuần tự → không lồng
  khóa → không deadlock. Các bước không-COM (LibreOffice / PyMuPDF) giữ concurrency của hàng đợi.
- `MAX_CONCURRENT_PPTX_RENDER` = `process.env... || 2`.
- Unit test mutex: ✅ (test #8 "chạy tuần tự", #9 "1 job lỗi không làm đứng hàng đợi").

Render COM thật (spawn PowerPoint) **KHÔNG chạy tự động** trong 1C vì mang tính can thiệp cao vào máy người
dùng (mở tiến trình Office, tạo file trong `uploads/`). Dù PowerPoint + fixtures có sẵn, đánh dấu:
**MANUAL VERIFICATION REQUIRED** cho pipeline PPTX→PDF→PNG đầu-cuối. Renderer PPTX **không bị xóa/thay đổi**.

---

## 9. SERVICE ABSTRACTION / DESKTOP READINESS (STEP 16) — ✅ PASS

Quét `src/**/*.{js,jsx}` cho `window.confirm|window.alert|localStorage|sessionStorage|location.reload`:
chỉ xuất hiện trong **3 file service** — `src/services/StorageService.js`, `AppLifecycleService.js`,
`DialogService.js`. Phần còn lại của UI đi qua lớp trừu tượng → sẵn sàng cho EduMaster Desktop sau này.
`process.cwd()` chỉ còn ở `pathService.getAppRoot()`. Không có đường dẫn cứng `C:\` / `D:\` trong mã nguồn app.

---

## 10. API ROUTING & apiClient (STEP 17–18) — ✅ PASS

- Định tuyến qua `server/routes/` (facade `server/api-handler.js` chỉ re-export `handleApiRequest`).
- Smoke test HTTP (trong bộ 9 test) + Part H Giai đoạn 1B (5/5 endpoint GET trả 200 trên DB tạm cô lập)
  xác nhận dispatch qua các module route mới hoạt động; `/api/ai/status` không lộ `apiKey`.
- `apiClient` được nối vào **đúng 3** call-site JSON-throw trong `src/utils/storage.js`
  (`saveAcademicYearSettings`, `transitionSchoolYearInSqlite`, `batchImportClassesToSqlite`); các call-site
  fallback/upload/download giữ nguyên `fetch` có chủ đích. Hình dạng response JSON KHÔNG đổi.

## 11. REACT.LAZY / CODE-SPLITTING (STEP 19) — ✅ PASS

Build phát sinh chunk riêng cho các manager lazy: `Gradebook`, `LuckyWheel`, `SeatingChart`, `RewardShop`,
`GoodScoresBoard`, `SessionManager`, `LessonManager`, `QuickQuizManager` (8 chunk có tên riêng).
`DuckRace` cũng `lazy()` nhưng được rolldown gộp vào chunk chung (vẫn dynamic-import). Cảnh báo "chunk > 500 kB"
là cảnh báo tối ưu **có sẵn từ trước**, không phải lỗi, không phải regression.

## 12. BẢO MẬT CUỐI & GIT (STEP 20–21) — ✅ PASS

- `git ls-files` với mẫu nhạy cảm (`.env`, `.sqlite`, `edumaster`, `.db`, `.log`): chỉ `.env.example` được theo dõi.
- `.gitignore` chặn: `.env` / `.env.*` (giữ `.env.example`), `*.sqlite(-wal/-shm)`, `*.log`, `dist`,
  `node_modules`, `uploads/**` (giữ `.gitkeep`).
- Cây làm việc sạch, không có thay đổi rác.

## 13. KIỂM TRA CUỐI (STEP 22) — ✅ PASS

| Lệnh | Kết quả |
|---|---|
| `node --test tests/smoke.test.js` | ✅ 9/9 PASS |
| `npm run lint` | ✅ 0 error / 180 warning |
| `npm run build` | ✅ exit 0, code-split đúng |

---

## 14. BẢNG NỢ KỸ THUẬT (Technical Debt)

| ID | Vấn đề | Vị trí | Mức | Xử lý 1C |
|---|---|---|---|---|
| TD-01 | `loadEnv()` ghi đè `process.env` vô điều kiện (phục vụ live-reload GEMINI_*) | `server/ai/envLoader.js:~25` | Thấp | Giữ nguyên (chủ ý) |
| TD-02 | `POST /api/sql/import-script` không xác thực | `server/routes/backup.js` | Trung bình | Ghi nợ; cân nhắc Phase 2 |
| TD-03 | Dump backup không gồm `app_settings/school_years/*sessions*` | `server/db/backup.js` | Trung bình | Ghi nợ |
| TD-04 | `importSqlScriptFile` thiếu guard `res.ok` (chưa migrate apiClient) | `src/utils/storage.js` | Thấp | Ghi nợ |
| TD-05 | `aiService` dùng hình dạng lỗi `err.errorCode` khác `ApiError` | `src/services/aiService.js` | Thấp | Ghi nợ |
| TD-06 | Cảnh báo chunk > 500 kB (Navbar & phụ thuộc nặng chưa tách) | build rolldown | Thấp | Ghi nợ |
| TD-07 | 180 cảnh báo lint (chủ yếu `no-unused-vars`, `exhaustive-deps`) | toàn kho | Thấp | Ghi nợ (baseline) |
| TD-08 | Render PPTX COM đầu-cuối chưa test tự động (cần chạy tay) | `server/pptxService.js` | Trung bình | MANUAL VERIFICATION REQUIRED |

## 15. CHECKLIST NGHIỆM THU

| # | Hạng mục | Kết quả |
|---|---|---|
| 1 | Test / Lint / Build xanh, không regression | ✅ PASS |
| 2 | DB engine/schema/PK/FK/seed KHÔNG đổi | ✅ PASS |
| 3 | API endpoint/method/body/response/status KHÔNG đổi | ✅ PASS |
| 4 | Cô lập DB test khỏi DB thật | ✅ PASS |
| 5 | `validateSqlDump` còn nguyên & chặn lệnh nguy hiểm | ✅ PASS |
| 6 | Backup/restore round-trip trên DB tạm | ✅ PASS |
| 7 | Không lộ secret; `.env` không bị theo dõi | ✅ PASS |
| 8 | Excel import (đa sheet, ngày/giới tính, chống trùng) | ✅ PASS (đọc tĩnh) |
| 9 | Mutex COM PPTX đúng & không đứng hàng đợi | ✅ PASS |
| 10 | Render PPTX COM đầu-cuối | ⚠️ MANUAL VERIFICATION REQUIRED |
| 11 | Lớp service (confirm/alert/storage/reload) đóng gói | ✅ PASS |
| 12 | React.lazy code-split hoạt động | ✅ PASS |
| 13 | apiClient nối đúng 3 call-site an toàn | ✅ PASS |
| 14 | Git sạch, chỉ `.env.example` được theo dõi | ✅ PASS |
| 15 | Tương tác UI E2E (trình duyệt thật) | ⛔ NOT TESTED (không có E2E; không thêm dep) |
| 16 | Renderer PPTX không bị xóa | ✅ PASS |

## 16. TRẠNG THÁI CUỐI CÙNG

### ✅ READY WITH TECHNICAL DEBT

Toàn bộ refactor 1A + 1B được xác nhận **không vỡ**: test 9/9, lint 0 error/180 warning, build exit 0,
DB/API/schema/secret/renderer PPTX đều nguyên vẹn, cô lập DB & backup/restore đã kiểm chứng thực tế trên DB tạm.
Còn tồn nợ kỹ thuật **có sẵn từ trước** (TD-01…TD-08) và hai hạng mục cần xác nhận thủ công/E2E
(render PPTX COM đầu-cuối, tương tác UI trình duyệt) — không phải blocker. Kho mã đủ ổn định để **chuẩn bị**
Giai đoạn 2. **DỪNG tại đây** — không commit, không push, không tự chuyển sang Giai đoạn 2.


