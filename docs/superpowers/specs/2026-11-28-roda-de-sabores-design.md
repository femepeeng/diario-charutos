# Roda de sabores na tela do terço (v2.12.0)

## Intenção

O Felipe pediu uma "evolução radical" do campo em que se marcam os sabores de cada terço. A base é uma roda de sabores de charuto que ele mandou em imagem: a versão em português, do Blog Charutos Online, da roda da Cigar Advisor/Famous Smoke, com 8 famílias e 52 termos. Ele quer a tela interativa e didática, com o máximo de opções, juntando o vocabulário atual do app com o da roda.

O motivo é duplo: marcar com mais precisão o que se sente e aprender a reconhecer. Cada nota precisa ensinar o que ela lembra e como treinar o nariz. O protótipo clicável (artifact privado, 27/11/2026) foi aprovado com "Segue" em 28/11/2026; este documento fixa o que ele mostrou e o que falta para entrar no app.

## Objetivos

- Trocar a lista de botões por família da tela do terço por uma roda: 11 famílias no anel; ao tocar numa família, ela se abre e ocupa a roda, com as notas em fatias grandes.
- 80 opções, juntando os 28 sabores atuais, os 35 termos da roda que o app não tem e 17 novos.
- Um cartão abaixo da roda que ensina: o que a nota lembra, como treinar e, para a família, o que ela reúne.
- Busca pelo nome, que também acha os nomes da imagem (chumbo, caju, sal, flores, terra).
- Nenhum registro antigo muda. Os 28 nomes de hoje continuam iguais e continuam contando no Paladar, na Jornada e nas missões.

## Fora do escopo

- Roda no Paladar ("sua roda" com o que você mais marca). Fica para depois.
- Conquista nova por famílias marcadas. Fica para depois.
- Intensidade por nota. A intensidade continua uma por terço.
- Os 5 itens menores adiados da 2.11.1 (2.11.2). Seguem anotados.
- Qualquer mudança de SQL ou de sincronização. As notas continuam texto dentro de `thirds[].notes`.

## O que não pode acontecer

- Renomear, apagar ou deixar sem família qualquer um dos 28 nomes atuais.
- Sessão antiga perder missão cumprida, pontos ou conquista.
- Fatia com alvo de toque abaixo de 44 px a 360 px, ou rótulo cortado ou ilegível.
- Marcar ficar mais lento para quem já sabe o nome: a busca e os chips resolvem em um toque.
- Texto que ensine a tragar ou faça afirmação técnica sem consenso.

## Restrições

As regras do `CLAUDE.md` valem inteiras. As que pesam aqui:

- `index.html` único, ES5, sem framework nem dependência nova; render por `innerHTML`, eventos por `data-act`, texto do usuário sempre por `esc()`.
- Mobile-first, testado a 360 e 390 px, sem rolagem horizontal, temas escuro e claro por tokens, fontes do app, alvos de 44 px, sem emoji como ícone.
- Versão 2.12.0 (recurso novo: número do meio), `APP_BUILD` na data da publicação, `CLAUDE.md` atualizado.
- Sem SQL: os nomes das notas continuam texto e sobem como hoje.

## Abordagens

| | Abordagem | Troca |
|---|---|---|
| **1** | **Roda que abre por família (escolhida)** | A roda é o próprio campo: família no anel, notas na roda aberta. Mais código de SVG, mas cabe 80 opções com toque de 44 px |
| 2 | Roda só como menu de famílias, notas em botões embaixo | Mais simples; a roda vira enfeite e não ensina a ir do geral para o específico |
| 3 | Passo a passo do miolo para fora (boca, família, nota) | O mais didático, mas lento com o charuto aceso |

A 1 leva o melhor da 3: cada família tem uma opção geral, para marcar a família quando não se sabe a nota.

## Vocabulário

### Famílias

São 11, nesta ordem no sentido horário, com Frutas no topo. A tabela completa, com descrições, fica no Apêndice B.

| Família (rótulo na roda) | Opções | Opção geral |
|---|---|---|
| Frutas | 10 | Frutado |
| Flores | 4 | Floral |
| Plantas | 7 | Vegetal |
| Especiarias | 12 | Pimenta |
| Terra | 6 | Terroso |
| Madeira e fumaça (Madeira) | 5 | Amadeirado |
| Tostados | 4 | Tostado |
| Cacau e café | 8 | não tem |
| Castanhas | 7 | Castanha |
| Doces | 8 | Adocicado |
| Boca: gostos e sensações (Boca) | 9 | não tem |

Boca reúne os 5 gostos (Doce, Salgado, Ácido, Amargo, Umami) e 4 sensações de toque na boca (Áspero, Seco, Picante, Cremoso). O resto da roda é aroma. A separação entre gosto, tato e aroma segue a Cigar Sense ("Of Cigar Tasting – The Aromas"), que lista os cinco gostos e as percepções de tato seco, cremoso e picante.

### De onde vêm as 80

| Origem | Opções |
|---|---|
| App de hoje, também na roda da imagem | 17 |
| Só no app de hoje | 11 |
| Só na roda da imagem | 35 |
| Novas | 17 |

As 17 novas são vocabulário comum de degustação, sem fonte única: Frutado, Figo, Frutas vermelhas, Rosa, Violeta, Flor de laranjeira, Noz-moscada, Erva-doce, Curral, Amadeirado, Torrada, Biscoito, Avelã, Adocicado, Açúcar mascavo, Picante e Cremoso.

### O que muda em relação à imagem

- Sal, Amargo, Áspero e Seco saem de "Características" e "Terras e minerais" e vão para Boca.
- "Outros sabores" (12 termos soltos) se divide em Doces, Cacau e café, Tostados e Madeira e fumaça.
- Capim vai para Plantas. Melaço (de cana) vai para Doces.
- Nomes ajustados: Chumbo vira Grafite, Caju vira Castanha de caju, Maçapão vira Marzipã, Flores vira Floral, Terra vira Terroso, Sal vira Salgado, Cravo-da-índia fica Cravo. Os nomes da imagem viram sinônimos de busca.

### Compatibilidade com o que já foi registrado

Os 28 nomes atuais continuam como estão, então nada precisa migrar. Mudam só família e rótulo:

| Nome | Família antiga | Família nova |
|---|---|---|
| Doce | Doce | Boca |
| Feno | Terra | Plantas |
| Tostado | Madeira | Tostados |
| Floral | Fruta e flor | Flores |

Rótulos de família que mudam: "Doce" vira "Doces", "Madeira" vira "Madeira e fumaça", "Fruta e flor" vira "Frutas" e "Gostos na boca" vira "Boca: gostos e sensações". Os ids `doce`, `castanha`, `madeira`, `terra`, `cacau`, `especiaria`, `fruta` e `gosto` continuam; entram `flor`, `planta` e `tostado`.

Consequências:

- **Missões.** As sessões guardam o id da família da missão. Uma missão antiga de `fruta` cumprida só com Floral, por exemplo, deixaria de contar. Por isso uma missão conta como cumprida quando a sessão tem uma nota da família nova **ou** uma das notas que saíram dela: `doce` aceita Doce, `fruta` aceita Floral, `terra` aceita Feno e `madeira` aceita Tostado. Vale para todas as sessões, inclusive as novas. A tolerância é mínima e evita guardar versão na sessão.
- **Paladar.** "Famílias de sabor mais marcadas" passa a contar nas 11 famílias, inclusive as sessões antigas. Floral, por exemplo, sai de "Fruta e flor" e vai para Flores. "Sabores e sua nota" não muda, porque é por nome.
- **Jornada.** "Paladar afiado" (20 sabores diferentes) e "Os cinco gostos" contam por nome e não mudam.
- **Clube.** Quem ainda estiver numa versão anterior vê as notas novas no feed com o ponto cinza (cor desconhecida), até o app atualizar.
- **Backup.** O formato não muda.

## A tela do terço

A ordem fica: abas dos terços, missão, dica do terço, ficha do charuto (1º terço), o painel da roda, intensidade, anotações e o botão para o próximo terço. O painel da roda tem, de cima para baixo: a pergunta "O que você sente no Nº terço?", a roda, o cartão, os chips "Neste terço" e a busca.

### A roda

SVG com `viewBox="-180 -180 360 360"`, largura de 100% até 420 px, centro em (0,0) e ângulos no sentido horário a partir do topo. Os rótulos são radiais: na metade direita leem de dentro para fora; na esquerda, de fora para dentro, para nunca ficarem de cabeça para baixo. Rótulo com mais de 11 caracteres quebra em duas linhas no espaço mais perto do meio ou, sem espaço e com mais de 13 caracteres, no hífen mais perto do meio. Depois de desenhar, um passe encolhe a fonte de quem não couber no espaço da fatia; ele roda de novo quando as fontes terminam de carregar.

**Roda fechada (famílias):**

- Centro (raio 48): o terço em letra miúda, o número de notas marcadas no terço e "marcado"/"marcados".
- Anel das famílias (raios 52 a 140): 11 fatias iguais de 360/11 graus, com Frutas centrada no topo, na cor da família com 30% de opacidade, ou 42% quando a família tem nota marcada no terço. O rótulo é o curto da tabela.
- **Decisão minha:** a fatia não mostra o número de notas marcadas, ao contrário do protótipo. O número encolhia "Especiarias" para menos de 8 px. A contagem fica no rótulo acessível, no anel das notas e no total do centro. Sem o número, o menor rótulo depois do ajuste fica perto de 10 px numa tela de 360 px.
- Anel das notas (raios 144 a 168): cada fatia de família dividida igualmente entre as notas dela, em 32% de opacidade. A nota marcada fica cheia e mais comprida (até o raio 177). O anel é só desenho: tocar nele abre a família.
- Cada família é um botão (`role="button"`, `tabindex="0"`) com o rótulo acessível "Frutas: 10 opções, 2 marcadas".

**Roda aberta (uma família):**

- As notas da família dividem a roda inteira (raios 52 a 175), com a primeira centrada no topo. A opção geral, quando existe, é a primeira e tem borda tracejada.
- A nota marcada fica na cor cheia, com texto escuro e um visto desenhado em SVG (sem caractere de emoji). As outras ficam com 26% de opacidade.
- Cada nota é um botão com `aria-pressed`. O rótulo acessível é o nome, e a opção geral ganha ", opção geral da família".
- O centro vira o botão "‹ VOLTAR", com o nome da família e "N de M" marcadas.

**Movimento:** ao abrir, a roda aberta entra girando da posição da família até o topo e crescendo (cerca de 0,34 s). Ao voltar, a roda fechada entra encolhendo (cerca de 0,24 s). Só há animação no redesenho causado por abrir ou voltar, nunca no redesenho por outro motivo. Com `prefers-reduced-motion`, não há animação.

**Toque duplo:** durante 300 ms depois de abrir uma família, toques nas fatias de nota são ignorados. Assim, o segundo toque de um toque duplo não marca a nota que caiu embaixo do dedo.

**Alvo de toque:** mede-se pelo maior círculo que cabe na fatia. Numa tela de 360 px, a roda tem uns 292 px de largura; o círculo tem uns 50 px na roda fechada e uns 58 px na roda aberta com 12 notas. As duas passam dos 44 px.

**Teclado e foco:**
- Enter e Espaço acionam qualquer elemento com `role="button"` e `data-act` que não seja um `<button>`.
- Depois de um redesenho da tela de sessão, o foco volta ao elemento com o mesmo `data-act` e `data-val`/`data-id`, se ele ainda existir: na roda, no cartão, nos chips ou nos resultados da busca.
- Se o elemento sumiu depois de uma ação da roda, o foco vai para a primeira nota da roda aberta ou para a família que acabou de fechar.
- A página nunca rola sozinha (decisão minha).

### O cartão

Fica embaixo da roda.

- **Sem nada escolhido:** "Como usar a roda". Toque na família que o aroma lembra; ela se abre. Toque na nota para marcar; aqui aparece o que ela lembra. Não achou a nota? Marque a opção geral, de borda tracejada. Gostos e sensações ficam na fatia Boca; o resto da roda é aroma.
- **Família aberta:** ponto na cor e "Família · N opções"; nome; descrição; "Para treinar: …". Por último, "Marcado no Nº terço: A, B." ou "Nada marcado nesta família no Nº terço."
- **Nota tocada (marcada ou desmarcada), venha o toque da roda, de um chip, da busca ou do próprio cartão:** ponto, família e tipo (Aroma, Gosto ou Sensação); nome; "Lembra: …". Na opção geral, também "Opção geral: marque quando sentir a família, mas não souber a nota." Depois, o "Para treinar" da família e o botão "Marcar no Nº terço" (primário) ou "Desmarcar do Nº terço".

A origem da opção (app, roda, nova) aparecia no protótipo só para a revisão e não entra no app.

### Chips "Neste terço" e busca

- "Neste terço · N" lista as notas marcadas no terço, na ordem em que foram marcadas, com o ponto da família e um ×. Tocar tira a nota. Nota sem família na taxonomia (por exemplo, vinda de uma versão futura) aparece com ponto cinza e também pode ser tirada. Sem nada marcado: "Nada marcado ainda."
- A busca é o campo "Buscar pelo nome", com o exemplo "ex.: canela, cedro, chumbo". Ela ignora acentos e maiúsculas e procura no nome e nos sinônimos. Primeiro vêm as notas cujo nome ou sinônimo começa pelo texto, depois as que o contêm, até 16. Tocar num resultado marca ou desmarca a nota no terço e abre a família dela na roda. O texto da busca fica, para marcar várias notas seguidas, e só é limpo ao trocar de terço ou ao entrar na sessão (decisão minha).
- Sem resultado: "Nenhum sabor com “texto”. Tente outra palavra ou procure pela família."
- Digitar atualiza só a lista, sem redesenhar a tela. Num redesenho por outro motivo (sincronização, por exemplo), o campo mantém o foco, o cursor e o texto.

### Estado

Tudo só na memória:

- `state.rodaFam`: id da família aberta, ou nulo.
- `state.rodaFoco`: `{t:'fam', id}` ou `{t:'note', n}`.
- `state.saborQ`: o texto da busca.
- `state.rodaAnim`: `'in'`, `'out'` ou vazio, consumido no desenho.
- `state.rodaAbertaEm`: o momento em que a família abriu, para o toque duplo.

Entrar numa sessão e trocar de terço zeram esses campos: a roda volta fechada, sem cartão de nota e com a busca vazia.

## Missões, Jornada, Paladar e Escola

- **Sorteio da missão:** entre as 10 famílias de aroma (todas menos Boca), como hoje: uma das 3 menos marcadas.
- **Missão cumprida:** pela regra de compatibilidade acima.
- **Texto da missão pendente:** "Missão de aroma: Família" e "Uma das famílias que você menos marca. Abra Família na roda e procure as N opções ao longo da sessão.", com um botão "Abrir na roda" que abre a família. O texto da missão cumprida não muda: "Você marcou A, B. +5 pontos."
- **Escola, lição "Treinando o paladar":** entra no fim a frase "Na sessão, a roda de sabores ajuda: toque na família que o aroma lembra e depois na nota. Cada nota mostra o que ela lembra e como treinar."
- O Paladar e a Jornada não mudam de código: passam a usar a taxonomia nova por `FAMILIES`, `famOf` e `NOTE_COLOR`.

## Código

- O novo bloco `/* @pure:sabores */ … /* @end:sabores */` reúne:
  - a taxonomia (`FAMILIES`), as notas aceitas por família antiga (`LEGACY_MISSAO`) e `MISSION_FAMS`;
  - `normSabor`, `famOf`, `famById`, `sessNotes`, `missionHit`, `missionDone` e `buscaSabores`;
  - a geometria e o desenho da roda, que devolvem texto HTML ou SVG sem tocar no DOM: `rodaSvg` e `rodaCartao`.

  As definições atuais de `famOf`, `famById`, `sessNotes` e `missionDone` saem do lugar de hoje. `esc` vai para um bloco `/* @pure:base */`, para os testes poderem usá-lo.
- A parte que mexe na tela fica fora dos blocos puros:
  - `viewSession` monta o painel;
  - os `case` de `roda-fam`, `roda-volta` e `note` tratam os toques, e `note` passa a atualizar o foco e a abrir a família quando vem da busca;
  - um ouvinte `input` cuida da busca, e um ouvinte `keydown` cuida de Enter e Espaço;
  - `render()` guarda o foco na tela de sessão, e `rodaFit` faz o passe que encolhe os rótulos;
  - entram os estilos da roda.
- **Ganchos de teste** no `window.__t`, no estilo de `setClubApi`:
  - `__t.sessao(d)` lê e troca o `draft` e abre ou fecha a tela de sessão sem gravar;
  - `__t.setSessionSaver(fn)` troca a função com que `flush` grava a sessão e devolve a anterior. Assim o teste de interface marca notas sem gravar no IndexedDB.

## Testes

- **`node tests/sabores.test.js`** carrega `@pure:base` e `@pure:sabores` e verifica:
  - a taxonomia: 80 opções, 11 famílias, nomes únicos, os 28 nomes atuais presentes, no máximo uma opção geral por família, no máximo 12 notas por família, textos de "lembra" e de família preenchidos, e Boca com 5 gostos e 4 sensações;
  - a família nova de cada um dos 28 nomes atuais;
  - as missões: família nova, notas aceitas da família antiga e `MISSION_FAMS` sem Boca;
  - a busca: sinônimos, acentos, ordem, limite e texto vazio;
  - a geometria: ponto, arco, quebra de linha e giro do rótulo;
  - `rodaSvg` fechada e aberta: botões, rótulos acessíveis, marcas, tracejado, visto, botão de voltar e classe de animação só quando pedida;
  - `rodaCartao` nos três estados, com o texto do botão por terço.
- **`tests/ui-sabores.js`** roda no navegador com uma sessão falsa, só na memória, pelos ganchos:
  - abrir e voltar a família;
  - marcar e desmarcar pela roda, pelo cartão, pelos chips e pela busca;
  - a busca mantém o foco num `render()` no meio da digitação;
  - o teclado: Enter abre a família e marca a nota, e o foco volta ao lugar;
  - o toque duplo é ignorado;
  - trocar de terço fecha a roda e mostra as notas do terço;
  - alvo de toque de pelo menos 44 px a 360 px e nenhuma rolagem horizontal;
  - nada é gravado (o gravador falso conta zero chamadas ao IndexedDB) e tudo é restaurado no fim.
- As suítes atuais continuam passando: guia, curadoria, clube, cesta, app e SQL fase 2 em Node; ui-guia, ui-curadoria, ui-clube e ui-cesta no navegador.

## O que fica com quem implementar

Nomes de classes CSS, a divisão interna das funções de desenho, os detalhes da curva de animação e a posição exata da contagem e do visto, desde que respeitem os raios, as opacidades e os alvos de toque acima.

## Apêndice A: as 80 opções

Na coluna "Tipo", "geral" marca a opção geral da família; em Boca, "gosto" e "sensação" dizem o que a nota é. Os sinônimos servem só para a busca.

| Família | Opção | Tipo | Lembra | Sinônimos |
|---|---|---|---|---|
| Frutas | Frutado | geral | Aroma de fruta, sem dar para dizer qual. | |
| Frutas | Frutas secas | | Mistura de frutas desidratadas, como as da ceia de Natal. | |
| Frutas | Uva-passa | | Uva-passa escura: doce e concentrada. | uva passa, passas |
| Frutas | Ameixa | | Ameixa seca, escura e adocicada. | |
| Frutas | Figo | | Figo seco ou doce de figo em calda. | |
| Frutas | Cereja | | Cereja em calda ou licor de cereja. | |
| Frutas | Groselha | | Groselha e cassis: frutinha vermelha ou preta, entre o doce e o azedo. | cassis |
| Frutas | Frutas vermelhas | | Morango, framboesa e amora. | morango, framboesa, amora |
| Frutas | Cítrico | | Casca de limão ou de laranja: fresco e um pouco ácido. | limão |
| Frutas | Raspas de laranja | | Raspa da casca da laranja, com o óleo perfumado. | laranja |
| Flores | Floral | geral | Perfume de flores em geral. Na roda da imagem aparece como flores. | flores, flor |
| Flores | Rosa | | Pétala de rosa ou água de rosas. | |
| Flores | Violeta | | Perfume de violeta: delicado, um pouco atalcado. | |
| Flores | Flor de laranjeira | | Água de flor de laranjeira, de doces e bolos. | |
| Plantas | Vegetal | geral | Folha verde, horta. Use quando o aroma for de planta, sem saber qual. | planta, folha |
| Plantas | Grama | | Grama recém-cortada. | |
| Plantas | Capim | | Mato do campo, mais rústico que a grama. Na roda da imagem fica em Terras e minerais. | |
| Plantas | Feno | | Capim seco de fardo, palha. | palha |
| Plantas | Musgo | | Mata úmida, pedra com musgo depois da chuva. | |
| Plantas | Chá | | Folhas secas de chá preto, como as de um sachê aberto. | |
| Plantas | Tabaco | | O próprio fumo: folha de tabaco curada, sem outro aroma por cima. | fumo |
| Especiarias | Pimenta | geral | Pimenta em geral, quando não dá para dizer qual. | |
| Especiarias | Pimenta-do-reino | | Pimenta-do-reino moída na hora: picante e um pouco amadeirada. | pimenta preta, pimenta do reino |
| Especiarias | Pimenta-branca | | Mais aguda e menos perfumada que a pimenta-do-reino. | pimenta branca |
| Especiarias | Pimenta-verde | | Pimenta-verde em conserva: fresca, quase herbácea. | pimenta verde |
| Especiarias | Pimenta-vermelha | | Pimenta calabresa ou caiena: calor que fica na boca. | pimenta vermelha, calabresa, caiena |
| Especiarias | Canela | | Canela em pau ou em pó: doce e quente. | |
| Especiarias | Cravo | | Cravo-da-índia, a especiaria do quentão. | cravo-da-índia, cravo da índia |
| Especiarias | Noz-moscada | | Noz-moscada ralada, de purê e molho branco. | noz moscada |
| Especiarias | Cardamomo | | Fresco e resinoso, do café árabe e do chai. | |
| Especiarias | Cominho | | Tempero quente e terroso, comum na comida árabe. | |
| Especiarias | Alcaçuz | | Bala de alcaçuz: adocicada, lembra anis. | |
| Especiarias | Erva-doce | | Erva-doce (anis), em chá ou em semente. | anis, erva doce |
| Terra | Terroso | geral | Terra molhada, chão de jardim depois da chuva. Na roda da imagem aparece como terra. | terra |
| Terra | Couro | | Cinto, sela ou bolsa de couro. | |
| Terra | Curral | | Curral, estrebaria: rústico, animal. | estábulo, estrebaria |
| Terra | Mineral | | Pedra molhada e giz: frio, sem doçura. | pedra, giz |
| Terra | Grafite | | A ponta do lápis: seco e mineral. Na roda da imagem aparece como chumbo. | chumbo, lápis |
| Terra | Mofo | | Cheiro de guardado, de porão ou armário fechado. | |
| Madeira e fumaça | Amadeirado | geral | Madeira em geral, quando não dá para dizer qual. | madeira |
| Madeira e fumaça | Cedro | | A madeira do lápis recém-apontado e da caixa de charutos. | |
| Madeira e fumaça | Carvalho | | Barril de carvalho, de uísque e vinho envelhecidos. | |
| Madeira e fumaça | Defumado | | Fumaça de lenha, como em alimentos defumados. | fumaça, lenha |
| Madeira e fumaça | Carvão | | Carvão de churrasqueira, fuligem. | |
| Tostados | Tostado | geral | Algo tostado em geral, como casca de pão ou grão torrado. | |
| Tostados | Pão | | Miolo de pão fresco, massa assada. | |
| Tostados | Torrada | | Pão torrado, casca dourada. | |
| Tostados | Biscoito | | Biscoito tipo maisena: assado e levemente doce. | bolacha |
| Cacau e café | Cacau | | Cacau em pó, sem açúcar. | |
| Cacau e café | Chocolate ao leite | | Chocolate cremoso e doce. | |
| Cacau e café | Chocolate meio amargo | | Cacau com um pouco de açúcar. | |
| Cacau e café | Chocolate amargo | | Muito cacau e pouco açúcar. | |
| Cacau e café | Café | | Café em geral, do coado ao expresso. | |
| Cacau e café | Café torrado | | Grão de café torrado e moído na hora. | |
| Cacau e café | Café expresso | | Café forte e concentrado. | expresso |
| Cacau e café | Café com leite | | Café suavizado pelo leite. | cappuccino |
| Castanhas | Castanha | geral | Castanhas em geral, quando não dá para dizer qual. | |
| Castanhas | Amêndoa | | Amêndoa crua ou torrada. | |
| Castanhas | Amendoim | | Amendoim torrado, de paçoca. | |
| Castanhas | Noz | | Noz, com a pele fina meio amarga. | nozes |
| Castanhas | Castanha de caju | | Castanha de caju torrada. Na roda da imagem aparece como caju. | caju |
| Castanhas | Avelã | | Avelã torrada, de creme de avelã. | |
| Castanhas | Marzipã | | Doce de pasta de amêndoa. Na roda da imagem aparece como maçapão. | maçapão |
| Doces | Adocicado | geral | Aroma de doce, sem dar para dizer qual. | |
| Doces | Mel | | Mel de abelha. | |
| Doces | Baunilha | | Baunilha de sorvete e de bolo. | |
| Doces | Caramelo | | Açúcar queimado, calda de pudim. | |
| Doces | Melaço | | Melaço de cana: escuro e denso. Na roda da imagem fica em Frutas. | melaço de cana |
| Doces | Açúcar mascavo | | Açúcar mascavo ou rapadura. | rapadura |
| Doces | Creme | | Creme de leite, nata. | nata |
| Doces | Coco | | Coco ralado, cocada. | |
| Boca | Doce | gosto | Gosto de açúcar. | |
| Boca | Salgado | gosto | Gosto de sal. Na roda da imagem aparece como sal. | sal |
| Boca | Ácido | gosto | Gosto azedo, de limão. | azedo |
| Boca | Amargo | gosto | Gosto de café sem açúcar ou de jiló. | |
| Boca | Umami | gosto | Gosto de caldo, shoyu ou queijo parmesão. | saboroso |
| Boca | Áspero | sensação | Arranha a língua ou a garganta. Pode vir de brasa quente demais: espaçar as baforadas ajuda. | |
| Boca | Seco | sensação | Deixa a boca seca, pedindo água. | |
| Boca | Picante | sensação | Ardência na boca, como a de pimenta. | |
| Boca | Cremoso | sensação | Fumaça macia e encorpada, que enche a boca. | |

## Apêndice B: as famílias

| id | Rótulo | Rótulo na roda | Cor | Descrição | Para treinar |
|---|---|---|---|---|---|
| fruta | Frutas | Frutas | #EE8665 | Do cítrico fresco às frutas secas e escuras. | Antes da sessão, cheire uva-passa, ameixa seca e raspas de laranja. |
| flor | Flores | Flores | #C7A0E2 | Perfumes de flor, leves e fáceis de perder. | Cheire uma rosa de verdade e um pouco de água de flor de laranjeira. |
| planta | Plantas | Plantas | #93BE6E | Folhas, capim, feno e o próprio tabaco. | Compare grama recém-cortada, palha seca e folhas de chá preto. |
| especiaria | Especiarias | Especiarias | #DE6B4F | Temperos quentes e picantes. O cheiro é aroma; a ardência na língua é sensação e fica em Boca. | Cheire canela, cravo e pimenta-do-reino moída na hora, um de cada vez. |
| terra | Terra | Terra | #A08A6C | Terra, couro, minerais e cheiro de guardado. | Cheire terra de vaso molhada, um cinto de couro e a ponta de um lápis. |
| madeira | Madeira e fumaça | Madeira | #B07A4C | Madeiras, lenha e fumaça. | Cheire um lápis recém-apontado: é a referência clássica de cedro. |
| tostado | Tostados | Tostados | #DDB07A | Pão, torrada e grãos assados. | Compare miolo de pão, torrada e biscoito maisena. |
| cacau | Cacau e café | Cacau e café | #B58266 | Do cacau em pó ao café expresso. | Compare cacau em pó, chocolate ao leite e café moído. |
| castanha | Castanhas | Castanhas | #D6A35E | Castanhas, nozes e amêndoas, cruas ou torradas. | Prove amêndoa, noz e amendoim torrado lado a lado. |
| doce | Doces | Doces | #F1C86E | Aromas que lembram doces. O gosto doce, na língua, fica em Boca. | Cheire mel, baunilha e açúcar mascavo. Repare que cheiro de doce não é gosto doce. |
| gosto | Boca: gostos e sensações | Boca | #A7B4C2 | O que a língua e a boca sentem. Gostos são só cinco; o resto da roda é aroma, que chega ao nariz por dentro da boca. | Prove água com açúcar, água com sal, água com limão e um café sem açúcar. |

Contrastes calculados pela fórmula da WCAG:
- **Nota marcada.** Texto escuro (#1A120C) sobre a cor cheia fica entre 5,0:1 (Madeira) e 11,6:1 (Doces). Por isso a nota marcada usa texto escuro nos dois temas.
- **Fatia não marcada.** O texto do tema sobre a cor com 26%, 30% ou 42% de opacidade fica entre 4,7:1 (Doces a 42% no tema escuro) e 13,9:1.

Todos passam de 4,5:1.
