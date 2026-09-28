# MotorShop — Auditoria final completa

> 2026-09-28, depois de todas as fases. Relatórios de apoio:
> [`AUDIT-INVENTORY.md`](./AUDIT-INVENTORY.md) (inventário),
> [`SECURITY-AUDIT.md`](./SECURITY-AUDIT.md) (segurança),
> [`PERFORMANCE-AUDIT.md`](./PERFORMANCE-AUDIT.md) (medições),
> [`CLEANUP.md`](./CLEANUP.md) (limpeza). A auditoria da FASE 13 (matriz de
> requisitos, teste de revenda) segue em
> [`FINAL-AUDIT-FASE-13.md`](./FINAL-AUDIT-FASE-13.md).

## 1. Resumo executivo

O projeto chegou à auditoria em bom estado: arquitetura em camadas
respeitada, validação estrita em toda entrada, autenticação sólida, zero
vulnerabilidade de dependência, nenhum segredo exposto e nenhum arquivo
órfão. A auditoria encontrou **problemas reais, porém de baixo e médio
impacto**, todos corrigidos ou registrados:

- **Segurança:** 1 achado médio (CORS barrava `PUT`, quebrando o envio de logo
  quando site e API estão em origens diferentes) e 5 baixos; 4 corrigidos, 2
  aceitos com justificativa.
- **Performance:** o LCP da home caiu de **4,0 s para 3,1 s** e o do estoque de
  **4,1 s para 2,7 s** (4G lento, CPU 4×), eliminando a cascata JS → API → foto.
- **Limpeza:** 2 funções mortas, 1 lógica triplicada unificada, 1 API
  depreciada do Mongoose substituída.
- Uma **regressão introduzida durante a própria auditoria** (hook de dados
  iniciais que quebrava a home no navegador) foi pega pela varredura de
  responsividade antes do commit, corrigida e coberta por teste.

## 2. Estado inicial

| Item | Situação encontrada |
|---|---|
| Lint / formatação | Passando |
| Testes | 1.152 (shared 63, backend 628, frontend 461) + 14 E2E, todos passando |
| Build | Passando; JS inicial ~145 KB gzip |
| `npm audit` | 0 vulnerabilidades |
| Site publicado | No ar em configuração de staging (robots `Disallow: /`) |
| Avisos nos logs | Depreciação do Mongoose a cada atualização |

## 3. Problemas encontrados

| # | Área | Problema | Severidade | Status |
|---|---|---|---|---|
| P-01 | API | CORS sem `PUT` (S-01) | Média | Corrigido |
| P-02 | Segurança | Algoritmo do JWT não fixado (S-02) | Baixa | Corrigido |
| P-03 | Segurança | `siteUrl` aceitava `javascript:` (S-03) | Baixa | Corrigido |
| P-04 | Segurança | `/auth/logout` e `/auth/me` sem limite (S-04) | Baixa | Corrigido |
| P-05 | Segurança | Sem teto de login por conta entre IPs (S-05) | Baixa | Aceito (DT-15) |
| P-06 | Segurança | Tamanho do upload conferido pelo navegador (S-06) | Baixa | Aceito (DT-16) |
| P-07 | Performance | Home: foto do hero esperava JS + 3 chamadas | Alta (UX) | Corrigido |
| P-08 | Performance | Estoque: foto do 1º card esperava JS + API | Alta (UX) | Corrigido |
| P-09 | Performance | 2º slide do carrossel disputava banda com o LCP | Média | Corrigido |
| P-10 | Performance | Logo baixado em dois tamanhos | Baixa | Corrigido |
| P-11 | Código | Lógica de campo com espera copiada em 3 lugares | Baixa | Unificado |
| P-12 | Código | Opção `new` do Mongoose depreciada | Baixa | Substituída |
| P-13 | Código | `fetchMe` e `urlOtimizada` sem uso | Baixa | Removidos |
| P-14 | UX/console | 401 no console do login do painel sem sessão | Baixa | Aceito (DT-14) |
| P-15 | Performance | Home ainda em 3,1 s (divide banda com JS e cards) | Média | Registrado (DT-13) |

## 4. Vulnerabilidades encontradas

Nenhuma crítica ou alta. Detalhe em [`SECURITY-AUDIT.md`](./SECURITY-AUDIT.md) §2.

| Severidade | Quantidade |
|---|---|
| Crítica | 0 |
| Alta | 0 |
| Média | 1 (S-01) |
| Baixa | 5 (S-02 a S-06) |

## 5. Melhorias de segurança

- `PUT` liberado no CORS, com teste que percorre **todas** as rotas e exige
  que cada método usado esteja no preflight.
- JWT com `HS256` fixo na emissão e na verificação (teste prova que `HS512`
  com o mesmo segredo e `none` são recusados).
- `siteUrl` restrito a `http(s)`.
- Limitador em `/auth/logout` e `/auth/me`.

## 6. Melhorias de performance

- Dados de partida e pré-anúncio da foto do LCP na home e no estoque sem
  filtro (o mesmo padrão que a página da moto já usava).
- Segunda foto do carrossel só após a primeira carregar.
- Logo em um tamanho só.

Números em [`PERFORMANCE-AUDIT.md`](./PERFORMANCE-AUDIT.md).

## 7. Melhorias arquiteturais

A cadeia rota → controller → service → repository → MongoDB está respeitada
em todos os módulos: nenhuma rota acessa o banco, nenhum controller tem
regra de negócio (só tradução HTTP ⇄ domínio; o maior, o do HTML com SEO,
tem 112 linhas), componentes React não conhecem Axios, `process.env` só em
`backend/src/config/env.js` e URL da API só em `frontend/src/config/env.js`.
Varredura dos imports de 212 arquivos de produção: **nenhuma dependência
circular**. Nenhuma abstração sem uso encontrada.

Mudanças:
- Hook `useRascunhoAdiado` no lugar de três cópias da mesma lógica.
- Hook `useDadoInicial(chave)` para os dados de partida da home e do estoque,
  com as marcas de "já usado" num `WeakMap` fora do objeto que vira JSON.
- Documentação da arquitetura (§11 do `ARCHITECTURE.md`) atualizada com os
  novos dados de partida.

## 8. Limpeza realizada

Ver [`CLEANUP.md`](./CLEANUP.md): 2 funções mortas removidas, 1 lógica
unificada, 8 chamadas do Mongoose atualizadas, relatório da FASE 13
renomeado com as referências corrigidas.

## 9. Arquivos removidos

Nenhum. A varredura não encontrou arquivo de código, teste, script ou
documento sem referência ([`AUDIT-INVENTORY.md`](./AUDIT-INVENTORY.md) §2 e §6).
Renomeado: `docs/FINAL-AUDIT.md` (FASE 13) → `docs/FINAL-AUDIT-FASE-13.md`.

## 10. Dependências removidas

Nenhuma — todas as declaradas são usadas. Nenhuma atualização major
pendente; só patch/minor dentro da faixa, que o `npm ci` do deploy já
respeita pelo `package-lock.json`.

## 11. Testes removidos

| Teste | Motivo |
|---|---|
| `imagem.test.js` › "insere redimensionamento, f_auto e q_auto na URL do provedor" | Testava o apelido removido `urlOtimizada`; o mesmo caso existe em `shared/tests/images.test.js` |
| `imagem.test.js` › "URL de fora do provedor volta intacta" | Idem |
| Linha de `fetchMe` em `servicos.test.js` | Função removida; o resto do teste (renovação de sessão) continua |

## 12. Testes adicionados

| Teste | O que protege |
|---|---|
| `errors.test.js` › preflight libera todo método usado por alguma rota | S-01; rota nova com método novo já nasce coberta |
| `tokens.test.js` › só aceita o algoritmo da aplicação | S-02 |
| `store.schema.test.js` › `siteUrl` com `javascript:` recusado | S-03 (asserções novas num teste existente) |
| `seo.test.js` › home com listas e foto pré-anunciada; home sem foto sem pré-anúncio | P-07 |
| `seo.test.js` › estoque sem filtro com 1ª página e foto; filtrado sem nada | P-08 |
| `Home.test.jsx` › com as listas do servidor, sai com a foto sem pedir à API | P-07 no cliente |
| `Estoque.test.jsx` › usa a lista do HTML sem filtro; ignora com filtro | P-08 no cliente |
| `entry-server.test.jsx` › home do servidor já com a foto do hero | P-07 na renderização |
| `entry-server.test.jsx` › renderizar não escreve nos dados que vão para o HTML | Regressão encontrada na auditoria |
| `Hero.test.jsx` › 2ª foto só depois da 1ª; se a 1ª falhar, baixa assim mesmo | P-09 |
| `useRascunhoAdiado.test.jsx` (3 testes) | P-11 |

Total: 15 testes novos, 2 removidos.

## 13. Testes mantidos

Classificação por grupo (todos os 103 arquivos lidos por amostragem e pela
varredura de referências):

| Grupo | Veredito | Observação |
|---|---|---|
| Backend — autenticação, sessão, permissões, limites | KEEP | Cobrem os itens de maior risco; a matriz de permissões e a tabela de limites se estendem sozinhas a rotas novas |
| Backend — CRUD de motos, fotos, leads, loja, usuários (integração com MongoDB real em memória) | KEEP | Testam comportamento pela API, não implementação |
| Backend — schemas, env, logger, monitoramento, dinheiro, slug | KEEP | Regras puras, rápidas |
| Frontend — páginas e componentes (Testing Library) | KEEP | Consultas por papel e rótulo acessível; frágeis só se o texto mudar, o que é desejado |
| Frontend — utilitários (simulador, catálogo, formatação, imagem) | KEEP / REMOVE 2 | Os 2 duplicados do shared saíram |
| Frontend — `moto.test.js` (render estático) e `MotoGallery.test.jsx` | KEEP | Parecem sobrepostos, mas um confere o HTML do servidor (sem JS) e o outro a interação |
| Shared | KEEP | Fonte única de regras usadas nos dois lados |
| E2E (8 especificações) | KEEP | Fluxos principais, revenda, acessibilidade (axe) e equipe |

Nenhum teste obsoleto (que teste código inexistente) além dos citados;
nenhum REFACTOR necessário.

## 14. Alterações no frontend

`Hero.jsx` (2ª foto adiada, logo), `Home.jsx` e `Estoque.jsx` (dados de
partida), `DadosIniciaisContext.jsx` (`useDadoInicial`), `Header.jsx` e
`Sobre.jsx` (logo), `MotoFilters.jsx`, `Estoque.jsx` e `MotosList.jsx`
(`useRascunhoAdiado`), `authService.js` e `imagem.js` (código morto).

## 15. Alterações no backend

`app.js` (CORS), `auth/tokens.js` (algoritmo), `auth/auth.routes.js`
(limites), `store/store.schema.js` (`siteUrl`), `seo/seo.service.js` (dados de
partida e pré-anúncio da home e do estoque), repositórios (`returnDocument`).

## 16. Alterações no MongoDB

Nenhum índice criado ou removido: o `explain` das consultas reais mostrou
todas usando índice, sem COLLSCAN
([`PERFORMANCE-AUDIT.md`](./PERFORMANCE-AUDIT.md) §4). Nenhuma mudança de
esquema; o campo `tradeInValue` do lead de financiamento (feature anterior)
já estava documentado.

## 17. SEO

Verificado no site publicado e nos testes: título, descrição, canonical,
Open Graph e JSON-LD por página no HTML do servidor; sitemap dinâmico com
todas as motos públicas; robots por ambiente (produção libera e bloqueia só
`/admin` e `/api`; staging bloqueia tudo); painel com `noindex, nofollow`;
catálogo filtrado com `noindex, follow` e canonical sem filtro; slugs
legíveis. Imagens decorativas com `alt=""`; fotos de moto com o nome.
Nenhuma página pública bloqueada por engano.

## 18. Acessibilidade

O axe roda em todas as páginas públicas e do painel, no celular e no
computador, a cada push (E2E), sem violações — inclusive depois das mudanças
desta auditoria. Navegação por teclado (pular para o conteúdo, controles do
carrossel, interruptores) coberta por testes. HTML semântico com ARIA só
onde falta semântica nativa (carrossel, interruptor). Pendente: leitor de
tela real (V-08).

## 19. Performance

Ver §6 e [`PERFORMANCE-AUDIT.md`](./PERFORMANCE-AUDIT.md). CLS ≤ 0,002 em
todas as páginas; FCP < 1 s no 4G lento.

## 20. Segurança

Ver §5 e [`SECURITY-AUDIT.md`](./SECURITY-AUDIT.md). Endpoints:

| Método | Endpoint | Público | Autenticação | Permissão | Validação | Limite |
|---|---|---|---|---|---|---|
| GET | `/api`, `/api/health` | sim | — | — | — | — |
| POST | `/api/auth/login` | sim | — | — | Zod | IP+conta e IP |
| POST | `/api/auth/refresh` | sim | cookie | — | cookie | 30/15 min |
| POST | `/api/auth/logout` | sim | cookie | — | — | site |
| GET | `/api/auth/sessao` | sim | cookie | — | — | site |
| GET | `/api/auth/me` | não | Bearer | qualquer admin | — | site |
| GET | `/api/motos`, `/api/motos/slug/:slug`, `…/similares` | sim | — | — | Zod | site |
| GET | `/api/marcas`, `/api/store`, `/api/filtros` | sim | — | — | Zod (filtros) | site |
| POST | `/api/leads` | sim | — | — | Zod | 5/hora |
| * | `/api/admin/motos/**` (10 rotas) | não | Bearer | ADMIN, SUPER_ADMIN | Zod | painel |
| * | `/api/admin/marcas/**` (5 rotas) | não | Bearer | ADMIN, SUPER_ADMIN | Zod | painel |
| POST | `/api/admin/uploads/assinatura` | não | Bearer | ADMIN, SUPER_ADMIN | Zod | painel |
| GET, PATCH | `/api/admin/leads`, `/api/admin/leads/:id` | não | Bearer | ADMIN, SUPER_ADMIN | Zod | painel |
| POST, DELETE | `/api/admin/leads/exclusao`, `/api/admin/leads/:id` | não | Bearer | SUPER_ADMIN | Zod | painel |
| GET | `/api/admin/store` | não | Bearer | ADMIN, SUPER_ADMIN | — | painel |
| PATCH, POST, PUT, DELETE | `/api/admin/store`, `…/imagens/**` | não | Bearer | SUPER_ADMIN | Zod | painel |
| * | `/api/admin/usuarios/**` (5 rotas) | não | Bearer | SUPER_ADMIN | Zod | painel |

Respostas no envelope padrão (`success`, `data`/`errors`, `requestId`);
códigos coerentes (401 sem sessão, 403 sem papel, 404, 409 conflito, 422
validação, 429 limite, 503 banco fora). Nenhum endpoint duplicado ou sem uso.

## 21. Problemas ainda existentes

| Item | Onde |
|---|---|
| LCP da home em 3,1 s no 4G lento | DT-13 |
| 401 no console do login do painel | DT-14 |
| Sem teto de login por conta entre IPs | DT-15 |
| Tamanho do upload conferido pelo navegador | DT-16 |
| Verificações que dependem do ambiente real (domínio, Cloudinary de produção, aparelhos, leitor de tela, backup) | V-01 a V-09 |

## 22. Melhorias futuras

Reduzir a foto do hero em telas de alta densidade (é fundo com véu escuro) e
adiar as fotos dos cards até o LCP (DT-13); MFA no painel (DT-08); cache e
limites compartilhados ao escalar para mais de uma instância (DT-01);
backlog de produto em [`TECHNICAL-DEBT.md`](./TECHNICAL-DEBT.md) §3.

## 23. Resultado dos testes finais

| Suíte | Resultado |
|---|---|
| Shared | 63 passando |
| Backend (unitários + integração com MongoDB) | 634 passando |
| Frontend | 468 passando |
| E2E (Playwright, build de produção) | 14 passando |
| Lint | sem erros |
| Formatação (Prettier) | ok |

## 24. Resultado do build

`vite build` (cliente) e `vite build --ssr` (servidor) sem erros nem avisos;
sem source maps publicados; JS inicial ~145 KB gzip, CSS 9 KB.

## 25. Status final do projeto

```
AUDITORIA FINAL

Arquivos analisados: 361 (218 de código, 103 de teste)
Arquivos removidos: 0 (1 renomeado)
Dependências removidas: 0
Testes removidos: 2
Testes adicionados: 15
Vulnerabilidades críticas: 0
Vulnerabilidades altas: 0
Vulnerabilidades médias: 1 (corrigida)
Problemas de performance encontrados: 5 (4 corrigidos, 1 registrado)
Problemas arquiteturais encontrados: 2 (corrigidos)

Testes:   PASS
Lint:     PASS
Build:    PASS
Frontend: OK
Backend:  OK
MongoDB:  OK
Segurança:   OK — 2 riscos baixos aceitos e documentados
Performance: OK — LCP da home (3,1 s em 4G lento) com próximo passo registrado
```

### Checklist

- [x] Projeto inicia corretamente (build de produção servido pelo backend)
- [x] Frontend, backend, API e MongoDB funcionam (E2E ponta a ponta)
- [x] Login e autorização (matriz de permissões + E2E da equipe)
- [x] CRUD de motos, leads, upload (integração + E2E com provedor simulado)
- [x] WhatsApp (links testados em unidade e E2E)
- [x] Responsividade (10 páginas × 8 larguras, sem rolagem lateral)
- [x] SEO (HTML do servidor, sitemap, robots, noindex)
- [x] Testes, lint e build passando
- [x] Nenhum segredo exposto; nenhum `console.log` desnecessário
- [x] Nenhum arquivo morto nem dependência desnecessária conhecidos
- [x] Nenhum endpoint sem proteção indevida
- [x] Nenhuma vulnerabilidade crítica conhecida
- [x] Performance analisada com medição real
- [x] Documentação atualizada
