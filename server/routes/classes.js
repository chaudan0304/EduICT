import { sendJson, parseJsonBody } from './helpers.js';
import {
  getAllClassesWithStudents,
  getStudentStatistics,
  saveOrUpdateClass,
  deleteClassById,
  saveStudentsForClass,
  sortAllStudentsInDatabase,
  batchImportClassesAndStudents,
  getDbBrokenMachines,
  saveDbBrokenMachines,
  getDbRules,
  saveDbRules
} from '../db.js';

export async function tryHandleClasses(req, res, ctx) {
  const { pathname, method } = ctx;

  // 2. Lấy toàn bộ danh sách lớp (hỗ trợ lọc theo schoolYear)
  if (pathname === '/api/classes' && method === 'GET') {
    try {
      const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const schoolYear = urlObj.searchParams.get('schoolYear') || null;
      const classes = getAllClassesWithStudents(schoolYear);
      sendJson(res, 200, classes);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 2b. Lấy thống kê số lượng học sinh & lớp theo khối và toàn trường
  if (pathname === '/api/statistics/students' && method === 'GET') {
    try {
      const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const schoolYear = urlObj.searchParams.get('schoolYear') || null;
      const stats = getStudentStatistics(schoolYear);
      sendJson(res, 200, stats);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 3. Tạo mới / cập nhật lớp
  if (pathname === '/api/classes' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      saveOrUpdateClass(body);
      sendJson(res, 201, { success: true });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 3b. Import hàng loạt nhiều lớp từ Excel (POST /api/classes/batch-import)
  if (pathname === '/api/classes/batch-import' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = batchImportClassesAndStudents(body);
      sendJson(res, 200, result);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 4. Xóa lớp học
  if (pathname.startsWith('/api/classes/') && method === 'DELETE') {
    const classId = pathname.replace('/api/classes/', '');
    try {
      deleteClassById(classId);
      sendJson(res, 200, { success: true });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 5. Cập nhật học sinh trong lớp (PUT /api/classes/:id/students)
  if (pathname.match(/^\/api\/classes\/[^/]+\/students$/) && method === 'PUT') {
    const parts = pathname.split('/');
    const classId = parts[3];
    try {
      const body = await parseJsonBody(req);
      const studentsList = Array.isArray(body) ? body : (body.students || []);
      saveStudentsForClass(classId, studentsList);
      sendJson(res, 200, { success: true });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 5b. Sắp xếp lại danh sách học sinh theo thứ tự A - Z chuẩn tiếng Việt (POST /api/classes/sort-students)
  if (pathname === '/api/classes/sort-students' && method === 'POST') {
    try {
      const result = sortAllStudentsInDatabase();
      sendJson(res, 200, { success: true, ...result });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 6. Danh sách máy hỏng (GET / POST)
  if (pathname === '/api/broken-machines') {
    if (method === 'GET') {
      try {
        const machines = getDbBrokenMachines();
        sendJson(res, 200, machines);
      } catch (err) {
        sendJson(res, 500, { error: err.message });
      }
      return true;
    }
    if (method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const machines = Array.isArray(body) ? body : (body.machines || []);
        saveDbBrokenMachines(machines);
        sendJson(res, 200, { success: true });
      } catch (err) {
        sendJson(res, 500, { error: err.message });
      }
      return true;
    }
  }

  // 7. Quản lý Nội quy phòng máy & Tiêu chí cộng/trừ điểm (GET / POST)
  if (pathname === '/api/rules') {
    if (method === 'GET') {
      try {
        const rules = getDbRules();
        sendJson(res, 200, rules);
      } catch (err) {
        sendJson(res, 500, { error: err.message });
      }
      return true;
    }
    if (method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const rules = Array.isArray(body) ? body : (body.rules || []);
        saveDbRules(rules);
        sendJson(res, 200, { success: true });
      } catch (err) {
        sendJson(res, 500, { error: err.message });
      }
      return true;
    }
  }

  return false;
}
