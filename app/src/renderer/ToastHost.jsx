import React, { useEffect, useState } from 'react';

// 单个 Toast：显示 2 秒（1.7s 后开始淡出 0.3s），完成后通知移除
function ToastItem({ msg, onDone }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 1700);
    const t2 = setTimeout(onDone, 2050);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div className={'toast' + (leaving ? ' leaving' : '')}>{msg}</div>;
}

// Toast 容器：固定在页面顶部居中，多个垂直堆叠
export default function ToastHost({ toasts, onDismiss }) {
  return (
    <div className="toasthost">
      {toasts.map((t) => (
        <ToastItem key={t.id} msg={t.msg} onDone={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}
