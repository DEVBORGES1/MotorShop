# Deploy e operação

Como colocar a MotorShop no ar e mantê-la funcionando. Escrito para que outra
pessoa consiga operar o sistema sem ter participado do desenvolvimento.

> **Resumo:** um serviço Node no Render (site + API no mesmo processo),
> MongoDB Atlas, Cloudinary para as fotos e, opcionalmente, Cloudflare na
> frente. Push na `main` → CI verde → deploy automático → o tráfego só muda
> quando o novo servidor responde saudável.

---

## 1. Visão geral

```
Visitante ──► Cloudflare (opcional: DNS, HTTPS, cache, WAF)
                  │
                  ▼
            Render — serviço "motorshop" (Node 22)
              /api/*        API
              /assets/*     arquivos do build (cache de 1 ano)
              /*            página renderizada no servidor
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
  MongoDB Atlas        Cloudinary (fotos: o navegador envia direto)
```

| Ambiente | Serviço no Render | Banco | Fotos (pasta) | Google |
|---|---|---|---|---|
| Produção | `motorshop` | Atlas **M10** (`motorshop_prod`) | `prod/` | indexa |
| Staging / demonstração | `motorshop-staging` | Atlas M0 (`motorshop_staging`) | `staging/` | **bloqueado** (`robots.txt`: `Disallow: /`) |

Os dois serviços estão descritos em [`render.yaml`](../render.yaml). O que é
segredo **não** está lá: é preenchido no painel do Render.

**Custos aproximados** (confira os valores atuais nos sites): Render Starter
~US$ 7/mês por serviço; Atlas M10 a partir de ~US$ 57/mês (M0 é grátis);
Cloudinary, Cloudflare e Sentry têm planos gratuitos que bastam para uma
loja; domínio `.com.br` ~R$ 40/ano.

---

## 2. Contas necessárias

| Conta | Para quê | Obrigatória |
|---|---|---|
| GitHub | código e CI (já existe) | sim |
| [Render](https://render.com) | servidor | sim |
| [MongoDB Atlas](https://www.mongodb.com/atlas) | banco | sim |
| [Cloudinary](https://cloudinary.com) | fotos das motos | sim |
| Registro de domínio (Registro.br etc.) | endereço da loja | sim, para produção |
| [Cloudflare](https://cloudflare.com) | DNS, HTTPS na borda, cache, WAF | recomendada |
| [Sentry](https://sentry.io) | aviso de erro em produção | recomendada |
| Monitor de disponibilidade (UptimeRobot, Better Stack) | aviso de site fora do ar | recomendada |

Use o e-mail da empresa, não um pessoal, e ative a verificação em duas
etapas em todas.

---

## 3. Banco de dados (MongoDB Atlas)

1. Crie um **projeto** "MotorShop".
2. Crie os clusters, na **AWS, região N. Virginia (us-east-1)** — a mesma do
   Render (`virginia`), para a latência entre servidor e banco ser mínima:
   - produção: **M10** (tem backup contínuo; o M0 não tem backup — R-04);
   - staging: M0 (grátis).
3. **Backup** (produção): em *Backup*, ative o **Continuous Cloud Backup**.
4. **Usuários** (*Database Access*): um por ambiente, com papel
   `readWrite` **apenas** no banco do ambiente (`motorshop_prod` ou
   `motorshop_staging`). Senha gerada, longa. Nunca use o usuário de
   administrador do Atlas na aplicação.
5. **Acesso de rede** (*Network Access*): libere os IPs de saída do Render
   (painel do serviço → *Connect* → *Outbound*). Se preferir não fixar IPs,
   `0.0.0.0/0` funciona, mas então a senha do usuário é a única barreira.
6. Copie a *connection string* e coloque o nome do banco no caminho:
   `mongodb+srv://USUARIO:SENHA@cluster.xxxxx.mongodb.net/motorshop_prod?retryWrites=true&w=majority`

---

## 4. Fotos (Cloudinary)

1. Em *Settings → API Keys*, gere **uma chave por ambiente** (produção e
   staging): assim dá para revogar uma sem derrubar a outra.
2. Anote `Cloud name`, `API Key` e `API Secret`.
3. Não é preciso criar pastas nem *upload presets*: o servidor assina cada
   envio para a pasta do ambiente (`STORAGE_FOLDER`) e da moto.

O `API Secret` nunca vai para o navegador; o site recebe só assinaturas
temporárias (1 h) para uma pasta específica.

---

## 5. Servidor (Render)

### 5.1 Criar os serviços

1. No Render: **New → Blueprint** → conecte o repositório `MotorShop`.
2. O Render lê o `render.yaml` e pede as variáveis marcadas como secretas:

| Variável | Valor |
|---|---|
| `MONGODB_URI` | a connection string do ambiente (seção 3) |
| `FRONTEND_URL` | o endereço público, sem barra no fim: `https://www.sualoja.com.br` (no início, o `https://motorshop.onrender.com` que o Render mostrar) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | da seção 4 |
| `SENTRY_DSN` | da seção 8 (pode deixar vazio no começo) |

   O `JWT_SECRET` é **gerado pelo próprio Render**, diferente em cada
   serviço — não copie de lugar nenhum.
3. Confirme. O primeiro deploy começa.

> O build precisa de `MONGODB_URI` e `JWT_SECRET` definidas: a verificação
> do backend valida a configuração de produção já no build. Variável
> faltando → o build falha, e o erro diz qual.

### 5.2 O que acontece em cada deploy

1. Push na `main`.
2. O GitHub roda a **CI** (lint, formato, ~950 testes, build, E2E). Se
   falhar, **o Render não faz deploy** (`autoDeployTrigger: checksPass`).
3. O Render constrói: `npm ci --include=dev && npm run build` (site, página
   do servidor e verificação do backend).
4. **Pré-deploy:** `npm run db:indexes` cria os índices que faltarem. Se
   falhar, o deploy para.
5. Sobe o servidor novo. Ele **recusa subir** se o build do site não
   existir.
6. O Render chama `/api/health` e **só troca o tráfego quando responde
   200** — o que exige o banco conectado. Até lá, a versão anterior segue
   atendendo.

Qualquer falha em 2–6 deixa a versão anterior no ar.

### 5.3 Primeiro acesso

No painel do serviço → **Shell**:

```bash
npm run create:superadmin      # pede nome, e-mail e senha do dono
npm run db:check               # confere loja, administrador e índices
```

Depois, no site: `/admin/login` → **Configurações**: nome, razão social,
**logo e imagem de compartilhamento**, contato, endereço, horários,
diferenciais, cor, módulos, taxa de financiamento e, em *Endereço e busca*,
o **endereço do site** (`siteUrl`) — é dele que saem os links do Google, do
WhatsApp e do sitemap. Seção por seção, e o checklist de entrega de uma loja
nova: [`CUSTOMIZATION.md`](./CUSTOMIZATION.md).

---

## 6. Domínio e HTTPS

### 6.1 Só com o Render

Serviço → *Settings → Custom Domains* → adicione `sualoja.com.br` e
`www.sualoja.com.br` e crie no seu DNS os registros que o Render indicar. O
certificado HTTPS é emitido sozinho. Atualize `FRONTEND_URL` e o `siteUrl`
nas Configurações.

### 6.2 Com o Cloudflare na frente (recomendado)

1. Mude os *nameservers* do domínio para os do Cloudflare.
2. DNS: `CNAME www → motorshop.onrender.com` com **proxy ligado** (nuvem
   laranja); a raiz redireciona para o `www` (*Rules → Redirect*).
3. *SSL/TLS*: modo **Full (strict)**; *Always Use HTTPS* ligado.
4. *Security*: WAF com as regras gerenciadas gratuitas; *Bot Fight Mode*
   ligado.
5. *Caching*: o padrão já guarda `/assets/*` (o servidor manda
   `immutable`, 1 ano) e não guarda HTML nem `/api`. Não crie regra de
   "cache everything" — a página muda quando o lojista mexe no estoque.
6. No Render, mude **`TRUST_PROXY_HOPS` para `2`**. Com o valor errado, os
   limites de tentativas passam a ver todo mundo com o mesmo IP (e bloqueiam
   clientes reais) ou deixam de funcionar ([SECURITY §7](./SECURITY.md#7-limites-de-requisição)).
   Para conferir, sem precisar registrar IP de ninguém: no seu computador,
   erre a senha do painel até aparecer "Muitas tentativas" (5 erros); em
   seguida, **no celular fora do Wi-Fi** (outra rede),
   entre normalmente. Se o celular também estiver bloqueado, o servidor está
   vendo todos com o mesmo IP: o valor está baixo demais.

---

## 7. Loja de demonstração

No **staging** (nunca na produção de uma loja real), pelo Shell:

```bash
npm run seed -- --confirmar-apagar-estoque
```

Cria 22 motos de marcas conhecidas e, se ainda não houver, uma loja
"MotorShop Demonstração". **Apaga todas as motos e marcas** antes — por isso
a confirmação explícita; sem ela, o seed se recusa a rodar em produção. As
fotos entram pelo painel (*Motos → editar → Fotos*). Crie o administrador
com `npm run create:superadmin`.

---

## 8. Monitoramento

### 8.1 Erros (Sentry)

1. Crie um projeto **Node.js** no Sentry. Copie o **DSN**.
2. No Render, preencha `SENTRY_DSN` (produção e staging; o
   `SENTRY_ENVIRONMENT` já separa os dois).
3. Em *Alerts*, crie a regra "quando um problema novo aparecer → e-mail".
4. Teste: o log de partida mostra `Monitoramento de erros ligado`.

Vai para o Sentry só erro do servidor (500): tipo, pilha, método, caminho e
o `requestId` (que liga ao log do Render). **Não vão** cabeçalhos, cookies,
corpo da requisição, IP ou dados de lead.

### 8.2 Disponibilidade

Num serviço de monitoramento (UptimeRobot, Better Stack), crie um monitor
HTTP para `https://www.sualoja.com.br/api/health`, a cada 1–5 min, alertando
por e-mail/WhatsApp. Ele responde **503** quando o banco cai — o monitor
avisa antes de um cliente reclamar.

### 8.3 Logs

Render → serviço → *Logs*. Cada linha é JSON, com `requestId`. Senhas,
tokens, cookies, telefones e e-mails são removidos do log antes de gravar.

---

## 9. Conferir um deploy

```bash
npm run smoke -- https://www.sualoja.com.br
npm run smoke -- https://motorshop-staging.onrender.com --robots=disallow
```

Confere em ~1 s: saúde e banco, página renderizada no servidor, cabeçalhos
de segurança, `robots.txt` do ambiente, sitemap, uma moto de verdade, 404 e
painel protegido. Só lê — não cria nada. O mesmo teste roda no GitHub
(*Actions → Fumaça*), à mão ou sozinho quando o Render informa um deploy.

Na primeira publicação, confira também:

- [ ] Lighthouse (celular) no domínio: Performance ≥ 90, SEO e Boas práticas 100
- [ ] Preview do link: [depurador do Facebook](https://developers.facebook.com/tools/debug/) e um envio real no WhatsApp
- [ ] [Rich Results Test](https://search.google.com/test/rich-results) numa página de moto
- [ ] Formulário de contato real → o lead aparece no painel
- [ ] Envio de foto real pelo painel (Cloudinary de verdade)

---

## 10. Backup e restauração

**Backup não testado não é backup.** O Atlas M10 guarda o banco
continuamente; o teste é restaurar e conferir.

**Teste de restauração** (a cada 3 meses, e antes de cada mudança grande):

1. Atlas → cluster de produção → *Backup* → *Restore* → escolha um horário
   → **Restore to a new cluster** (M10 temporário). Nunca restaure por cima
   da produção num teste.
2. Libere seu IP no *Network Access* e rode, na sua máquina:
   ```bash
   MONGODB_URI="mongodb+srv://.../motorshop_prod" npm run db:check
   ```
   Tem de terminar com `✓ Banco íntegro` e mostrar números de motos, leads e
   administradores coerentes com a produção.
3. Apague o cluster temporário (ele cobra por hora).
4. Registre abaixo.

| Data | Ponto restaurado | Resultado | Quem |
|---|---|---|---|
| | | | |

**Restauração de verdade** (perda de dados): restaure para um cluster novo,
confira com `db:check`, troque o `MONGODB_URI` do serviço para ele e faça
*Manual Deploy*. As fotos não precisam de restauração: ficam no Cloudinary.

---

## 11. Rollback

**Voltar a versão do código** (deploy com defeito que passou nos testes):

- Render → serviço → *Events/Deploys* → escolha o último deploy bom →
  **Rollback**. Leva ~1 min e não precisa de build.
- Depois, corrija no código com `git revert` e push: a `main` precisa
  refletir o que está no ar, senão o próximo deploy traz o defeito de volta.

Rollback é seguro para o banco: as mudanças de banco do projeto são só
índices novos (aditivos). Se um dia uma mudança alterar o formato dos
dados, ela precisa de um plano de volta próprio antes do deploy.

**Teste de rollback** (antes da primeira publicação e a cada mudança
grande): faça no **staging** — rollback para o deploy anterior, confira com
`npm run smoke`, e volte para o mais recente.

---

## 12. Rotação de segredos

Faça **antes de publicar** (os valores de desenvolvimento nunca vão para
produção) e sempre que alguém com acesso sair da empresa.

| Segredo | Como trocar | Efeito |
|---|---|---|
| `JWT_SECRET` | Render → *Environment* → `JWT_SECRET` → *Generate* → salvar | todas as sessões do painel caem; é só entrar de novo |
| Senha do banco | Atlas → *Database Access* → *Edit* → nova senha → atualizar `MONGODB_URI` no Render | reinício automático; segundos fora |
| Cloudinary | gerar nova chave → atualizar as três variáveis no Render → **revogar** a antiga | envios em andamento falham e podem ser repetidos |
| Senha do dono | painel → *Usuários* (outro SUPER_ADMIN) ou `npm run create:superadmin` | — |
| `SENTRY_DSN` | Sentry → *Client Keys* → nova chave → atualizar | — |

Checklist completo de go-live: [SECURITY §9](./SECURITY.md#9-checklist-de-go-live).

---

## 13. Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Deploy não sai do "building" para "live" | health check falhando | *Logs*: geralmente `MONGODB_URI` errada ou IP do Render não liberado no Atlas |
| Build falha com "Configuração de ambiente inválida" | variável faltando | o erro lista qual; preencha no *Environment* |
| `/api/health` responde 503 | banco fora ou inacessível | status do Atlas; *Network Access*; senha do usuário |
| Erro de CORS no painel | `FRONTEND_URL` diferente do endereço usado | ajuste para o endereço exato, com `https://` e sem barra final |
| Clientes reclamam de "muitas tentativas" | `TRUST_PROXY_HOPS` errado para a topologia | seção 6.2 |
| Foto não sobe | credenciais do Cloudinary, ou chave revogada | refaça a seção 4; o erro aparece no painel |
| Preview do WhatsApp com endereço errado | `siteUrl` não configurado | painel → Configurações → SEO |
| Mudança no painel não aparece no site | não deveria acontecer (o cache é limpo a cada alteração) | confira se a alteração foi salva; se persistir, *Manual Deploy* reinicia |
