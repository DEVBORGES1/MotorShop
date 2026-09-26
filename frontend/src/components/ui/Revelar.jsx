import { useEffect, useRef, useState } from 'react';

/**
 * Entrada suave ao rolar: o bloco sobe e aparece quando entra na tela.
 *
 * O conteúdo nasce visível — no HTML do servidor, sem JavaScript, com
 * IntersectionObserver ausente ou com "reduzir movimento" ligado, nada é
 * escondido. O esconder só acontece depois da montagem, e só para o que ainda
 * está abaixo da tela; o que já está à vista não pisca.
 *
 * @param {{ atraso?: number, as?: React.ElementType, className?: string }} props
 *   `atraso` em ms, para escalonar itens vizinhos
 */
export function Revelar({ as: Tag = 'div', atraso = 0, className = '', children, ...resto }) {
  const ref = useRef(null);
  const [escondido, setEscondido] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    // Já à vista na primeira pintura: nada a revelar.
    if (el.getBoundingClientRect().top < window.innerHeight) return undefined;

    setEscondido(true);
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return;
        setEscondido(false);
        observador.disconnect();
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    observador.observe(el);

    return () => observador.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      style={atraso ? { transitionDelay: `${atraso}ms` } : undefined}
      className={`transition duration-700 ease-out motion-reduce:transition-none ${
        escondido ? 'translate-y-6 opacity-0' : 'translate-y-0 opacity-100'
      } ${className}`}
      {...resto}
    >
      {children}
    </Tag>
  );
}
