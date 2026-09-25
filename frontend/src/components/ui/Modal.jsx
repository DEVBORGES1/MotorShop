import { useEffect, useRef } from 'react';

/**
 * Modal sobre o `<dialog>` nativo.
 *
 * `showModal()` já entrega o que um modal feito à mão costuma esquecer: o foco
 * fica preso dentro dele, o resto da página vira inerte para teclado e leitor
 * de tela, `Esc` fecha e, ao fechar, o foco volta ao botão que o abriu.
 *
 * O componente é controlado (`aberto`/`onClose`): o `Esc` dispara `cancel`, que
 * é interceptado para o estado do React continuar sendo a fonte da verdade.
 */
export function Modal({ aberto, onClose, rotulo, className = '', children, ...props }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (aberto && !dialog.open) dialog.showModal();
    if (!aberto && dialog.open) dialog.close();
  }, [aberto]);

  // O <dialog> não trava a rolagem da página por baixo; sem isto, a roda do
  // mouse rola o site atrás da foto ampliada.
  useEffect(() => {
    if (!aberto) return undefined;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      aria-label={rotulo}
      onCancel={(evento) => {
        evento.preventDefault();
        onClose();
      }}
      // Clique no fundo escurecido (fora do conteúdo) fecha.
      onClick={(evento) => evento.target === ref.current && onClose()}
      className={`backdrop:bg-ink-900/95 ${className}`}
      {...props}
    >
      {aberto && children}
    </dialog>
  );
}
