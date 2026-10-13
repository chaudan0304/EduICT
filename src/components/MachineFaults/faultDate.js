export function faultDate(value) {
  if (!value) return 'Chưa ghi nhận';
  const date = new Date(value.includes('T') ? value : value.replace(' ', 'T') + 'Z');
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
}
