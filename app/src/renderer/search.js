// 全局搜索：扫描计划（每日清单/总结/次日计划/读书）、日记、体系，返回包含关键词的整句
export function runSearch(data, q) {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const results = [];

  // 取包含 idx 的完整句子（以 。！？!?；;\n 断句）
  function sentenceAround(text, idx) {
    const re = /[。！？!?；;\n]/g;
    let start = 0;
    let m;
    while ((m = re.exec(text)) && m.index < idx) start = m.index + 1;
    let end = text.length;
    const rest = text.slice(idx);
    const m2 = rest.match(/[。！？!?；;\n]/);
    if (m2) end = idx + m2.index + 1;
    return text.slice(start, end).trim();
  }

  const scan = (text, tab, label, sub, target) => {
    if (!text) return;
    const lower = text.toLowerCase();
    let idx = lower.indexOf(query);
    let count = 0;
    while (idx !== -1 && count < 5) {
      results.push({
        tab,
        label,
        sub,
        snippet: sentenceAround(text, idx),
        target: { ...target, matchIdx: idx, matchLen: query.length },
      });
      count++;
      idx = lower.indexOf(query, idx + query.length);
    }
  };

  const days = data.days || {};
  const dates = Object.keys(days).sort();
  for (const date of dates) {
    const day = days[date];
    if (!day) continue;

    // 计划
    const lists = day.lists || {};
    for (const colId of Object.keys(lists)) {
      for (const it of lists[colId] || []) {
        scan(it.text, 'daily', '计划', date, { tab: 'daily', date, colId, itemId: it.id });
        scan(it.reason, 'daily', '计划', `${date}（未完成原因）`, { tab: 'daily', date, colId, itemId: it.id });
      }
    }
    (day.reading || []).forEach((r) => {
      scan(r.content, 'daily', '计划', `${date} · 读书`, { tab: 'daily', date, field: 'reading' });
      scan(r.feeling, 'daily', '计划', `${date} · 读书`, { tab: 'daily', date, field: 'reading' });
    });
    scan(day.summary, 'daily', '计划', `${date} · 总结`, { tab: 'daily', date, field: 'summary' });
    scan(day.tomorrow, 'daily', '计划', `${date} · 次日计划`, { tab: 'daily', date, field: 'tomorrow' });

    // 日记
    const di = day.diary;
    if (di) {
      const fields = [
        ['events', '事件'],
        ['thoughts', '思考'],
        ['mood', '感受'],
        ['essays', '随笔'],
        ['music', '今日音乐'],
        ['weather', '天气'],
      ];
      for (const [k, name] of fields) {
        scan(di[k], 'diary', '日记', `${date} · ${name}`, { tab: 'diary', date, field: k });
      }
    }
  }

  // 体系
  for (const n of data.systems || []) {
    scan(n.title, 'systems', '体系', n.title, { tab: 'systems', nodeId: n.id });
    scan(n.content, 'systems', '体系', n.title, { tab: 'systems', nodeId: n.id });
  }

  return results.slice(0, 80);
}
