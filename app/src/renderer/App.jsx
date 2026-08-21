import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import DailyPage from './DailyPage.jsx';
import DiaryPage from './DiaryPage.jsx';
import SystemsPage from './SystemsPage.jsx';
import SettingsPage from './SettingsPage.jsx';
import LogsPage from './LogsPage.jsx';
import SearchPanel from './SearchPanel.jsx';
import ToastHost from './ToastHost.jsx';
import { runSearch } from './search.js';
import { makeLog } from './logService.js';
import { uid } from './utils.js';

// 日志上下文：{ log(category, message) 写日志+Toast；toast(message) 仅 Toast（删除等不记日志的操作）}
export const LogContext = createContext({ log: () => {}, toast: () => {} });

export default function App() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('daily');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [jump, setJump] = useState(null); // { id, target }
  const [lastJump, setLastJump] = useState(null); // 最近点过的结果 target
  const [toasts, setToasts] = useState([]);
  const timer = useRef(null);

  useEffect(() => {
    window.api.getData().then(setData);
  }, []);

  // update(fn)：fn 接收数据副本，返回新的完整数据
  const update = useCallback((fn) => {
    setData((prev) => {
      if (!prev) return prev;
      return fn(structuredClone(prev));
    });
  }, []);

  const showToast = useCallback((msg) => {
    const id = uid();
    setToasts((t) => [...t, { id, msg }]);
  }, []);

  // 记录操作日志 + 弹 Toast（消息即日志内容）
  const log = useCallback(
    (category, message) => {
      setData((prev) => (prev ? { ...prev, logs: [...(prev.logs || []), makeLog(category, message)] } : prev));
      showToast(message);
    },
    [showToast]
  );

  const dismissToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const results = useMemo(() => runSearch(data || { days: {}, systems: [] }, searchQ), [data, searchQ]);

  // 防抖保存
  useEffect(() => {
    if (!data) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      window.api.setData(data);
    }, 400);
    return () => clearTimeout(timer.current);
  }, [data]);

  if (!data) return <div className="loading">正在加载…</div>;

  const dismissJump = () => setJump(null);

  const handlePick = (r) => {
    setJump({ id: Date.now(), target: r.target });
    setLastJump(r.target);
    setTab(r.tab);
  };

  // 点击搜索框和结果列表之外的地方：自动转到搜索到的那一页并收起搜索
  const handleAppMouseDown = (e) => {
    if (!searchOpen) return;
    if (e.target.closest('.searchpanel') || e.target.closest('.searchbtn')) return;
    const t = lastJump || (results[0] && results[0].target);
    if (t) {
      setJump({ id: Date.now(), target: t });
      setTab(t.tab);
    }
    setSearchOpen(false);
  };

  return (
    <div className="app" onMouseDownCapture={handleAppMouseDown}>
      <nav className="topnav">
        <div className="brand">个人体系</div>
        <button className={tab === 'daily' ? 'navbtn active' : 'navbtn'} onClick={() => setTab('daily')}>计划</button>
        <button className={tab === 'diary' ? 'navbtn active' : 'navbtn'} onClick={() => setTab('diary')}>日记</button>
        <button className={tab === 'systems' ? 'navbtn active' : 'navbtn'} onClick={() => setTab('systems')}>体系</button>
        <button className={tab === 'settings' ? 'navbtn active' : 'navbtn'} onClick={() => setTab('settings')}>设置</button>
        <button className={tab === 'logs' ? 'navbtn active' : 'navbtn'} onClick={() => setTab('logs')}>日志</button>
        <div className="navright">纯本地 · 数据在本机</div>
        <button
          className={searchOpen ? 'searchbtn active' : 'searchbtn'}
          onClick={() => setSearchOpen(!searchOpen)}
          title="全局搜索"
        >
          🔍
        </button>
      </nav>

      {searchOpen && (
        <SearchPanel q={searchQ} results={results} onQChange={setSearchQ} onPick={handlePick} onClose={() => setSearchOpen(false)} />
      )}

      <LogContext.Provider value={{ log, toast: showToast }}>
        <div className={'pagewrap' + (tab === 'daily' ? '' : ' hidden')}>
          <DailyPage data={data} update={update} jump={jump} onJumpDismiss={dismissJump} searchOpen={searchOpen} />
        </div>
        <div className={'pagewrap' + (tab === 'diary' ? '' : ' hidden')}>
          <DiaryPage data={data} update={update} jump={jump} onJumpDismiss={dismissJump} searchOpen={searchOpen} />
        </div>
        <div className={'pagewrap' + (tab === 'systems' ? '' : ' hidden')}>
          <SystemsPage data={data} update={update} jump={jump} onJumpDismiss={dismissJump} searchOpen={searchOpen} />
        </div>
        <div className={'pagewrap' + (tab === 'settings' ? '' : ' hidden')}>
          <SettingsPage data={data} update={update} />
        </div>
        <div className={'pagewrap' + (tab === 'logs' ? '' : ' hidden')}>
          <LogsPage data={data} update={update} />
        </div>
      </LogContext.Provider>

      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
