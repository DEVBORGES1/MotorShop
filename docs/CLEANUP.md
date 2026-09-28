# MotorShop — Limpeza

> 2026-09-28. O projeto já chegou à auditoria enxuto: nenhum arquivo órfão,
> nenhum log de depuração, nenhuma dependência sem uso. A limpeza foi pequena
> e cada remoção tem evidência. Inventário completo em
> [`AUDIT-INVENTORY.md`](./AUDIT-INVENTORY.md).

## 1. Removido

| O quê | Onde | Evidência de que não era usado |
|---|---|---|
| `fetchMe()` | `frontend/src/services/authService.js` | Nenhuma referência em código de produção (`git grep fetchMe`): o painel obtém o usuário pela renovação de sessão. Só uma linha de teste o chamava — removida junto. A rota `/api/auth/me` **continua** (API documentada em `API.md`) |
| `urlOtimizada` | `frontend/src/utils/imagem.js` | Apelido de `optimizedImageUrl` (shared) sem nenhum uso em produção |
| 2 testes de `urlOtimizada` | `frontend/src/utils/imagem.test.js` | Repetiam, com os mesmos casos, os testes de `optimizedImageUrl` em `shared/tests/images.test.js`, que continuam |

Nenhum **arquivo** foi removido: não havia arquivo sem referência.

## 2. Unificado (código repetido)

| O quê | Antes | Depois |
|---|---|---|
| Campo que só avisa depois da pausa na digitação | A mesma lógica (rascunho, espera de 400 ms, sincronizar com a URL, limpar o timer) copiada em `MotoFilters.jsx`, `Estoque.jsx` e `admin/MotosList.jsx` | Hook `useRascunhoAdiado`, com testes próprios (espera, sincronia com o valor externo, desmontagem sem aviso tardio). A marcação de cada campo continua no seu componente |
| Tamanho do logo | Três tamanhos pedidos ao provedor (cabeçalho, hero, Sobre) | Um só (`logoUrl` sem parâmetro de altura) |

## 3. Atualizado (API depreciada)

| O quê | Por quê |
|---|---|
| `{ new: true }` / `{ new: false }` → `returnDocument: 'after'` / `'before'` em 8 chamadas do Mongoose | A opção antiga gerava um aviso a cada atualização (visto nos logs da CI) e vai sair numa versão futura |

## 4. Avaliado e mantido

| Candidato | Por que fica |
|---|---|
| `docs/PHASE-{1,2,3}-REPORT.md` | Histórico das fases, citados no README |
| `docs/FINAL-AUDIT.md` da FASE 13 | Renomeado para `FINAL-AUDIT-FASE-13.md` (conteúdo intacto); referências atualizadas |
| `getAccessToken`, `RATE_LIMITS`, `ADMIN_ROUTERS` e outros exports lidos só por testes | São o ponto que permite aos testes percorrer toda rota/limite; remover tiraria cobertura |
| `console.error` em `config/env.js` | Roda antes de o logger existir, ao recusar a configuração |
| Testes | Nenhum removido além dos 2 duplicados acima. Ver [`FINAL-AUDIT.md`](./FINAL-AUDIT.md) §11–13 |
