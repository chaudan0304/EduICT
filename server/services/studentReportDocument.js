const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const evaluation = value => ({ T: 'Hoàn thành tốt', H: 'Hoàn thành', C: 'Chưa hoàn thành' }[value] || value || 'Chưa ghi nhận');
const signed = value => `${value > 0 ? '+' : ''}${value}`;

// Only escaped text from the stored report enters this document. No scripts,
// remote fonts, pictures, links, user HTML or credentials are included.
export function studentReportDocument(report) {
  const s = report.student; const m = report.monthly;
  const row = (label, value) => `<tr><th>${escape(label)}</th><td>${escape(value)}</td></tr>`;
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Báo cáo tiến bộ học sinh</title>
  <style>@page{size:A4;margin:18mm}body{font:14px/1.6 "Segoe UI",Arial,sans-serif;color:#183046;margin:24px auto;max-width:760px}h1{font-size:25px;color:#075985;margin-bottom:4px}h2{font-size:18px;margin-top:24px}p{white-space:pre-wrap}table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}th{background:#f1f5f9}.summary{padding:14px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px}.notice{font-size:12px;color:#475569}thead{display:table-header-group}tr{break-inside:avoid}footer{margin-top:24px;border-top:1px solid #cbd5e1;padding-top:10px;font-size:12px}</style></head>
  <body><h1>BÁO CÁO TIẾN BỘ HỌC SINH</h1><p>Tháng ${escape(report.month)} · Năm học ${escape(report.schoolYear)}</p>
  <h2>${escape(s.name)}</h2><p>Lớp ${escape(report.className)}</p>
  <div class="summary">Sao ghi nhận trong tháng: +${escape(m.awarded)} / -${escape(m.deducted)} · Thay đổi ${escape(signed(m.net))}<br>Tổng sao hiện tại: ${escape(s.stars)}</div>
  <h2>Kỹ năng và đánh giá hiện tại</h2><table><tbody>${row('Sử dụng chuột', evaluation(s.skill_mouse))}${row('Bàn phím', evaluation(s.skill_keyboard))}${row('Vẽ / Paint', evaluation(s.skill_paint))}${row('Đánh giá học kỳ 1', evaluation(s.eval_hk1))}${row('Đánh giá học kỳ 2', evaluation(s.eval_hk2))}${row('Điểm học kỳ 1', s.score_hk1 ?? 'Chưa ghi nhận')}${row('Điểm cuối năm', s.score_ck ?? 'Chưa ghi nhận')}</tbody></table>
  <h2>Nhận xét của giáo viên</h2><p>${escape(s.note || 'Chưa có nhận xét.')}</p><p class="notice">${escape(report.notice)}</p>
  <h2>Nhật ký sao trong tháng (${escape(m.transactionCount)} lượt)</h2><table><thead><tr><th>Ngày giờ (Việt Nam)</th><th>Số sao</th><th>Lý do</th></tr></thead><tbody>
  ${report.history.length ? report.history.map(entry => `<tr><td>${escape(entry.date)}</td><td>${escape(signed(entry.amount))}</td><td>${escape(entry.reason)}</td></tr>`).join('') : '<tr><td colspan="3">Chưa có nhật ký sao trong tháng đã chọn.</td></tr>'}</tbody></table>
  <footer>EduICT · Báo cáo từ dữ liệu đã lưu trên máy · Không tự động gửi thông tin học sinh</footer></body></html>`;
}
