import React, { useEffect, useState } from 'react';
import { todayStr, defaultDay } from './utils.js';
import { weekdayOf, dayExtra } from './calendar.js';
import CalendarPicker from './CalendarPicker.jsx';
import ExpandableTextarea from './ExpandableTextarea.jsx';

function fmtCn(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${y} 年 ${m} 月 ${d} 日 星期${weekdayOf(dateStr)}`;
}

export default function DiaryPage({ data, update, jump, onJumpDismiss, searchOpen }) {
  const today = todayStr();
  const [sel, setSel] = useState(today);
  const [pickerOpen, setPickerOpen] = useState(false);
  const jumpActive = jump && jump.target && jump.target.tab === 'diary';

  // 搜索跳转：切日期 + 定位到板块（文字框则选中搜索词）
  useEffect(() => {
    if (!jump || !jump.target || jump.target.tab !== 'diary') return;
    const t = jump.target;
    if (t.date) setSel(t.date);
    const tid = setTimeout(() => {
      let el = document.getElementById('diary-sec-' + (t.field || 'events'));
      if (!el && (t.field === 'music' || t.field === 'weather')) el = document.querySelector('main.diary');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('jumpflash');
        setTimeout(() => el.classList.remove('jumpflash'), 2000);
        const ta = el.querySelector ? el.querySelector('textarea') : null;
        if (ta && t.matchIdx != null) {
          ta.focus();
          try {
            ta.setSelectionRange(t.matchIdx, t.matchIdx + (t.matchLen || 0));
          } catch (e) {
            // ignore
          }
        }
      }
    }, 200);
    return () => clearTimeout(tid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump && jump.id]);

  const diary = (data.days[sel] && data.days[sel].diary) || {};

  const patchDiary = (patch) =>
    update((d) => {
      const days = { ...d.days };
      const cur = days[sel] ? structuredClone(days[sel]) : defaultDay();
      cur.diary = { ...(cur.diary || {}), ...patch };
      days[sel] = cur;
      return { ...d, days };
    });

  const exportDiary = async () => {
    await window.api.exportDiary(sel);
  };

  const ex = dayExtra(sel);
  const festivalText = [...ex.festivals, ex.jieqi].filter(Boolean).join(' · ');

  return (
    <main className="diary">
      {jumpActive && searchOpen && <button className="jumpback" onClick={onJumpDismiss}>← 返回搜索</button>}

      {/* 吸顶栏：不加框，时间/音乐/天气固定在上方 */}
      <div className="diarytop">
        <div className="diaryhead">
          <div className="diarytitle">
            <div className="diarydate clickable" onClick={() => setPickerOpen(true)} title="点击弹出日历选择日期">
              {fmtCn(sel)}
            </div>
            {festivalText && <div className="diaryfestival">{festivalText}</div>}
          </div>
          {sel !== today && <button className="ghostbtn" onClick={() => setSel(today)}>回到今天</button>}
          <button className="primarybtn" onClick={exportDiary}>导出日记</button>
        </div>

        <div className="diarymeta">
          <label>
            今日音乐
            <input value={diary.music || ''} onChange={(e) => patchDiary({ music: e.target.value })} placeholder="手动填写" />
          </label>
          <label>
            天气
            <input value={diary.weather || ''} onChange={(e) => patchDiary({ weather: e.target.value })} placeholder="手动填写" />
          </label>
        </div>
      </div>

      {/* 四个分区各自独立成卡片 */}
      <div className="diarysections">
        <section className="card dsec-card">
          <DiarySection id="diary-sec-events" title="事件" value={diary.events} onChange={(v) => patchDiary({ events: v })} />
        </section>
        <section className="card dsec-card">
          <DiarySection id="diary-sec-mood" title="情绪" value={diary.mood} onChange={(v) => patchDiary({ mood: v })} />
        </section>
        <section className="card dsec-card">
          <DiarySection id="diary-sec-thoughts" title="思考" value={diary.thoughts} onChange={(v) => patchDiary({ thoughts: v })} />
        </section>
        <section className="card dsec-card">
          <DiarySection id="diary-sec-essays" title="随笔" value={diary.essays} onChange={(v) => patchDiary({ essays: v })} />
        </section>
      </div>

      {pickerOpen && (
        <CalendarPicker
          initial={sel}
          onSelect={(ds) => setSel(ds)}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </main>
  );
}

function DiarySection({ id, title, value, onChange }) {
  return (
    <div className="dsec" id={id}>
      <div className="dsechead">
        <h3>{title}</h3>
      </div>
      <ExpandableTextarea value={value} onChange={onChange} placeholder={`写${title}…`} minHeight={240} />
    </div>
  );
}
