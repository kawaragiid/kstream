export function slugify(text = '') {
  return text
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function formatDuration(sec = 0) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return [h, m, s]
    .map((v) => String(v).padStart(2, '0'))
    .join(':');
}

export function timeAgo(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function inferOrientationFromUrl(url, fallback = 'landscape') {
  if (!url) return fallback;
  const lower = url.toLowerCase();
  if (lower.includes('portrait') || lower.includes('poster') || lower.includes('2x3')) return 'portrait';
  if (lower.includes('landscape') || lower.includes('banner') || lower.includes('wide')) return 'landscape';
  return fallback;
}
