import React, { useState } from 'react';
import { uid } from './utils.js';

export default function SettingsPage({ data, update }) {
  const [newRoutine, setNewRoutine] = useState('');
  const [newCol, setNewCol] = useState('');

  const setSettings = (patch) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));

  const routines = [...data.routines].sort((a, b) => a.sort - b.sort);
  const renameRoutine = (id, name) =>
    update((d) => ({ ...d, routines: d.routines.map((r) => (r.id === id ? { ...r, name } : r)) }));
  const moveRoutine = (id, dir) =>
    update((d) => {
      const rs = [...d.routines].sort((a, b) => a.sort - b.sort);
      const i = rs.findIndex((r) => r.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= rs.length) return d;
      [rs[i], rs[j]] = [rs[j], rs[i]];
      return { ...d, routines: rs.map((r, idx) => ({ ...r, sort: idx })) };
    });
  const removeRoutine = (id) =>
    update((d) => ({
      ...d,
      routines: d.routines.filter((r) => r.id !== id).map((r, idx) => ({ ...r, sort: idx })),
    }));
  const addRoutine = () => {
    const name = newRoutine.trim();
    if (!name) return;
    update((d) => ({ ...d, routines: [...d.routines, { id: uid(), name, sort: d.routines.length }] }));
    setNewRoutine('');
  };

  const addColumn = () => {
    const name = newCol.trim();
    if (!name) return;
    update((d) => ({ ...d, columns: [...d.columns, { id: uid(), name, type: 'checklist', sort: d.columns.length }] }));
    setNewCol('');
  };
  const removeColumn = (id) => update((d) => ({ ...d, columns: d.columns.filter((c) => c.id !== id) }));
  const renameColumn = (id, name) =>
    update((d) => ({ ...d, columns: d.columns.map((c) => (c.id === id ? { ...c, name } : c)) }));

  return (
    <main className="settings">
      <section className="card">
        <h2 className="cardtitle">每日 SOP 步骤 <span className="hint">8 步轨道 · 修改后每天自动生效</span></h2>
        <ul className="settingslist">
          {routines.map((r, i) => (
            <li key={r.id} className="settingsrow">
              <span className="idx">{i + 1}</span>
              <input className="sinput" value={r.name} onChange={(e) => renameRoutine(r.id, e.target.value)} />
              <button className="minibtn" disabled={i === 0} onClick={() => moveRoutine(r.id, -1)} title="上移">↑</button>
              <button className="minibtn" disabled={i === routines.length - 1} onClick={() => moveRoutine(r.id, 1)} title="下移">↓</button>
              <button className="minibtn danger" onClick={() => removeRoutine(r.id)} title="删除">删</button>
            </li>
          ))}
        </ul>
        <div className="addrow">
          <input
            className="addinput"
            placeholder="添加一步例程…"
            value={newRoutine}
            onChange={(e) => setNewRoutine(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addRoutine()}
          />
          <button className="addbtn" onClick={addRoutine}>+</button>
        </div>
      </section>

      <section className="card">
        <h2 className="cardtitle">栏目管理 <span className="hint">「安排 / 读书 / 临时起意 / 总结」可按需增减</span></h2>
        <ul className="settingslist">
          {data.columns.map((c) => {
            const fixed = c.id === 'arrange' || c.id === 'reading' || c.id === 'spur' || c.id === 'summary';
            return (
              <li key={c.id} className="settingsrow">
                <input className="sinput" value={c.name} onChange={(e) => renameColumn(c.id, e.target.value)} />
                <span className="tag">{c.type === 'reading' ? '读书记录' : c.type === 'text' ? '文本' : '清单'}</span>
                {fixed ? <span className="tag fixed">默认</span> : <button className="minibtn danger" onClick={() => removeColumn(c.id)}>删</button>}
              </li>
            );
          })}
        </ul>
        <div className="addrow">
          <input
            className="addinput"
            placeholder="添加新栏目（清单型）…"
            value={newCol}
            onChange={(e) => setNewCol(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addColumn()}
          />
          <button className="addbtn" onClick={addColumn}>+</button>
        </div>
      </section>

      <section className="card">
        <h2 className="cardtitle">提醒 <span className="hint">SOP 硬约束提醒（可开关、可改时间）</span></h2>
        <label className="switchrow">
          <input type="checkbox" checked={data.settings.remindersEnabled} onChange={(e) => setSettings({ remindersEnabled: e.target.checked })} />
          <span>启用提醒（软件开着时到点弹系统通知）</span>
        </label>
        <div className="timerow">
          <label>开始总结提醒：<input type="time" value={data.settings.summaryReminder} onChange={(e) => setSettings({ summaryReminder: e.target.value })} /></label>
          <label>睡觉提醒：<input type="time" value={data.settings.sleepReminder} onChange={(e) => setSettings({ sleepReminder: e.target.value })} /></label>
        </div>
      </section>

      <section className="card">
        <h2 className="cardtitle">关于</h2>
        <p className="about">
          数据保存在本机（纯本地），不会上传。当天安排可导出为 Word 文档（WPS 可打开）。
          更多板块（学习体系、创作体系、体系树、日记时间线、AI 提炼…）将在后续版本加入。
        </p>
      </section>
    </main>
  );
}
