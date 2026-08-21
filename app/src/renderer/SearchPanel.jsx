import React from 'react';

function esc(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function highlight(text, q) {
  const safe = esc(text);
  const qq = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    return safe.replace(new RegExp(`(${qq})`, 'gi'), '<mark>$1</mark>');
  } catch {
    return safe;
  }
}

// 受控的搜索面板：q / results 由 App 管理（关闭后再次打开仍保留）
export default function SearchPanel({ q, results, onQChange, onPick, onClose }) {
  return (
    <div className="searchpanel">
      <div className="searchrow">
        <input
          autoFocus
          className="searchinput"
          placeholder="全局搜索：计划、日记、体系…"
          value={q}
          onChange={(e) => onQChange(e.target.value)}
        />
        <button className="iconbtn" onClick={onClose} title="关闭搜索">✕</button>
      </div>
      {q.trim() && (
        <div className="searchresults">
          {results.length === 0 && <div className="empty">没有找到包含「{q}」的内容</div>}
          {results.map((r, i) => (
            <button
              key={i}
              className="searchitem"
              onClick={() => onPick(r)}
            >
              <span className="searchmeta">
                <span className={'searchtag ' + r.tab}>{r.label}</span>
                <span className="searchsub">{r.sub}</span>
              </span>
              <span className="searchsnippet" dangerouslySetInnerHTML={{ __html: highlight(r.snippet, q) }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
