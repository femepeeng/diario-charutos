# Aba Início com o Guia de bolso interativo (v2.7.0)

## Intenção

O Guia de bolso hoje fica escondido no fim da aba Conta, numa lista sanfonada. O Felipe quer o guia em destaque logo na abertura do app, mais atraente e com interação, para dar motivo de voltar à home. A aba Início também é o lugar onde depois cresce a home em formato de "blog".

## Objetivos

- Nova aba **Início**, primeira da barra e tela de abertura do app.
- Guia de bolso em um carrossel de cartões deslizáveis, com a "Dica do dia" primeiro.
- Três cartões com mini-ferramentas: Conservação, Corte e Ritmo.

## Fora do escopo

Artigos do blog, a lista de compras e o quiz com pontos. Ficam para depois.

## Anti-objetivos

- Emoji como ícone, informação técnica inventada, rolagem horizontal da página.
- Qualquer coisa que incentive tragar.
- Preços, lojas ou links de compra.

## Restrições

- Arquivo único (`index.html`), sem framework. Render por `innerHTML` e eventos delegados por `data-act`, `data-input` e `data-change`.
- Mobile-first, de 360 a 390 px, com alvos de toque de pelo menos 44 px.
- Tema escuro e claro pelos tokens CSS existentes.
- Ícones em SVG inline no padrão de `HEART_ICON` e `CROWN_ICON`.
- O conteúdo técnico sai só do array `GUIDE` existente, adaptado de *O Guia Definitivo do Charuto* (Johny Oliveira). Nada de texto novo copiado do livro.
- Nenhum dado novo vai para o IndexedDB nem para o Supabase.

## Abordagens consideradas

| | Abordagem | Troca |
|---|---|---|
| A | Carrossel só de leitura | Simples, mas pouca interação |
| **B** | **Carrossel com mini-ferramentas (escolhida)** | Esforço médio, dá motivo para voltar |
| C | Quiz com pontos na jornada | O mais engajador, mas mexe na gamificação e é o maior esforço |

Posição: uma aba Início própria, escolhida pelo Felipe. Pôr o carrossel acima da barra de abas o faria aparecer em todas as abas.

## Desenho

**Barra de abas:** Início, Acervo, Histórico, Paladar, Comparar, Conta. O Clube saiu da barra na mesma entrega e abre pela coroa do cabeçalho. `state.tab` começa em `'inicio'`.

**Carrossel:**
- Os 7 tópicos de `GUIDE`.
- Container com `scroll-snap` horizontal e cartões com cerca de 85% da largura.
- Cada cartão mostra ícone SVG, título e a regra de ouro em uma linha.
- O cartão de ferramenta ganha o selo "Ferramenta".
- O cartão do dia vem primeiro, com o selo "Dica do dia". A escolha é determinística: dia do ano mod 7.
- Pontos indicadores abaixo do carrossel.

**Regras de ouro** (novo terceiro campo de cada item de `GUIDE`):

| Tópico | Regra de ouro |
|---|---|
| Conservação | 65–70% de umidade · 16–18 °C |
| Viagem e praia | Hermético, longe do sol e de perfumes |
| Corte | Reto de 2 a 3 mm nos parejos, diagonal nos figurados |
| Acendimento | Chama limpa, toste sem encostar |
| Ritmo e cinza | Uma baforada a cada 30 a 60 segundos |
| Paladar | O retrohale revela as notas; charuto não se traga |
| Quando parar | Quando o prazer acaba |

**Detalhe do tópico:**
- Tocar no cartão abre `state.view = 'guia'`, com o texto completo, a ferramenta (se houver) e os botões Anterior, Próximo e Voltar.

**Ferramentas:**
- **Conservação:** campos de umidade (%) e temperatura (°C).
  - "Ideal" quando a umidade está entre 65 e 70% e a temperatura entre 16 e 18 °C.
  - "Risco" quando a temperatura chega a 24 °C ou mais, pelo besouro do tabaco.
  - "Atenção" nos demais casos, com a explicação: umidade alta favorece mofo e queima irregular; umidade baixa resseca, e o charuto queima rápido e quente.
- **Corte:** botões de vitola (Petit Corona, Corona, Robusto, Toro, Churchill, Lancero, Torpedo, Pirâmide, Belicoso, Perfecto). O resultado vem do `cutTipOf()` existente.
- **Ritmo:** marcador de baforada com intervalo de 30, 45 ou 60 segundos.
  - Mostra um anel de progresso e o tempo restante.
  - Ao fim de cada ciclo, vibra (`navigator.vibrate`, se houver) e recomeça.
  - Iniciar e Parar.
  - O estado fica numa variável do módulo; um `setInterval` atualiza só o anel e o número, sem `render()`.
  - O marcador para quando a pessoa sai da tela.

**Aba Conta:** o painel "Guia de bolso" vira um atalho para a aba Início.

**Versão:** 2.7.0, por ser recurso novo.

## Decisões deixadas a quem implementar

- Desenho exato dos ícones SVG.
- Animação do anel do marcador, respeitando `prefers-reduced-motion`.
- Microcopy dos estados das ferramentas, dentro do tom conservador do app.
