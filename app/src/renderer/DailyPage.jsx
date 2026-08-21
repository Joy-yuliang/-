import React, { useEffect, useMemo, useState } from 'react';
import { todayStr, shiftDate, weekdayCn, uid, defaultDay } from './utils.js';
import CalendarPicker from './CalendarPicker.jsx';
import EventsModal from './EventsModal.jsx';
import ExpandableTextarea from './ExpandableTextarea.jsx';

export default function DailyPage({ data, update, jump, onJumpDismiss, searchOpen }) {
  const [date, setDate] = useState(todayStr());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);
  const day = data.days[date] || defaultDay();

  const routines = [...data.routines].sort((a, b) => a.sort - b.sort);
  const columns = [...data.columns].sort((a, b) => a.sort - b.sort);
  const isToday = date === todayStr();
  const jumpActive = jump && jump.target && jump.target.tab === 'daily';

  // 搜索跳转：切日期 + 定位到目标元素（文字框则选中搜索词）
  useEffect(() => {
    if (!jump || !jump.target || jump.target.tab !== 'daily') return;
    const t = jump.target;
    if (t.date) setDate(t.date);
    const tid = setTimeout(() => {
      let el = null;
      if (t.itemId) el = document.getElementById('item-' + t.itemId);
      else if (t.field === 'summary') el = document.getElementById('field-summary');
      else if (t.field === 'tomorrow') el = document.getElementById('field-tomorrow');
      else if (t.field === 'reading') el = document.getElementById('field-reading');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('jumpflash');
        setTimeout(() => el.classList.remove('jumpflash'), 2000);
        if (el.tagName === 'TEXTAREA' && t.matchIdx != null) {
          el.focus();
          try {
            el.setSelectionRange(t.matchIdx, t.matchIdx + (t.matchLen || 0));
          } catch (e) {
            // ignore
          }
        }
      }
    }, 200);
    return () => clearTimeout(tid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump && jump.id]);

  // ---- 修改某一天 ----
  const patchDay = (fn, targetDate = date) =>
    update((d) => {
      const days = { ...d.days };
      const cur = days[targetDate] ? structuredClone(days[targetDate]) : defaultDay();
      days[targetDate] = fn(cur);
      return { ...d, days };
    });

  // ---- 例行公事 ----
  const setRoutine = (rid, status) =>
    patchDay((cur) => {
      const routine = { ...cur.routine };
      if (status === 'todo') delete routine[rid];
      else routine[rid] = { status, reason: (routine[rid] && routine[rid].reason) || '' };
      return { ...cur, routine };
    });

  const setRoutineReason = (rid, reason) =>
    patchDay((cur) => {
      const routine = { ...cur.routine };
      if (!routine[rid]) routine[rid] = { status: 'missed', reason: '' };
      routine[rid] = { ...routine[rid], reason };
      return { ...cur, routine };
    });

  // ---- 清单栏目 ----
  const addItem = (colId, text) =>
    patchDay((cur) => {
      const lists = { ...cur.lists };
      lists[colId] = [...(lists[colId] || []), { id: uid(), text, status: 'todo', reason: '' }];
      return { ...cur, lists };
    });

  const setItem = (colId, itemId, patch) =>
    patchDay((cur) => {
      const lists = { ...cur.lists };
      lists[colId] = (lists[colId] || []).map((it) => (it.id === itemId ? { ...it, ...patch } : it));
      return { ...cur, lists };
    });

  const removeItem = (colId, itemId) =>
    patchDay((cur) => {
      const lists = { ...cur.lists };
      lists[colId] = (lists[colId] || []).filter((it) => it.id !== itemId);
      return { ...cur, lists };
    });

  // ---- 读书 ----
  const addReading = () =>
    patchDay((cur) => ({ ...cur, reading: [...cur.reading, { id: uid(), content: '', feeling: '', minutes: '' }] }));
  const patchReading = (id, patch) =>
    patchDay((cur) => ({ ...cur, reading: cur.reading.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  const removeReading = (id) =>
    patchDay((cur) => ({ ...cur, reading: cur.reading.filter((r) => r.id !== id) }));

  // ---- 文本 ----
  const setSummary = (v) => patchDay((cur) => ({ ...cur, summary: v }));
  const setTomorrow = (v) => patchDay((cur) => ({ ...cur, tomorrow: v }));

  // ---- 临时起意 → 复制到明天安排（今天的记录保留，计划也是日记的一部分）----
  const copyToTomorrow = (colId, itemId) => {
    const tomorrow = shiftDate(date, 1);
    update((d) => {
      const days = structuredClone(d.days);
      const cur = days[date] ? structuredClone(days[date]) : defaultDay();
      const item = (cur.lists[colId] || []).find((it) => it.id === itemId);
      if (!item) return d;
      const tmr = days[tomorrow] ? structuredClone(days[tomorrow]) : defaultDay();
      tmr.lists.arrange = [...(tmr.lists.arrange || []), { id: uid(), text: item.text, status: 'todo', reason: '' }];
      days[date] = cur;
      days[tomorrow] = tmr;
      return { ...d, days };
    });
  };

  // ---- 进度 ----
  const progress = useMemo(() => {
    let total = routines.length;
    let done = routines.filter((r) => day.routine[r.id] && day.routine[r.id].status === 'done').length;
    for (const col of columns) {
      if (col.type !== 'checklist') continue;
      const items = (day.lists[col.id] || []).filter((it) => it.text);
      total += items.length;
      done += items.filter((it) => it.status === 'done').length;
    }
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [day, routines, columns]);

  const exportDay = async () => {
    await window.api.exportDay(date);
  };

  return (
    <main className="daily">
      {jumpActive && searchOpen && <button className="jumpback" onClick={onJumpDismiss}>← 返回搜索</button>}

      <header className="dayhead">
        <div className="daynav">
          <button className="iconbtn" onClick={() => setDate(shiftDate(date, -1))} title="前一天">‹</button>
          <div className="daytitle">
            <div className="date clickable" onClick={() => setPickerOpen(true)} title="点击弹出日历选择日期">
              {date} <span className="weekday">{weekdayCn(date)}</span>
              {isToday && <span className="todaytag">今天</span>}
            </div>
            <div className="progressline">
              <div className="progressbar"><div className="progressfill" style={{ width: progress.pct + '%' }} /></div>
              <span className="progresstext">{progress.done}/{progress.total} 已完成</span>
            </div>
          </div>
          <button className="iconbtn" onClick={() => setDate(shiftDate(date, 1))} title="后一天">›</button>
          {!isToday && <button className="ghostbtn" onClick={() => setDate(todayStr())}>回到今天</button>}
          <button className="ghostbtn" onClick={() => setEventsOpen(true)}>📅 日历</button>
        </div>
        <button className="primarybtn" onClick={exportDay}>导出安排</button>
      </header>

      <section className="card routine">
        <h2 className="cardtitle">例行公事 <span className="hint">每日 SOP 轨道 · 可到设置里调整</span></h2>
        <ul className="checklist">
          {routines.map((r) => {
            const st = day.routine[r.id];
            const status = st ? st.status : 'todo';
            return (
              <li key={r.id} className={status === 'done' ? 'item done' : status === 'missed' ? 'item missed' : 'item'}>
                <button
                  className={status === 'done' ? 'check checked' : 'check'}
                  onClick={() => setRoutine(r.id, status === 'done' ? 'todo' : 'done')}
                  title="完成 / 取消"
                >
                  {status === 'done' ? '✓' : ''}
                </button>
                <span className="text">{r.name}</span>
                <button
                  className={status === 'missed' ? 'missbtn active' : 'missbtn'}
                  onClick={() => setRoutine(r.id, status === 'missed' ? 'todo' : 'missed')}
                  title="标记未完成（记录原因，第二天纠正）"
                >
                  ✗
                </button>
                {status === 'missed' && (
                  <input
                    className="reason"
                    placeholder="未完成原因（如实记录，第二天纠正）"
                    value={st.reason || ''}
                    onChange={(e) => setRoutineReason(r.id, e.target.value)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="cols">
        {columns.map((col) => (
          <section key={col.id} className="card">
            <h2 className="cardtitle">{col.name}</h2>
            {col.type === 'checklist' && (
              <ChecklistCol
                colId={col.id}
                items={day.lists[col.id] || []}
                onAdd={addItem}
                onSet={setItem}
                onRemove={removeItem}
                onCopyTomorrow={col.id === 'spur' ? copyToTomorrow : null}
              />
            )}
            {col.type === 'reading' && (
              <div id="field-reading">
                <ReadingCol reading={day.reading || []} onAdd={addReading} onPatch={patchReading} onRemove={removeReading} />
              </div>
            )}
            {col.type === 'text' && (
              <ExpandableTextarea
                id="field-summary"
                value={day.summary || ''}
                onChange={setSummary}
                placeholder="写日记、写感悟、做总结反思…（SOP 第 6 步）"
                minHeight={180}
              />
            )}
          </section>
        ))}
      </div>

      <section className="card">
        <h2 className="cardtitle">次日计划 <span className="hint">今晚规划明天，明天无需纠结</span></h2>
        <ExpandableTextarea
          id="field-tomorrow"
          value={day.tomorrow || ''}
          onChange={setTomorrow}
          placeholder="明天的安排、要读的书、要纠正的未完成项…"
          minHeight={160}
        />
      </section>

      {pickerOpen && <CalendarPicker initial={date} onSelect={setDate} onClose={() => setPickerOpen(false)} />}
      {eventsOpen && <EventsModal data={data} update={update} onClose={() => setEventsOpen(false)} />}
    </main>
  );
}

function ChecklistCol({ colId, items, onAdd, onSet, onRemove, onCopyTomorrow }) {
  const [text, setText] = useState('');
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState('');
  const visible = items.filter((it) => it.text);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onAdd(colId, t);
    setText('');
  };

  const startEdit = (it) => {
    setEditId(it.id);
    setDraft(it.text);
  };

  const commitEdit = (it) => {
    const t = draft.trim();
    if (t && t !== it.text) onSet(colId, it.id, { text: t });
    setEditId(null);
  };

  return (
    <div className="colwrap">
      <ul className="checklist">
        {visible.map((it) => (
          <li key={it.id} id={'item-' + it.id} className={it.status === 'done' ? 'item done' : it.status === 'missed' ? 'item missed' : 'item'}>
            <button
              className={it.status === 'done' ? 'check checked' : 'check'}
              onClick={() => onSet(colId, it.id, { status: it.status === 'done' ? 'todo' : 'done' })}
            >
              {it.status === 'done' ? '✓' : ''}
            </button>
            {editId === it.id ? (
              <input
                className="itemedit"
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => commitEdit(it)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit(it);
                  if (e.key === 'Escape') setEditId(null);
                }}
              />
            ) : (
              <span className="text editable" onClick={() => startEdit(it)} title="点击文字可修改">
                {it.text}
              </span>
            )}
            <button
              className={it.status === 'missed' ? 'missbtn active' : 'missbtn'}
              onClick={() => onSet(colId, it.id, { status: it.status === 'missed' ? 'todo' : 'missed' })}
              title="标记未完成"
            >
              ✗
            </button>
            {onCopyTomorrow && (
              <button className="tomorrowbtn" onClick={() => onCopyTomorrow(colId, it.id)} title="复制到明天的安排（今天的记录保留）">复制→明天</button>
            )}
            <button className="delbtn" onClick={() => onRemove(colId, it.id)} title="删除">🗑</button>
            {it.status === 'missed' && (
              <input
                className="reason"
                placeholder="未完成原因"
                value={it.reason || ''}
                onChange={(e) => onSet(colId, it.id, { reason: e.target.value })}
              />
            )}
          </li>
        ))}
        {!visible.length && <li className="empty">暂无内容</li>}
      </ul>
      <div className="addrow">
        <input
          className="addinput"
          placeholder="添加一条…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button className="addbtn" onClick={submit}>+</button>
      </div>
    </div>
  );
}

function ReadingCol({ reading, onAdd, onPatch, onRemove }) {
  return (
    <div className="colwrap">
      {reading.map((r) => (
        <div key={r.id} className="readingrow">
          <input className="read-content" placeholder="读了什么（书名 / 文章 + 内容）" value={r.content} onChange={(e) => onPatch(r.id, { content: e.target.value })} />
          <input className="read-feel" placeholder="感受" value={r.feeling} onChange={(e) => onPatch(r.id, { feeling: e.target.value })} />
          <input className="read-min" placeholder="分钟" type="number" min="0" value={r.minutes} onChange={(e) => onPatch(r.id, { minutes: e.target.value })} />
          <button className="delbtn" onClick={() => onRemove(r.id)} title="删除">🗑</button>
        </div>
      ))}
      {!reading.length && <div className="empty">读完写下来：内容 + 感受 + 时长（目标 ≥ 1 小时）</div>}
      <button className="addbtn wide" onClick={onAdd}>+ 添加读书记录</button>
    </div>
  );
}
