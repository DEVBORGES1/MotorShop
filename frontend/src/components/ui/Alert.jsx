const TONES = {
  error: 'border-danger/40 bg-danger/10 text-danger',
  success: 'border-ok/40 bg-ok/10 text-ok',
  info: 'border-ink-800 bg-surface text-ink-200',
};

export function Alert({ tone = 'info', children }) {
  if (!children) return null;

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-md border px-4 py-3 text-sm ${TONES[tone]}`}
    >
      {children}
    </div>
  );
}
