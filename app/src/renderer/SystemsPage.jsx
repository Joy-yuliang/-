import React, { useEffect, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { uid } from './utils.js';

marked.setOptions({ breaks: true, gfm: true });

function md(text) {
  return DOMPurify.sanitize(marked.parse(text || ''));
}

function wc(text) {
  return (text || '').replace(/\s/g, '').length;
}

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const LEVEL_NAMES = ['一级', '二级', '三级', '四级', '五级', '六级', '七级', '八级', '九级', '十级', '十一级', '十二级', '十三级', '十四级', '十五级', '十六级'];

function levelName(depth) {
  return LEVEL_NAMES[depth] || `第${depth + 1}级`;
}

function childLabel(depth) {
  return levelName(depth + 1);
}

export default function SystemsPage({ data, update, jump, onJumpDismiss, searchOpen }) {
  const [view, setView] = useState('memo'); // memo | tree
  const [forcedOpen, setForcedOpen] = useState(null); // Set of node ids to force-open（搜索跳转用）
  const nodes = data.systems || [];
  const now = () => new Date().toISOString();
  const jumpActive = jump && jump.target && jump.target.tab === 'systems';

  // 搜索跳转：展开祖先路径 + 滚动定位
  useEffect(() => {
    if (!jump || !jump.target || jump.target.tab !== 'systems') return;
    const targetId = jump.target.nodeId;
    setView('memo');
    const chain = new Set();
    let cur = nodes.find((n) => n.id === targetId);
    while (cur) {
      chain.add(cur.id);
      cur = nodes.find((n) => n.id === cur.parentId);
    }
    setForcedOpen(chain);
    const tid = setTimeout(() => {
      const el = document.getElementById('sys-node-' + targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('jumpflash');
        setTimeout(() => el.classList.remove('jumpflash'), 2000);
      }
    }, 250);
    return () => clearTimeout(tid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump && jump.id]);

  const addNode = (parentId, title, content) =>
    update((d) => ({
      ...d,
      systems: [...d.systems, { id: uid(), parentId, title, content, createdAt: now(), updatedAt: now() }],
    }));

  const updateNode = (id, patch) =>
    update((d) => ({
      ...d,
      systems: d.systems.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: now() } : n)),
    }));

  const deleteNode = (id) =>
    update((d) => {
      const ids = new Set();
      const collect = (nid) => {
        ids.add(nid);
        d.systems.filter((n) => n.parentId === nid).forEach((n) => collect(n.id));
      };
      collect(id);
      return { ...d, systems: d.systems.filter((n) => !ids.has(n.id)) };
    });

  const moveNode = (id, parentId) =>
    update((d) => ({
      ...d,
      systems: d.systems.map((n) => (n.id === id ? { ...n, parentId, updatedAt: now() } : n)),
    }));

  return (
    <main className="systems">
      {jumpActive && searchOpen && <button className="jumpback" onClick={onJumpDismiss}>← 返回搜索</button>}
      <header className="syshead">
        <div className="sysheadtitle">
          <h1>体系</h1>
          <span className="hint">像便签一样一条条记录：一级 → 二级 → 三级…层层展开</span>
        </div>
        <div className="sysheadbtns">
          <button className={view === 'memo' ? 'navbtn active' : 'navbtn'} onClick={() => setView('memo')}>体系建构</button>
          <button className={view === 'tree' ? 'navbtn active' : 'navbtn'} onClick={() => setView('tree')}>总体预览</button>
        </div>
      </header>

      {view === 'memo' ? (
        <MemoView
          nodes={nodes}
          addNode={addNode}
          updateNode={updateNode}
          deleteNode={deleteNode}
          moveNode={moveNode}
          forcedOpen={forcedOpen}
        />
      ) : (
        <TreeView nodes={nodes} onBack={() => setView('memo')} />
      )}
    </main>
  );
}

function MemoView({ nodes, addNode, updateNode, deleteNode, moveNode, forcedOpen }) {
  const [addingRoot, setAddingRoot] = useState(false);
  const roots = nodes.filter((n) => !n.parentId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div className="memoview">
      {!nodes.length && !addingRoot && (
        <div className="emptybox">
          <p>还没有体系。点下面的按钮，从「一级体系」开始建——</p>
          <p className="hint">例如：学习（一级）→ 英语学习（二级）→ 四级 / 六级 / 考研 / 雅思（三级）</p>
        </div>
      )}
      {addingRoot && (
        <AddBox
          onSave={(title, content) => {
            addNode(null, title, content);
            setAddingRoot(false);
          }}
          onCancel={() => setAddingRoot(false)}
        />
      )}
      {roots.map((n) => (
        <NodeCard key={n.id} node={n} nodes={nodes} addNode={addNode} updateNode={updateNode} deleteNode={deleteNode} moveNode={moveNode} depth={0} forcedOpen={forcedOpen} />
      ))}
      <button className="primarybtn addrootbtn" onClick={() => setAddingRoot(true)}>＋ 新增一级体系</button>
    </div>
  );
}

function NodeCard({ node, nodes, addNode, updateNode, deleteNode, moveNode, depth, forcedOpen }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [moving, setMoving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  // 搜索跳转：强制展开路径上的节点
  useEffect(() => {
    if (forcedOpen && forcedOpen.has(node.id)) setExpanded(true);
  }, [forcedOpen, node.id]);

  const children = nodes.filter((n) => n.parentId === node.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  // 移动目标：除自身和所有子孙外的节点
  const invalid = new Set();
  const collect = (nid) => {
    invalid.add(nid);
    nodes.filter((n) => n.parentId === nid).forEach((n) => collect(n.id));
  };
  collect(node.id);
  const moveTargets = nodes.filter((n) => !invalid.has(n.id));

  return (
    <div className="nodecard" id={'sys-node-' + node.id}>
      <div className="nodehead" onClick={() => setExpanded(!expanded)} title="点击整条展开 / 收起">
        <button className="chevron">{expanded ? '▾' : '▸'}</button>
        <span className="leveltag">{levelName(depth)}</span>
        <span className="nodetitle">{node.title || '（未命名）'}</span>
        <span className="nodemeta">{wc(node.content)} 字 · 更新于 {fmtTime(node.updatedAt)}</span>
        {children.length > 0 && <span className="nodemeta">{children.length} 个子体系</span>}
        <div className="nodebtns" onClick={(e) => e.stopPropagation()}>
          {confirmDel ? (
            <span className="delconfirm">
              确认删除（含全部子体系）？
              <button className="minibtn danger" onClick={() => deleteNode(node.id)}>确定</button>
              <button className="minibtn" onClick={() => setConfirmDel(false)}>取消</button>
            </span>
          ) : (
            <button className="minibtn danger" onClick={() => setConfirmDel(true)}>删除</button>
          )}
          <button className="minibtn" onClick={() => { setExpanded(true); setMoving(!moving); }}>移动</button>
          <button className="minibtn" onClick={() => { setExpanded(true); setEditing(!editing); }}>编辑</button>
        </div>
      </div>

      {expanded && (
        <div className="nodebody">
          {editing ? (
            <AddBox
              initialTitle={node.title}
              initialContent={node.content}
              onSave={(title, content) => {
                updateNode(node.id, { title, content });
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <div className="mdbody" dangerouslySetInnerHTML={{ __html: md(node.content) || '<span class="placeholder">（暂无内容）</span>' }} />
          )}

          {moving && (
            <div className="moverow">
              <span>移动到：</span>
              <select
                value={node.parentId || ''}
                onChange={(e) => {
                  moveNode(node.id, e.target.value || null);
                  setMoving(false);
                }}
              >
                <option value="">（顶层）</option>
                {moveTargets.map((t) => (
                  <option key={t.id} value={t.id}>{t.title || '（未命名）'}</option>
                ))}
              </select>
            </div>
          )}

          <button className="addsubbtn" onClick={() => setAdding(!adding)}>＋ 新增{childLabel(depth)}体系</button>

          {adding && (
            <AddBox
              onSave={(title, content) => {
                addNode(node.id, title, content);
                setAdding(false);
              }}
              onCancel={() => setAdding(false)}
            />
          )}

          {children.map((c) => (
            <NodeCard key={c.id} node={c} nodes={nodes} addNode={addNode} updateNode={updateNode} deleteNode={deleteNode} moveNode={moveNode} depth={depth + 1} forcedOpen={forcedOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

function AddBox({ initialTitle = '', initialContent = '', onSave, onCancel }) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [preview, setPreview] = useState(false);

  const save = () => {
    if (!title.trim()) {
      alert('请填写标题');
      return;
    }
    onSave(title.trim(), content);
  };

  return (
    <div className="addbox">
      <input className="addbox-title" placeholder="标题（如：英语学习）" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="addbox-tabs">
        <button className={!preview ? 'tabbtn active' : 'tabbtn'} onClick={() => setPreview(false)}>编辑</button>
        <button className={preview ? 'tabbtn active' : 'tabbtn'} onClick={() => setPreview(true)}>预览</button>
      </div>
      {preview ? (
        <div className="mdbody addbox-preview" dangerouslySetInnerHTML={{ __html: md(content) || '<span class="placeholder">（暂无内容）</span>' }} />
      ) : (
        <textarea
          className="addbox-content"
          placeholder={'支持 Markdown：\n# 标题\n- 列表\n**加粗**\n\n写下这个体系的内容、方法、规划…'}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      )}
      <div className="addbox-actions">
        <button className="primarybtn" onClick={save}>保存</button>
        <button className="ghostbtn" onClick={onCancel}>取消</button>
      </div>
    </div>
  );
}

function TreeView({ nodes, onBack }) {
  const [selId, setSelId] = useState(null);
  const roots = nodes.filter((n) => !n.parentId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const sel = nodes.find((n) => n.id === selId);

  return (
    <div className="treeview">
      <div className="treecol">
        <div className="treehead">
          <button className="ghostbtn" onClick={onBack}>‹ 返回便签</button>
          <span className="treecaption">体系 · 总体预览</span>
        </div>
        <div className="tree">
          <div className="treeroot">体系</div>
          {roots.map((n) => (
            <TreeNode key={n.id} node={n} nodes={nodes} selId={selId} onSelect={setSelId} depth={0} />
          ))}
          {!nodes.length && <div className="empty">还没有体系节点</div>}
        </div>
      </div>
      <div className="treepanel">
        {sel ? (
          <div className="treepanelbody">
            <div className="treepanelhead">
              <h2>{sel.title || '（未命名）'}</h2>
              <span className="nodemeta">{wc(sel.content)} 字 · 更新于 {fmtTime(sel.updatedAt)}</span>
            </div>
            <div className="mdbody" dangerouslySetInnerHTML={{ __html: md(sel.content) || '<span class="placeholder">（暂无内容）</span>' }} />
          </div>
        ) : (
          <div className="empty">点击左侧节点查看内容</div>
        )}
      </div>
    </div>
  );
}

function TreeNode({ node, nodes, selId, onSelect, depth }) {
  const [open, setOpen] = useState(false);
  const children = nodes.filter((n) => n.parentId === node.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div className="treenode">
      <div className="treenode-row" style={{ paddingLeft: depth * 18 + 4 }}>
        <button className="chevron small" onClick={() => setOpen(!open)}>{open ? '▾' : '▸'}</button>
        <button
          className={selId === node.id ? 'treenode-label sel' : 'treenode-label'}
          onClick={() => {
            onSelect(node.id);
            setOpen(!open);
          }}
        >
          {node.title || '（未命名）'}
        </button>
      </div>
      {open &&
        children.map((c) => (
          <TreeNode key={c.id} node={c} nodes={nodes} selId={selId} onSelect={onSelect} depth={depth + 1} />
        ))}
    </div>
  );
}
