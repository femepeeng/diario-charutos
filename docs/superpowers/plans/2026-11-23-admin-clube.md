# Administração do clube e conversa com os inscritos: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Na aba Conta, dar ao administrador o controle dos inscritos (lista, suspensão, papel de administrador e convites) e uma conversa com cada um, mais avisos para todos. O inscrito ganha a conversa com a administração e os avisos.

**Architecture:** A fase 2 do SQL acrescenta colunas ao perfil, as tabelas `messages` e `announcements` e funções `security definer` que checam quem chama. Toda permissão fica no banco. O app ganha uma camada `clubApi` (uma função por chamada ao banco, trocável por uma falsa nos testes), atualiza ao abrir e ao voltar para o app, e desenha os painéis na Conta a partir de `cloud.me` e `cloud.club`.

**Tech Stack:** Postgres/Supabase (RLS, funções plpgsql), supabase-js 2 já vendorizado, JavaScript ES5 em `index.html`, Node para testes puros, PGlite 0.3.0 para testar o SQL, navegador do app para os testes de interface.

**Spec:** `docs/superpowers/specs/2026-11-23-admin-clube-design.md`

## Global Constraints

- Arquivo único `index.html`, JavaScript ES5 (sem arrow function nem template string), render por `innerHTML`, eventos delegados por `data-act`.
- Toda permissão garantida no banco, por RLS e por funções `security definer set search_path = public` que checam `auth.uid()`. Execução só para `authenticated`; `anon` não executa nem lê nada novo.
- SQL idempotente, aplicado pelo Felipe no SQL Editor do Supabase. Fica em `supabase/`, que o `.gitignore` já exclui. Nada desse SQL vai para o GitHub.
- Compatível com o app 2.8.0: membros continuam lendo `id`, `display_name` e `is_admin` dos perfis. Os embeds `profiles(display_name)` e `profiles!sessions_owner_id_fkey(display_name)` continuam funcionando.
- Nenhuma chave `secret` ou `service_role` no app.
- Mensagem e aviso: de 1 a 1000 caracteres, só texto, sempre escapado com `esc()`, quebras de linha preservadas (`white-space: pre-wrap`), sem links clicáveis.
- O último acesso é registrado pela `club_me()`, no máximo a cada 10 minutos.
- Atualização automática no máximo uma vez por minuto ao voltar para o app. É forçada ao abrir a Conta, depois de cada ação e no botão Atualizar.
- Mobile-first, 360 a 390 px, sem rolagem horizontal, alvos de 44 px, temas escuro e claro pelos tokens, sem emoji como ícone.
- Versão 2.9.0, build 23/11/2026.
- Os testes de interface não gravam dados reais: usam um `clubApi` falso em memória e um cliente Supabase falso, e restauram `cloud`, `state` e o localStorage `clube-owner` no fim.

## Review Focus

1. **Privilégios padrão do Supabase.** O Supabase dá `all` em tabela nova para `anon` e `authenticated`, por privilégio padrão. A fase 2 precisa revogar isso explicitamente em `messages` e `announcements`. O teste da Task 1 reproduz esse privilégio padrão antes de aplicar o SQL.
2. **App antes do SQL.** Com a 2.9.0 no ar e a fase 2 ainda não aplicada, a `club_me` não existe (erro `PGRST202`). Os painéis novos devem sumir sem toast em loop, e o administrador deve ver o aviso de que falta o SQL. Testado na Task 3 (inscrito) e na Task 4 (administrador).
3. **Suspenso no app novo.** O app não tenta sincronizar (`canSync()` falso), o Clube explica a suspensão e a conversa segue funcionando. Testado na Task 3.
4. **Redesenho no meio da digitação.** Quando a sincronização muda de status, o texto em digitação e o foco precisam continuar no campo de mensagem e no de aviso. Testado na Task 3.
5. **Envio duplicado e envio sem internet.** Dois toques em Enviar mandam uma vez só. Um envio que falha mantém o texto e mostra o aviso. Testado na Task 3.

---

### Task 1: Banco: fase 2 do SQL, testada no PGlite

**Files:**
- Copy: `C:\Users\femep\Documents\ClaudeDesing\diario-charutos\diario-charutos\supabase\supabase-clube.sql` → `supabase/supabase-clube.sql` (sem mudança; é a fase 1)
- Create: `supabase/supabase-clube-fase2.sql`
- Create: `supabase/package.json` (só a dependência `@electric-sql/pglite` 0.3.0)
- Test: `supabase/tests/fase2.test.mjs`

**Interfaces:**
- Produces, no banco:
  - `profiles` + colunas `invite_code text`, `suspended_at timestamptz`, `last_seen_at timestamptz`, `msgs_read_at timestamptz`, `avisos_read_at timestamptz`, `admin_read_at timestamptz`.
  - `authenticated` só lê, de `profiles`, as colunas `id, display_name, is_admin, created_at`. O `update (display_name)` continua.
  - `messages(id uuid, member_id uuid → profiles on delete cascade, author_id uuid → profiles on delete set null, from_admin boolean, body text 1..1000, created_at timestamptz)`. Índice em `(member_id, created_at desc)`. Política de leitura: `member_id = auth.uid() or is_admin()`. Ninguém escreve direto.
  - `announcements(id uuid, author_id uuid → profiles on delete set null, body text 1..1000, created_at timestamptz)`. Leitura: `is_member()`. Inserir: `is_admin() and author_id = auth.uid()`. Apagar: `is_admin()`.
  - `is_member()`: perfil existe e `suspended_at is null`.
  - `is_admin()`: o mesmo, mais `is_admin`.
  - `is_active(p_id uuid)`: o perfil existe e não está suspenso. Usada nas políticas, porque as políticas rodam com as permissões de quem consulta e não leem `suspended_at`.
  - `can_see_session(p_uid uuid)` e a política `sessions_club_read` passam a exigir `is_active(owner_id)` para sessões de outros.
  - `join_club(p_code text, p_name text, p_adult boolean, p_terms boolean)`: mesma assinatura, grava `invite_code`.
  - `club_me() returns json`. Devolve `{is_admin, suspended, unread_msgs, aviso: {id, body, created_at} | null}`, ou `null` para quem tem login e não tem perfil. Para inscrito, `unread_msgs` conta mensagens `from_admin` depois de `msgs_read_at`. Para administrador, conta mensagens de inscritos depois do `admin_read_at` de cada um. `aviso` é o mais recente depois de `avisos_read_at`, e vem `null` para suspenso. Atualiza `last_seen_at` se estiver nulo ou tiver mais de 10 minutos.
  - `send_message(p_member uuid, p_body text) returns uuid`. Faz trim no texto. O inscrito que não é administrador escreve com `p_member = auth.uid()`, mesmo suspenso, e isso avança o `msgs_read_at` dele. O administrador escreve com `p_member <> auth.uid()`, o que avança o `admin_read_at` daquele inscrito. Erros: `invalid_body`, `not_allowed`, `no_member`.
  - `mark_read(p_member uuid) returns void`: o próprio inscrito avança `msgs_read_at`; o administrador avança `admin_read_at`. Erro: `not_allowed`.
  - `mark_avisos_read() returns void`.
  - `admin_members() returns table(id uuid, display_name text, is_admin boolean, created_at timestamptz, invite_code text, suspended_at timestamptz, last_seen_at timestamptz, shared_sessions int, last_msg_at timestamptz, unread int)`, ordenada por `created_at`. Erro: `not_admin`.
  - `admin_set_suspended(p_member uuid, p_suspend boolean) returns void`. Erros: `not_admin`, `not_self`, `is_admin`, `no_member`.
  - `admin_set_admin(p_member uuid, p_admin boolean) returns void`. Erros: `not_admin`, `not_self`, `suspended`, `no_member`.
  - `admin_set_invite(p_code text, p_active boolean) returns void`. Erros: `not_admin`, `admin_invite` (reativar convite que dá papel de administrador), `no_invite`.

- [ ] **Step 1: Preparar a pasta `supabase/`.** Copie a fase 1. Rode `npm init -y` e `npm install @electric-sql/pglite@0.3.0 --no-audit --no-fund` dentro de `supabase/`.
  Run: `git -C . status --short supabase`
  Expected: nenhuma linha. A pasta inteira é ignorada.

- [ ] **Step 2: Escrever o teste `supabase/tests/fase2.test.mjs`.**
  - **Base simulada:** papéis `anon`, `authenticated` e `service_role`; `auth.users` e `auth.uid()` lendo `request.jwt.claim.sub`; `storage.buckets`, `storage.objects` e `storage.foldername`, como no spike.
  - **Privilégio padrão do Supabase:** `alter default privileges in schema public grant all on tables to anon, authenticated`.
  - **Ordem:** aplica a fase 1, a fase 2, e as duas de novo.
  - **Dados de teste:**
    - Administrador A, que entrou por um convite de fundador `F-TESTE` criado no teste.
    - Membros M e N, que entraram pelo convite `INV1`.
    - Usuário U, com login e sem perfil.
    - Para M e N: uma sessão concluída visível ao clube e uma sessão "Só eu".
  - **Helper `as(uid)`:** faz `set role authenticated` e grava o `sub`. `asAnon()` e `asRoot()` também.
  - **Casos e asserções:**
  1. `fase 1 + fase 2 aplicam duas vezes sem erro`.
  2. `anon não lê messages, announcements nem profiles`: cada `select` dá "permission denied".
  3. `membro lê id, nome, papel e data de entrada dos perfis`: devolve 3 linhas.
  4. `membro não lê as colunas novas do perfil`: `select suspended_at`, `last_seen_at` e `invite_code` dão "permission denied".
  5. `membro não altera colunas de controle`: `update profiles set is_admin = true` e `set suspended_at = null`, no próprio perfil, dão "permission denied".
  6. `tabelas novas não herdam o grant padrão do Supabase`: como M, `insert into messages` e `update announcements` dão "permission denied".
  7. `join_club grava o convite usado`: `invite_code` de M = `'INV1'`.
  8. `club_me de quem não é membro devolve null`: como U.
  9. `club_me registra o último acesso no máximo a cada 10 min`:
     - A primeira chamada preenche `last_seen_at`.
     - Com o valor posto em `now() - 5 min`, o valor não muda.
     - Com o valor posto em `now() - 11 min`, passa a ficar perto de `now()`.
  10. `inscrito escreve na própria conversa`: `send_message(M, '  Oi  ')` grava `body = 'Oi'`, `from_admin = false` e `author_id = M`.
  11. `inscrito não escreve na conversa de outro`: M em `send_message(N, 'x')` dá `not_allowed`.
  12. `texto vazio ou acima de 1000 caracteres é recusado`: `'   '` e `'a'.repeat(1001)` dão `invalid_body`.
  13. `inscrito só lê a própria conversa`: como M, todas as linhas de `messages` têm `member_id = M`.
  14. `administrador vê não lidas por inscrito e no total`: depois de 2 mensagens de M, a linha de M em `admin_members()` tem `unread = 2` e a `club_me()` de A tem `unread_msgs = 2`.
  15. `resposta do administrador conta como não lida para o inscrito`:
      - A envia `send_message(M, 'Resposta')`, gravada com `from_admin = true`.
      - A `club_me()` de M passa a `unread_msgs = 1`.
      - A linha de M em `admin_members()` volta a `unread = 0`.
  16. `mark_read zera as não lidas de cada lado`:
      - M faz `mark_read(M)` e a `club_me()` dele vai a 0.
      - M envia de novo e o lado de A vai a 1.
      - A faz `mark_read(M)` e o lado dele vai a 0.
  17. `membro não lista inscritos`: M em `admin_members()` dá `not_admin`.
  18. `aviso: administrador publica, membro vê e dispensa`:
      - A insere um aviso.
      - M o lê, e a `club_me()` de M traz `aviso.body` com o texto.
      - Depois de `mark_avisos_read()`, `aviso` vem `null`.
  19. `membro não publica nem apaga aviso`: o insert de M dá violação de RLS, e o delete de M deixa a contagem igual.
  20. `suspender tira o acesso, guarda os dados e mantém a conversa`. A faz `admin_set_suspended(M, true)`. Como M:
      - `is_member()` dá false.
      - As sessões do clube de N somem (0 linhas).
      - `insert into cigars` dá violação de RLS.
      - `announcements` devolve 0 linhas.
      - A `club_me()` traz `suspended = true` e `aviso = null`.
      - `send_message(M, 'ajuda')` funciona.
      - Como superusuário, as sessões e charutos de M continuam lá.
  21. `sessões de suspenso somem do feed`: como N, a sessão do clube de M não aparece, e `can_see_session` dela é false.
  22. `reativar devolve o acesso`: depois de `admin_set_suspended(M, false)`, N volta a ver a sessão de M.
  23. `administrador não suspende a si nem outro administrador`:
      - `admin_set_suspended(A, true)` dá `not_self`.
      - Com N promovido, `admin_set_suspended(N, true)` dá `is_admin`.
  24. `papel de administrador: não muda o próprio e não promove suspenso`:
      - `admin_set_admin(A, false)` dá `not_self`.
      - Com M suspenso, `admin_set_admin(M, true)` dá `suspended`.
  25. `promover dá acesso de administrador`: depois de `admin_set_admin(N, true)`, N consegue usar `admin_members()`.
  26. `convite desativado barra novos usos, e convite de fundador não reativa`:
      - `admin_set_invite('INV1', false)` faz um novo `join_club('INV1', ...)` dar `invalid_invite`.
      - `admin_set_invite('F-TESTE', true)` dá `admin_invite`.
  27. `excluir a conta apaga a conversa`: M faz `delete_my_account()` e, como superusuário, `messages` de M fica com 0 linhas.

- [ ] **Step 3: Rodar e ver falhar.**
  Run: `node supabase/tests/fase2.test.mjs`
  Expected: FAIL nos casos de 1 a 27, porque `supabase-clube-fase2.sql` não existe ou as funções não foram encontradas.

- [ ] **Step 4: Escrever `supabase/supabase-clube-fase2.sql`** com as interfaces acima.
  - Cabeçalho explicando que se cola depois da fase 1.
  - `alter table ... add column if not exists` para as colunas novas.
  - Nas tabelas novas: `revoke all ... from anon, authenticated` e depois só os grants listados.
  - `revoke select on profiles from authenticated` seguido de `grant select (id, display_name, is_admin, created_at)`.
  - `drop policy if exists` antes de cada `create policy`.
  - Nas funções novas: `revoke all on function ... from public, anon` e `grant execute ... to authenticated`.
  - Em `admin_members`, use `#variable_conflict use_column`.

- [ ] **Step 5: Rodar e ver passar.**
  Run: `node supabase/tests/fase2.test.mjs`
  Expected: `27 ok, 0 falha(s)`.

- [ ] **Step 6: Registrar.** Não há commit: a pasta `supabase/` é ignorada pelo Git. A linha da task no ledger registra o resultado do teste.

### Task 2: Funções puras do clube

**Files:**
- Modify: `index.html` (novo bloco `/* @pure:clube */ … /* @end:clube */`, depois do bloco da curadoria)
- Test: `tests/clube.test.js` (mesmo formato de `tests/curadoria.test.js`)

**Interfaces:**
- Produces:
  - `relTime(iso, now)`: `'agora'` abaixo de 60 s; `'há N min'` abaixo de 60 min; `'há N h'` abaixo de 24 h; `'ontem'` no dia anterior do calendário; `'há N dias'` até 6 dias; depois disso, `dd/mm/aaaa`. Nulo ou inválido dá `'—'`.
  - `cleanMsg(s)`: devolve `{ok, text, err}`. Troca `\r\n` por `\n`, junta três ou mais quebras em duas e faz trim. Vazio dá `err = 'Escreva a mensagem.'`; acima de 1000 caracteres dá `err = 'Use no máximo 1000 caracteres.'`.
  - `inboxOrder(members)`: novo array só com quem tem `last_msg_at`. Quem tem `unread > 0` vem primeiro; depois, `last_msg_at` do mais recente ao mais antigo; depois, `display_name`.
  - `inviteStatus(inv)`: devolve `{label, canOff}`.
    - Inativo: `'desativado'`.
    - `uses >= max_uses`: `'esgotado'`.
    - Ativo: `'ativo · U/M usos'`.
    - `grants_admin`: põe o prefixo `'fundador · '`.
    - `canOff` só é verdadeiro para convite ativo e não esgotado.
  - `missingSql(err)`: verdadeiro se `err.code === 'PGRST202'`, `err.code === '42883'` ou a mensagem bater com `/could not find the function/i`.
  - `clubErrMsg(err)`: mensagem em português para `not_admin`, `not_self`, `is_admin`, `suspended`, `no_member`, `not_allowed`, `invalid_body`, `admin_invite` e `no_invite`, procurada dentro de `err.message`. Qualquer outro erro dá `'Não foi possível concluir. Confira a internet e tente de novo.'`.
  - `memberMeta(m, now)`: `'Entrou em DD/MM/AAAA · <convite> · último acesso <relTime> · N sessões compartilhadas'`.
    - `<convite>`: `'convite de fundador'` se o código começa com `F-`; `'convite ABCDEF'` para os demais (os 6 primeiros caracteres); `'convite não registrado'` se nulo.
    - Último acesso nulo vira `'nunca'`. Para 1, use `'1 sessão compartilhada'`.

- [ ] **Step 1: Escrever `tests/clube.test.js`** com:
  - `relTime` (agora, 5 min, 3 h, ontem, 3 dias, data, nulo);
  - `cleanMsg` (trim, quebras, vazio, 1000 aceito, 1001 recusado);
  - `inboxOrder` (sem mensagem fica fora; não lida na frente; recência; nome);
  - `inviteStatus` (os quatro estados e `canOff`);
  - `missingSql` (os três formatos e um erro comum);
  - `clubErrMsg` (`not_self` e erro genérico);
  - `memberMeta` (fundador, convite comum, sem convite, nunca acessou, 1 sessão).
- [ ] **Step 2: Rodar e ver falhar.** Run: `node tests/clube.test.js`. Expected: FAIL, com "não encontrado no bloco @pure:clube".
- [ ] **Step 3: Implementar as funções no bloco `@pure:clube`.**
- [ ] **Step 4: Rodar e ver passar.** Run: `node tests/clube.test.js && node tests/curadoria.test.js && node tests/guia.test.js`. Expected: todos com 0 falha.
- [ ] **Step 5: Commit.** `git add index.html tests/clube.test.js` e `git commit -m "feat: funções puras do clube (datas, mensagens, convites, inscritos)"`.

### Task 3: Lado do inscrito: atualização, suspensão, conversa, avisos e sinais

**Files:**
- Modify: `index.html`
- Test: `tests/ui-clube.js` (seção "Inscrito")

**Interfaces:**
- Consumes: as funções da Task 1 (por `cloud.sb`) e as da Task 2.
- Produces:
  - `var clubApi = {me, members, invites, setInvite(code, active), setSuspended(id, on), setAdmin(id, on), thread(memberId), send(memberId, body), markRead(memberId), avisos, postAviso(body), deleteAviso(id), markAvisosRead}`. Cada método devolve uma promessa de `{data, error}`.
    - `thread` busca as 200 mensagens mais recentes do inscrito, em ordem de `created_at` decrescente, e o app inverte a ordem para mostrar.
    - `avisos` busca os 50 mais recentes.
  - `cloud.me` (`null` ou o retorno da `club_me`), `cloud.clubMissing` e `cloud.club = {thread:[], avisos:[], members:[], invites:[], sec:'inscritos', open:null, at:0, sending:false, drafts:{}}`.
  - `refreshClub(force)`: devolve uma promessa.
    - Sem `force`, não roda se `Date.now() - cloud.club.at < 60000`.
    - Chama `me()`. Erro de `missingSql` liga `cloud.clubMissing` e para ali, sem toast.
    - Com a aba Conta aberta e o usuário não sendo administrador, carrega `thread(self)` e, se não estiver suspenso, `avisos()`.
    - Depois chama `markRead(self)` se `unread_msgs > 0`. Termina com `rerender()`.
  - Ganchos:
    - Depois do `loadProfile` de um membro: `refreshClub(true)`.
    - No `visibilitychange` para visível, se for membro: `refreshClub()`.
    - Ao tocar na aba Conta: `refreshClub(true)`.
  - `canSync()` também exige `!(cloud.me && cloud.me.suspended)`.
  - Suspenso:
    - O Clube mostra "Sua participação no clube está suspensa…" no lugar do feed.
    - A Conta mostra o mesmo alerta acima da conversa.
  - Painel "Mensagens" do inscrito, só para quem não é administrador:
    - A conversa: as mensagens do inscrito à direita; as da administração com o rótulo "Administração"; a data em `relTime`.
    - Uma `textarea` `id="msg-body"` com `data-cin="msg"` e `maxlength="1000"`, e o botão `data-act="msgsend"`.
    - A lista de avisos, se não estiver suspenso.
  - Faixa no Início (`avisoBanner()`): aparece quando `cloud.me.aviso` existe e a pessoa não está suspensa.
    - Mostra os 160 primeiros caracteres.
    - "Ver" (`data-act="avisover"`) abre a Conta e marca o aviso como lido.
    - "Dispensar" (`data-act="avisook"`) só marca como lido.
  - Ponto na aba Conta: aparece quando `cloud.me.unread_msgs > 0`.
    - É um `span` decorativo com `aria-hidden`.
    - O botão ganha `aria-label="Conta, nova mensagem"`.
    - O `innerText` continua sendo "Conta".
  - O rascunho é guardado em `cloud.club.drafts` no evento `input`.
  - A restauração de foco do `render()` (hoje só para `cat-q`) passa a valer para `cat-q`, `msg-body` e `aviso-body`.
  - Ganchos de teste:
    - `__t.cloud`.
    - `__t.setClubApi(obj)`, que devolve o `clubApi` anterior.
    - `__t.refreshClub`.
    - `__t.canSync`.

- [ ] **Step 1: Escrever a seção "Inscrito" de `tests/ui-clube.js`.**
  - **Preparação:**
    - Guarda `cloud.sb`, `user`, `profile`, `profileChecked`, `me`, `clubMissing`, `club`, `state.tab`, `state.view` e o localStorage `clube-owner`.
    - Põe um cliente falso: um `Proxy` em que qualquer cadeia de métodos termina em `{data:[], error:null}`.
    - Usuário M não administrador.
    - `clubApi` falso, que registra as chamadas. `me` devolve `{is_admin:false, suspended:false, unread_msgs:1, aviso:{id:'a1', body:'Nova versão no ar', created_at}}`. `thread` devolve 2 mensagens, uma do inscrito e uma da administração; a da administração tem o texto `'<b>x</b> https://loja.com'`.
  - **Asserções:**
  1. A aba Conta tem o `aria-label` com "nova mensagem", e o `innerText` dela continua "Conta".
  2. O Início mostra a faixa com "Nova versão no ar". "Dispensar" chama `markAvisosRead` uma vez e a faixa some.
  3. A Conta mostra "Mensagens", com as 2 mensagens e o rótulo "Administração". Abrir chama `markRead('M')`.
  4. O texto `<b>x</b>` aparece como texto: não há `b` nem `a` dentro da mensagem.
  5. Enviar `'  Olá  '` chama `send('M', 'Olá')` uma vez, limpa o campo e chama `thread` de novo.
  6. Dois cliques seguidos em Enviar, com um `send` lento (300 ms), fazem uma chamada só.
  7. Com o `send` devolvendo erro, o toast aparece e o texto continua no campo.
  8. Com o campo vazio, aparece o toast "Escreva a mensagem." e não há chamada.
  9. Um `__t.rerender()` no meio da digitação mantém o foco, o texto e o cursor em `msg-body`.
  10. Suspenso (`me.suspended = true`, `aviso = null`):
      - a Conta mostra "suspensa" e a conversa, e não mostra os avisos;
      - a aba Clube mostra "suspensa";
      - `__t.canSync()` é falso.
  11. SQL ausente (`me()` devolve `{error:{code:'PGRST202'}}`): não aparece o painel "Mensagens", não há faixa nem toast, e `cloud.clubMissing` fica verdadeiro.
  12. Os botões da conversa e da faixa têm 44 px, e não há rolagem horizontal.
  - **Restauração** de tudo no fim.
- [ ] **Step 2: Rodar e ver falhar.** No navegador do app: `eval(await (await fetch('/tests/ui-clube.js?' + Date.now())).text())`. Expected: FAIL a partir da 1.
- [ ] **Step 3: Implementar** o que está em Produces.
- [ ] **Step 4: Rodar e ver passar.** Expected: `ok: true`, e também `tests/ui-guia.js` e `tests/ui-curadoria.js` com `ok: true`.
- [ ] **Step 5: Commit.** `git add index.html tests/ui-clube.js` e `git commit -m "feat: conversa com a administração, avisos e suspensão no lado do inscrito"`.

### Task 4: Painel de administração na Conta

**Files:**
- Modify: `index.html`
- Test: `tests/ui-clube.js` (seção "Administrador")

**Interfaces:**
- Consumes: `clubApi`, `cloud.me`, `cloud.club`, `refreshClub` (Task 3) e as funções puras (Task 2).
- Produces:
  - `refreshClub` para administrador, com a Conta aberta:
    - `members()` sempre;
    - `invites()` quando `sec === 'convites'`;
    - `avisos()` quando `sec === 'avisos'`;
    - `thread(open)` quando há conversa aberta, seguido de `markRead(open)` se aquele inscrito tem `unread > 0`.
  - `adminPanel()`. Título "Administração", botão "Atualizar" (`data-act="clubrefresh"`) e quatro botões de seção (`data-act="admsec"`, 44 px): "Inscritos N", "Mensagens" com o total de não lidas quando houver, "Avisos" e "Convites".
  - **Inscritos.** Um cartão por pessoa, com nome, as marcas "você", "administrador" e "suspenso", e a linha de `memberMeta`. Ações:
    - "Conversar" (`admopen`).
    - "Suspender" ou "Reativar" (`admsusp`). Escondido no próprio cartão e no de outros administradores, porque administrador não pode ser suspenso.
    - "Tornar administrador" ou "Tirar administrador" (`admadm`). Escondido no próprio cartão; "Tornar" também fica escondido para quem está suspenso.
    - Suspender, tornar administrador e apagar aviso pedem confirmação em linha (`state.confirm = 'susp:<id>'`, `'adm:<id>'` ou `'aviso:<id>'`). O botão de confirmar é `data-act="admconfirm"`, e o de desistir reaproveita `cancelconfirm`. A confirmação de administrador diz que ele "lê todas as conversas". Reativar e tirar administrador não pedem confirmação.
  - **Mensagens.** A caixa vem de `inboxOrder(cloud.club.members)`, com nome, contador de não lidas e `relTime` da última. Abrir (`admopen`) mostra "Conversa com <nome>", "Voltar" (`admclose`), a conversa e uma `textarea` `id="msg-body"` com o botão `msgsend` para aquele inscrito.
  - **Avisos.** Uma `textarea` `id="aviso-body"` com `data-cin="aviso"`, o botão "Publicar" (`avisopub`) e a lista com "Apagar" (`avisodel`, com confirmação).
  - **Convites.** O botão "Gerar link de convite" e o bloco copiar/enviar, que hoje ficam em "Convidar amigos". Depois, a lista com o código, o `inviteStatus().label`, a data e, se `canOff`, "Desativar" (`invoff`).
  - O painel "Convidar amigos" antigo só aparece quando `cloud.clubMissing`. Nesse caso, um alerta diz: "Falta aplicar a atualização do banco (supabase-clube-fase2.sql) no SQL Editor do Supabase."
  - Erros das ações viram toast com `clubErrMsg`. Toda ação bem-sucedida chama `refreshClub(true)`.
  - O administrador não vê o painel "Mensagens" do inscrito.

- [ ] **Step 1: Escrever a seção "Administrador" de `tests/ui-clube.js`.**
  - **Dados falsos:**
    - `me = {is_admin:true, suspended:false, unread_msgs:2, aviso:null}`.
    - `members`:
      - A (você, administrador);
      - M (2 não lidas, última mensagem há 1 h);
      - N (suspenso);
      - P (sem mensagens, nunca acessou).
    - `invites`:
      - `F-X` com `grants_admin`, 1/1;
      - `INV1`, ativo, 3/10;
      - `INV2`, inativo.
  - **Asserções:**
  1. Aparecem "Administração" e as quatro seções com 44 px. "Inscritos" mostra 4 e "Mensagens" mostra 2.
  2. Inscritos:
     - há 4 cartões;
     - o de A tem "você" e nenhuma ação;
     - o de N tem "suspenso" e "Reativar";
     - o de P tem "nunca".
  3. Em M, "Suspender" mostra a confirmação. Confirmar chama `setSuspended('M', true)` uma vez e depois `members()`.
  4. Em P, "Tornar administrador" mostra a confirmação com "lê todas as conversas". Confirmar chama `setAdmin('P', true)`.
  5. Mensagens:
     - a caixa tem M e não tem P;
     - abrir M mostra a conversa e chama `markRead('M')`;
     - responder chama `send('M', texto)`;
     - "Voltar" fecha a conversa.
  6. Avisos:
     - publicar chama `postAviso(texto)`;
     - "Apagar" pede confirmação e depois chama `deleteAviso(id)`.
  7. Convites:
     - mostra "fundador · esgotado", "ativo · 3/10 usos" e "desativado";
     - "Desativar" só aparece em `INV1` e chama `setInvite('INV1', false)`;
     - "Gerar link de convite" está presente.
  8. Um erro em `setSuspended` (`{message:'not_self'}`) vira o toast de `clubErrMsg`.
  9. Com o SQL ausente, para o administrador:
     - aparece o alerta "Falta aplicar a atualização do banco";
     - "Convidar amigos" continua;
     - "Administração" não aparece.
  10. O administrador não vê o painel "Mensagens" do inscrito.
  11. Não há rolagem horizontal a 360 px.
- [ ] **Step 2: Rodar e ver falhar.** Expected: FAIL a partir da 1 da seção "Administrador". A seção "Inscrito" continua passando.
- [ ] **Step 3: Implementar** o que está em Produces.
- [ ] **Step 4: Rodar e ver passar.** Expected: `tests/ui-clube.js`, `tests/ui-guia.js` e `tests/ui-curadoria.js` com `ok: true`.
- [ ] **Step 5: Commit.** `git add index.html tests/ui-clube.js` e `git commit -m "feat: painel de administração do clube na Conta"`.

### Task 5: Regras do clube, versão, documentação e verificação final

**Files:**
- Modify: `index.html` (`TERMS_HTML`, `APP_VERSION`, `APP_BUILD`)
- Modify: `CLAUDE.md`

- [ ] **Step 1: Acrescentar a `TERMS_HTML`**, depois do parágrafo sobre o que é guardado, exatamente este texto: `<p>Pelo app, o administrador vê de cada membro: nome, data de entrada, convite usado, último acesso e quantas sessões foram compartilhadas com o clube. Ele não vê pelo app o seu e-mail nem as sessões marcadas como "Só eu". As mensagens trocadas com a administração e os avisos ficam guardados no clube até a exclusão da conta.</p>`. Teste: uma verificação em `tests/ui-clube.js` confere que as regras, abertas na tela de entrada, contêm "último acesso" e "até a exclusão da conta". Ela falha antes do texto e passa depois.
- [ ] **Step 2: `APP_VERSION='2.9.0'` e `APP_BUILD='23/11/2026'`.**
- [ ] **Step 3: Atualizar o `CLAUDE.md`:**
  - versão;
  - "Clube" em Funcionalidades: administração, mensagens, avisos e suspensão;
  - Arquivos: `supabase/supabase-clube-fase2.sql` e o teste no PGlite, com a ordem fase 1 → fase 2 e "SQL antes do app";
  - Testes: `node tests/clube.test.js`, `node supabase/tests/fase2.test.mjs` e `tests/ui-clube.js`;
  - Pendências: tempo real e push ficam para depois.
- [ ] **Step 4: Verificação final.**
  - Run: `node tests/guia.test.js && node tests/curadoria.test.js && node tests/clube.test.js && node supabase/tests/fase2.test.mjs`.
  - No navegador, a 360 e a 390 px, nos temas escuro e claro: `ui-guia`, `ui-curadoria` e `ui-clube`.
  - Expected: tudo com 0 falha e o console sem erros novos.
- [ ] **Step 5: Commit.** `git add index.html CLAUDE.md tests/ui-clube.js` e `git commit -m "feat: administração do clube e conversa com os inscritos (2.9.0)"`.
