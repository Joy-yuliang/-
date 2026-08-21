import React, { useRef } from 'react';

// 输入框：失焦且内容有变化时触发 onEdit 一次（用于操作日志的“编辑/修改”记录）
export default function BlurLogInput({ value, onValue, onEdit, className, placeholder, type, min }) {
  const focusVal = useRef(value);
  return (
    <input
      className={className}
      placeholder={placeholder}
      type={type}
      min={min}
      value={value}
      onChange={(e) => onValue(e.target.value)}
      onFocus={() => {
        focusVal.current = value;
      }}
      onBlur={() => {
        if (value !== focusVal.current) onEdit();
      }}
    />
  );
}
