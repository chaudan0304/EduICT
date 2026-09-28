# Báo cáo Giai đoạn 1 — Core Refactor & Desktop Readiness

> Nhánh: `feature/new-idea` · Cập nhật: 2026-09-28
> Nguyên tắc áp dụng xuyên suốt: **AUDIT → REFACTOR → VERIFY → REPORT** (không REWRITE → BREAK → FIX).
> Ràng buộc cốt lõi: **giữ nguyên 100% hành vi hiện tại** — không đổi API contract, endpoint, định dạng response, engine/schema/dữ liệu DB; không chuyển sang Electron/Tauri; không xây PowerPoint Desktop Bridge; không gỡ PPTX renderer.

## 1. Tổng quan

Giai đoạn 1 refactor nội bộ EduICT để chuẩn bị kiến trúc cho "EduMaster Desktop" trong khi **bảo toàn toàn bộ chức năng**. Đây KHÔNG phải viết lại. Trọng tâm: tách phần phụ thuộc môi trường (đường dẫn, dialog, storage, vòng đời app, mạng) ra sau một lớp service để sau này Desktop có thể thay implementation mà không đụng vào logic nghiệp vụ.

Trạng thái: **các nhóm bổ sung (additive) + nhóm an toàn đã hoàn tất và verify**. Các thao tác cấu trúc rủi ro cao (tách `db.js`, `api-handler.js`) **được hoãn lại có chủ đích**, chờ quyết định — đúng mệnh lệnh "refactor từng bước, kiểm tra sau mỗi nhóm". **Chưa tự động chuyển sang Giai đoạn 2.**

## 2. Baseline (trước khi động vào code)

| Hạng mục | Kết quả |
|---|---|
| `npm run build` | PASS (exit 0) |
| `npm run lint` (oxlint) | 0 lỗi, **177 warning** (đã có sẵn từ trước) |
| Kiểm chứng số warning | Đo bằng `git stash` → lint → so sánh: **177 (baseline) = 177 (sau refactor)** → 0 warning phát sinh mới |

Ghi chú: lần đo đầu bị **SIGPIPE cắt cụt** khi pipe oxlint qua `head/tail/grep -c` (cho ra 40/6/3 sai lệch). Cách đúng: ghi ra file trước rồi mới đếm.

## 3. File tài liệu tham chiếu bị thiếu

Task nhắc tới `eduict_full_audit_report.md` nhưng **file này không tồn tại** trong repo. Đã tiến hành dựa trên các phát hiện audit nhúng ngay trong đề bài — và chúng khớp thực tế đã kiểm chứng (db.js ~3764 dòng, api-handler ~1224 dòng, 16 `window.confirm`, 2 `reload`, GEMINI_API_KEY thật trong `.env`, bundle ~1.5MB).

## 4. Những gì ĐÃ hoàn tất

**Nhóm A — Lớp service bổ sung** (commit `59b3d90`):

| Service | Vai trò | Số điểm gọi đã nối |
|---|---|---|
| `src/services/DialogService.js` | Bao bọc `window.confirm/alert`; `confirm()` **đồng bộ** (drop-in) | 16 |
| `src/services/StorageService.js` | Bao bọc `localStorage/sessionStorage`; **pass-through chuỗi thô** (không tự JSON.parse/stringify → không đổi định dạng dữ liệu cũ) | 19 |
| `src/services/AppLifecycleService.js` | Bao bọc `window.location.reload` | 2 |
| `src/services/apiClient.js` | Hạ tầng `fetch` có timeout (AbortController) + `ApiError` | **Đã tạo, CHƯA nối** |
| `server/services/pathService.js` | Tập trung mọi phân giải đường dẫn; **nơi DUY NHẤT dùng `process.cwd()`** | 9 |

**Nhóm an toàn** (commit `be393e1`, `c95350c`):

- **Part 12 — CORS theo cấu hình**: `server/services/corsConfig.js`, đọc `EDUICT_CORS_ORIGIN`, **mặc định `*`** (giữ nguyên hành vi WEB). Hỗ trợ allowlist + `Vary: Origin`.
- **Part 16 — Smoke tests**: `tests/smoke.test.js` chạy bằng `node --test` tích hợp (**không thêm dependency**), thêm script `npm test`.
- **Part 11 — Chốt an toàn SQL import**: `validateSqlDump()` đặt tại `executeSqlDump()`.

## 5. Những gì CHƯA làm / hoãn có chủ đích

| Part | Hạng mục | Lý do hoãn |
|---|---|---|
| 2 | Tách `server/db.js` (3764 dòng) → `server/db/` + facade | **Rủi ro cao nhất** — chờ quyết định, cần verify liên tục |
| 4 | Tách `server/api-handler.js` → `server/routes/` | Rủi ro trung bình-cao |
| 8 | Nối `apiClient` vào các điểm `fetch` hiện có | Phải giữ nguyên hành vi fallback-vs-throw |
| 9 | React.lazy code splitting (giảm bundle 1.5MB) | Chưa làm |
| 13 | Serial hóa COM PPTX (1 job/lần) | Hiện `MAX_CONCURRENT_PPTX_RENDER=2` |
| 17 | Verify đầy đủ 25 tính năng | Smoke test mới phủ phần lõi |

## 6. Kiến trúc lớp service & lý do Desktop-readiness

Mọi phụ thuộc môi trường giờ đi qua một điểm chốt duy nhất. Khi lên Desktop, chỉ cần thay implementation phía sau (ví dụ `PathService` trỏ vào thư mục dữ liệu của app đóng gói, `DialogService` dùng dialog native) mà **không sửa logic nghiệp vụ**. `pathService` là **module lá** (chỉ import `node:path`/`node:fs`) để tránh phụ thuộc vòng.

## 7. Sai lệch so với spec (deviations)

- **`PathService` đặt ở `server/services/` thay vì `src/services/`**: vì **toàn bộ** `process.cwd()` nằm phía server. Đây là lựa chọn có lý do, dùng đúng "escape hatch" của spec ("hoặc nếu architecture hiện tại phù hợp hơn").
## 8. Bảo mật (Part 10, 11, 12)

**Part 10 — GEMINI_API_KEY (audit, không lộ):**

| Kiểm tra | Kết quả |
|---|---|
| `.env` được gitignore | ✅ |
| `.env` từng bị commit vào lịch sử git | ❌ Chưa bao giờ |
| Key lọt vào bundle `dist/` | ❌ Không |
| Key trong backup/sqlite/json | ❌ Không |
| Frontend `src/` tham chiếu | Chỉ là **tên chuỗi** trong text UI + placeholder `AIzaSy...` (không phải key thật) |
| Điểm đọc key server-side | Duy nhất `server/ai/envLoader.js:36` |
| Endpoint status `getAiStatus()` | Trả `{enabled, configured, model}` — **KHÔNG** trả `apiKey` |
| Ghi key ra log | ❌ Không |

→ **Khuyến nghị ROTATE key**: mang tính **dự phòng** (key hiện chưa lộ ở đâu). Không hiển thị giá trị key trong báo cáo này.

**Part 11 — `/api/sql/import-script`:** endpoint gọi `executeSqlDump(sql)` → `db.exec(sql)` **raw, không auth**. Đã thêm `validateSqlDump()` chặn `ATTACH/DETACH DATABASE`, `load_extension()`, `VACUUM INTO`, `PRAGMA writable_schema/temp_store_directory`, và dump rỗng/`>50MB` — **vẫn cho restore hợp lệ** (CREATE/INSERT/UPDATE/DELETE/DROP). ⚠️ **Bảo vệ đầy đủ vẫn cần thêm auth cho endpoint** (một client vẫn có thể xóa/DROP dữ liệu) — ghi nhận cho Giai đoạn 2 / Desktop bridge (chạy local-only).

**Part 12 — CORS:** trước đây hardcode `Access-Control-Allow-Origin: *`. Nay đọc cấu hình, **mặc định vẫn `*`**.

## 9. Audit an toàn DB (Part 3 — KHÔNG migrate schema)

- `PRAGMA foreign_keys = ON` + `journal_mode = WAL` ✅ (`db.js:25-26`).
- FK cascade đầy đủ: `ON DELETE CASCADE` cho bản ghi con, `ON DELETE SET NULL` cho tham chiếu tùy chọn.
- ⚠️ **Orphan student_id**: `student_participation.student_id` và `quiz_student_results.student_id` là `TEXT NOT NULL` **không có FK**. Nguyên nhân: bảng `students` có PK ghép `(id, class_id)` nên không thể FK thẳng chỉ `student_id`. Nhiều khả năng **chủ ý** (giữ lịch sử thưởng sao / kết quả quiz kể cả khi học sinh rời lớp). → Chỉ báo cáo, **không sửa schema**.
- Sinh ID động dùng `Date.now()_Math.random()` — rủi ro trùng cực thấp, đang hoạt động ổn, không cần đổi.

## 10. Biến môi trường mới

| Biến | Mặc định (giữ hành vi WEB) | Dùng cho |
|---|---|---|
| `EDUICT_APP_ROOT` | `process.cwd()` | Gốc app (Desktop trỏ vào thư mục cài đặt) |
| `EDUICT_DATA_DIR` | `<app root>` | Thư mục dữ liệu (DB, uploads...) |
| `EDUICT_DB_PATH` | (đã có sẵn) | Đường dẫn file SQLite |
| `EDUICT_CORS_ORIGIN` | `*` | Allowlist origin cho CORS |

## 11. Kiểm thử (Part 16)

`tests/smoke.test.js` — **7/7 PASS**: corsConfig (mặc định + allowlist), pathService (`EDUICT_DB_PATH`), khởi tạo schema + `foreign_keys` ON, CRUD roundtrip + FK CASCADE (trên **DB tạm** qua `EDUICT_DB_PATH`, không đụng DB thật), `validateSqlDump` (cho dump hợp lệ / chặn lệnh nguy hiểm).

## 12. Kết quả VERIFY tổng hợp

| Kiểm tra | Kết quả |
|---|---|
| `npm run build` | ✅ PASS (exit 0) |
| `npm run lint` | ✅ 0 lỗi, 177 warning (= baseline, 0 mới) |
| `npm test` | ✅ 7/7 PASS |
| Smoke 3 endpoint HTTP | ✅ 200 + JSON hợp lệ (phiên trước) |
| API contract / endpoint / response | ✅ Không đổi |
| DB engine / schema / dữ liệu | ✅ Không đổi |

## 13. Rủi ro & khuyến nghị

1. **ROTATE `GEMINI_API_KEY`** (dự phòng) — không commit key mới.
2. **Thêm auth cho `/api/sql/import-script`** ở Giai đoạn 2 (validateSqlDump chưa chống được xóa/DROP dữ liệu bởi client có quyền gọi).
3. Tách `db.js`/`api-handler.js` là bước rủi ro cao — làm từng bước, verify + smoke test sau mỗi bước, có facade tương thích.
4. Cân nhắc dọn dữ liệu orphan (`student_participation`, `quiz_student_results`) ở tầng ứng dụng nếu muốn — **không** đổi schema trong Giai đoạn 1.

## 14. Bước tiếp theo (Giai đoạn 2)

**KHÔNG tự động chuyển sang Giai đoạn 2.** Các ứng viên kế tiếp trong Giai đoạn 1 (chờ duyệt): Part 2 (tách db.js), Part 4 (tách api-handler), Part 8 (nối apiClient), Part 9 (React.lazy), Part 13 (serial hóa COM PPTX), Part 17 (verify đủ 25 tính năng).

### Nhật ký commit Giai đoạn 1

- `59b3d90` — refactor: lớp service trừu tượng (Nhóm A)
- `be393e1` — feat: CORS theo cấu hình + smoke tests
- `c95350c` — feat(security): validateSqlDump cho SQL import
