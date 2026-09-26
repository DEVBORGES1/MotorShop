# MotorShop — Débito técnico e backlog pós-lançamento

> Registro da FASE 13 (2026-09-26). O que ficou para depois, **por quê**, e o
> que dispara a necessidade de resolver. Nada aqui é defeito escondido: são
> escolhas conscientes para o MVP, verificações que dependem de contas ou
> dispositivos, e ideias fora do escopo do briefing.
>
> Regra de uso: item resolvido sai daqui no mesmo commit que o resolve; item
> novo entra com motivo e gatilho.

---

## 1. Verificações que dependem do ambiente real

Não são débito de código — o código está pronto e testado —, mas os critérios
só fecham com contas, domínio ou aparelhos que este ambiente não tem.

| # | Pendência | Fase | Como fechar |
|---|---|---|---|
| V-01 | Publicação: contas, domínio, HTTPS | 12 | [`DEPLOYMENT.md`](./DEPLOYMENT.md) §2–§6 |
| V-02 | Envio de fotos com conta **Cloudinary real** (10 fotos, pasta, exclusão, formato AVIF/WebP entregue) | 8 | SETUP §4.1. O fluxo foi verificado com o provedor simulado, que confere as assinaturas |
| V-03 | Preview de link no WhatsApp/Facebook e JSON-LD no Rich Results Test | 9 | Precisa de endereço público |
| V-04 | **Lighthouse ≥ 90 no domínio de produção** | 9, 13 | Local: 95–98 (modo simulado), LCP 1,5–1,6 s com 4G real. Repetir no domínio, com fotos pelo Cloudinary |
| V-05 | Teste de **restauração de backup** e de **rollback** | 12 | DEPLOYMENT §10 e §11, no staging |
| V-06 | Rotação dos segredos e checklist de go-live | 10 | [`SECURITY.md`](./SECURITY.md) §9 |
| V-07 | **Responsividade em dispositivos reais** (Android, iOS, tablet) | 13 | Verificado em emulação (390, 768 e 1280 px, sem rolagem lateral em nenhuma página). Falta o toque real: teclado virtual sobre os formulários, galeria com gesto, barra fixa da moto no iOS |
| V-08 | **Leitor de tela** (NVDA/TalkBack/VoiceOver) | 13 | O axe passa sem violações em todas as páginas (E2E); rótulos, foco e ordem de títulos estão cobertos. Falta percorrer os fluxos com leitor de tela de verdade |
| V-09 | Bloqueio de merge com CI vermelha no GitHub (branch protection) | 11 | Configuração do repositório — SETUP §Testes |

---

## 2. Débito técnico

### DT-01 — Rate limit e cache do site em memória
**O quê:** contadores de limite e o cache de 5 min das páginas vivem na
memória do processo (risco R-06).
**Por quê:** o MVP roda em **uma** instância; Redis seria custo e peça a mais
sem uso.
**Gatilho:** subir para 2+ instâncias. Aí os limites passam a valer por
instância e o cache pode servir versões diferentes. Solução: store Redis no
`express-rate-limit` e no cache (§13.3 do ARCHITECTURE).

### DT-02 — Números dos limites sem tráfego real
**O quê:** 5 leads/hora por IP, 900 req/15 min na API pública etc. vêm do uso
esperado, não medido.
**Gatilho:** 2–4 semanas no ar. Conferir no log os 429 (quem, onde) e ajustar
a tabela em `rateLimiters.js` — cada linha já é testada.

### DT-03 — `style-src 'unsafe-inline'` na CSP
**O quê:** a CSP permite estilo inline.
**Por quê:** o tema da loja chega como `<style id="tema">` no HTML (cor
aplicada antes da primeira pintura, sem piscar), e o painel usa `style` nas
barras do resumo (`Dashboard.jsx`). Scripts inline continuam **proibidos** —
é o que importa contra XSS.
**Caminho:** hash do `<style id="tema">` calculado por resposta e as barras
com classes. Ganho pequeno; fazer se uma auditoria externa exigir.

### DT-04 — Campos de tema não usados
**O quê:** `theme.secondary` e `theme.accent` existem no modelo (previstos
em §5.5), mas o site deriva tudo da cor primária. Os seletores dessas cores
foram **retirados do painel** na FASE 13 — não faziam nada.
**Por quê ficou:** remover do modelo é migração sem ganho agora; usar exige
decisão de design (onde entra a segunda cor?).
**Gatilho:** um cliente pedir duas cores. Aí: definir o papel da secundária
nos tokens, voltar o seletor ao painel, com o mesmo ajuste de contraste da
primária.

### DT-05 — Cor da loja ajustada para caber no tema escuro
**O quê:** o tema do produto é escuro. Uma cor de marca escura (azul-marinho,
vinho) sumiria como texto sobre ele; a plataforma a **clareia no mesmo tom**
até o contraste AA (`utils/cor.js`). A loja pode ver um tom um pouco mais
claro que o escolhido.
**Gatilho:** cliente que exija a cor exata ou um site claro. Caminho: tema
claro como variante de produto (tokens alternativos em `index.css`,
escolhidos em Configurações).

### DT-06 — Interação só depois da hidratação
**O quê:** o HTML chega pronto do servidor e os **links** funcionam de
imediato; botões e formulários respondem quando o JS termina (~0,5 s a mais
que no SPA, nas páginas pesadas, com 4G real).
**Por quê:** foi a troca que levou o LCP de 2,4–3,4 s para 1,5–1,6 s
(decisão do dono: "quanto menos tempo melhor").
**Caminho, se medir problema:** hidratação parcial/por ilha, ou formulário
nativo com envio sem JS.

### DT-07 — Monitoramento só no servidor
**O quê:** o Sentry captura erros 500 do backend. Erro de JavaScript no
navegador do visitante não é registrado.
**Por quê:** o SDK de navegador custa ~25 kB no JS inicial e exigiria abrir
a CSP para o domínio do Sentry.
**Gatilho:** reclamação de "botão não funciona" sem erro no servidor.

### DT-08 — Sem MFA no painel
**Por quê:** equipe pequena; senha forte obrigatória, limites por conta e por
IP, sessão encerrada ao trocar senha ou desativar. Risco aceito em SECURITY §12.
**Gatilho:** loja com mais de um punhado de usuários, ou exigência do cliente.

### DT-09 — Loja única por instalação
**O quê:** `StoreSettings` é singleton; não há `storeId` nos documentos.
Cada loja nova é um deploy com banco próprio ([`CUSTOMIZATION.md`](./CUSTOMIZATION.md)).
**Gatilho:** operar muitas lojas pequenas, quando um deploy por loja custar
mais que a migração. Caminho em ARCHITECTURE §14.3 — os repositórios são o
único ponto que toca o banco, então o `storeId` entra localizado.

### DT-10 — Itens do modelo planejado que não foram construídos
Previstos em ARCHITECTURE §5.5 e deixados de fora por não terem uso no
briefing: `favicon` separado (o logo vira o ícone da aba), `theme.radius` e
fontes por loja, `seo.titleTemplate`, `social.tiktok`, `address.geo`,
`features.tradeInEnabled` (a troca é atendida pelo "Venda sua moto"). Nenhum
tem campo morto no banco. Entram se um cliente pedir.

### DT-11 — E2E sequencial num banco só
**O quê:** os fluxos E2E compartilham o banco e rodam um por vez, em ordem
(o teste de revenda troca a loja; o de acessibilidade roda depois, com ela).
**Por quê:** simples e rápido (~1 min) para 7 arquivos.
**Gatilho:** a suíte passar de ~5 min. Aí: banco por arquivo e paralelismo.

### DT-13 — Painel recarregado em várias abas ao mesmo tempo
**O quê:** cada renovação de sessão troca o token (rotação), e reapresentar
um token já trocado é tratado como roubo — todas as sessões caem. Dentro de
uma aba, as renovações são uma por vez; mas **duas abas do painel
recarregadas no mesmo instante** renovam em paralelo com o mesmo cookie, e a
segunda derruba a sessão.
**Por quê ficou:** raro no uso normal (uma aba do painel). O site público
**não** entra nessa conta: ele só consulta a sessão (`GET /api/auth/sessao`),
sem renovar.
**Caminho:** janela de tolerância de poucos segundos para o token recém-
trocado (devolver o mesmo par novo), ou trava entre abas com
`BroadcastChannel`/`navigator.locks` no cliente.

### DT-12 — Casca do painel fora dos tokens
**O quê:** a barra lateral e o topo do painel usam `bg-[#0D0F0D]` direto,
não um token. É cor do **produto** (não da loja) e passa no contraste, mas
foge do padrão.
**Custo de resolver:** um token `--color-chrome`. Fazer na próxima mexida no
layout do painel.

---

## 3. Backlog pós-lançamento

Fora do briefing (R-16). Cada item vira fase nova, com aprovação do dono.

| Ideia | Valor | Observação |
|---|---|---|
| Aviso de lead novo por e-mail ou WhatsApp para a loja | Alto | Hoje a loja precisa abrir o painel. Exige provedor de e-mail (custo, SPF/DKIM) |
| Exportar leads (CSV) | Médio | Base para CRM externo; cuidado LGPD no arquivo exportado |
| CAPTCHA nos formulários | — | **Só se o spam se confirmar** (R-11); hoje: honeypot + 5/hora por IP |
| Tema claro | Médio | Ver DT-05 |
| Painel: relatórios (motos mais vistas, leads por origem) | Médio | Origem e UTM já são gravadas em cada lead |
| Multi-loja | Alto ao escalar | Ver DT-09 |
| Integração com portais (OLX, Webmotors) | Alto | Fora do briefing |
| Blog/conteúdo, comparador, chat, app | — | Fora do briefing (ROADMAP, "o que não inclui") |
