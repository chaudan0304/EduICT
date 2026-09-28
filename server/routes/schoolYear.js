import { sendJson, parseJsonBody } from './helpers.js';
import {
  getCurrentSchoolYear,
  setCurrentSchoolYear,
  getAvailableSchoolYears,
  transitionSchoolYear,
  getAcademicYearSettings,
  setAcademicYearSettings,
  getCurrentAcademicYear,
  checkAndInitializeSchoolYear
} from '../db.js';

export async function tryHandleSchoolYear(req, res, ctx) {
  const { pathname, method } = ctx;

  // 2a. Quản lý năm học: Lấy danh sách năm học & năm hiện tại
  if (pathname === '/api/school-years' && method === 'GET') {
    try {
      const info = getAvailableSchoolYears();
      sendJson(res, 200, info);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 2a-2. Đặt năm học hiện tại đang chọn
  if (pathname === '/api/school-year/current' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const schoolYear = (body.schoolYear || '').trim();
      if (!schoolYear) {
        sendJson(res, 400, { error: 'Cần cung cấp schoolYear' });
        return true;
      }
      setCurrentSchoolYear(schoolYear);
      sendJson(res, 200, { success: true, currentYear: getCurrentSchoolYear() });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 2a-3. Tự động chuyển năm học và chuyển lớp (nguyên tử)
  if (pathname === '/api/school-year/transition' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { fromYear, toYear } = body;
      const result = transitionSchoolYear(fromYear, toYear);
      sendJson(res, 200, { success: true, ...result });
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
    return true;
  }

  // 2a-4. Lấy cấu hình ngày bắt đầu năm học
  if (pathname === '/api/school-year/settings' && method === 'GET') {
    try {
      const settings = getAcademicYearSettings();
      const currentCalculatedYear = getCurrentAcademicYear();
      const activeCurrentYear = getCurrentSchoolYear();
      sendJson(res, 200, {
        ...settings,
        currentCalculatedYear,
        activeCurrentYear
      });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 2a-5. Cập nhật cấu hình ngày bắt đầu năm học
  if (pathname === '/api/school-year/settings' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { startMonth, startDay } = body;
      const updated = setAcademicYearSettings(startMonth, startDay);
      const currentCalculatedYear = getCurrentAcademicYear();
      const activeCurrentYear = getCurrentSchoolYear();
      sendJson(res, 200, {
        success: true,
        ...updated,
        currentCalculatedYear,
        activeCurrentYear
      });
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
    return true;
  }

  // 2a-6. Kiểm tra năm học mới khi khởi động ứng dụng (Section VI & VIII)
  if (pathname === '/api/school-year/check-new' && method === 'GET') {
    try {
      const result = checkAndInitializeSchoolYear();
      sendJson(res, 200, result);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  return false;
}
