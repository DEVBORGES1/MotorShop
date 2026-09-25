/**
 * Importadores das páginas carregadas sob demanda.
 *
 * Ficam num módulo próprio para servirem a dois usos: o `lazy()` das rotas e o
 * pré-carregamento. Chamar o mesmo `import()` duas vezes não baixa duas vezes —
 * o navegador reaproveita o módulo —, então pré-carregar ao passar o mouse
 * sobre um card deixa a página da moto pronta antes do clique.
 */
export const carregarMotoDetalhe = () => import('@/pages/public/MotoDetalhe.jsx');
