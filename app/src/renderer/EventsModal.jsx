import React, { useContext, useState } from 'react';
import { uid } from './utils.js';
import { dayLabel } from './calendar.js';
import { LogContext } from './App.jsx';
import { truncate } from './logService.js';

const WEEK = ['一', '二', '三', '四', '五', '六', '日'];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDT(v) {
  if (!v) return '';
  const [d, t] = String(v).split('T');
  if (!d) return t || '';
  const [, m, dd] = d.split('-');
  return `${Number(m)}-${Number(dd)} ${t || ''}`;
}

function EventForm({ onSave, onCancel }) {
  const [name, setName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const save = () => {
    if (!name.trim()) {
      alert('请填写日程名称');
      return;
    }
    onSave({ name: name.trim(), start, end, location: location.trim(), notes: notes.trim() });
  };

  return (
    <div className="evform">
      <input placeholder="日程名称（必填）" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="evform-row">
        <label>开始 <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></label>
        <label>结束 <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
      </div>
      <input placeholder="地点（可选）" value={location} onChange={(e) => setLocation(e.target.value)} />
      <input placeholder="备注（可选）" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="addbox-actions">
        <button className="primarybtn" onClick={save}>保存日程</button>
        <button className="ghostbtn" onClick={onCancel}>取消</button>
      </div>
    </div>
  );
}

// 大日历弹窗：翻月翻年、添加日程、红色「有日」标记、点击查看当天日程
export default function EventsModal({ data, update, onClose }) {
  const { log } = useContext(LogContext);
  const events = data.events || {};
  const [ym, setYm] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() + 1 };
  });
  const [sel, setSel] = useState(null);
  const [adding, setAdding] = useState(false);
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

  const changeYear = (delta) => setYm((p) => ({ y: p.y + delta, m: p.m }));

  const dayEvents = sel ? events[sel] || [] : [];

  const addEvent = (ev) => {
    log('plan', '您添加了日程：' + truncate(ev.name));
    update((d) => {
      const evs = { ...(d.events || {}) };
      evs[sel] = [...(evs[sel] || []), { id: uid(), ...ev }];
      return { ...d, events: evs };
    });
  };

  const removeEvent = (id) => {
    const ev = dayEvents.find((e) => e.id === id);
    log('plan', '您删除了日程：' + truncate(ev ? ev.name : ''));
    update((d) => {
      const evs = { ...(d.events || {}) };
      evs[sel] = (evs[sel] || []).filter((e) => e.id !== id);
      return { ...d, events: evs };
    });
  };

  return (
    <div className="modalback" onClick={onClose}>
      <div className="eventsmodal" onClick={(e) => e.stopPropagation()}>
        <div className="modalhead">
          <h3>日程日历</h3>
          <span className="hint">有日程的天会显示红色「有日」，点开可查看具体日程</span>
          <button className="iconbtn" onClick={onClose} style={{ marginLeft: 'auto' }}>✕</button>
        </div>
        <div className="eventsbody">
          <div className="eventscal">
            <div className="calhead">
              <button className="iconbtn" onClick={() => changeYear(-1)} title="上一年">«</button>
              <button className="iconbtn" onClick={() => changeMonth(-1)} title="上一月">‹</button>
              <div className="caltitle">{ym.y} 年 {ym.m} 月</div>
              <button className="iconbtn" onClick={() => changeMonth(1)} title="下一月">›</button>
              <button className="iconbtn" onClick={() => changeYear(1)} title="下一年">»</button>
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
                    className={'calcell' + (ds === today ? ' istoday' : '') + (ds === sel ? ' isselected' : '')}
                    onClick={() => {
                      setSel(ds);
                      setAdding(false);
                    }}
                  >
                    <span className="caldaynum">{Number(ds.slice(-2))}</span>
                    <span className="callabel">{dayLabel(ds)}</span>
                    {events[ds] && events[ds].length ? <span className="hasevent">有日</span> : null}
                  </button>
                ) : (
                  <div key={i} className="calcell empty" />
                )
              )}
            </div>
          </div>
          <div className="eventslist">
            <div className="eventslisthead">
              <b>{sel ? `${sel} 的日程` : '点击日期查看日程'}</b>
              {sel && (
                <button className="addbtn wide" onClick={() => setAdding(!adding)}>
                  {adding ? '收起' : '＋ 添加日程'}
                </button>
              )}
            </div>
            {adding && (
              <EventForm
                onSave={(ev) => {
                  addEvent(ev);
                  setAdding(false);
                }}
                onCancel={() => setAdding(false)}
              />
            )}
            {dayEvents.length === 0 && !adding && <div className="empty">当日暂无日程</div>}
            {dayEvents.map((e) => (
              <div key={e.id} className="evrow">
                <button className="evdel" onClick={() => removeEvent(e.id)} title="删除日程">🗑</button>
                <div className="evname">{e.name}</div>
                {(e.start || e.end) && (
                  <div className="evtime">{e.start ? fmtDT(e.start) : '?'} ~ {e.end ? fmtDT(e.end) : '?'}</div>
                )}
                {e.location && <div className="evloc">📍 {e.location}</div>}
                {e.notes && <div className="evnote">📝 {e.notes}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
