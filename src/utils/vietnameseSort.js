/**
 * Thuật toán sắp xếp học sinh theo bảng chữ cái tiếng Việt (A - Z)
 * Quy chuẩn theo quy định của Bộ Giáo Dục & Đào Tạo:
 * 1. Tách chuỗi Họ & Tên thành các từ. Từ cuối cùng được coi là Tên gọi chính (First name).
 * 2. So sánh Tên gọi chính trước bằng bảng chữ cái tiếng Việt (Collation 'vi').
 * 3. Nếu trùng Tên gọi chính, so sánh phần Họ và Tên đệm (tất cả các từ đứng trước).
 * 4. Nếu trùng hoàn toàn Họ & Tên, so sánh Ngày sinh (nếu có) và Mã học sinh (ID).
 */

export function compareVietnameseNames(a, b) {
  const nameA = (typeof a === 'string' ? a : (a?.name || '')).trim();
  const nameB = (typeof b === 'string' ? b : (b?.name || '')).trim();
  if (!nameA && !nameB) return 0;
  if (!nameA) return 1;
  if (!nameB) return -1;

  const partsA = nameA.split(/\s+/);
  const partsB = nameB.split(/\s+/);

  const firstNameA = partsA[partsA.length - 1];
  const firstNameB = partsB[partsB.length - 1];

  // 1. So sánh Tên chính theo bảng chữ cái tiếng Việt
  const cmpFirst = firstNameA.localeCompare(firstNameB, 'vi', { numeric: true, sensitivity: 'accent' });
  if (cmpFirst !== 0) return cmpFirst;

  // 2. Cùng Tên -> So sánh Họ và tên đệm
  const restA = partsA.slice(0, -1).join(' ');
  const restB = partsB.slice(0, -1).join(' ');
  const cmpRest = restA.localeCompare(restB, 'vi', { numeric: true, sensitivity: 'accent' });
  if (cmpRest !== 0) return cmpRest;

  // 3. Nếu họ tên giống nhau -> So sánh ngày sinh
  const dobA = typeof a === 'object' && a?.dob ? String(a.dob).trim() : '';
  const dobB = typeof b === 'object' && b?.dob ? String(b.dob).trim() : '';
  if (dobA && dobB && dobA !== dobB) {
    return dobA.localeCompare(dobB);
  }

  // 4. Phân định cuối cùng theo id nếu là đối tượng
  const idA = typeof a === 'object' && a?.id ? String(a.id) : '';
  const idB = typeof b === 'object' && b?.id ? String(b.id) : '';
  return idA.localeCompare(idB);
}

/**
 * Hàm tiện ích sắp xếp danh sách học sinh theo thứ tự A - Z chuẩn tiếng Việt
 * @param {Array} students Mảng học sinh
 * @returns {Array} Mảng học sinh mới đã được sắp xếp A - Z
 */
export function sortStudentsVietnamese(students) {
  if (!Array.isArray(students)) return [];
  return [...students].sort(compareVietnameseNames);
}
