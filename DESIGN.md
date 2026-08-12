# DESIGN.md

Sistema em arquivo único, sem build. CSS puro com variáveis, sem framework.
Toda decisão abaixo precisa sobreviver a isso.

## Color

Estratégia: **Restrained**. Neutros tintados + um acento.

Acento verde, herdado do contexto (sóbrio, não corporativo, não "SaaS roxo").
Todos os neutros são tintados na direção do verde com croma baixíssimo (0.004–0.012),
nunca cinza puro. Preto e branco puros são proibidos.

Escrito em OKLCH, com fallback implícito para navegadores atuais (suporte amplo desde 2023).

**Nunca usar `opacity` para atenuar texto.** Foi assim que os itens entregues
ficaram ilegíveis: `opacity: .55` derrubou o contraste de nomes de publicação para
3.73, abaixo do mínimo de 4.5. Para recuar um elemento, trocar a cor por `--muted`
(que é medida e aprovada) ou dessaturar só a imagem. A opacidade some com qualquer
garantia de contraste, porque o valor final depende do que está atrás.

## Tema

Três estados, escolha do usuário, guardada em `localStorage` sob `pedidos-tema`:
claro, escuro e automático (padrão). O tema resolvido é escrito em `data-tema` no
`<html>` por um script no `<head>`, antes da primeira pintura, para a tela não
piscar clara ao abrir no escuro.

`color-scheme` acompanha o tema, senão os controles nativos (seletor de data, lista
de sugestões) renderizam no esquema errado e ficam ilegíveis.

| Papel | Claro | Escuro |
|---|---|---|
| Fundo | `oklch(97.2% 0.004 155)` | `oklch(19.5% 0.007 155)` |
| Superfície | `oklch(100% 0 0 / 0.86)` sobre fundo | `oklch(23.5% 0.008 155)` |
| Texto | `oklch(24% 0.012 155)` | `oklch(93% 0.006 155)` |
| Texto secundário | `oklch(52% 0.012 155)` | `oklch(70% 0.012 155)` |
| Linha | `oklch(91% 0.006 155)` | `oklch(30% 0.009 155)` |
| Acento | `oklch(48% 0.088 155)` | `oklch(72% 0.095 155)` |

O acento carrega apenas: ação primária, aba atual, filtro ativo, quantidade.
Nunca decoração.

**Estados por status** (vocabulário semântico, não paleta livre):
pendente = âmbar, solicitado = azul, chegou = verde, entregue = neutro.
Cada um em par tinta/fundo, com croma reduzido no tema escuro.

## Typography

Uma família só: stack de sistema (`system-ui, -apple-system, "Segoe UI", Roboto`).
Legítimo no registro product e evita download em conexão ruim no salão.

Escala fixa em px, razão ~1.2. Nada de `clamp()` em UI de produto.

| Uso | Tamanho | Peso |
|---|---|---|
| Nome do irmão | 16px | 650 |
| Título de publicação | 15px | 400 |
| Corpo / campos | 16px (nunca menos no celular: abaixo disso o iOS dá zoom) | 400 |
| Metadados | 13px | 400 |
| Rótulo de seção | 11.5px, caixa alta, `letter-spacing: .5px` | 700 |
| Números de quantidade | 15px, `font-variant-numeric: tabular-nums` | 700 |

## Layout

Grid previsível. A consistência é a afordância.

- **Celular (< 640px)**: coluna única. Navegação fixa no rodapé, dentro da zona do
  polegar. O topo é área de leitura, não de ação.
- **Desktop (≥ 640px)**: navegação em abas no topo, conteúdo em `max-width: 1080px`.
- Espaçamento em múltiplos de 4px. Ritmo varia por hierarquia; padding uniforme em
  tudo é monotonia.
- Cartões só onde a elevação comunica agrupamento real (um pedido = um cartão).
  Tabelas viram linhas de lista no celular, nunca tabela rolando na horizontal.

## Touch

- Alvo mínimo **44×44px** em qualquer coisa tocável. Sem exceção no celular.
- Espaço mínimo de 8px entre alvos adjacentes.
- Nada depende de `:hover`.
- Feedback tátil: `scale(0.97)` no `:active`, 120ms.
- `env(safe-area-inset-bottom)` respeitado na barra inferior.

## Components

Todo componente interativo tem: default, hover, focus-visible, active, disabled.
Foco visível sempre — `outline: 2px solid` no acento, nunca `outline: none`.

- **Vazio**: ensina o que fazer, não diz "nada aqui".
- **Erro**: inline, junto do campo, em linguagem comum.
- **Confirmação destrutiva**: sempre, com o nome do que será apagado na frase.

## Motion

150–220ms, `cubic-bezier(0.16, 1, 0.3, 1)`. Só `transform` e `opacity`.

Movimento comunica estado: entrada da folha inferior, feedback de toque, aviso de
ação concluída. Nada de decoração, nada de sequência de carregamento.

Respeitar `prefers-reduced-motion: reduce`.

## Bans neste projeto

- Emoji em qualquer lugar. Ícones são SVG inline.
- Borda lateral colorida como acento.
- Gradiente em texto.
- Vidro fosco decorativo.
- Modal como primeira ideia no celular: folha inferior, sempre.
- Fonte serifada em UI.
