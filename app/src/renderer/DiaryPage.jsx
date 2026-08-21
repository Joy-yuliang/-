import React, { useContext, useEffect, useState } from 'react';
import { todayStr, defaultDay } from './utils.js';
import { weekdayOf, dayExtra } from './calendar.js';
import CalendarPicker from './CalendarPicker.jsx';
import ExpandableTextarea from './ExpandableTextarea.jsx';
import BlurLogInput from './BlurLogInput.jsx';
import { LogContext } from './App.jsx';

function fmtCn(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${y} 年 ${m} 月 ${d} 日 星期${weekdayOf(dateStr)}`;
}

export default function DiaryPage({ data, update, jump, onJumpDismiss, searchOpen }) {
  const { log } = useContext(LogContext);
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
    log('diary', '您导出了日记');
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
            <BlurLogInput
              value={diary.music || ''}
              onValue={(v) => patchDiary({ music: v })}
              onEdit={() => log('diary', '您修改了音乐')}
              placeholder="手动填写"
            />
          </label>
          <label>
            天气
            <BlurLogInput
              value={diary.weather || ''}
              onValue={(v) => patchDiary({ weather: v })}
              onEdit={() => log('diary', '您修改了天气')}
              placeholder="手动填写"
            />
          </label>
        </div>
      </div>

      {/* 四个分区各自独立成卡片 */}
      <div className="diarysections">
        <section className="card dsec-card">
          <DiarySection id="diary-sec-events" title="事件" value={diary.events} onChange={(v) => patchDiary({ events: v })} onEdit={() => log('diary', '您编辑了事件')} />
        </section>
        <section className="card dsec-card">
          <DiarySection id="diary-sec-mood" title="感受" value={diary.mood} onChange={(v) => patchDiary({ mood: v })} onEdit={() => log('diary', '您编辑了感受')} />
        </section>
        <section className="card dsec-card">
          <DiarySection id="diary-sec-thoughts" title="思考" value={diary.thoughts} onChange={(v) => patchDiary({ thoughts: v })} onEdit={() => log('diary', '您编辑了思考')} />
        </section>
        <section className="card dsec-card">
          <DiarySection id="diary-sec-essays" title="随笔" value={diary.essays} onChange={(v) => patchDiary({ essays: v })} onEdit={() => log('diary', '您编辑了随笔')} />
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

function DiarySection({ id, title, value, onChange, onEdit }) {
  return (
    <div className="dsec" id={id}>
      <div className="dsechead">
        <h3>{title}</h3>
      </div>
      <ExpandableTextarea value={value} onChange={onChange} onEdit={onEdit} placeholder={`写${title}…`} minHeight={240} />
    </div>
  );
}
