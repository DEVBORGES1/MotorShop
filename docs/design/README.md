# Design de referência — protótipo "Rafa Motos"

Este diretório guarda o protótipo visual que serve de referência para o
frontend público e para o painel administrativo.

| Arquivo | O que é |
|---|---|
| `rafa-motos.prototype.html` | Protótipo completo exportado do Claude Design. Arquivo **gerado** — não editar à mão. |

**Como abrir:** baixe o arquivo e abra no navegador. Ele é autocontido (fontes,
logo e scripts embutidos) e não precisa de servidor. A barra preta no topo
("Protótipo") alterna entre as 12 telas.

> **Loja fictícia.** "Rafa Motos", Videira/SC, telefones, endereço e CNPJ do
> protótipo são dados de demonstração. Conforme o `CLAUDE.md`, **nada disso
> pode ser escrito no código** — tudo vem da configuração da loja. O protótipo
> respeita essa regra: a tela `Admin · Config` edita identidade, tema, endereço,
> horários e módulos.

---

## 1. Tokens visuais

### Cores

Tema escuro, acento verde. Os valores abaixo saíram direto do protótipo,
ordenados por frequência de uso.

| Token | Hex | Uso no protótipo |
|---|---|---|
| Acento (primária) | `#4CD62B` | CTAs, preços, links, tag "Oferta", thumb dos sliders |
| Acento · hover | `#8CF06E` | hover de botão primário e de link |
| Acento · texto sobre | `#07120A` | texto dentro do botão verde |
| Fundo | `#0A0B0A` | fundo da página |
| Superfície | `#121412` | cards, painéis |
| Superfície · alt | `#191D19` / `#1A1D1A` | áreas de foto, linhas alternadas de tabela |
| Texto forte | `#F2F4F1` | títulos |
| Texto | `#C3C9C1` | corpo |
| Texto fraco | `#9AA39A` | apoio, chips inativos |
| Texto mínimo | `#79817A` | rótulos em caixa alta, legendas |
| Texto desativado | `#5C655C` | placeholders |
| Aviso / "Reservada" | `#E8B33C` (sobre `#1A1206`) | tag de moto reservada |
| Bordas | `rgba(255,255,255,.08 – .16)` | divisórias, contornos de campo |

O acento é aplicado via a variável CSS `--g`, trocada em tempo de execução.
O protótipo oferece como alternativas `#38C172`, `#7BE01F` e `#20D9A0` — ou
seja, **a cor primária é configuração da loja, não constante de código**.

### Tipografia

| Papel | Fonte | Tratamento |
|---|---|---|
| Títulos, botões, rótulos | **Archivo** (600–800) | caixa alta, `letter-spacing` `.04em`–`.14em` |
| Corpo, formulários | **Barlow** (400–600) | caixa normal |

A tela de configurações também deixa trocar as duas famílias (alternativas
previstas: `Barlow Condensed` para títulos, `Archivo` para texto).

### Forma e layout

- **Raios:** `2px` (chips, tags), `3px` (botões, campos), `4px` (cards).
  Nada arredondado — a linguagem é industrial, de oficina.
- **Largura máxima do conteúdo:** `1280px`, com `24px` de padding lateral.
- **Divisórias:** grids com `gap: 2px` sobre fundo claro translúcido, criando
  linhas de 1–2px em vez de bordas.
- **Header:** fixo (`sticky`), fundo `rgba(10,11,10,.94)` com `backdrop-filter:
  blur(12px)`.

---

## 2. Inventário de telas

### Site público

| Tela | Conteúdo | Fase |
|---|---|---|
| **Home** | Mosaico de 3 fotos no topo, headline + 2 CTAs, busca rápida (marca / cilindrada / preço), destaques da semana, 3 serviços (mecânica, peças, vendas), bloco de financiamento, bloco de troca em 3 passos | 4 |
| **Estoque** | Filtros laterais (marca com contagem, faixa de preço, cilindrada, câmbio), chips de filtro ativo, ordenação, grade de cards, paginação | 4 |
| **Detalhe da moto** | Galeria com miniaturas e contador, ficha técnica, descrição, selos, painel de preço com preço antigo riscado e parcela, CTAs (WhatsApp, test ride, troca), vendedor, mini-simulador, motos parecidas | 5 |
| **Vender sua moto** | Formulário em 3 blocos (moto / fotos / contato), upload de até 8 fotos, consentimento LGPD, "como funciona" em 3 passos | 6 |
| **Financiamento** | Simulador com sliders (valor, entrada, parcelas), resultado (parcela, valor financiado, total), envio da simulação, avisos legais | 7 |
| **Sobre · Contato** | História da loja, 3 números, formulário com assunto, mapa, endereço, telefones, horários, rodapé completo | 4 e 6 |

### Painel administrativo

| Tela | Conteúdo | Fase |
|---|---|---|
| **Dashboard** | KPIs com variação, leads recentes, estoque por status, alerta de motos paradas há +60 dias | 3 ✅ / 6 |
| **Motos** | Abas por status, tabela com slug, ano, km, preço, status; formulário "Nova moto" com fotos arrastáveis e capa | 3 ✅ / 8 |
| **Leads** | Kanban por coluna de status com cards de lead e atalho de WhatsApp | 6 |
| **Marcas** | Tabela com slug, contagem de motos e situação; formulário com logo; aviso de marca vinculada | 3 ✅ |
| **Usuários** | Equipe, papéis `ADMIN` / `SUPER_ADMIN`, último acesso, convite, matriz de permissões | 3 ✅ |
| **Configurações** | Identidade da loja, endereço e horários, **tema** (cores e fontes), módulos ligáveis | 3 ✅ / 13 |

---

## 3. Regras de negócio que o protótipo assume

- **Financiamento:** tabela Price, taxa exibida de **1,79% a.m.**, até **48x**,
  entrada mínima de **20%**. Os três valores são dados de configuração, não
  constantes — a FASE 7 define onde ficam.
- **Tags de moto:** `Oferta` (verde), `Reservada` (âmbar), demais (cinza).
  O modelo já suporta as três: `onSale` e `featured` em
  `backend/src/modules/motos/moto.schema.js`, e `RESERVED` em
  `MOTO_STATUS` (`shared/src/enums.js`).
- **Preço antigo:** quando existe, aparece riscado ao lado do preço atual —
  corresponde ao campo `previousPrice` já modelado.
- **Placa:** aparece no formulário do admin com a nota "nunca exibida no site".
- **Marcas:** não podem ser excluídas quando têm motos vinculadas — apenas
  desativadas.

---

## 4. Como usar este protótipo

O protótipo é **referência visual**, não fonte de código. Ao implementar:

1. As telas saem por fase, na ordem do `ROADMAP.md` — o protótipo mostrar uma
   tela não autoriza implementá-la.
2. Textos, telefones, endereço, logo e cores vêm da configuração da loja.
3. Os estilos inline do protótipo viram classes Tailwind e componentes em
   `frontend/src/components/`; os tokens acima entram no tema do Tailwind.
