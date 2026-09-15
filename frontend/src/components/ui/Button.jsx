const VARIANTS = {
  primary: 'bg-brand-500 text-ink-900 hover:bg-brand-600 disabled:hover:bg-brand-500',
  secondary: 'border border-ink-800 text-ink-200 hover:bg-ink-800',
  danger: 'border border-danger/50 text-danger hover:bg-danger/10',
};

export function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
