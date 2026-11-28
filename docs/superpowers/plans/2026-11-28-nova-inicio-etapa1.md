# 2.13.0: nova Início (etapa 1, sem SQL) — plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: superpowers:executing-plans (Nativo) ou superpowers:subagent-driven-development. Passos com caixas (`- [ ]`).

**Objetivo:** a Início com o herói de iniciar sessão e a folha de escolha, o Clube na abertura, o Guia de bolso ilustrado em grade e o bloco Seu diário. Curtir vira Brindar. Tudo sem mudar SQL nem dados.

**Arquitetura:** tudo em `index.html` (ES5, `innerHTML`, `data-act`). As regras de lista, progresso e texto ficam num bloco puro novo, `@pure:inicio`, testado em Node. As ilustrações do guia ficam no bloco `@pure:guia`. A sessão passa a começar por `iniciarSessao`, que grava pelo `sessionSaver` para o teste trocar o gravador. A tela é provada em `tests/ui-inicio.js`.

**Tecnologia:** HTML, CSS e JS ES5; Node (`vm`, `assert`); navegador embutido (preview `diario`).

**Desenho:** `docs/superpowers/specs/2026-11-28-nova-inicio-design.md`, Etapa 1. As ilustrações e o visual seguem o protótipo aprovado; o arquivo está no scratchpad desta sessão, `inicio-proto.html`.

## Restrições globais

- ES5; `innerHTML`; `data-act`; `esc()` em todo texto.
- Alvos de 44 px (o botão principal tem 56 px); sem rolagem horizontal de 360 a 390 px; temas claro e escuro; sem emoji como ícone.
- Nenhum SQL, nenhum campo novo sincronizado, nenhum formato de backup novo. Os dados de brinde continuam em `reactions` e `cloud.likes`.
- Testes de interface não gravam no diário e restauram o estado.
- Nada que ensine a tragar; sem preço, loja ou link.
- Versão final: `APP_VERSION='2.13.0'`. O `APP_BUILD` recebe a data conferida com `date` e com o horário do último commit.

## Foco da revisão

1. **Diário vazio:** o herói mostra a linha de diário vazio, com Adicionar e Importar, e a folha abre já no Avulso. Teste na Task 3.
2. **Sessão aberta e toque em "Começar sessão":** aparece o aviso de hoje e não nasce uma segunda sessão. Teste na Task 2.
3. **Membro sem degustações no feed e sem contagem de membros:** a seção do Clube não quebra; a linha de membros some e aparece "Nenhuma degustação compartilhada ainda.". Teste na Task 3.
4. **Relógio do herói:** só corre com a Início visível e para ao sair dela. Teste na Task 3.
5. **Nível máximo (Mestre):** a barra mostra "Nível máximo" e não divide por zero. Teste na Task 1.

---

### Task 1: funções puras da Início

**Arquivos:**
- Modificar: `index.html`, com o bloco novo `/* @pure:inicio */ … /* @end:inicio */` logo depois do `@pure:sabores`.
- Criar: `tests/inicio.test.js`, que carrega os blocos `base`, `sabores` e `inicio`.

**Interfaces (produz):**
- `inicioCharutos(cigars, aba, busca)`: devolve uma lista de `{id, name, meta}`.
  - Com `aba='estoque'`, entram só os de status com `estoque`; com `'acervo'`, todos, filtrados por `normSabor(busca)` contido em `normSabor(name)`.
  - A ordem é por `order` crescente e depois pelo nome.
  - O `meta` junta, com " · ", a origem, "força N/5" (se houver) e a bitola, pulando o que estiver vazio.
- `abaInicial(cigars)`: `'estoque'` se algum tem estoque; senão `'acervo'` se há charutos; senão `'avulso'`.
- `nivelProgresso(j)`: devolve `{atual, proximo, pts, alvo, pct, faltam, max}`.
  - O `j` é o objeto de `journey()`, com `xp`, `name`, `floor` e `next`.
  - Sem `next`: `max:true`, `pct:100` e `faltam:0`.
- `quandoTexto(iso, agora)`: `'hoje'`, `'ontem'` ou `'há N dias'` até 29 dias; depois disso, `'em dd/mm'`. Com data inválida, devolve `''`.
- `ultimaSessaoTexto(sessions, agora)`: para a concluída mais recente (por `endedAt`, ou `createdAt` sem ele), devolve `'Última sessão: Nome · nota 7,5 · há 3 dias'`. Sem nota, a parte da nota sai. Sem sessão concluída, devolve `''`. A nota usa vírgula decimal.

- [ ] **Passo 1: testes em `tests/inicio.test.js`:**
  - `inicioCharutos: estoque, acervo, busca sem acento e ordem`. Charutos: A (estoque, order 2), B (cesta, order 1), C (`'estoque,cesta'`, order 3) e D (sem status).
    - Estoque dá `[A, C]`.
    - Acervo dá `[B, A, C, D]`.
    - A busca `'partagas'` acha "Partagás D4".
    - O `meta` de `{origin:'Cuba', strength:4, vitola:'124 x 50'}` é `'Cuba · força 4/5 · 124 x 50'`; sem origem, `'força 4/5 · 124 x 50'`.
  - `abaInicial`: estoque, acervo e avulso nos três casos.
  - `nivelProgresso`:
    - `{xp:28, name:'Iniciante', floor:0, next:[40,'Apreciador']}` dá `pct:70`, `faltam:12`, `proximo:'Apreciador'`;
    - `{xp:500, name:'Mestre', floor:450, next:null}` dá `max:true`, `pct:100`, `faltam:0`.
  - `quandoTexto`, com `agora` fixo em 2026-11-28 12:00:
    - mesmo dia dá `'hoje'`, a véspera dá `'ontem'`, 3 dias antes dá `'há 3 dias'`, 40 dias antes dá `'em 19/10'`;
    - `'x'` dá `''`.
  - `ultimaSessaoTexto`:
    - com duas concluídas e uma aberta, usa a concluída mais recente;
    - a nota 7,5 aparece com vírgula;
    - sem nota, não aparece "nota";
    - sem concluída, devolve `''`.
- [ ] **Passo 2: rodar e ver falhar.** `node tests/inicio.test.js` → FAIL, porque o bloco `@pure:inicio` não existe.
- [ ] **Passo 3: implementar o bloco `@pure:inicio`.**
- [ ] **Passo 4: rodar e ver passar.** `node tests/inicio.test.js` sem falhas, e as suítes de antes também.
- [ ] **Passo 5: commit** `feat: funções puras da nova Início`.

### Task 2: iniciar sessão pela folha

**Arquivos:**
- Modificar: `index.html`:
  - a nova `iniciarSessao` perto de `newSession`;
  - o `case 'start'` passa a usar `iniciarSessao`;
  - `newSession` usa `state.proximaMissao`;
  - a folha "Iniciar sessão", com os `case` `inicio-abrir`, `inicio-fechar`, `inicio-aba`, `inicio-escolher`, `inicio-momento` e `inicio-comecar`, os ouvintes de busca e de avulso, a tecla Esc e o foco;
  - o CSS da folha.
- Testes: `tests/app.test.js` (extrair `iniciarSessao`, `newSession`, `pickMission`, `lastMoment` e `done`, ou usar dublês para eles) e `tests/ui-inicio.js` (novo).

**Interfaces:**
- `iniciarSessao(c, opts)`: devolve a sessão ou `null`.
  - Com `openSession()`, mostra o aviso de hoje e devolve `null`.
  - Sem sessão aberta, cria `s=newSession(c)` e, com `opts.moment`, grava `s.moment`.
  - Depois chama `sessionSaver(s)` (que antes chamava `put('sessions',s)`) e `enterSession(s)`, e devolve `s`.
- `newSession(c)`: `mission: c.id ? (state.proximaMissao || pickMission()) : ''`; depois de usar, `state.proximaMissao = null`.
- **Estado só na memória:** `state.inicioFolha` (true ou false), `state.inicioAba`, `state.inicioEscolha` (id), `state.inicioBusca`, `state.inicioAvulso` e `state.inicioMomento`. A folha é desenhada em `#inicio-folha`, fora do `#app`, para o `render()` da Início não a apagar enquanto está aberta. Ela tem seu próprio desenho, `folhaInicioHtml()`.
- **Foco:** ao abrir, vai para a primeira aba da folha. Ao fechar, volta para `[data-act="inicio-abrir"]`.

- [ ] **Passo 1: testes.**
  - Em `app.test.js`:
    - `iniciarSessao grava pelo sessionSaver e entra na sessão`: com um dublê de `enterSession` e `sessionSaver` contando, a sessão tem o momento pedido;
    - `iniciarSessao usa a missão já mostrada`: com `state.proximaMissao='flor'`, a sessão vem com `mission:'flor'` e `state.proximaMissao` fica nulo;
    - `com sessão aberta, iniciarSessao avisa e não cria`.
  - Em `ui-inicio.js`:
    - preparação no formato do `ui-sabores`: gravador falso, estado guardado e restaurado, charutos falsos só na memória com `syncedAt=updatedAt`;
    - `Iniciar sessão abre a folha com o foco na primeira aba`: `#inicio-folha [role=dialog]`;
    - `a aba Estoque lista só o estoque`;
    - `a busca do Acervo ignora acento`;
    - `Começar fica desativado até escolher`;
    - `o avulso libera Começar com o nome`;
    - `Esc fecha e devolve o foco ao botão`;
    - `Começar abre a sessão pelo gravador falso, com o momento escolhido`: `state.view==='session'`, `draft.moment` certo e gravador chamado;
    - `com sessão aberta, Começar avisa e não troca a sessão`;
    - `alvos de 44 px na folha` (o botão principal com 56).
- [ ] **Passo 2: rodar e ver falhar.** `node tests/app.test.js` e `ui-inicio` a 360 px: FAIL nos novos.
- [ ] **Passo 3: implementar.**
- [ ] **Passo 4: rodar e ver passar.** Node com 0 falhas; `ui-inicio` sem FAIL; `ui-sabores`, `ui-guia`, `ui-curadoria`, `ui-clube` e `ui-cesta` sem FAIL.
- [ ] **Passo 5: commit** `feat: iniciar sessão pela folha da Início`.

### Task 3: herói, Clube e Seu diário

**Arquivos:**
- Modificar: `index.html`:
  - `viewInicio`, com herói, Clube, Guia (a Task 4 troca o guia) e Seu diário;
  - `viewHome`, para não mostrar o cartão de sessão em andamento de cima na Início, e o `.banner` compacto;
  - `welcomeHtml` passa para dentro do herói, ainda com a classe `gwelcome`;
  - `avisoBanner` passa para dentro do Clube;
  - o relógio do herói (`inicioTick`, que só corre com `state.tab==='inicio'`, `state.view==='home'` e a página visível);
  - a contagem de membros (`cloud.membros`, junto do `loadFeed`);
  - a carga do feed pela Início, quando tem mais de 5 minutos;
  - o `case 'inicio-encerrar'`, que entra na sessão e põe `state.step=3`;
  - o CSS.
- Testes: `tests/ui-inicio.js`.

**Interfaces:**
- **Herói, por `heroiHtml()`:** sem sessão; com sessão (`openSession()`), com relógio em `#heroi-relogio`; com o diário vazio.
- **Clube, por `clubeInicioHtml()`:** membro ativo, sem login, suspenso; sem `cloud.configured`, devolve `''`.
- **Seu diário, por `diarioInicioHtml()`:** usa `nivelProgresso(journey())` e `state.proximaMissao`. Se a missão ainda não foi sorteada e há sessões concluídas, ela é sorteada na hora (`pickMission()`).

- [ ] **Passo 1: testes em `ui-inicio.js`.**
  - `herói sem sessão: Iniciar sessão com 56 px, sugestão e última sessão`.
  - `tocar na sugestão abre a folha com o charuto escolhido`.
  - `herói com sessão aberta: relógio, Retomar e Encerrar, e sem o cartão de cima`: sessão falsa aberta só na memória.
  - `o relógio corre na Início e para fora dela`: o texto de `#heroi-relogio` muda em 1,2 s; depois de ir ao Acervo, `inicioTick` fica parado (sem intervalo), conferido por um gancho `__t.inicioTick()`.
  - `Encerrar entra na sessão no Fechamento`.
  - `diário vazio: a linha de boas-vindas fica dentro do herói e a folha abre no Avulso`.
  - `clube como membro: mensagens com selo, aviso, membros e 2 degustações com Brindar`: cliente falso do `ui-clube` e `cloud.feed` falso.
  - `membro sem feed e sem contagem: mensagem de vazio e sem linha de membros`.
  - `sem login: cartão de convite com Entrar com convite`.
  - `suspenso: a linha de suspensão`.
  - `clube não configurado: sem a seção`.
  - `Seu diário: barra, faltam N pontos, conquistas e missão`.
  - `Início sem rolagem horizontal a 360 px`.
- [ ] **Passo 2: rodar e ver falhar.**
- [ ] **Passo 3: implementar.**
- [ ] **Passo 4: rodar e ver passar.** `ui-inicio` e os outros cinco `ui-*.js` a 360 px sem FAIL. Ajustar o `ui-guia.js` onde ele contava com o aviso no topo ou com o cartão de cima, se for o caso. Cada ajuste de teste é registrado como Ruling.
- [ ] **Passo 5: commit** `feat: herói, Clube e Seu diário na Início`.

### Task 4: Guia de bolso ilustrado em grade

**Arquivos:**
- Modificar: `index.html`:
  - `GUIDE_ILLS`, no `@pure:guia`, com as 7 ilustrações do protótipo e o mesmo SVG (classes `f`, `s` e `k` e o CSS `.ill`);
  - o guia de `viewInicio`, com a dica do dia e a grade;
  - o cabeçalho do detalhe em `viewGuia`, com a ilustração de 72 px;
  - saem o carrossel (`.gcar`, `.gdots`, `syncGcar`, `state.gcarX` e o ouvinte de rolagem) e o CSS dele.
- Testes: `tests/guia.test.js` e `tests/ui-guia.js`.

**Interfaces:**
- `GUIDE_ILLS[i]`: um SVG com `class="ill"`, `viewBox="0 0 64 64"` e `aria-hidden="true"`, na ordem do `GUIDE`.
- O cartão da dica do dia e os da grade continuam `button.gcard[data-act="guia"][data-id]`. O primeiro tem a classe `today`.

- [ ] **Passo 1: testes.**
  - Em `guia.test.js`: `GUIDE_ILLS tem 7 ilustrações SVG decorativas, uma por tópico` (7 itens com `viewBox="0 0 64 64"` e `aria-hidden="true"`).
  - Em `ui-guia.js`, a troca do carrossel pela grade:
    - `a Início mostra 7 cartões do guia` (era "carrossel tem 7 cartões");
    - `a dica do dia vem primeiro e em destaque` (`.gcard.today` primeiro);
    - `3 cartões têm o selo Ferramenta`;
    - `a grade tem 2 colunas` (os dois primeiros cartões da grade na mesma linha, `top` igual).
  - Saem as verificações dos pontos e da posição do carrossel.
- [ ] **Passo 2: rodar e ver falhar.**
- [ ] **Passo 3: implementar.**
- [ ] **Passo 4: rodar e ver passar.** Node com `guia` e o resto sem falha; `ui-guia` e `ui-inicio` sem FAIL.
- [ ] **Passo 5: commit** `feat: Guia de bolso ilustrado em grade`.

### Task 5: Brindar, versão 2.13.0 e documentação

**Arquivos:**
- Modificar: `index.html`:
  - `CHEERS_ICON` no lugar do `HEART_ICON` no feed, na degustação e na Início;
  - os textos de curtir, em `TERMS_HTML`, `postCard`, na degustação e na ajuda do clube;
  - a versão.
- Modificar também: `CLAUDE.md`.
- Testes: `tests/ui-clube.js` e `tests/ui-inicio.js`.

- [ ] **Passo 1: testes.**
  - Em `ui-clube.js` ou `ui-inicio.js`: `no feed e na Início, o botão diz Brindar e o rótulo acessível diz Brindar ou Remover brinde`;
  - `nenhum "curtir" ou "curtida" sobra no app`: `document.body.textContent` e os `aria-label`, com o clube falso aberto.
- [ ] **Passo 2: rodar e ver falhar.**
- [ ] **Passo 3: implementar.** Também: `APP_VERSION='2.13.0'` e o `APP_BUILD` conferido. No `CLAUDE.md`: a versão, a Início nova, `iniciarSessao` e `sessionSaver`, `@pure:inicio`, `GUIDE_ILLS`, Brindar e os testes novos.
- [ ] **Passo 4: verificação final.**
  - Em Node: `inicio`, `sabores`, `guia`, `curadoria`, `clube`, `cesta`, `app` e o SQL da fase 2, todos com 0 falhas.
  - No navegador: os seis `ui-*.js` a 360 e 390 px, nos temas escuro e claro, com 0 FAIL e o console limpo.
  - À mão, no navegador de teste sem login: iniciar pela folha, encerrar pelo herói e apagar os dados de teste.
- [ ] **Passo 5: commit** `feat: 2.13.0 com a nova Início`.
