# MotorShop — Auditoria de performance

> 2026-09-28. Tudo **medido**, nada estimado: build de produção servido pelo
> próprio backend, banco em memória com 6 motos e fotos reais do Cloudinary
> da loja; e, para o banco, 2.000 motos e 5.000 leads sintéticos.

## 1. Como foi medido

- **Página:** Playwright + Chromium emulando Moto G4 (360×640, DPR 3), rede
  "4G lento" do Lighthouse (1,6 Mbps, 150 ms) e CPU 4× mais lenta. FCP e LCP
  pela API `PerformanceObserver`; bytes pelo protocolo do DevTools. Cada
  medição repetida 2–3 vezes (variação < 0,1 s).
- **Banco:** `explain('executionStats')` nas consultas que o site e o painel
  realmente fazem, com os índices declarados nos modelos.
- **Bundle:** `vite build` e tamanho gzip de cada arquivo.

## 2. Páginas

| Página | LCP antes | LCP depois | FCP | CLS | Elemento LCP |
|---|---|---|---|---|---|
| Home | **4,0 s** | **3,1 s** | 0,9 s | 0,001 | foto do 1º slide do hero |
| Estoque (sem filtro) | **4,1 s** | **2,7 s** | 0,8 s | 0,001 | foto do 1º card |
| Página da moto | 2,1 s | 2,1 s | 0,9 s | 0,001 | foto principal da galeria |
| Financiamento | 0,8 s | 0,8 s | 0,8 s | 0,002 | texto da abertura |

### Causa (home e estoque)
A foto que vira o LCP dependia de uma cascata: HTML → JS principal (termina
em ~1,9 s) → chamadas à API → só então a foto começa a baixar. A página da
moto já não sofria disso porque o servidor manda a moto no HTML e
pré-anuncia a foto.

### O que mudou
1. **Home e estoque sem filtro no mesmo padrão da página da moto:** o
   servidor manda as listas nos dados de partida (no formato da resposta da
   API, então o site as usa sem pedir de novo) e pré-anuncia a foto com o
   mesmo `srcset`/`sizes` que a tela pede. O estoque filtrado continua
   buscando no navegador (combinações demais para cachear, e fora do índice).
2. **Segunda foto do carrossel só depois da primeira:** antes ela baixava em
   paralelo e dividia a conexão com a foto do LCP.
3. **Logo em um tamanho só** (128 px de altura) para cabeçalho, hero e Sobre:
   um download em vez de dois.

### Linha do tempo da home (depois)
A foto do hero passou a começar em **0,2 s** (antes: 2,3 s). Ela ainda
termina em ~3 s porque divide os 1,6 Mbps com o JS e com as fotos dos cards
de destaque, que o Chrome antecipa mesmo com `loading="lazy"` (raio de
1.250–2.500 px da tela). Próximos passos registrados em
[`TECHNICAL-DEBT.md`](./TECHNICAL-DEBT.md) DT-13.

## 3. JavaScript e CSS

| Item | Tamanho (gzip) |
|---|---|
| JS carregado pelo `index.html` | ~145 KB (React, React DOM, roteador, código comum) |
| CSS | 9 KB |
| Maior chunk sob demanda | `zod` 32 KB (só em formulários) |
| Source maps no build | nenhum |

Todas as páginas, exceto a home, são carregadas sob demanda
(`React.lazy`), e o servidor pré-anuncia o chunk da página pedida
(`modulepreload`). Nenhum código do painel nem de formulário está no chunk
inicial (conferido por busca de textos exclusivos no arquivo). Sem
dependências pesadas a trocar: o maior pacote de aplicação é o React.

## 4. Banco (`explain`)

| Consulta | Plano | Docs lidos | Devolvidos | Tempo |
|---|---|---|---|---|
| Catálogo padrão (recentes) | IXSCAN | 12 | 12 | 1 ms |
| Catálogo por preço | IXSCAN | 12 | 12 | 0 ms |
| Marca + faixa de preço | IXSCAN | 12 | 12 | 0 ms |
| Destaques da home | IXSCAN | 12 | 12 | 0 ms |
| Moto por slug | IXSCAN | 1 | 1 | 0 ms |
| Leads (painel, todos / por status) | IXSCAN | 20 | 20 | 0 ms |
| Lead repetido (telefone + tipo) | IXSCAN | 0 | 0 | 0 ms |
| Catálogo por km | IXSCAN + sort em memória | 1.334 | 12 | 6 ms |
| Busca textual | TEXT | proporcional ao termo | 12 | 3 ms |

Nenhum COLLSCAN. A ordenação por km lê e ordena o conjunto filtrado em
memória: sem índice próprio por decisão registrada no modelo (filtros de
refinamento atuam sobre um conjunto já pequeno), e 6 ms com 2.000 motos
confirmam que não compensa um índice a mais em cada escrita. Nenhum índice
novo foi criado.

## 5. Paginação

Toda lista da API pública e do painel é paginada no servidor com teto de 48
itens (`PAGINATION.MAX_LIMIT`), inclusive leads. Marcas e usuários voltam
inteiros — listas curtas por natureza (dezenas). Paginação por página (não
por cursor) é a certa para o volume de uma loja (centenas de motos): o
visitante pula para a página N e a contagem total aparece na tela.

## 6. Cache

| Dado | Situação | Decisão |
|---|---|---|
| Loja, moto, listas da home e do estoque, sitemap (usados no HTML) | Cache em memória de 5 min, limpo a cada alteração bem-sucedida no painel | Mantido; cobre o caso quente (primeira visita) |
| Assets do build | `Cache-Control: immutable` de 1 ano (nome com hash) | Correto |
| HTML | Sem cache compartilhado (vem com dados atuais) | Correto |
| API pública | Sem cache HTTP | Mantido: o estoque muda ao longo do dia e o volume não pede |

Redis ou CDN de API **não** são necessários com uma instância (ver DT-01:
o gatilho é subir para duas ou mais).

## 7. Responsividade (sem regressão)

10 páginas × 8 larguras (320, 375, 414, 768, 1024, 1366, 1440 e 1920 px):
nenhuma rolagem horizontal e nenhum erro de JavaScript. Os únicos erros de
console são respostas esperadas: 404 na página inexistente e 401 da tentativa
de renovar sessão no login do painel sem cookie (DT-14).
