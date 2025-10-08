"use client";

import { useState } from 'react';

export default function SubtitleSelector({ tracks = [] }) {
  const [value, setValue] = useState(tracks?.[0]?.lang || 'off');
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span>Subtitle</span>
      <select className="border rounded px-2 py-1" value={value} onChange={(e)=>setValue(e.target.value)}>
        <option value="off">Off</option>
        {tracks.map((t) => (
          <option key={t.lang} value={t.lang}>{t.label || t.lang}</option>
        ))}
      </select>
    </label>
  );
}

