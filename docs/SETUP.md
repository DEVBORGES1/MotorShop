# Configuração do ambiente local

Guia para colocar o MotorShop rodando na sua máquina.
Visão geral do projeto: [`README.md`](../README.md) ·
Arquitetura: [`ARCHITECTURE.md`](./ARCHITECTURE.md)

---

## 1. Pré-requisitos

| Ferramenta | Versão | Observação |
|---|---|---|
| **Node.js** | **≥ 22** | Obrigatório. O projeto usa `--env-file-if-exists` e `--watch`, nativos do Node 22. |
| **npm** | ≥ 10 | Vem com o Node 22. O projeto usa *workspaces*. |
| **MongoDB Atlas** | — | **Opcional nesta fase** (ver §4). |

Confira sua versão:

```bash
node -v    # deve mostrar v22.x ou superior
npm -v
```

> Use **npm**, não pnpm ou yarn: o `package-lock.json` e os workspaces são a
> configuração suportada.

---

## 2. Instalação

```bash
git clone <url-do-repositorio>
cd MotorShop
npm install
```

Um único `npm install` na raiz instala backend e frontend — é o comportamento
dos workspaces. Não rode `npm install` dentro de `backend/` ou `frontend/`.

---

## 3. Variáveis de ambiente

O projeto tem **dois** arquivos de ambiente, e a separação é proposital:

| Arquivo | Serve | Conteúdo |
|---|---|---|
| `.env` (raiz) | **backend** | Inclui segredos. Nunca chega ao navegador. |
| `frontend/.env` | **frontend** | `VITE_*` apenas. **É embutido no bundle e é público.** |

Crie os dois a partir dos exemplos:

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

**Os valores padrão já funcionam** — a API sobe em `http://localhost:3000` e o
site em `http://localhost:5173`, sem nenhum ajuste.

> **Por que não um `.env` único?** Porque o Vite leria o `NODE_ENV=development`
> do backend e passaria a gerar o build de produção com o **React de
> desenvolvimento** — cerca de 55% maior e mais lento. Foi um problema real,
> detectado e corrigido na FASE 1. A separação também mantém o arquivo com
> segredos fora do workspace que gera bundle público.

### Variáveis do backend (`.env` na raiz)

| Variável | Obrigatória | Padrão | Descrição |
|---|---|---|---|
| `NODE_ENV` | não | `development` | `development` \| `test` \| `production` |
| `PORT` | não | `3000` | Porta da API |
| `FRONTEND_URL` | não | `http://localhost:5173` | Origem(ns) liberada(s) no CORS. Aceita lista separada por vírgula. |
| `MONGODB_URI` | **em produção** | — | String de conexão do Atlas |
| `JWT_SECRET` | **em produção** | — | Mínimo 32 caracteres. Usado a partir da FASE 3. |
| `STORAGE_PROVIDER` | não | `none` | `none` \| `cloudinary`. Sem provedor, o site funciona e só o envio de fotos responde 503. |
| `CLOUDINARY_CLOUD_NAME` | se `cloudinary` | — | Nome da conta |
| `CLOUDINARY_API_KEY` | se `cloudinary` | — | Chave da API |
| `CLOUDINARY_API_SECRET` | se `cloudinary` | — | **Segredo.** Só no `.env` do backend |
| `STORAGE_FOLDER` | não | `motorshop` | Pasta-raiz no provedor, uma por loja e ambiente (ex.: `loja-x/prod`) |
| `LOG_LEVEL` | não | `info` | Nível do log |
| `BODY_LIMIT` | não | `100kb` | Limite do corpo JSON |
| `TRUST_PROXY_HOPS` | não | `1` | Quantos proxies à frente do servidor: `0` direto, `1` Render, `2` Cloudflare → Render. Errado, os limites por IP falham ([SECURITY §7](./SECURITY.md#7-limites-de-requisição)) |
| `ROBOTS_POLICY` | não | `allow` | `disallow` em staging/demonstração: `robots.txt` bloqueia tudo |
| `FRONTEND_DIST_DIR` | não | `frontend/dist` | Build do site servido pela API em produção |

Uma variável **declarada e vazia** (`MONGODB_URI=`) equivale a ausente — copiar
o `.env.example` direto funciona.

O backend **valida tudo no boot**: se algo estiver inválido, ele não sobe e diz
exatamente qual variável e por quê. O valor nunca é impresso.

### Variável do frontend (`frontend/.env`)

| Variável | Padrão | Descrição |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000/api` | Base da API |

⚠️ Nunca coloque segredo em variável `VITE_*`: ela vai para o bundle.

---

## 4. MongoDB (opcional nesta fase)

A FASE 1 **não define nenhum model** — apenas a infraestrutura de conexão.
Sem `MONGODB_URI`, a API sobe normalmente e o health check reporta
`database.status: "not_configured"`. Isso é esperado, e permite desenvolver sem
conta no Atlas. A partir da **FASE 2** a conexão passa a ser necessária.

### Configurando o Atlas quando for a hora

1. Crie uma conta em [mongodb.com/atlas](https://www.mongodb.com/atlas) e um
   cluster **M0** (gratuito).
2. Em **Database Access**, crie um usuário com permissão **restrita a um único
   database** — nunca `atlasAdmin`.
3. Em **Network Access**, libere seu IP.
4. Copie a string de conexão e coloque em `.env`:

```bash
MONGODB_URI=mongodb+srv://USUARIO:SENHA@cluster.mongodb.net/motorshop_dev?retryWrites=true&w=majority
```

Use databases distintos por ambiente: `motorshop_dev`, `_staging`, `_prod`.

---

## 4.1 Fotos das motos (Cloudinary)

O navegador envia as fotos **direto** ao Cloudinary, com uma assinatura emitida
pela API — o arquivo nunca passa pelo backend (ARCHITECTURE §10.4).

1. Crie uma conta gratuita em [cloudinary.com](https://cloudinary.com).
2. No Dashboard, em **Product Environment Credentials**, copie *Cloud name*,
   *API Key* e *API Secret* para o `.env`:

```bash
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=seu-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=...        # segredo: nunca em VITE_*, nunca no Git
STORAGE_FOLDER=motorshop/dev
```

3. Reinicie a API e abra **Motos → Editar** no painel: a seção **Fotos**
   aceita arrastar vários arquivos de uma vez.

Nada precisa ser configurado no Cloudinary além disso: pasta, formatos
aceitos e o limite de resolução (2560 px) vão na própria assinatura.

---

## 5. Rodando

### Tudo de uma vez (recomendado)

```bash
npm run dev
```

Sobe API e site em paralelo, com logs identificados por `api` e `web`.

| Serviço | URL |
|---|---|
| Site | http://localhost:5173 |
| API | http://localhost:3000/api |
| Health check | http://localhost:3000/api/health |

A home exibe o resultado do health check — é a confirmação visual de que o
frontend está falando com o backend.

### Separadamente

```bash
npm run dev:backend     # API com recarga automática (node --watch)
npm run dev:frontend    # site com HMR
```

### Como em produção (site servido pela API)

Em produção um único processo serve a API **e** o site, com título,
descrição, preview de link e dados estruturados já no HTML inicial
(ARCHITECTURE §11.3 e §13.2). Para ver assim localmente:

```bash
npm run build           # gera frontend/dist (site) e frontend/dist-ssr (renderização no servidor)
npm start               # http://localhost:3000 — site e API na mesma origem
curl -s http://localhost:3000/ | grep '<title'   # meta injetada, sem JS
```

No modo `npm run dev` (Vite na 5173) a meta **não** é injetada e a página
não vem renderizada do servidor: é o HTML do Vite, e o React desenha tudo
no navegador. Isso é esperado.

---

## 6. Scripts

Todos rodam a partir da **raiz**:

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe backend e frontend juntos |
| `npm run dev:backend` / `dev:frontend` | Sobe um deles |
| `npm start` | Sobe a API em modo produção |
| `npm run build` | Build do frontend + verificação de módulos do backend |
| `npm test` | Testes dos dois workspaces |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` / `format:check` | Prettier |
| `npm run verify` | **lint + format + testes + build** — rode antes de commitar |

---

## 7. Verificando que está tudo certo

```bash
npm run verify
```

E, com a API no ar:

```bash
curl http://localhost:3000/api/health
```

Resposta esperada:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptime": 12,
    "timestamp": "2026-09-14T12:00:00.000Z",
    "database": { "status": "not_configured", "configured": false }
  },
  "message": "API is running"
}
```

---

## 8. Problemas comuns

| Sintoma | Causa e solução |
|---|---|
| `Configuração de ambiente inválida` no boot | A mensagem já diz qual variável e por quê. Compare com `.env.example`. |
| `EADDRINUSE` na porta 3000 ou 5173 | Outro processo na porta. Mude `PORT` no `.env` (e `VITE_API_URL` junto) ou encerre o processo. |
| Home mostra "Não foi possível conectar à API" | A API não está no ar, ou `VITE_API_URL` aponta para a porta errada. |
| Erro de **CORS** no console do navegador | A origem em uso não está em `FRONTEND_URL`. Acontece, por exemplo, ao usar `vite preview` (porta 4173): acrescente-a — `FRONTEND_URL=http://localhost:5173,http://localhost:4173`. |
| `database.status: "not_configured"` | Esperado sem `MONGODB_URI`. Ver §4. |
| Alterei o `.env` e nada mudou | O Vite lê variáveis só na inicialização. Reinicie o servidor. |
| `npm install` reclama da versão do Node | O projeto exige Node ≥ 22. |
