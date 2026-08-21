import React, { useState } from 'react';
import { dayLabel } from './calendar.js';

const WEEK = ['一', '二', '三', '四', '五', '六', '日'];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 小型日历弹出框：点日期选择后关闭
export default function CalendarPicker({ initial, onSelect, onClose }) {
  const [ym, setYm] = useState(() => {
    const [y, m] = (initial || todayStr()).split('-').map(Number);
    return { y: y || new Date().getFullYear(), m: m || new Date().getMonth() + 1 };
  });
  const today = todayStr();

  const cells = (() => {
    const first = new Date(ym.y, ym.m - 1, 1);
    const start = (first.getDay() + 6) % 7;
    const total = new Date(ym.y, ym.m, 0).getDate();
    const arr = [];
    for (let i = 0; i < start; i++) arr.push(null);
    for (let d = 1; d <= total; d++) {
      arr.push(`${ym.y}-${String(ym.m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  })();

  const changeMonth = (delta) =>
    setYm((p) => {
      let m = p.m + delta;
      let y = p.y;
      if (m < 1) { m = 12; y--; }
      if (m > 12) { m = 1; y++; }
      return { y, m };
    });

  return (
    <div className="modalback" onClick={onClose}>
      <div className="calpick" onClick={(e) => e.stopPropagation()}>
        <div className="calhead">
          <button className="iconbtn" onClick={() => changeMonth(-1)} title="上一月">‹</button>
          <div className="caltitle">{ym.y} 年 {ym.m} 月</div>
          <button className="iconbtn" onClick={() => changeMonth(1)} title="下一月">›</button>
        </div>
        <div className="calweek">
          {WEEK.map((w) => (
            <div key={w} className="calweekcell">{w}</div>
          ))}
        </div>
        <div className="calgrid">
          {cells.map((ds, i) =>
            ds ? (
              <button
                key={i}
                className={'calcell' + (ds === today ? ' istoday' : '')}
                onClick={() => {
                  onSelect(ds);
                  onClose();
                }}
              >
                <span className="caldaynum">{Number(ds.slice(-2))}</span>
                <span className="callabel">{dayLabel(ds)}</span>
              </button>
            ) : (
              <div key={i} className="calcell empty" />
            )
          )}
        </div>
      </div>
    </div>
  );
}
