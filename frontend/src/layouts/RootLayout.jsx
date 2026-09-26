import { useEffect } from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';

import { BarraDaEquipe } from '@/components/layout/BarraDaEquipe.jsx';
import { Footer } from '@/components/layout/Footer.jsx';
import { Header } from '@/components/layout/Header.jsx';
import { WhatsAppFloatingButton } from '@/components/layout/WhatsAppFloatingButton.jsx';
import { useAuth } from '@/hooks/useAuth.js';

const chaveDeRolagem = (location) =>
  location.pathname === '/estoque' ? location.pathname : location.key;

/** Casca das páginas públicas. */
export function RootLayout() {
  const { verificarSessaoSeJaEntrou } = useAuth();
  // Depois de hidratar: quem da equipe já entrou neste navegador vê os
  // atalhos (faixa, "Editar"). O visitante comum não dispara nada.
  useEffect(verificarSessaoSeJaEntrou, [verificarSessaoSeJaEntrou]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Primeiro elemento focável da página: quem navega por teclado pula o
          cabeçalho inteiro em vez de tabular por todos os links. */}
      <a
        href="#conteudo"
        className="label-caps sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-60 focus:rounded-md focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-[11px] focus:text-on-brand"
      >
        Pular para o conteúdo
      </a>

      <BarraDaEquipe />
      <Header />

      <main id="conteudo" className="flex-1">
        <Outlet />
      </main>

      <Footer />
      <WhatsAppFloatingButton />

      {/* Sem isto, abrir uma moto a partir do fim do estoque mantém a rolagem
          lá embaixo, e o visitante cai no rodapé da página da moto. No estoque
          a chave é o caminho: trocar filtro muda só a query e não pode jogar a
          lista de volta ao topo. Nas demais páginas, cada entrada do histórico
          tem a sua posição — "voltar" restaura, link novo começa do topo. */}
      <ScrollRestoration getKey={chaveDeRolagem} />
    </div>
  );
}
