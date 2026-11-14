export const fmtBytes = bytes => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MiB';
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(bytes >= 104857600 ? 0 : 1)} MiB`;
  return `${(bytes / 1024).toFixed(0)} KiB`;
};

export const fmtMs = ms => {
  if (!Number.isFinite(ms)) return '—';
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`;
  if (ms >= 10) return `${ms.toFixed(1)} ms`;
  return `${ms.toFixed(2)} ms`;
};

export const fmtPct = value => `${Math.round((Number.isFinite(value) ? value : 0) * 100)}%`;

export const fmtTokens = tokens => `${Math.round(tokens || 0).toLocaleString('en-US')}`;

export const shortHash = id => {
  let hash = 2166136261;
  for (const char of String(id)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};
