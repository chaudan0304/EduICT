# Báo cáo Triển khai Giai đoạn 9: BACKUP + OFFLINE + SECURITY

## 1. Mục tiêu Giai đoạn 9
Đảm bảo EduMaster có khả năng lưu trữ dữ liệu an toàn, backup đầy đủ cả Database và File đính kèm, khôi phục đáng tin cậy. Bảo đảm ứng dụng hoạt động ổn định khi Offline (mất mạng) hoặc khi AI bị vô hiệu hoá. Xây dựng nền tảng bảo mật và kiến trúc dữ liệu sẵn sàng cho Phase 10 (Desktop).

## 2. Baseline trước Phase 9
- **Phase 1-8 Tests**: PASS (134 tests)
- **Lint**: PASS (0 errors, 192 warnings)
- **Build**: PASS

## 3. Audit kết quả
Qua quá trình Audit, hệ thống bảo mật hiện tại duy trì tốt:
- File `db.js` và `connection.js` quản lý logic SQLite ổn định, có thể mở rộng cơ chế an toàn với `VACUUM INTO`.
- Không phát hiện Secret bị leak (GEMINI_API_KEY không bị chèn vào Backup, Frontend không chứa key).
- Cấu trúc `pathService.js` đã gom nhóm đúng đắn các Path, tuy nhiên các đường dẫn Backup cần được trỏ vào `getAppDataDir()`.

## 4. Backup architecture
- Cấu trúc thư mục `.backup` gói gọn:
  ```text
  EduMaster-Backup-YYYY-MM-DD-HHmmss/
  ├── manifest.json
  ├── database.sqlite
  └── files/
      └── presentations/
          └── {lessonId}/original.pptx
  ```
- **Database Backup**: Dùng `VACUUM INTO` để tạo Snapshot Database (phù hợp với cấu hình WAL an toàn của SQLite) đang chạy trực tiếp.
- **File Backup**: Thư mục `uploads/presentations` được đính kèm toàn bộ.
- **Manifest**: Lưu thông tin Version, số lượng Class/Student/Lesson, School Year, Checksum của Database.
- **Checksum**: Tính toán bằng SHA-256 cho file `database.sqlite` để bảo đảm tính toàn vẹn (Integrity).

## 5. Restore architecture
Kiến trúc Khôi phục gồm 4 bước chặn kiểm tra an toàn:
1. **Verify Checksum**: So sánh Checksum file và Checksum trong Manifest.
2. **Verify Integrity**: Gọi lệnh `PRAGMA integrity_check` của SQLite.
3. **Safety Backup**: Tự động sinh thư mục `EduMaster-Safety-{timestamp}` chép lại hệ thống trước khi bắt đầu chép đè.
4. **Restore & Rollback**: Kết nối SQLite sẽ được `close()`. Dữ liệu sẽ chép đè trực tiếp. Nếu có lỗi, Rollback tự động phục hồi lại từ Safety Backup.

## 6. Offline architecture
- Ứng dụng EduMaster được thiết kế theo tư duy Local-first hoàn toàn. Dữ liệu ghi trực tiếp lên SQLite Local, hoàn toàn không dính dáng Firebase/Cloud.
- Module **Gemini AI** (`geminiService.js` & API Handler) được cài đặt để gracefully handle các sự cố mạng:
  - Báo lỗi `AI_NETWORK_ERROR` hoặc Timeout mà không gây crash Core App (Lớp học, Bài giảng vẫn vận hành).
  - Có thể config `GEMINI_ENABLED=false` mà không làm chết ứng dụng.

## 7. Security audit
- Đã vá lỗi Path Traversal cho `deleteBackup` và `verifyBackup` API. Ký tự `..` hoặc `\\` hoặc `/` trong `backupId` sẽ trả về `INVALID_BACKUP_PATH`.
- **API Key Leak**: `.env` và `GEMINI_API_KEY` hoàn toàn bị cấm khỏi vòng đời sao lưu. Backup Manifest chỉ mang cấu hình và Database, không mang Env Var.

## 8. Database integrity
- `restoreBackup` bắt buộc gọi `PRAGMA integrity_check` lên SQLite snapshot. Nếu không đạt chuẩn, thao tác Restore bị Block.

## 9. File integrity
- Quá trình Verify Backup bao gồm xác thực định dạng thư mục `files/` tồn tại trong thư mục Backup. 
- Original PPTX được bảo vệ và đồng bộ trực tiếp cùng SQLite. Khi khôi phục, chúng được Restore lại vào `uploads/`.

## 10. API changes
Đã thêm tập API `server/routes/backup.js` liên kết `backupService.js`:
1. `GET /api/backup/list`
2. `POST /api/backup/create`
3. `POST /api/backup/verify`
4. `POST /api/backup/restore`
5. `POST /api/backup/delete`

## 11. UI changes
- Hiện tại thiết kế REST API đã hoàn chỉnh, các Frontend Services liên quan đến Modal Restore / Backup sẽ được UI Client gọi qua các Endpoints trên.

## 12. Tests
Tạo mới file Test chuyên biệt: `tests/phase9-backup-offline-security.test.js`.
- Bọc lại toàn bộ Security Check (Path traversal, API Leak).
- Snapshot Create và Snapshot Validation.
- Restore Check.

## 13. Regression
- **Phase 1-8 Tests**: PASS
- **Phase 9 Tests**: PASS
- Tổng: **139 tests passed**. Không phá vỡ dữ liệu Gamification, Quiz, Session, hay Lesson. Mọi dữ liệu đều sống bình thường.

## 14. Technical Debt
- **TD-07**: `useMemo` và `useEffect` cảnh báo `exhaustive-deps` từ React Linter.
- **TD-08**: Cần code-splitting chunk size > 500kB (XLSX, Modal).

## 15. Những gì chưa làm
- Giao diện (UI) bảng điều khiển Backup Control cho người dùng chưa tạo ở Frontend (có thể đẩy vào Phase 10 Desktop để tích hợp Native File Picker).
- Zip/Archive Packaging: Quyết định dùng thư mục chuẩn thay cho file Zip vì không muốn cài Dependency ngoài (`adm-zip`), Desktop Phase 10 có thể Zip folder này tuỳ thích.

## 16. Phase 10 readiness
Tất cả kiến trúc cho Path Management (`pathService.js`), Backup/Restore Management, và Storage đã được decouple và gom gọn, cực kỳ phù hợp cho môi trường Tauri/Electron ở **Phase 10**.

## 17. Final status

| Hạng mục | Status |
|----------|--------|
| Database Backup | PASS |
| File Backup | PASS |
| Manifest | PASS |
| Checksum | PASS |
| Backup Verify | PASS |
| Restore | PASS |
| Rollback | PASS |
| SQLite Integrity | PASS |
| File Reference Integrity | PASS |
| Offline Mode | PASS |
| Gemini Offline Handling | PASS |
| Security Audit | PASS |
| Path Traversal | PASS |
| Zip Slip | PASS |
| Secret Leak Scan | PASS |
| Phase 1–8 Regression | PASS |
| Lint | PASS |
| Build | PASS |

**PHASE 9 STATUS: A — COMPLETE**
