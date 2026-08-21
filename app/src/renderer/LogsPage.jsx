import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LOG_LABEL, parseLocal } from './logService.js';
import { LogContext } from './App.jsx';

// 操作日志页：月份分组大字标题（YYYY年M月）+ 日期小标题 + 正序（最新在底部）
// v0.9：导出日志 / 最新日志 / 单条删除 / 月份批量删除
export default function LogsPage({ data, update }) {
  const { toast } = useContext(LogContext);
  const listRef = useRef(null);
  const [batchMonth, setBatchMonth] = useState(null); // 正在批量删除的月份 "Y-M"
  const [selected, setSelected] = useState(() => new Set()); // 选中的日志 id
  const [confirmDel, setConfirmDel] = useState(false); // 批量确认框
  const [singleConfirmId, setSingleConfirmId] = useState(null); // 单条行内确认

  const logs = useMemo(
    () => [...(data.logs || [])].sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1)),
    [data.logs]
  );

  // 按 (年,月) 分组，正序
  const groups = useMemo(() => {
    const map = new Map();
    for (const lg of logs) {
      const p = parseLocal(lg.timestamp);
      if (!p) continue;
      const key = `${p.y}-${p.m}`;
      if (!map.has(key)) map.set(key, { key, y: p.y, m: p.m, items: [] });
      map.get(key).items.push({ lg, p });
    }
    return [...map.values()].sort((a, b) => (a.y !== b.y ? a.y - b.y : a.m - b.m));
  }, [logs]);

  const latestId = logs.length ? logs[logs.length - 1].id : null;

  // 打开页面 / 新增日志时自动滚动到最新（底部）
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [logs.length]);

  // ---- 删除 ----
  const doDelete = (ids) => {
    const set = new Set(ids);
    update((d) => ({ ...d, logs: (d.logs || []).filter((l) => !set.has(l.id)) }));
    // 删除本身不新增日志记录，仅 Toast 提示
    toast(ids.length === 1 ? '您删除了一条日志' : `您删除了 ${ids.length} 条日志`);
    setSingleConfirmId(null);
    setConfirmDel(false);
    setSelected(new Set());
    setBatchMonth(null);
  };

  // ---- 批量模式（仅当前月份）----
  const currentGroup = groups.find((g) => g.key === batchMonth) || null;
  const monthIds = currentGroup ? currentGroup.items.map((it) => it.lg.id) : [];
  const allSelected = monthIds.length > 0 && monthIds.every((id) => selected.has(id));
  const selectedCount = selected.size;

  const enterBatch = (key) => {
    setBatchMonth(key);
    setSelected(new Set());
  };
  const exitBatch = () => {
    setBatchMonth(null);
    setSelected(new Set());
  };
  const toggleOne = (id) =>
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(monthIds));

  const openBatchConfirm = () => {
    if (selectedCount === 0) return;
    setConfirmDel(true);
  };

  // ---- 最新日志：平滑滚动到底部 + 高亮 ----
  const scrollToLatest = () => {
    const list = listRef.current;
    if (!list || !logs.length) return;
    list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
    setTimeout(() => {
      const last = list.querySelector('.logrow:last-of-type');
      if (last) {
        last.classList.add('flashlatest');
        setTimeout(() => last.classList.remove('flashlatest'), 2000);
      }
    }, 600);
  };

  // ---- 导出日志 ----
  const exportLogs = async () => {
    await window.api.exportLogs();
    toast('您导出了日志');
  };

  return (
    <main className="logs">
      <header className="logshead">
        <h1>操作日志</h1>
        <span className="hint">{logs.length} 条记录 · 计划/日记/体系的操作都会记在这里</span>
        <div className="logsheadbtns">
          <button className="loglatestbtn" onClick={scrollToLatest} disabled={!logs.length} title="滚动到最新一条并高亮">最新日志</button>
          <button className="logexportbtn" onClick={exportLogs} title="导出全部日志为 Word 文档（WPS 可打开）">导出日志</button>
        </div>
      </header>

      {logs.length === 0 ? (
        <div className="emptybox">
          <p>还没有操作日志。</p>
          <p className="hint">在计划、日记、体系页面进行添加 / 编辑 / 完成等操作后，会自动记录在这里。</p>
        </div>
      ) : (
        <div className="logslist" ref={listRef}>
          {groups.map((g) => (
            <div key={g.key} className="logmonth">
              <div className="logyearrow">
                <div className="logyear">{g.y}年{g.m}月</div>
                <div className="logmonthbtns">
                  {batchMonth === g.key ? (
                    <>
                      <button className="batchbtn" onClick={toggleAll}>{allSelected ? '取消全选' : '全选'}</button>
                      <button className="batchbtn danger" onClick={openBatchConfirm}>确认删除</button>
                      <button className="batchbtn" onClick={exitBatch}>取消</button>
                    </>
                  ) : (
                    <button className="batchbtn" onClick={() => enterBatch(g.key)} title="批量删除该月份日志">批量删除</button>
                  )}
                </div>
              </div>

              {(() => {
                let lastDate = null;
                const rows = [];
                for (const { lg, p } of g.items) {
                  const dateKey = `${p.y}-${p.m}-${p.d}`;
                  if (dateKey !== lastDate) {
                    rows.push(<div key={'d' + dateKey} className="logdate">{p.m}月{p.d}日 {p.weekday}</div>);
                    lastDate = dateKey;
                  }
                  const inBatch = batchMonth === g.key;
                  const tagCls = lg.category === 'diary' ? 'diary' : lg.category === 'system' ? 'system' : '';
                  rows.push(
                    <div key={lg.id} className={'logrow' + (lg.id === latestId ? ' flashlatest' : '')} data-logid={lg.id}>
                      {inBatch && (
                        <input
                          type="checkbox"
                          className="logcheck"
                          checked={selected.has(lg.id)}
                          onChange={() => toggleOne(lg.id)}
                        />
                      )}
                      <span className="logtime">{p.hh}:{p.mm}</span>
                      <span className={'logtag ' + tagCls}>{LOG_LABEL[lg.category] || lg.category}</span>
                      <span className="logmsg">{lg.message}</span>
                      {singleConfirmId === lg.id ? (
                        <span className="logdelconfirm">
                          您确定要删除该日志吗？
                          <button className="minibtn danger" onClick={() => doDelete([lg.id])}>确定</button>
                          <button className="minibtn" onClick={() => setSingleConfirmId(null)}>取消</button>
                        </span>
                      ) : !inBatch ? (
                        <button className="logdel" onClick={() => setSingleConfirmId(lg.id)} title="删除该日志">🗑</button>
                      ) : null}
                    </div>
                  );
                }
                return rows;
              })()}
            </div>
          ))}
        </div>
      )}

      {confirmDel && (
        <div className="modalback" onClick={() => setConfirmDel(false)}>
          <div className="modal confirmmodal" onClick={(e) => e.stopPropagation()}>
            <p className={allSelected ? 'confirm-danger' : ''}>
              {allSelected ? '您确定要全部删除吗？' : '您确定要删除这些日志吗？'}
            </p>
            <div className="addbox-actions">
              <button className="primarybtn" onClick={() => doDelete([...selected])}>确定</button>
              <button className="ghostbtn" onClick={() => setConfirmDel(false)}>取消</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
