export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function shiftDate(dateStr, delta) {
  const [y, m, dd] = dateStr.split('-').map(Number);
  const d = new Date(y, m - 1, dd + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function weekdayCn(dateStr) {
  const [y, m, dd] = dateStr.split('-').map(Number);
  const names = ['日', '一', '二', '三', '四', '五', '六'];
  return '星期' + names[new Date(y, m - 1, dd).getDay()];
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function defaultDay() {
  return { routine: {}, lists: {}, reading: [], summary: '', tomorrow: '' };
}
