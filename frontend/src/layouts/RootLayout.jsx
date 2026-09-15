import { Outlet } from 'react-router-dom';

import { Footer } from '@/components/layout/Footer.jsx';
import { Header } from '@/components/layout/Header.jsx';
import { WhatsAppFloatingButton } from '@/components/layout/WhatsAppFloatingButton.jsx';

/** Casca das páginas públicas. */
export function RootLayout() {
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

      <Header />

      <main id="conteudo" className="flex-1">
        <Outlet />
      </main>

      <Footer />
      <WhatsAppFloatingButton />
    </div>
  );
}
