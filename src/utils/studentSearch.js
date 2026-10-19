// Normalize only for searching; keep the original student name and ID intact.
export function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchesStudentSearch(student, query) {
  const search = normalizeSearchText(query);
  if (!search) return true;
  return [student?.name, student?.id, student?.machineNumber ? `máy ${student.machineNumber}` : '']
    .some(value => normalizeSearchText(value).includes(search));
}
