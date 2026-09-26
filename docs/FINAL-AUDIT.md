# MotorShop — Auditoria final (FASE 13)

> Realizada em 2026-09-26, sobre o código da branch `main`. Responde às
> perguntas da FASE 13 do [`ROADMAP.md`](./ROADMAP.md): a plataforma é um
> **produto base revendável**? Cada requisito foi entregue, adiado ou
> descartado — e por quê? O que ficou para depois está em
> [`TECHNICAL-DEBT.md`](./TECHNICAL-DEBT.md).

---

## 1. Veredito

**Sim, é um produto base.** Uma segunda loja — outro nome, razão social,
slogan, logo, cor, WhatsApp, cidade, diferenciais e módulos — foi configurada
**só pelo painel**, e o site inteiro mudou sem uma linha de código (§3). O
teste roda a cada push (`e2e/6-revenda.spec.js`).

A auditoria encontrou e corrigiu **13 problemas** (§7). Nenhum deles vazava
dado ou quebrava fluxo de venda; o mais sério era que **não havia como**
trocar o logo, a imagem de compartilhamento nem o endereço do site pelo
painel — uma loja nova precisaria de acesso ao banco para isso.

O que falta depende do ambiente real (contas, domínio, aparelhos) e está
listado em TECHNICAL-DEBT §1.

---

## 2. Matriz de requisitos

Legenda: ✅ entregue · 🔁 entregue de outra forma (motivo ao lado) ·
⏳ adiado (motivo e gatilho em TECHNICAL-DEBT) · ✖ descartado (justificativa)

### 2.1 Site público

| Requisito | Situação | Observação |
|---|---|---|
| Home com destaques, ofertas e últimas cadastradas | ✅ | Seções somem quando vazias |
| Estoque com filtros (marca, busca, preço, ano, km, cilindrada, combustível, câmbio) | ✅ | Filtros na URL, compartilháveis |
| Ordenação e paginação no servidor | ✅ | Ordem por whitelist; `limit` ≤ 48 |
| Painel de filtros deslizante no celular | ✅ | |
| Página da moto: galeria com tela cheia, ficha, opcionais, descrição | ✅ | Galeria com gesto e teclado |
| Selo de status; moto vendida acessível sem preço (decisão A) | ✅ | CTA "Avise-me de uma similar" |
| WhatsApp com mensagem contextual (modelo, ano, link) | ✅ | `wa.me` (decisão G) |
| Motos similares, breadcrumb, barra fixa no celular | ✅ | |
| "Tenho interesse", "Venda sua moto", contato | ✅ | |
| Financiamento: simulador (Price), aviso de estimativa, envio como lead | ✅ | Servidor refaz a conta com a taxa dele |
| Sobre, contato com endereço, horários e mapa | 🔁 | Mapa como **link** "Abrir no mapa": um iframe traria script e rastreio de terceiro e exigiria abrir a CSP |
| Política de privacidade (LGPD) | ✅ | Controladora = razão social da loja |
| Botão flutuante de WhatsApp | ✅ | Some sem WhatsApp configurado |
| Preço "sob consulta" (decisão B) | ✖ | Preço visível converte melhor; nenhum cliente pediu |

### 2.2 Painel administrativo

| Requisito | Situação | Observação |
|---|---|---|
| Login com sessão segura | ✅ | Token em memória + refresh em cookie `httpOnly` com rotação |
| Resumo (contadores) | ✅ | `/admin` (não `/admin/dashboard`) |
| Motos: lista, busca, filtro por status, criar, editar, status, desativar | ✅ | "Excluir" desativa (D-06) |
| Fotos: envio direto ao provedor, progresso, ordenar, principal, `alt`, excluir | ✅ | Ordenar também por botões (teclado e toque) |
| Marcas | ✅ | Marca em uso não é excluída (409) |
| Leads: lista, filtros, detalhe, status, anotações | ✅ | |
| Exclusão de lead (LGPD) e em lote (decisão E) | ✅ | Só SUPER_ADMIN |
| Usuários (SUPER_ADMIN), proteção do último super admin | ✅ | |
| Configurações da loja — identidade, contato, endereço, horários, redes, módulos, financiamento, cor | ✅ | |
| Configurações — **logo, imagem de compartilhamento, SEO** | ✅ | **Adicionado nesta fase** — faltava (§7) |
| Configurações — diferenciais da home | ✅ | **Adicionado nesta fase** — eram texto fixo (§7) |
| Cores secundária e de destaque | ⏳ | Seletores retirados: não faziam nada (DT-04) |

### 2.3 API e dados

| Requisito | Situação | Observação |
|---|---|---|
| Envelope único de sucesso e erro | ✅ | Conferido em **todas** as rotas (`envelope.test.js`) |
| `GET /api/motos/:id` público (briefing) | 🔁 | Só por slug no público; id no admin (§6.5 do ARCHITECTURE) |
| CRUD em `/api/motos` (briefing) | 🔁 | Sob `/api/admin/motos` — o público não tem código capaz de vazar campo privado |
| `GET /api/leads` (briefing) | 🔁 | `GET /api/admin/leads` (dado pessoal) |
| `PATCH /motos/:id/status`, `GET /api/filtros` | ✅ | Acrescentados ao briefing (§6.5) |
| Preço em centavos, slug imutável, lead com discriminador | ✅ | D-04, D-07, D-05 |
| `asyncHandler` | ✖ | Express 5 já propaga erro de função assíncrona (D-10) |
| Referência de endpoints | ✅ | [`API.md`](./API.md) |

### 2.4 SEO e desempenho

| Requisito | Situação | Observação |
|---|---|---|
| Título, descrição, Open Graph e Twitter no HTML inicial | 🔁 | Além da injeção de meta planejada, a página inteira é **renderizada no servidor** (decisão do dono) |
| JSON-LD (Vehicle+Offer, AutoDealer, breadcrumb), sitemap, robots por ambiente | ✅ | Rich Results Test pendente de domínio (V-03) |
| `noindex` no catálogo filtrado, canonical | ✅ | |
| Code splitting, admin fora do bundle público | ✅ | JS inicial 138 kB gzip (orçamento 180) |
| Fontes | 🔁 | No próprio domínio (`@fontsource`) em vez do Google: −780 ms de bloqueio e sem enviar o IP do visitante |
| Hook de SEO no cliente | 🔁 | `useSeo` próprio, sem `react-helmet-async` |
| Lighthouse ≥ 90 | ✅ local · ⏳ produção | Local 95–98; LCP 1,5–1,6 s com 4G real (V-04) |

### 2.5 Segurança, testes e deploy

| Requisito | Situação | Observação |
|---|---|---|
| Cabeçalhos, CSP sem script inline, CORS fechado, limites por rota | ✅ | `style-src 'unsafe-inline'` aceito (DT-03) |
| Autorização testada rota por rota | ✅ | Matriz descobre as rotas sozinha |
| OWASP Top 10, LGPD | ✅ | [`SECURITY.md`](./SECURITY.md) §10–§11 |
| Rate limits com tráfego real | ⏳ | Sem tráfego ainda (DT-02) |
| Rotação de segredos | ⏳ | No go-live (V-06) |
| Testes unitários, integração, componentes, E2E, cobertura, CI | ✅ | §6 |
| `mongodb-memory-server` | 🔁 | É o padrão local sem configuração; a CI usa um contêiner `mongo:7` (mais rápido, e lá teste de banco pulado vira falha) |
| Deploy com CI/CD, health check, índices, monitoramento, runbook | ✅ preparado · ⏳ publicação | Depende das contas (V-01) |
| Backup M10 e teste de restauração; rollback testado | ⏳ | V-05 |
| Cloudflare (DNS, WAF, cache) | ⏳ | Recomendado, não obrigatório; DEPLOYMENT §6.2 |

### 2.6 Fora do briefing

Multi-loja, conta de comprador, pagamento, avaliação automática, comparador,
chat, portais, e-mail transacional, blog, app, BI, internacionalização —
registrados em ROADMAP ("o que não inclui") e TECHNICAL-DEBT §3. Nenhum foi
construído.

---

## 3. Teste de revenda

`e2e/6-revenda.spec.js` entra no painel como dono de outra loja e, **só pela
tela de Configurações**, troca:

| Configurado | Conferido no site (visitante novo, sem cache) |
|---|---|
| Nome "Garagem Duas Rodas", razão social, slogan | Título da aba, `<h1>` da home, rodapé; política de privacidade nomeia a razão social; nenhum resquício do nome anterior no HTML |
| Cor `#1e6fff` | `<style id="tema">` com a cor (clareada para contraste AA) |
| Logo | Cabeçalho com a versão de 88 px; ícone da aba gerado do logo |
| WhatsApp, cidade/UF | Link `wa.me` com o número novo; cidade no rodapé |
| Diferencial "Garantia de 90 dias" | Faixa da home com ele, sem os diferenciais da loja anterior |
| Módulo "Venda sua moto" desligado | Link some do site; `/venda-sua-moto` responde 404 (a recusa do lead pela API é coberta no teste de integração) |

---

## 4. Varreduras

| Varredura | Como | Resultado |
|---|---|---|
| Dado de loja no código | Busca por telefones, CNPJ, e-mails, cidades, nomes, cores e textos de marketing em `frontend/src`, `backend/src`, `shared/src` | Encontrados e removidos: diferenciais fixos na home ("Troca aceita", "Revisadas…"), telefone de exemplo com DDD 49 no formulário. O que resta são **padrões do produto** (nome "MotorShop" e cor verde enquanto a loja não é configurada; seed de demonstração) |
| Envelope | `envelope.test.js`: percorre toda rota pública e do painel (descobertas do registro de rotas) com pedidos válidos e inválidos | Toda resposta tem o formato do contrato; nenhuma 500; 204 sem corpo |
| Código morto | `knip` + revisão | Removidos: `countByBrand`, `isDev` e 9 exports sem uso fora do próprio arquivo. Restam só falsos positivos (arquivos de teste e E2E) |
| `TODO`, `console.log` | `grep` em todo o código de produção | Nenhum `TODO`/`FIXME`. `console.log` só nos scripts de linha de comando (`seed`, `create:superadmin`, `db:*`), onde é a saída esperada |
| Segurança (reexecução da FASE 10) | `npm audit`; varredura de segredos no histórico inteiro; matriz de permissões e exposição com as rotas novas | 0 vulnerabilidades; nenhum segredo versionado; rotas de imagem da loja só para SUPER_ADMIN, com pasta própria e assinatura do provedor conferida |

---

## 5. Acessibilidade e responsividade

**Automático** — `e2e/7-acessibilidade.spec.js` roda o axe-core (WCAG 2.1 A/AA
+ boas práticas) nas 9 páginas públicas, no login e nas 7 telas do painel, em
390 e 1280 px, **com a loja da revenda** (cor escolhida pelo lojista, não a
padrão). Zero violações. Também confere que o primeiro Tab oferece "Pular
para o conteúdo" e que o foco segue para o `<main>`.

Encontrado e corrigido:

| Problema | Correção |
|---|---|
| Cor da loja escura (ex.: azul `#1e6fff`) ilegível como texto no fundo escuro (3,9:1) | Cor clareada no mesmo tom até 4,5:1 (`utils/cor.js`), com aviso no painel |
| Cinza secundário (`ink-500`) e vermelho de erro abaixo de 4,5:1 sobre superfícies elevadas | Tokens clareados; contrastes anotados em `index.css` |
| "sem foto" no card com contraste 2,8:1 | Tom mais claro |
| Link dentro de texto só distinguível pela cor (privacidade, financiamento) | Sublinhado |
| Coluna de ações da tabela sem nome para leitor de tela | "Ações" visível só para leitor de tela |
| Estoque pulava do `h1` para os `h3` dos cards | `h2` invisível "Resultado da busca" |
| Botão flutuante do WhatsApp fora de qualquer região | Dentro de um `<aside>` rotulado |
| Login sem `<main>` nem `h1` | Corrigido |

**Responsividade** — capturas e medição de rolagem lateral em 390, 768 e
1280 px, site e painel:

| Problema | Correção |
|---|---|
| Em 768 px o menu do cabeçalho espremia o nome da loja e "Venda sua moto" em três linhas | Menu compacto até 1024 px |
| Tabelas do painel alargavam a página no celular (o rótulo invisível escapava do contêiner rolável) | Contêiner posicionado |

Pendente: aparelhos reais e leitor de tela (V-07, V-08).

---

## 6. Testes

| Pacote | Testes | Linhas | Funções | Ramos |
|---|---|---|---|---|
| shared | 61 | 98,1% | 95,7% | 83,4% |
| backend | 615 | 97,0% | 97,3% | 84,2% |
| frontend | 337 | 91,3% | 82,7% | 82,5% |
| E2E | 11 (7 arquivos) | — | — | — |

E2E: os 5 fluxos de negócio da FASE 11 + revenda + acessibilidade (celular,
computador e teclado). Limites de cobertura mantidos (70% global; 90% nos
serviços e no cálculo de financiamento).

---

## 7. Problemas encontrados e corrigidos

1. **Sem logo, imagem de compartilhamento nem SEO no painel.** O modelo tinha
   os campos, mas nenhuma tela os preenchia — uma loja nova ficaria sem logo e
   com links errados no Google e no WhatsApp. Agora: envio direto ao provedor
   (mesmo fluxo verificado das fotos), rotas só para SUPER_ADMIN, imagem
   anterior apagada ao trocar.
2. **Razão social e imagem de compartilhamento fora da configuração pública**
   — a política de privacidade não conseguia nomear a controladora dos dados.
3. **Diferenciais fixos no código** ("Troca aceita", "Revisadas antes da
   vitrine"…): promessas que nem toda loja cumpre. Viraram configuração;
   sem nenhum, a faixa não aparece.
4. **Ícone da aba sempre o do MotorShop.** Agora é gerado do logo da loja.
5. **Seletores de cor secundária e de destaque que não faziam nada** —
   retirados (DT-04).
6. **Telefone de exemplo com DDD 49** no formulário — trocado por máscara
   neutra.
7. **Telefone da loja sem máscara** no cabeçalho, rodapé e contato
   ("4935550000") — agora "(49) 3555-0000".
8. **Módulo desligado ainda aceitava lead pela API** — a página sumia, mas um
   envio direto criava lead de "venda sua moto" ou financiamento. Agora 422.
9. **Cor da loja podia deixar o texto ilegível** (§5).
10. **Contrastes abaixo de AA** em superfícies elevadas (§5).
11. **Estrutura para leitor de tela** — regiões, títulos, nome de coluna,
    login (§5).
12. **Cabeçalho espremido em tablet e tabela alargando a página** (§5).
13. **Código morto** — 2 funções e 9 exports sem uso (§4).

---

## 8. Critérios de conclusão da FASE 13

| Critério | Situação |
|---|---|
| Requisitos classificados com justificativa | ✅ §2 |
| Segunda loja configurada sem tocar em código | ✅ §3, em CI |
| Zero dado de loja hardcoded | ✅ §4 |
| Envelope consistente em todos os endpoints | ✅ §4 |
| Acessibilidade: contraste AA, teclado, foco visível, rótulos | ✅ automático · ⏳ leitor de tela (V-08) |
| Responsividade em dispositivo real | ⏳ emulado ✅ (V-07) |
| Auditoria de segurança reexecutada, sem pendência | ✅ (rotação no go-live, V-06) |
| Testes verdes; cobertura mantida | ✅ §6 |
| Lighthouse ≥ 90 em produção | ⏳ local ✅ (V-04) |
| `CUSTOMIZATION.md` | ✅ [`CUSTOMIZATION.md`](./CUSTOMIZATION.md) |
| `TECHNICAL-DEBT.md` | ✅ [`TECHNICAL-DEBT.md`](./TECHNICAL-DEBT.md) |
| Nenhum `console.log` ou `TODO` esquecido | ✅ §4 |
