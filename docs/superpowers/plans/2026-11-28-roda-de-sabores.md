# 2.12.0: roda de sabores na tela do terço — plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: superpowers:executing-plans (Nativo) ou superpowers:subagent-driven-development. Passos com caixas (`- [ ]`).

**Objetivo:** trocar os botões de sabor de cada terço por uma roda interativa e didática, com 80 opções em 11 famílias, sem mudar nenhum nome já gravado.

**Arquitetura:** tudo continua em `index.html` (ES5, `innerHTML`, `data-act`). A taxonomia, as regras de missão, a busca e o desenho da roda e do cartão viram funções puras, que devolvem texto e ficam num bloco novo `@pure:sabores`, testado em Node. A tela de sessão só chama essas funções, trata os toques e guarda o foco. Dois ganchos de teste deixam o teste de interface abrir uma sessão falsa sem gravar no IndexedDB.

**Tecnologia:** HTML, CSS e JS ES5 num arquivo; SVG inline; Node (`vm`, `assert`) para os testes sem navegador; navegador embutido (preview `diario`, porta 8765) para a interface.

**Desenho:** `docs/superpowers/specs/2026-11-28-roda-de-sabores-design.md` (os textos exatos das 80 opções e das 11 famílias estão nos apêndices A e B).

## Restrições globais

- ES5 no app; desenho por `innerHTML`; eventos por `data-act`; texto sempre por `esc()`.
- Os 28 nomes de sabor atuais não mudam (`Doce, Mel, Baunilha, Creme, Caramelo, Coco, Castanha, Amêndoa, Amendoim, Cedro, Carvalho, Tostado, Terroso, Couro, Feno, Cacau, Café, Chocolate amargo, Pimenta, Canela, Cravo, Frutas secas, Cítrico, Floral, Salgado, Ácido, Amargo, Umami`).
- Ids de família mantidos: `doce, castanha, madeira, terra, cacau, especiaria, fruta, gosto`; novos: `flor, planta, tostado`.
- Alvos de toque de pelo menos 44 px a 360 px; sem rolagem horizontal de 360 a 390 px; temas claro e escuro; sem emoji como ícone (o visto é desenhado em SVG).
- Nenhum SQL, nenhum campo sincronizado novo, nenhum formato de backup novo.
- Textos exatamente como nos apêndices e nas seções "O cartão", "Chips e busca" e "Missões" do desenho. Nada que ensine a tragar.
- Testes de interface não gravam no diário e restauram o estado no fim.
- Versão final: `APP_VERSION='2.12.0'`, `APP_BUILD` com a data da publicação.

## Foco da revisão

1. **Nota fora da taxonomia** numa sessão (nome de outra versão ou de backup editado à mão): a roda e os chips não podem quebrar; o chip aparece com ponto cinza e sai com um toque. Testes na Task 2 (`rodaSvg` e `rodaChips` com "Inventado").
2. **Redesenho no meio da digitação da busca** (sincronização terminando): o campo mantém foco, texto e cursor. Teste na Task 3.
3. **Toque duplo ao abrir uma família:** o segundo toque não pode marcar a nota que caiu embaixo do dedo. Teste na Task 3.
4. **Rótulo comprido com fonte maior ou ainda carregando:** nenhum rótulo passa do espaço da fatia depois do passe de ajuste. Teste na Task 3 (largura medida de cada rótulo ≤ `data-max`).
5. **Missão antiga cumprida com nota que mudou de família** (Floral, Feno, Tostado, Doce): continua cumprida e com os 5 pontos. Teste na Task 1.

---

### Task 1: taxonomia e regras no bloco puro

**Arquivos:**
- Modificar: `index.html`: `FAMILIES` (l. 318-327) sai dali; `MISSION_FAMS`, `famById` e `missionDone` (l. 791-795) e `sessNotes` e `famOf` (l. 1577-1578) saem dos lugares atuais; `esc` (l. 924) passa para um bloco `/* @pure:base */ … /* @end:base */` no mesmo lugar.
- Criar: bloco `/* @pure:sabores */ … /* @end:sabores */` logo depois do bloco base; `tests/sabores.test.js`.

**Interfaces:**
- Produz, no bloco `@pure:sabores`:
  - `FAMILIES: Array<{id, label, short, color, desc, treino, notes: string[]}>` na ordem do Apêndice B. `notes` continua uma lista de nomes, como hoje, para `f.notes.indexOf(n)` seguir valendo.
  - `NOTA_INFO: {[nome]: {n, l, g: boolean, k: 'aroma'|'gosto'|'sensacao', a: string[]}}` com o "lembra" (`l`), a opção geral (`g`), o tipo (`k`) e os sinônimos (`a`) do Apêndice A.
  - `LEGACY_MISSAO = {doce:['Doce'], fruta:['Floral'], terra:['Feno'], madeira:['Tostado']}`.
  - `MISSION_FAMS: string[]`, os ids de `FAMILIES` menos `gosto`.
  - `normSabor(s: string): string` (sem acento, minúsculo, sem espaço nas pontas).
  - `famOf(n: string): Family|null`, `famById(id: string): Family|null`, `sessNotes(s): string[]` (como hoje).
  - `missionHit(s: Session): string[]` (notas da sessão, na ordem de `sessNotes`, que pertencem a `famById(s.mission)` ou a `LEGACY_MISSAO[s.mission]`).
  - `missionDone(s): boolean`, que é `missionHit(s).length>0`.
  - `buscaSabores(q: string, max?: number): string[]`, com `max` padrão 16. Vêm primeiro as notas cujo nome ou sinônimo começa por `normSabor(q)`, depois as que o contêm, cada grupo na ordem da taxonomia. Com `q` vazio, devolve `[]`.
- No bloco `@pure:base`: `esc(s)` sem mudança.

- [ ] **Passo 1: escrever `tests/sabores.test.js`.**
  - Carrega `@pure:base` e `@pure:sabores` num `vm`, no formato de `tests/guia.test.js`.
  - Termina com `${pass} ok, ${fail} falha(s)` e `process.exit(fail?1:0)`.
  - Testes:
  - `taxonomia: 11 famílias na ordem do desenho`: ids `['fruta','flor','planta','especiaria','terra','madeira','tostado','cacau','castanha','doce','gosto']`.
  - `taxonomia: 80 opções sem nome repetido`: total 80; `new Set` com 80.
  - `taxonomia: opções por família`: `[10,4,7,12,6,5,4,8,7,8,9]`.
  - `os 28 sabores de hoje continuam na roda`: `famOf(n)` não nulo para os 28 da restrição global.
  - `os 28 sabores mudam de família só onde o desenho manda`: `Doce→gosto, Feno→planta, Tostado→tostado, Floral→flor`; os outros 24 na família de hoje (`Mel→doce`, `Cedro→madeira`, `Couro→terra`, `Cítrico→fruta`, `Salgado→gosto` e assim por diante).
  - `famílias e opções têm os textos do desenho`:
    - `label`, `desc` e `treino` não vazios;
    - `color` casa com `/^#[0-9A-F]{6}$/i`;
    - `NOTA_INFO[n].l` não vazio para as 80;
    - conferir literalmente três textos: `NOTA_INFO['Cedro'].l === 'A madeira do lápis recém-apontado e da caixa de charutos.'`, `famById('gosto').label === 'Boca: gostos e sensações'` e `famById('madeira').short === 'Madeira'`.
  - `opção geral: no máximo uma por família e sempre a primeira`: as gerais são exatamente `Frutado, Floral, Vegetal, Pimenta, Terroso, Amadeirado, Tostado, Castanha, Adocicado`.
  - `Boca tem 5 gostos e 4 sensações`: `k` de `Doce, Salgado, Ácido, Amargo, Umami` é `gosto`; de `Áspero, Seco, Picante, Cremoso` é `sensacao`; as outras 71 são `aroma`.
  - `MISSION_FAMS são as 10 famílias de aroma`: tamanho 10, sem `gosto`.
  - `missão cumprida por nota da família nova`: `{mission:'especiaria', thirds:[{notes:['Canela']},{notes:[]},{notes:[]}]}` dá `missionHit` igual a `['Canela']` e `missionDone` verdadeiro.
  - `missão antiga continua cumprida com a nota que mudou de família`: `fruta`+Floral, `terra`+Feno, `madeira`+Tostado e `doce`+Doce dão verdadeiro.
  - `missão não cumprida fora da família`: `fruta`+Cedro, sessão sem `mission` e `mission:'xyz'` dão falso.
  - `busca acha pelos nomes da imagem`:
    - `buscaSabores('chumbo')` é `['Grafite']`;
    - `buscaSabores('caju')` é `['Castanha de caju']`;
    - `buscaSabores('flores')[0]` é `'Floral'`;
    - `buscaSabores('sal')[0]` é `'Salgado'`.
  - `busca ignora acento e maiúscula`: `buscaSabores('ACUCAR')` é `['Açúcar mascavo']`, pelo nome sem acento; `buscaSabores('cafe').slice(0,4)` é `['Café','Café torrado','Café expresso','Café com leite']`.
  - `busca põe primeiro quem começa pelo texto`: `buscaSabores('noz')` é `['Noz-moscada','Noz']`; `buscaSabores('pimenta')[0]` é `'Pimenta'`.
  - `busca vazia e limite`: `buscaSabores('')` e `buscaSabores('  ')` são `[]`; `buscaSabores('a').length===16`; `buscaSabores('a',5).length===5`.
- [ ] **Passo 2: rodar e ver falhar.** `node tests/sabores.test.js`. Esperado: FAIL em todos, com o bloco `@pure:sabores` ausente.
- [ ] **Passo 3: implementar.**
  - Monte os blocos `@pure:base` e `@pure:sabores` com os dados dos apêndices A e B, sem a coluna "origem" do protótipo.
  - Um comentário no topo do bloco credita a base: a roda Cigar Advisor/Famous Smoke, na versão em português do Blog Charutos Online.
  - Apague as definições antigas, que ficariam duplicadas.
  - `NOTE_COLOR` (l. 901) e a tela antiga de botões continuam funcionando com `f.notes` como lista de nomes, agora com 80 botões. A troca da tela é da Task 3.
- [ ] **Passo 4: rodar e ver passar.** `node tests/sabores.test.js` → `0 falha(s)`. `node tests/guia.test.js`, `node tests/curadoria.test.js`, `node tests/clube.test.js`, `node tests/cesta.test.js` e `node tests/app.test.js` → `0 falha(s)` cada.
- [ ] **Passo 5: commit** `feat: taxonomia da roda de sabores com 80 opções e missões compatíveis`.

### Task 2: desenho da roda, do cartão, dos chips, da busca e da missão (puro)

**Arquivos:**
- Modificar: `index.html`, bloco `@pure:sabores`.
- Testes: `tests/sabores.test.js`.

**Interfaces:**
- Consome: Task 1.
- Produz, no bloco `@pure:sabores`:
  - `RODA = {hub:48, f0:52, f1:140, t0:144, t1:168, t1on:177, i:52, o:175}`.
  - `rodaPt(r, a): [x, y]`, arredondado a 2 casas. O ângulo é em graus, no sentido horário a partir do topo.
  - `rodaArc(r0, r1, a0, a1): string`, o `d` de uma fatia de anel.
  - `rodaLinhas(t): string[]`: 1 ou 2 linhas, pela regra do desenho.
  - `rodaRot(a): number`, o giro do rótulo radial: com `a` normalizado para [0,360), `a<=180 ? a-90 : a-270`.
  - `rodaSvg(o: {fam: string|null, sel: string[], terco: string, anim: ''|'in'|'out'}): string`, o `<svg>` inteiro.
    - Na roda fechada: famílias com `data-act="roda-fam" data-id`.
    - Na roda aberta: notas com `data-act="note" data-val`, `role="button"`, `tabindex="0"` e `aria-pressed`, e o centro com `data-act="roda-volta"`.
    - Os rótulos levam `data-max`, a largura máxima em unidades do SVG.
    - O visto é um `<path class="chk">`.
    - A classe `anim-in` ou `anim-out` entra só quando pedida.
    - O nome no centro da roda aberta é `f.label`, ou `f.short` quando `f.label` passa de 16 caracteres.
  - `rodaCartao(o: {foco: null|{t:'fam', id}|{t:'note', n}, sel: string[], terco: string}): string`. O botão da nota é `<button type="button" class="btn[ primary]" data-act="note" data-val>`.
  - `rodaChips(sel: string[]): string`. Cada chip é um botão `data-act="note"` com `aria-label="Tirar X"`; a cor vem de `famOf`, ou `#999` quando a nota não tem família.
  - `rodaBuscaHtml(q: string, sel: string[]): string`. Os resultados são botões `class="opt" data-act="note" data-val data-abre aria-pressed`.
  - `missaoCartao(s: Session): string`. Sem missão, devolve `''`.
    - Pendente: título "Missão de aroma: X" e a frase do desenho, com N = `famById(s.mission).notes.length`, mais o botão `data-act="roda-fam" data-id` "Abrir na roda".
    - Cumprida: "Missão cumprida: X" e "Você marcou A, B. +5 pontos.", com as notas de `missionHit`.

- [ ] **Passo 1: testes novos em `tests/sabores.test.js`.**
  - `rodaPt: topo, direita e baixo`: `(10,0)→[0,-10]`, `(10,90)→[10,0]`, `(10,180)→[0,10]`.
  - `rodaArc: fatia de 90 graus`: `rodaArc(10,20,0,90) === 'M0 -20A20 20 0 0 1 20 0L10 0A10 10 0 0 0 0 -10Z'`.
  - `rodaLinhas: quebra no espaço ou no hífen mais perto do meio`:
    - `'Canela'` dá `['Canela']`;
    - `'Chocolate meio amargo'` dá `['Chocolate','meio amargo']`;
    - `'Raspas de laranja'` dá `['Raspas de','laranja']`;
    - `'Pimenta-do-reino'` dá `['Pimenta-','do-reino']`;
    - `'Pimenta-verde'` dá `['Pimenta-verde']`;
    - `'Cacau e café'` dá `['Cacau','e café']`.
  - `rodaRot: rótulo nunca de cabeça para baixo`: `0→-90`, `90→0`, `180→90`, `270→0`, `330→60`.
  - `rodaSvg fechada`, com `{fam:null, sel:['Cedro','Canela'], terco:'1º terço', anim:''}`:
    - 11 `data-act="roda-fam"`;
    - os rótulos acessíveis `Especiarias: 12 opções, 1 marcada` e `Frutas: 10 opções`;
    - 80 `class="sl tick"`, com 2 fatias até o raio 177 (`A177 177`);
    - o centro com `1º TERÇO`, `>2<` e `marcados`;
    - nenhum número de contagem dentro das fatias (sem `class="fcnt"`);
    - nenhuma `anim-`.
  - `rodaSvg aberta`, com `{fam:'especiaria', sel:['Canela','Cedro'], terco:'2º terço', anim:'in'}`:
    - 12 `data-act="note"`;
    - 1 `aria-pressed="true"`;
    - 1 `class="chk"`;
    - `aria-label="Pimenta, opção geral da família"` e uma classe `gen`;
    - `data-act="roda-volta"`, com `Especiarias` e `1 de 12`;
    - a classe `anim-in`.
  - `rodaSvg aberta usa o rótulo curto quando o nome é longo`: com `fam:'gosto'`, o centro mostra `Boca`, e não `Boca: gostos e sensações`.
  - `rodaSvg com nota fora da taxonomia`: com `sel:['Inventado']`, a roda fechada tem 11 famílias e nenhum `A177 177`.
  - `rodaCartao nos três estados`:
    - Sem foco: contém `Como usar a roda` e `Boca`.
    - `{t:'fam', id:'flor'}`, com `['Rosa']` e `1º terço`: contém `Família · 4 opções`, `Flores`, `Para treinar:` e `Marcado no 1º terço: Rosa.`. Com `[]`: `Nada marcado nesta família no 1º terço.`
    - `{t:'note', n:'Cedro'}`, com `[]` e `2º terço`: contém `Aroma`, `Lembra:`, o texto do Cedro, `Marcar no 2º terço` e `btn primary`. Com `['Cedro']`: `Desmarcar do 2º terço`, sem `btn primary`.
    - `Frutado` contém `Opção geral:`; `Amargo` contém `Gosto`; `Seco` contém `Sensação`.
  - `rodaChips`:
    - `[]` dá `Nada marcado ainda.`;
    - `['Cedro','Inventado']` dá `Neste terço · 2`, 2 `data-act="note"`, `aria-label="Tirar Cedro"` e `#999` no ponto do Inventado.
  - `rodaBuscaHtml`:
    - `('', [])` dá `''`;
    - `('xyz', [])` contém `Nenhum sabor com “xyz”.`;
    - `('chumbo', ['Grafite'])` contém `data-val="Grafite"`, `data-abre` e `aria-pressed="true"`;
    - `('<b>', [])` contém `&lt;b&gt;`.
  - `missaoCartao`:
    - Sem missão, dá `''`.
    - `flor` sem nota de Flores contém `Missão de aroma: Flores`, `Abra Flores na roda e procure as 4 opções ao longo da sessão.` e `data-act="roda-fam" data-id="flor"`.
    - `fruta` com `Floral` contém `Missão cumprida: Frutas` e `Você marcou Floral. +5 pontos.`
- [ ] **Passo 2: rodar e ver falhar.** `node tests/sabores.test.js`. Esperado: os testes da Task 1 passam; os novos falham com "não é função".
- [ ] **Passo 3: implementar** as funções acima. O protótipo aprovado é a referência de desenho: anel das famílias, anel das notas, centro e fatias. O visto é um `<path class="chk">` perto da borda de fora da fatia marcada, e o rótulo da fatia marcada ganha espaço para ele (`data-max` menor).
- [ ] **Passo 4: rodar e ver passar.** `node tests/sabores.test.js` → `0 falha(s)`.
- [ ] **Passo 5: commit** `feat: desenho puro da roda, do cartão, dos chips, da busca e da missão`.

### Task 3: a roda na tela do terço

**Arquivos:**
- Modificar: `index.html`:
  - CSS: estilos da roda depois de `.fam` (l. 215), no padrão do protótipo e com as cores dos tokens;
  - `render()`, na parte da tela de sessão (l. 1369);
  - o painel de notas de `viewSession` (l. 1873-1877);
  - a missão em `viewSession`, que passa a usar `missaoCartao`;
  - `enterSession` e `flush` (l. 1948-1950);
  - os `case` `step` e `note` (l. 1993 e 1997), mais os novos `roda-fam` e `roda-volta`;
  - os ouvintes `input` e `keydown`;
  - `window.__t` (l. 1477-1479);
  - `init`, para chamar `rodaFit` quando as fontes carregarem.
- Criar: `tests/ui-sabores.js`.

**Interfaces:**
- Consome: Tasks 1 e 2.
- Produz:
  - `state.rodaFam`, `state.rodaFoco`, `state.saborQ`, `state.rodaAnim` e `state.rodaAbertaEm`;
  - `rodaReset()`, que zera os cinco e é chamado em `enterSession` e no `case 'step'`;
  - `rodaFit()`: para cada `#roda text[data-max]`, zera o tamanho, mede `getBBox().width` e encolhe a fonte na proporção quando passar;
  - `var sessionSaver = function(d){return put('sessions', d);}`, com `flush()` gravando por ele;
  - `__t.sessao(d)`: com `d`, troca o `draft`, põe a tela em `session` (ou em `home` com `null`), zera o terço e a roda e desenha; sempre devolve o `draft`;
  - `__t.setSessionSaver(fn)`: troca o gravador e devolve o anterior.
- Toques:
  - `roda-fam` abre a família, foca o cartão nela, pede `anim='in'` e guarda `rodaAbertaEm`.
  - `roda-volta` fecha a família, deixa o cartão na família que fechou e pede `anim='out'`.
  - `note` marca ou desmarca como hoje e foca o cartão na nota. Ele é ignorado quando vem de dentro de `#roda` até 300 ms depois de `rodaAbertaEm`. Com `data-abre`, também abre a família da nota.
- Busca: `<input type="search" id="sabor-q" data-saborq>` atualiza `state.saborQ` e só o `#sabor-res`.
- Teclado: Enter e Espaço num elemento com `role="button"` e `data-act` que não seja `<button>` disparam um clique nele.
- Foco no redesenho da sessão:
  - Se o foco estava em `#sabor-q`, ele volta com o cursor.
  - Se estava em qualquer elemento da tela de sessão com `data-act` (roda, cartão, chips ou resultados da busca), volta ao elemento com o mesmo `data-act` e `data-id`/`data-val`, se ele ainda existir.
  - Se o elemento era da roda e sumiu, o foco vai para a primeira nota da roda aberta ou para a família de `state.rodaFoco`.
  - Sem `scrollIntoView`: a página não rola sozinha.
- A busca guarda o texto depois de um toque num resultado; só `rodaReset()` o limpa.

- [ ] **Passo 1: escrever `tests/ui-sabores.js`.**
  - Usa o formato de `tests/ui-cesta.js`, com `try/catch/finally` e devolvendo `{ok, falhas, resultados}`.
  - Preparação:
    - guarda `state.tab`, `state.view`, `state.step` e o gravador;
    - troca o gravador por um falso que só conta as chamadas;
    - abre pela `__t.sessao` uma sessão falsa `{id:'t-roda', cigarId:'', cigarName:'Teste da roda', status:'aberta', visibility:'private', mission:'flor', timer:{acc:0, running:false, resumedAt:null}, thirds:[{notes:['Cedro'], intensity:0, text:''}, {notes:[], intensity:0, text:''}, {notes:[], intensity:0, text:''}]}`.
  - Verificações:
  - `a roda fechada mostra 11 famílias`.
  - `tocar numa família abre a roda nela`: no clique em Especiarias, 12 notas e o cartão com `Especiarias`.
  - `toque logo depois de abrir é ignorado`: clicar em Canela sem esperar não muda `aria-pressed` nem as notas.
  - `tocar na nota marca no terço, mostra o cartão e o chip`: depois de 350 ms, Canela fica nas notas do 1º terço, no cartão (`Lembra:`) e nos chips.
  - `o botão do cartão desmarca`.
  - `o chip tira a nota`.
  - `voltar fecha a roda`: 11 famílias de novo.
  - `a busca acha pelo nome da imagem e marca`:
    - com `chumbo` no campo e o evento `input`, aparece Grafite;
    - o clique marca Grafite e abre Terra, com 6 notas;
    - o campo continua com `chumbo`, e o resultado fica com `aria-pressed="true"`.
  - `a busca mantém o foco num redesenho`: com `can` no campo e o cursor em 3, depois de `__t.render()`, o foco continua em `sabor-q`, com o mesmo texto e o cursor em 3.
  - `Enter abre a família e marca a nota pelo teclado`:
    - Enter em Frutas abre 10 notas e põe o foco numa nota;
    - depois de 350 ms, Enter na nota focada a marca;
    - o foco continua na mesma nota.
  - `nenhum rótulo passa do espaço da fatia`: em `#roda text[data-max]`, `getBBox().width <= data-max + 0.5`, com a roda fechada e com Especiarias aberta.
  - `trocar de terço fecha a roda e mostra as notas do terço`: no 2º terço, 11 famílias, `Nada marcado ainda.` e `state.saborQ === ''`.
  - `a missão pendente abre a família na roda`: "Abrir na roda" leva a 4 notas.
  - `alvo de toque de pelo menos 44 px`: o critério é o maior círculo que cabe na fatia.
    - Sejam `k` = largura do SVG / 360 e `s = sin(θ/2)`. O diâmetro em px é `k*2*r1*s/(1+s)`. Ele vale quando `r1*(1-s)/(1+s) >= r0`, que se confere no próprio teste.
    - Precisa dar pelo menos 44 na roda fechada (`θ = 360/11`, `r0 = 52`, `r1 = 140`) e na aberta com 12 notas (`θ = 30`, `r0 = 52`, `r1 = 175`).
  - `sem rolagem horizontal`.
  - `nada foi gravado no diário`: o gravador falso foi chamado pelo menos uma vez, e `state.sessions` não tem `t-roda`.
  - No `finally`: `__t.sessao(null)`, gravador de volta e estado restaurado.
- [ ] **Passo 2: rodar e ver falhar.**
  - Preview `diario` a 360 px. No console: `eval(await (await fetch('/tests/ui-sabores.js?' + Date.now())).text())`.
  - Esperado: FAIL, com `__t.sessao` ausente ou sem `#roda`.
- [ ] **Passo 3: implementar** o que está em Interfaces.
  - O painel do terço segue a ordem do desenho: pergunta, `#roda`, `#roda-card` (`aria-live="polite"`), `#roda-sel`, a busca (`label.f` "Buscar pelo nome") com `#sabor-res`, a intensidade e as anotações.
  - O `hint` de Gostos na boca deixa de existir: o cartão ensina.
- [ ] **Passo 4: rodar e ver passar.** `ui-sabores` a 360 e 390 px, nos temas escuro e claro, com 0 FAIL. Os quatro `ui-*.js` de antes também com 0 FAIL. No console, nenhum erro.
- [ ] **Passo 5: conferir à mão.**
  - Abra uma sessão de verdade num navegador sem login no clube, marque e desmarque, e apague a sessão de teste depois.
  - A animação de abrir e voltar aparece. Com `prefers-reduced-motion`, ela some.
- [ ] **Passo 6: commit** `feat: roda de sabores na tela do terço, com cartão, chips e busca`.

### Task 4: lição, versão 2.12.0 e documentação

**Arquivos:**
- Modificar: `index.html`: lição `paladar` em `LESSONS` (l. 785), `APP_VERSION` e `APP_BUILD` (l. 317); `CLAUDE.md`.
- Testes: `tests/ui-sabores.js`.

- [ ] **Passo 1: teste.** `a lição Treinando o paladar fala da roda`. Em Conta › Paladar, o conteúdo de `details[data-lesson="paladar"]` contém `a roda de sabores ajuda`. A lição não é aberta, porque abrir grava a leitura. Rodar e ver falhar.
- [ ] **Passo 2: implementar.**
  - Entra no fim da lição o parágrafo `<p>Na sessão, a roda de sabores ajuda: toque na família que o aroma lembra e depois na nota. Cada nota mostra o que ela lembra e como treinar.</p>`.
  - `APP_VERSION='2.12.0'`, com `APP_BUILD` na data do dia.
  - `CLAUDE.md`:
    - a versão;
    - a linha da Sessão: roda de sabores, 80 opções em 11 famílias, cartão, chips e busca;
    - a regra de compatibilidade das missões (`LEGACY_MISSAO`);
    - os testes `node tests/sabores.test.js` e `tests/ui-sabores.js`, com os ganchos `__t.sessao` e `__t.setSessionSaver`.
- [ ] **Passo 3: verificação final.**
  - Em Node: `sabores`, `guia`, `curadoria`, `clube`, `cesta`, `app` e `node supabase/tests/fase2.test.mjs`, todos com 0 falhas.
  - No navegador: os cinco `ui-*.js` a 360 e 390 px, nos temas escuro e claro, com 0 FAIL e o console limpo.
- [ ] **Passo 4: commit** `feat: 2.12.0 com a roda de sabores`.
