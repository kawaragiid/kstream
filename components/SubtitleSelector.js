"use client";

import { useState } from 'react';

export default function SubtitleSelector({ tracks = [], value: controlledValue, onChange }) {
  const [internalValue, setInternalValue] = useState(tracks?.[0]?.lang || 'off');
  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const handleChange = (e) => {
    const nextValue = e.target.value;
    if (controlledValue === undefined) {
      setInternalValue(nextValue);
    }
    onChange?.(nextValue);
  };

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span>Subtitle</span>
      <select className="border rounded px-2 py-1" value={value} onChange={handleChange}>
        <option value="off">Off</option>
        {tracks.map((t, idx) => (
          <option key={`${t.lang || 'sub'}-${idx}`} value={t.lang}>{t.label || t.lang}</option>
        ))}
      </select>
    </label>
  );
}

