# T101 — Claude Code: công cụ hỗ trợ EduICT

## Giao việc
Bạn là Claude Code thực sự được Codex điều phối theo yêu cầu người dùng. Đọc package.json bằng Read trước; ghi đúng tên/version vào báo cáo để chứng minh đã đọc workspace. Dự án React/Vite tại D:\DU_AN\EduICT. .codegraph không tồn tại.

## Allowlist ghi
Chỉ `src/components/ClassroomTools/*` và `.agent-work/reports/T101-claude.md`. Được đọc mã nguồn src/server/shared/desktop và package.json, không đọc `.env`, dữ liệu người dùng, SQLite, uploads, settings, logs, credential/global config. Không sửa file ngoài allowlist, không chạy/thêm tests, không git commit/push, không cài dependency, không spawn subagent. Không gọi API chứa dữ liệu thật. Codex làm backend và wiring Navbar.

## Deliverable
Default export `ClassroomToolsModal.jsx` nhận `{isOpen,onClose,currentClass,onAiStatusChange}`. Native dialog showModal/close, close bằng Esc/đóng, responsive, focus restore, async race guard, khóa thao tác đang lưu. Bốn tab tiếng Việt:
1. Cấu hình Gemini: nhập key dạng password, không echo/ghi localStorage. Key trống giữ nguyên; nút lưu, bật/tắt, model; nút kiểm tra kết nối riêng sau khi lưu. Bỏ key mới khỏi state sau lưu. API status never includes key. Explicit remove checkbox nếu cần, không bắt buộc. Hiển thị localOnly false là read-only form với giải thích.
2. Trước giờ dạy: load lessons, chọn bài rồi nút kiểm tra; checklist server/DB, internet, slide, AI. Show unknown/limited honestly; không coi navigator.onLine là chứng minh Internet và không coi link tồn tại là chạy được hiệu ứng.
3. Tiến bộ học sinh: currentClass selector student, tháng YYYY-MM; đọc report API, show tổng sao hiện tại, cộng/trừ tháng, nhận xét giáo viên và kỹ năng; in bản báo cáo tiếng Việt sạch thông qua window.open + document.createElement/textContent (không interpolate unescaped user text into HTML). Người dùng chọn Save as PDF trong print. Nếu popup bị chặn hiển thị hướng dẫn. Giá trị kỹ năng là trạng thái hiện tại, không giả dữ liệu lịch sử.
4. Phiên bản: tự load GET version mỗi lần mở tab; nút kiểm tra GitHub mới nhất; show offline/no-release/private/unavailable honestly; chỉ link GitHub HTTPS đã trả backend, không tải/cài tự động. Nhãn bản web vs desktop chính xác.

## API hợp đồng Codex đang triển khai
Import apiClient from ../../services/apiClient (đường dẫn từ ClassroomTools là ../../services đúng). apiClient.get(path,{timeout}); .post(path,payload,{timeout}); .put if needed. Error.message Vietnamese.
- GET `/api/classroom-tools/ai-config` => `{enabled,configured,model,localOnly:boolean}` localOnly true cho backend chạy local (desktop hoặc loopback web); chỉ local mới sửa config.
- POST same => `{enabled:boolean,model:string,apiKey?:string,removeKey?:boolean}`; empty/omitted key giữ nguyên, removeKey true xóa. Result same as GET.
- POST `/api/classroom-tools/ai-check` `{}` => `{ok:boolean,message:string,model:string}`; only saved key; metadata check, no student data. Timeout UI >=15000.
- GET `/api/lessons` => array `{id,title,type,...}`
- GET `/api/classroom-tools/preflight?lessonId=<encoded>` => `{checkedAt,checks:[{id,label,state:'ready'|'warning'|'error'|'unknown',message}]}`. Không gửi lessonId cũng được.
- GET `/api/classroom-tools/student-report?classId=<encoded>&studentId=<encoded>&month=YYYY-MM` => `{month,className,schoolYear,student:{id,name,stars,skill_mouse,skill_keyboard,skill_paint,eval_hk1,eval_hk2,score_hk1,score_ck,note},monthly:{awarded:number,deducted:number,net:number,transactionCount:number},history:[{date,amount,reason,source}],notice:string}`.
- GET `/api/classroom-tools/version` => `{currentVersion,runtime,updateAvailable:false,checked:false}`.
- POST `/api/classroom-tools/version-check` `{}` => `{currentVersion,runtime,latestVersion:string|null,updateAvailable:boolean,checked:boolean,message:string,releaseUrl:string|null}`.

## Giao diện
Scoped CSS prefix `classroom-tools-`, sử dụng CSS vars hiện có. Native top-layer dialog an toàn với slideshow/native PowerPoint. Tab buttons aria labels, errors role alert, status live region, loading disable, version stale request ignored. Không đổi animation PowerPoint.

## Báo cáo
Ghi `.agent-work/reports/T101-claude.md`: status, package đã đọc, files, chức năng, assumptions, build/tests không chạy, blockers và integration guidance. Không in secret. Làm thật bằng tools, hoàn tất source và report, sau đó trả tóm tắt.
