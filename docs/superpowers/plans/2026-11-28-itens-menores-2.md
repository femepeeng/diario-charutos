# 2.12.1: itens menores da 2.11.1 e da 2.12.0 — plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: superpowers:executing-plans (execução escolhida: Nativo). Passos com caixas (`- [ ]`).

**Objetivo:** fechar os 12 itens menores adiados, sem recurso novo, sem SQL e sem mudar dados gravados.

**Arquitetura:** tudo em `index.html` (ES5, `innerHTML`, `data-act`). As regras novas ficam em funções puras quando dá (`notaIdx`, `normSabor`, `rodaCartao`, `rodaSvg`, no bloco `@pure:sabores`). O fim da sessão vira uma função com nome (`finishSaved`), para ser testada em Node com dublês. O resto se prova nos testes de interface.

**Tecnologia:** HTML, CSS e JS ES5 num arquivo; Node (`vm`, `assert`); navegador embutido (preview `diario`, porta 8765).

**Desenho:** `docs/superpowers/specs/2026-11-28-itens-menores-2-design.md`

## Restrições globais

- ES5 no app; `innerHTML`; `data-act`; `esc()` em todo texto.
- Alvos de 44 px; sem rolagem horizontal de 360 a 390 px; temas claro e escuro.
- Nenhum SQL, nenhum campo sincronizado e nenhum formato de backup mudam.
- Os testes de interface não gravam no diário e restauram o estado, inclusive `state.msgVisto`.
- Versão final: `APP_VERSION='2.12.1'`. O `APP_BUILD` recebe a data do dia, conferida com `date` e com o horário do último commit.

## Foco da revisão

1. **Administrador que lê só parte das conversas em outro aparelho, sem mensagem nova:** pela regra escolhida, a Conta abre uma vez em Mensagens. Isso precisa acontecer uma vez só, e não a cada toque. Teste na Task 1: depois do desvio, a próxima ida à Conta abre a última sub-aba.
2. **Toque em "Guardar no estoque" de outro pedido enquanto um grava:** a trava é global, então o segundo pedido também não pode gravar. O botão "Guardando…" aparece só no pedido que está gravando. Teste na Task 2: o HTML do outro pedido continua com "Guardar no estoque".
3. **Fim de sessão com a gravação pendurada (nem confirma, nem falha):** nenhum aviso de "salva" antes de a gravação confirmar. Teste na Task 2.
4. **Nota `null` e nota `""` no mesmo terço:** `notaIdx` acha a primeira, e um toque tira uma por vez. Teste na Task 3.
5. **Tirar o último chip pelo toque, num celular:** o foco vai para a roda, nunca para o campo de busca, que abriria o teclado. Teste na Task 3: o foco não fica em `#sabor-q`.

---

### Task 1: Conta e mensagens (itens 1, 2 e 4)

**Arquivos:**
- Modificar: `index.html`: `viewHome` (regra do `msgVisto`, l. 1628) e CSS da `.tdot` na `.minitabs` (l. 156-161).
- Testes: `tests/ui-clube.js` (parte do administrador, l. 288-307) e `tests/ui-guia.js` (backup e restauração da seção Navegação da Conta, l. 156 e 236).

**Interfaces:**
- Produz: em `viewHome`, `else if((state.msgVisto||0)>un)state.msgVisto=0;`. Com o Perfil aberto, continua `state.msgVisto=un`.
- CSS: `.minitabs button{position:relative}` e `.minitabs .tdot{position:absolute; top:7px; right:7px; margin:0}`.

- [ ] **Passo 1: testes em `ui-clube.js`,** logo depois de "não lidas caem e depois chega uma nova":
  - `lida em outro aparelho e chega uma nova sem o celular ver a queda: a Conta abre em Mensagens`.
    - Com `meA(2)`, `S.tab='conta'` e um render, o Perfil fica visto com 2. Depois, a sub-aba Cesta e `tab('inicio')`.
    - `meA(1)`, `refreshClub(true)` e render; o toque em Conta deve dar `S.tab==='conta'` e `C.club.sec==='mensagens'`.
  - `depois desse desvio, sem mensagem nova, a Conta abre a última sub-aba`: Cesta, depois Início, depois Conta dá `S.tab==='cesta'`.
  - `com o rótulo cortado, o ponto da sub-aba Perfil continua à vista`:
    - Com não lidas maiores que 0 e a Conta aberta, o botão `.minitabs [data-id="conta"]` fica com `flex:none; width:46px`.
    - O retângulo da `.tdot` precisa ter largura maior que 0 e caber inteiro no retângulo do botão. Depois, os estilos voltam.
- [ ] **Passo 2: teste em `ui-guia.js`:** `nb.visto = S.msgVisto` no backup e `S.msgVisto = nb.visto` na restauração.
- [ ] **Passo 3: rodar e ver falhar.**
  - `ui-clube` a 360 px. Esperado: FAIL na primeira verificação, em que a Conta abre a Cesta, e na do ponto, que fica fora do botão.
  - Antes de mudar o `ui-guia`: com `__t.state.msgVisto=7`, rodar a versão antiga e ver que volta 0. Com a versão nova, volta 7.
- [ ] **Passo 4: implementar** o que está em Interfaces.
- [ ] **Passo 5: rodar e ver passar.** `ui-clube` e `ui-guia` a 360 px, sem FAIL; `ui-guia` com `msgVisto=7` antes devolve 7.
- [ ] **Passo 6: commit** `fix: Conta volta a abrir em Mensagens quando a queda esconde mensagem nova; ponto do Perfil fora do corte`.

### Task 2: Cesta e fim de sessão (itens 3 e 5)

**Arquivos:**
- Modificar: `index.html`: `enviadosHtml` e `pedGuardar` (l. 1884-1903); o `case 'finish'` (l. 2253-2259), que passa a usar a função nova `finishSaved`.
- Testes: `tests/app.test.js`.
  - Carrega também `@pure:base`.
  - Extrai também `enviadosHtml`, `flush` e `finishSaved`.
  - Nos dublês: `var draft=null, saveTimer=null, sessionSaver=function(d){return put('sessions',d);};`.

**Interfaces:**
- Produz:
  - `finishSaved(wasDone: boolean): Promise<boolean>`: chama `flush()` e, só se o resultado não for `false`, mostra `wasDone ? 'Alterações salvas' : 'Sessão salva no diário'`.
  - `pedGuardar` chama `render()` logo depois de `state.pedGuardando=id`.
  - Em `enviadosHtml`, o pedido com `state.pedGuardando===p.id` mostra `<button class="btn primary" … disabled>Guardando…</button>`.

- [ ] **Passo 1: testes em `app.test.js`:**
  - `Guardar no estoque mostra Guardando… e desativa o botão enquanto grava`:
    - com o `putRec` pendente, logo depois de `pedGuardar('p1')`, `T.renders >= 1`;
    - no HTML do `p1`, `Guardando…` e `disabled`;
    - com um segundo pedido `p2`, o HTML dele continua com `Guardar no estoque`;
    - depois de confirmar as gravações, não há mais `Guardando…`.
  - `fim de sessão com a gravação falhando: fica o aviso de falha, sem "salva"`:
    - com `draft` e o `putRec` rejeitando, `await finishSaved(false)`;
    - `T.toasts` tem `Não foi possível salvar. Tente de novo.` e não tem `Sessão salva no diário`.
  - `fim de sessão com a gravação pendente: nada de "salva" antes de confirmar`: com o `putRec` pendente, `finishSaved(false)` e `flush()` (`setImmediate`) ainda não dão "salva".
  - `fim de sessão com a gravação certa`: `Sessão salva no diário`, ou, com `true`, `Alterações salvas`.
- [ ] **Passo 2: rodar e ver falhar.** `node tests/app.test.js`. Esperado: FAIL nos quatro, por `finishSaved` não encontrada e por faltar `Guardando…`.
- [ ] **Passo 3: implementar** o que está em Interfaces. O `case 'finish'` troca o `flush().then(function(){toast(...)})` por `finishSaved(wasDone)`.
- [ ] **Passo 4: rodar e ver passar.** `node tests/app.test.js` → `0 falha(s)`. O `ui-cesta` a 360 px fica sem FAIL.
- [ ] **Passo 5: commit** `fix: Guardar no estoque mostra Guardando…; "Sessão salva" só depois de gravar`.

### Task 3: roda de sabores (itens 6, 7, 8, 9, 10 e 12)

**Arquivos:**
- Modificar: `index.html`:
  - no bloco `@pure:sabores`: `normSabor`, `rodaCartao` (texto de "Fora da roda") e `rodaSvg` (`hub-back`), mais a nova `notaIdx`;
  - no bloco `@pure:curadoria`: o regex de `normName`;
  - o CSS `.roda-svg .hub-back`;
  - `render()` na parte da sessão: `rodaAnim` e o ajuste quando as fontes carregam;
  - em `viewSession`, sai `state.rodaAnim=''`;
  - o `case 'note'` passa a usar `notaIdx`; o `case 'roda-fam'` cuida do foco;
  - `rodaFocoDepois`: sem chip, o foco vai para a roda.
- Testes: `tests/sabores.test.js`, `tests/curadoria.test.js` e `tests/ui-sabores.js`.

**Interfaces:**
- Produz:
  - `notaIdx(notas: any[], val: string): number`, o primeiro `i` com `String(notas[i]==null?'':notas[i])===String(val)`, ou -1;
  - `normSabor`, que também troca `\s+` por um espaço.
- Escrever os regex com o escape `̀-ͯ` por um script Node. O Edit transforma os escapes em caracteres.

- [ ] **Passo 1: testes em Node.**
  - Em `sabores.test.js`:
    - `notaIdx acha a nota pelo texto`:
      - `notaIdx(['Cedro',5,null],'5')===1` e `notaIdx(['Cedro',5,null],'')===2`;
      - `notaIdx(['Cedro'],'Cedro')===0` e `notaIdx(['Cedro'],'Mel')===-1`;
      - `notaIdx([null,''],'')===0`.
    - `cartão Fora da roda com o texto novo`: contém `Nota de outra versão do app ou de um backup editado à mão.`
    - `busca junta espaços repetidos`: `buscaSabores('pimenta  do')[0]==='Pimenta-do-reino'`.
    - `VOLTAR com classe própria`: a roda aberta contém `class="hub-back"` e `‹ VOLTAR`.
    - `bloco sabores sem caracteres combinantes crus`: `!/[̀-ͯ]/.test(pick('sabores').join(''))`.
  - Em `curadoria.test.js`: `bloco curadoria sem caracteres combinantes crus`, com a mesma conferência.
- [ ] **Passo 2: testes em `ui-sabores.js`:**
  - `nota que não é texto sai pelo chip`: no 3º terço, `thirds[2].notes=[5]`; o toque no chip com `data-val="5"` deixa `[]`.
  - `tirar o último chip leva o foco à roda, e não à busca`:
    - num terço só com Cedro, `focus()` no chip e depois `.click()`;
    - `document.activeElement` fica dentro de `#roda` e não é `#sabor-q`.
  - `"Abrir na roda" com o foco passa o foco para a primeira nota`: com `focus()` e depois `.click()` no botão da missão, `activeElement` é `#roda [data-act="note"]` e a primeira nota.
  - `rodaFit roda de novo quando as fontes terminam de carregar`:
    - `Object.defineProperty(document,'fonts',{value:{status:'loading',ready:P},configurable:true})`;
    - depois de `__t.render()`, um rótulo vai para `style.fontSize='30px'`, e `P` resolve;
    - o tamanho do rótulo deixa de ser `30px`;
    - no fim, `delete document.fonts`.
  - `redesenhar sem abrir nem voltar não anima de novo`: depois de abrir uma família e de `__t.render()`, não há `.anim-in`.
  - Verificações reforçadas:
    - a busca passa a usar `canela`, com o cursor em 2;
    - `nenhum rótulo passa do espaço da fatia` mede a roda fechada e as 11 famílias abertas.
- [ ] **Passo 3: rodar e ver falhar.**
  - Node: FAIL nos 6 novos.
  - Interface a 360 px: FAIL em "não é texto", "foco à roda", "Abrir na roda com o foco" e "fontes".
  - Para as verificações reforçadas, sabotar `rodaFocoDepois`, tirando o `setSelectionRange`, e ver FAIL no cursor; depois, desfazer.
- [ ] **Passo 4: implementar** o que está em Interfaces e em Arquivos.
- [ ] **Passo 5: rodar e ver passar.**
  - Node: `sabores` e `curadoria` com `0 falha(s)`.
  - `ui-sabores` a 360 e 390 px, nos temas escuro e claro, sem FAIL.
- [ ] **Passo 6: commit** `fix: roda remove nota que não é texto, devolve o foco e reajusta rótulos com fonte tardia`.

### Task 4: CSS sem uso, versão 2.12.1 e documentação (item 11)

**Arquivos:**
- Modificar: `index.html`, onde saem o `.fam{…}` e o `.fam .lbl{…}` (l. 215-216) e entram `APP_VERSION` e `APP_BUILD`; e o `CLAUDE.md`.

- [ ] **Passo 1:** `grep -n 'class="fam' index.html` não acha nada. Apagar as duas regras.
- [ ] **Passo 2:** `APP_VERSION='2.12.1'`; `APP_BUILD` com a data de `date`, conferida com o horário do último commit.
- [ ] **Passo 3: `CLAUDE.md`.**
  - A versão.
  - A regra do `msgVisto`: quando as não lidas caem fora do Perfil, ele vai a 0.
  - A Cesta: "Guardando…".
  - O fim de sessão: `finishSaved`.
  - A roda: `notaIdx`, o ajuste com fonte tardia e o foco sem chip.
  - Os testes novos.
- [ ] **Passo 4: verificação final.**
  - Em Node: `sabores`, `guia`, `curadoria`, `clube`, `cesta`, `app` e `node supabase/tests/fase2.test.mjs`, todos com 0 falhas.
  - No navegador: os cinco `ui-*.js` a 360 e 390 px, nos temas escuro e claro, com 0 FAIL e o console limpo.
- [ ] **Passo 5: commit** `feat: 2.12.1 com os itens menores da 2.11.1 e da 2.12.0`.
