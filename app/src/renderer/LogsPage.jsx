import React, { useEffect, useRef } from 'react';
import { LOG_LABEL, parseLocal } from './logService.js';

// 操作日志页：按时间正序（早→晚），最新在底部；同年日期分隔 + 跨年/首条年份标题
export default function LogsPage({ data }) {
  const listRef = useRef(null);
  const logs = [...(data.logs || [])].sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));

  // 打开页面 / 新增日志时自动滚动到最新（底部）
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [logs.length]);

  // 生成带日期分隔的展示行
  const rows = [];
  let lastDate = null;
  let lastYear = null;
  let isFirst = true;
  for (const lg of logs) {
    const p = parseLocal(lg.timestamp);
    if (!p) continue;
    const dateKey = `${p.y}-${p.m}-${p.d}`;
    if (isFirst || p.y !== lastYear) {
      rows.push({ type: 'year', y: p.y });
      lastYear = p.y;
    }
    if (isFirst || dateKey !== lastDate) {
      rows.push({ type: 'date', text: `${p.m}月${p.d}日 ${p.weekday}` });
      lastDate = dateKey;
    }
    isFirst = false;
    rows.push({ type: 'log', log: lg, time: `${p.hh}:${p.mm}` });
  }

  return (
    <main className="logs">
      <header className="logshead">
        <h1>操作日志</h1>
        <span className="hint">{logs.length} 条记录 · 计划/日记/体系的操作都会记在这里</span>
      </header>
      {logs.length === 0 ? (
        <div className="emptybox">
          <p>还没有操作日志。</p>
          <p className="hint">在计划、日记、体系页面进行添加 / 编辑 / 完成等操作后，会自动记录在这里。</p>
        </div>
      ) : (
        <div className="logslist" ref={listRef}>
          {rows.map((r, i) =>
            r.type === 'year' ? (
              <div key={i} className="logyear">{r.y}年</div>
            ) : r.type === 'date' ? (
              <div key={i} className="logdate">{r.text}</div>
            ) : (
              <div key={r.log.id} className="logrow">
                <span className="logtime">{r.time}</span>
                <span className={'logtag ' + (r.log.category === 'diary' ? 'diary' : r.log.category === 'system' ? 'system' : '')}>
                  {LOG_LABEL[r.log.category] || r.log.category}
                </span>
                <span className="logmsg">{r.log.message}</span>
              </div>
            )
          )}
        </div>
      )}
    </main>
  );
}
