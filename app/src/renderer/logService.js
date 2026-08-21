import { uid } from './utils.js';

// 日志分类
export const LOG_CATEGORY = { PLAN: 'plan', DIARY: 'diary', SYSTEM: 'system' };

// 中文标签（日志页分类标签用）
export const LOG_LABEL = { plan: '计划', diary: '日记', system: '体系' };

// 截断：超过 max 个字符（中文按字计）则保留前 max 个加省略号
export function truncate(text, max = 20) {
  const s = String(text == null ? '' : text);
  if (s.length <= max) return s;
  return s.slice(0, max) + '…';
}

// 生成一条日志（时间戳 ISO 字符串，显示时按本机时区取 时:分）
export function makeLog(category, message) {
  return {
    id: uid(),
    timestamp: new Date().toISOString(),
    category,
    message: String(message == null ? '' : message),
  };
}

// 本地时间 → 对象 {y, m, d, hh, mm, weekday}
export function parseLocal(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return {
    y: d.getFullYear(),
    m: d.getMonth() + 1,
    d: d.getDate(),
    hh: String(d.getHours()).padStart(2, '0'),
    mm: String(d.getMinutes()).padStart(2, '0'),
    weekday: '星期' + ['日', '一', '二', '三', '四', '五', '六'][d.getDay()],
  };
}
