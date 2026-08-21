import { Solar } from 'lunar-javascript';

const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六'];

export function weekdayOf(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return WEEK_CN[new Date(y, m - 1, d).getDay()];
}

// 某天的：节日（公历+农历）、节气、农历日
export function dayExtra(dateStr) {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const solar = Solar.fromYmd(y, m, d);
    const lunar = solar.getLunar();
    const festivals = [...new Set([...(lunar.getFestivals() || []), ...(solar.getFestivals() || [])])];
    const jieqi = lunar.getJieQi();
    return { festivals, jieqi, lunarDay: lunar.getDayInChinese() };
  } catch (e) {
    return { festivals: [], jieqi: '', lunarDay: '' };
  }
}

// 日历格子上显示的文字：节日 > 节气 > 农历日
export function dayLabel(dateStr) {
  const ex = dayExtra(dateStr);
  if (ex.festivals.length) return ex.festivals[0];
  if (ex.jieqi) return ex.jieqi;
  return ex.lunarDay || '';
}
