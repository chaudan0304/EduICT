'use strict';
const fs = require('node:fs');
const { sanitizeFileName } = require('./security.cjs');

function createStudentReportPdfExporter({ BrowserWindow, dialog, backendOrigin, getWindow }) {
  let busy = false;
  return async (payload = {}, event) => {
    if (event?.sender !== getWindow()?.webContents || event.senderFrame !== event.sender.mainFrame) return { ok: false, message: 'Chỉ xuất PDF từ cửa sổ EduICT chính.' };
    if (busy) return { ok: false, message: 'Đang xuất một báo cáo. Hãy chờ hoàn tất.' };
    if (typeof payload.classId !== 'string' || !payload.classId || payload.classId.length > 200
      || typeof payload.studentId !== 'string' || !payload.studentId || payload.studentId.length > 200
      || !/^\d{4}-(0[1-9]|1[0-2])$/.test(payload.month || '')) return { ok: false, message: 'Chọn học sinh và tháng hợp lệ.' };
    busy = true; let reportWindow; let timer;
    try {
      const query = new URLSearchParams({ classId: payload.classId, studentId: payload.studentId, month: payload.month });
      const response = await fetch(`${backendOrigin}/api/classroom-tools/student-report-print?${query}`, { signal: AbortSignal.timeout(10000), redirect: 'error' });
      if (!response.ok) throw new Error('Report unavailable');
      const html = await response.text();
      if (Buffer.byteLength(html) > 4 * 1024 * 1024) throw new Error('Report too large');
      reportWindow = new BrowserWindow({ show: false, width: 800, height: 1100, parent: getWindow() || undefined,
        webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, javascript: false } });
      reportWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      reportWindow.webContents.on('will-navigate', event => event.preventDefault());
      const render = async () => {
        await reportWindow.loadURL(`data:text/html;charset=utf-8;base64,${Buffer.from(html).toString('base64')}`);
        return reportWindow.webContents.printToPDF({ pageSize: 'A4', printBackground: true, preferCSSPageSize: true });
      };
      const data = await Promise.race([render(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('PDF timeout')), 20000); })]);
      clearTimeout(timer);
      const choice = await dialog.showSaveDialog(getWindow() || undefined, { title: 'Lưu báo cáo tiến bộ PDF',
        defaultPath: sanitizeFileName(`Bao-cao-${payload.studentId}-${payload.month}.pdf`), filters: [{ name: 'PDF', extensions: ['pdf'] }] });
      if (choice.canceled || !choice.filePath) return { ok: true, canceled: true, saved: false };
      await fs.promises.writeFile(choice.filePath, data);
      return { ok: true, saved: true };
    } catch { return { ok: false, message: 'Không tạo được PDF. Kiểm tra kết nối dữ liệu và quyền lưu file, rồi thử lại.' }; }
    finally { clearTimeout(timer); if (reportWindow && !reportWindow.isDestroyed()) reportWindow.destroy(); busy = false; }
  };
}
module.exports = { createStudentReportPdfExporter };
