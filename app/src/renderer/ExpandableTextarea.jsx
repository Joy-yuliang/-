import React, { useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ breaks: true, gfm: true });

function md(text) {
  return DOMPurify.sanitize(marked.parse(text || ''));
}

// 可展开的文字框：右下角展开图标 → 大编辑框（编辑/预览 + 撤销/恢复）
export default function ExpandableTextarea({ id, value, onChange, placeholder, minHeight }) {
  const [modal, setModal] = useState(false);
  const [preview, setPreview] = useState(false);
  const [hist, setHist] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const edit = (v) => {
    setHist((h) => [...h.slice(-49), value || '']);
    setRedoStack([]);
    onChange(v);
  };

  const undo = () => {
    if (!hist.length) return;
    const prev = hist[hist.length - 1];
    setHist(hist.slice(0, -1));
    setRedoStack((r) => [...r, value || '']);
    onChange(prev);
  };

  const redo = () => {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(redoStack.slice(0, -1));
    setHist((h) => [...h, value || '']);
    onChange(next);
  };

  return (
    <div className="etwrap">
      <textarea
        id={id}
        className="bigtext"
        style={minHeight ? { minHeight } : undefined}
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
      <button className="etexpand" onClick={() => { setPreview(false); setModal(true); }} title="展开编辑">⤢</button>

      {modal && (
        <div className="modalback" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modalhead">
              <h3>编辑</h3>
              <div className="addbox-tabs">
                <button className={!preview ? 'tabbtn active' : 'tabbtn'} onClick={() => setPreview(false)}>编辑</button>
                <button className={preview ? 'tabbtn active' : 'tabbtn'} onClick={() => setPreview(true)}>预览</button>
              </div>
              <div className="modal-ur">
                <button className="minibtn" onClick={undo} disabled={!hist.length} title="撤销">⟲ 撤销</button>
                <button className="minibtn" onClick={redo} disabled={!redoStack.length} title="恢复">⟳ 恢复</button>
              </div>
              <button className="iconbtn" onClick={() => setModal(false)} style={{ marginLeft: 'auto' }}>✕</button>
            </div>
            {preview ? (
              <div className="modalbody mdbody" dangerouslySetInnerHTML={{ __html: md(value) || '<span class="placeholder">（暂无内容）</span>' }} />
            ) : (
              <textarea
                className="modaltextarea"
                autoFocus
                placeholder={placeholder}
                value={value || ''}
                onChange={(e) => edit(e.target.value)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
