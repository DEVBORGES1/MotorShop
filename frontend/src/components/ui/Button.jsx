/**
 * Botão da plataforma.
 *
 * A classe sai em `buttonClass()` separada do componente porque metade dos
 * "botões" da interface são `<Link>` do router — antes cada tela repetia a
 * mesma string de classes e elas já tinham começado a divergir entre si.
 */

const VARIANTS = {
  primary: 'bg-brand-500 text-on-brand hover:bg-brand-400 disabled:hover:bg-brand-500',
  secondary: 'border border-ink-700 text-ink-100 hover:border-ink-600 hover:bg-ink-800',
  ghost: 'text-ink-200 hover:text-brand-500',
  danger: 'border border-danger/50 text-danger hover:bg-danger/10',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-[11px]',
  md: 'px-4 py-2.5 text-[13px]',
  lg: 'px-5 py-3 text-sm',
};

export function buttonClass({ variant = 'primary', size = 'md', className = '' } = {}) {
  return [
    'label-caps inline-flex items-center justify-center gap-2 rounded-md transition',
    'disabled:cursor-not-allowed disabled:opacity-60',
    VARIANTS[variant],
    SIZES[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

export function Button({ variant, size, className, children, ...props }) {
  return (
    <button className={buttonClass({ variant, size, className })} {...props}>
      {children}
    </button>
  );
}
