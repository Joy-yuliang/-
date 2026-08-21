const { app, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
const { Solar } = require('lunar-javascript');

function line(text, opts) {
  return new Paragraph({
    children: [new TextRun(text, opts || {})],
    spacing: { after: 120 },
  });
}

async function saveDoc(win, children, defaultName, title) {
  const doc = new Document({ sections: [{ children }] });
  const buf = await Packer.toBuffer(doc);

  const result = await dialog.showSaveDialog(win, {
    title,
    defaultPath: path.join(app.getPath('documents'), defaultName),
    filters: [{ name: 'Word 文档', extensions: ['docx'] }],
  });
  if (result.canceled || !result.filePath) return { ok: false, canceled: true };

  fs.writeFileSync(result.filePath, buf);
  shell.showItemInFolder(result.filePath);
  return { ok: true, path: result.filePath };
}

async function exportDay(win, data, dateStr) {
  const day = data.days[dateStr] || {};
  const routines = data.routines.slice().sort((a, b) => a.sort - b.sort);
  const columns = data.columns.slice().sort((a, b) => a.sort - b.sort);

  const children = [];
  children.push(new Paragraph({
    text: `${dateStr} · 每日安排`,
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 240 },
  }));

  // 例行公事
  children.push(new Paragraph({ text: '例行公事（每日 SOP）', heading: HeadingLevel.HEADING_2 }));
  for (const r of routines) {
    const st = day.routine && day.routine[r.id];
    const mark = st && st.status === 'done' ? '☑' : st && st.status === 'missed' ? '✗' : '☐';
    const reason = st && st.status === 'missed' && st.reason ? `　（未完成原因：${st.reason}）` : '';
    children.push(line(`${mark} ${r.name}${reason}`));
  }

  // 各栏目
  for (const col of columns) {
    children.push(new Paragraph({ text: col.name, heading: HeadingLevel.HEADING_2 }));
    if (col.type === 'checklist') {
      const items = (day.lists && day.lists[col.id] || []).filter((i) => i && i.text);
      if (!items.length) {
        children.push(line('（无）', { italics: true, color: '888888' }));
      }
      for (const it of items) {
        const mark = it.status === 'done' ? '☑' : it.status === 'missed' ? '✗' : '☐';
        const reason = it.status === 'missed' && it.reason ? `　（未完成原因：${it.reason}）` : '';
        children.push(line(`${mark} ${it.text}${reason}`));
      }
    } else if (col.type === 'reading') {
      const items = day.reading || [];
      if (!items.length) {
        children.push(line('（无）', { italics: true, color: '888888' }));
      }
      for (const it of items) {
        const parts = [];
        if (it.content) parts.push(it.content);
        if (it.feeling) parts.push(`感受：${it.feeling}`);
        if (it.minutes) parts.push(`${it.minutes} 分钟`);
        children.push(line(parts.join('　|　')));
      }
    } else if (col.type === 'text') {
      children.push(line(day.summary || '（无）', day.summary ? {} : { italics: true, color: '888888' }));
    }
  }

  if (day.tomorrow) {
    children.push(new Paragraph({ text: '次日计划', heading: HeadingLevel.HEADING_2 }));
    children.push(line(day.tomorrow));
  }

  return saveDoc(win, children, `${dateStr}-每日安排.docx`, '导出当天安排（可用 WPS 打开）');
}

function dateInfo(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const week = ['日', '一', '二', '三', '四', '五', '六'][new Date(y, m - 1, d).getDay()];
  let festival = '';
  try {
    const solar = Solar.fromYmd(y, m, d);
    const lunar = solar.getLunar();
    const fests = [...new Set([...(lunar.getFestivals() || []), ...(solar.getFestivals() || [])])];
    const jq = lunar.getJieQi();
    festival = [...fests, jq].filter(Boolean).join(' · ');
  } catch (e) {
    // 忽略农历库异常
  }
  return { y, m, d, week, festival };
}

async function exportDiary(win, data, dateStr) {
  const day = data.days[dateStr] || {};
  const di = day.diary || {};
  const info = dateInfo(dateStr);

  const children = [];
  const head = `${info.y} 年 ${info.m} 月 ${info.d} 日 星期${info.week}${info.festival ? ' · ' + info.festival : ''}`;
  children.push(new Paragraph({ text: head, heading: HeadingLevel.HEADING_1, spacing: { after: 240 } }));

  const meta = [];
  if (di.music) meta.push(`今日音乐：${di.music}`);
  if (di.weather) meta.push(`天气：${di.weather}`);
  if (meta.length) children.push(line(meta.join('　')));

  const sections = [
    ['事件', di.events],
    ['思考', di.thoughts],
    ['感受', di.mood],
    ['随笔', di.essays],
  ];
  for (const [title, text] of sections) {
    children.push(new Paragraph({ text: title, heading: HeadingLevel.HEADING_2 }));
    const t = text && text.trim();
    children.push(line(t ? t : '（无）', t ? {} : { italics: true, color: '888888' }));
  }

  return saveDoc(win, children, `${dateStr}-日记.docx`, '导出日记（可用 WPS 打开）');
}

const LOG_CAT_NAME = { plan: '计划', diary: '日记', system: '体系' };
const LOG_CAT_COLOR = { plan: '2563EB', diary: '059669', system: 'D97706' };

// 导出全部操作日志：标题 + 月份标题（YYYY年M月）+ 日期标题（M月D日 星期X）+ 每条（HH:mm 分类 消息）
async function exportLogs(win, data) {
  const logs = (data.logs || []).slice().sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
  const children = [];
  children.push(new Paragraph({ text: '操作日志', heading: HeadingLevel.HEADING_1, spacing: { after: 240 } }));

  if (!logs.length) {
    children.push(line('（暂无日志）', { italics: true, color: '888888' }));
    return saveDoc(win, children, '操作日志.docx', '导出操作日志（可用 WPS 打开）');
  }

  let lastMonth = '';
  let lastDate = '';
  for (const lg of logs) {
    const d = new Date(lg.timestamp);
    if (isNaN(d.getTime())) continue;
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const dd = d.getDate();
    const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    const monthKey = `${y}-${m}`;
    const dateKey = `${y}-${m}-${dd}`;
    if (monthKey !== lastMonth) {
      children.push(new Paragraph({ text: `${y}年${m}月`, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } }));
      lastMonth = monthKey;
    }
    if (dateKey !== lastDate) {
      children.push(new Paragraph({
        children: [new TextRun({ text: `${m}月${dd}日 星期${week}`, bold: true, size: 24 })],
        spacing: { before: 120, after: 80 },
      }));
      lastDate = dateKey;
    }
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `${hh}:${mm}`, color: '888888' }),
        new TextRun({ text: '　' }),
        new TextRun({
          text: LOG_CAT_NAME[lg.category] || lg.category,
          color: LOG_CAT_COLOR[lg.category] || '333333',
          bold: true,
        }),
        new TextRun({ text: '　' }),
        new TextRun({ text: lg.message || '' }),
      ],
      spacing: { after: 100 },
    }));
  }

  return saveDoc(win, children, '操作日志.docx', '导出操作日志（可用 WPS 打开）');
}

module.exports = { exportDay, exportDiary, exportLogs };
