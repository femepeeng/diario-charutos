# 2.14.0: "Fumando agora" (etapa 2, com a fase 3 do SQL) — plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: superpowers:executing-plans (Nativo) ou superpowers:subagent-driven-development. Passos com caixas (`- [ ]`). Começa depois que a 2.13.0 estiver publicada.

**Objetivo:** membros escolhem, ao iniciar a sessão, se aparecem em "Fumando agora". O clube vê só o charuto, o nome e há quanto tempo, e pode brindar e comentar. Quem fuma vê o que recebe.

**Arquitetura:**
- **SQL:** a fase 3 acrescenta `live` e `live_at` (este por gatilho, na hora do servidor) a `sessions`, amplia `can_see_session` para a sessão ao vivo e cria a RPC `club_live()`, com colunas limitadas. A leitura direta das sessões em andamento continua fechada.
- **App:** sincroniza `live`; mostra a chave na folha, a faixa na sessão e a seção na Início. As consultas são periódicas e só acontecem com a tela visível.

**Tecnologia:** SQL do Postgres/Supabase com teste em PGlite (`supabase/tests`); HTML, CSS e JS ES5; Node; navegador embutido.

**Desenho:** `docs/superpowers/specs/2026-11-28-nova-inicio-design.md`, Etapa 2.

## Restrições globais

- O SQL vai para produção antes do app, com o OK do Felipe, pelo SQL Editor (colagem conferida por SHA-256), e é conferido depois. A pasta `supabase/` continua fora do Git.
- O app tolera a fase 3 ausente: esconde a seção e a chave (`cloud.liveMissing`).
- Nunca expor `thirds`, `comment`, `rating`, `band_photo` nem outro campo da sessão em andamento.
- Consultas periódicas: no mínimo 60 s na Início e 90 s na sessão, só com a página visível e a tela certa aberta.
- As regras de sempre do app: ES5, 44 px, de 360 a 390 px, temas claro e escuro, testes que não gravam.
- Versão final: `APP_VERSION='2.14.0'`, com o `APP_BUILD` conferido.

## Foco da revisão

1. **Celular com o relógio errado** (já aconteceu nesta máquina): o "há N min" e a janela de 4 h não podem depender dele para esconder ou mostrar sessões. A janela usa o `live_at` do servidor. Teste do SQL na Task 1.
2. **Membro suspenso durante a sessão ao vivo:** some de "Fumando agora", e não dá mais para brindar a sessão dele. Teste do SQL na Task 1.
3. **Duas abas ou dois aparelhos com a mesma sessão:** desligar a chave num deles tira a sessão do clube depois da sincronização. Teste em `app.test.js` (o `sessionRow` com `live:false`) na Task 2.
4. **Encerrar como "Só eu" depois de receber brindes:** os brindes deixam de ser visíveis para os outros. Teste do SQL na Task 1.
5. **Sem internet:** a seção mostra o último resultado, ou o vazio, sem erro; a consulta tenta de novo no próximo ciclo. Teste na Task 4.

---

### Task 1: fase 3 do SQL e seus testes

**Arquivos:**
- Criar: `supabase/supabase-clube-fase3.sql` e `supabase/tests/fase3.test.mjs` (o mesmo arcabouço do `fase2.test.mjs`).

**Interfaces (produz):**
- `public.sessions.live boolean not null default false` e `public.sessions.live_at timestamptz`.
- O gatilho `sessions_live_at`, `before insert or update`: com `live` e `status='aberta'`, faz `live_at=now()`; senão, `live_at=null`.
- `public.can_see_session(p_uid)`: a regra de hoje, mais a sessão ao vivo de outro membro ativo, dentro de 4 h de `live_at`.
- `public.club_live()`: devolve `uid`, `owner_id`, `display_name`, `cigar_name`, `started_at` e `live_at`.
  - Sai vazia para quem não é membro ativo.
  - Exclui `auth.uid()`.
  - No máximo 30, do `live_at` mais recente para o mais antigo.
  - `security definer`, `stable`, `search_path=public`, revogada de `public` e `anon` e concedida a `authenticated`.

- [ ] **Passo 1: escrever `fase3.test.mjs`.** Membros A (administrador), M e N, e U sem perfil.
  - `fases 1, 2 e 3 aplicam duas vezes sem erro`.
  - `gatilho: live com aberta grava live_at; desligar ou concluir zera`.
  - `club_live mostra a sessão ao vivo de N para M, só com as colunas permitidas`: as chaves são exatamente as 6, e `thirds` não aparece.
  - `club_live não mostra a sessão de N quando ela`:
    - não está ao vivo;
    - está concluída;
    - tem `live_at` de 5 h atrás (gravado como root);
    - é de um membro suspenso;
    - é do próprio M.
  - `U, sem perfil, recebe vazio; anon não executa a função`.
  - `M brinda e comenta a sessão ao vivo de N; não consegue na aberta sem live`.
  - `N lê os brindes e comentários da própria sessão`.
  - `N encerra como "Só eu": M não vê mais os brindes dela`.
  - `M continua sem ler a linha da sessão em andamento de N pela tabela`: `select` em `sessions` não traz a linha.
- [ ] **Passo 2: rodar e ver falhar.** `node supabase/tests/fase3.test.mjs` → FAIL, porque o arquivo da fase 3 não existe.
- [ ] **Passo 3: escrever `supabase-clube-fase3.sql`.**
- [ ] **Passo 4: rodar e ver passar.** `fase3` com 0 falhas; `fase2` continua com 0 falhas.
- [ ] **Passo 5: sem commit no Git,** porque `supabase/` não vai para o GitHub. Registrar no ledger o SHA-256 do arquivo.

### Task 2: dados e clube no app

**Arquivos:**
- Modificar: `index.html`:
  - `sessionRow` e `rowToSession`;
  - o `clubApi`, com `live()` (`rpc('club_live')`), `reacoes(uids)`, `comentarios(uids)`, `comentar(uid, body)` e `sessaoUid(localId)`;
  - `cloud.liveMissing`, marcado pelo `missingSql`;
  - `iniciarSessao`, com `opts.live`: grava `s.live` e, sendo membro, chama `sync()` em 300 ms;
  - o `case 'finish'`, que põe `live:false`.
- Testes: `tests/app.test.js`.

- [ ] **Passo 1: testes em `app.test.js`.**
  - `sessionRow envia live só com a sessão aberta`: aberta com `live:true` dá `true`; concluída com `live:true` dá `false`; sem o campo dá `false`.
  - `rowToSession lê live`.
  - `iniciarSessao com live grava live:true`.
  - `encerrar põe live:false`, pela `finishSaved` ou pela função que o fim de sessão usar.
- [ ] **Passo 2: rodar e ver falhar.**
- [ ] **Passo 3: implementar.**
- [ ] **Passo 4: rodar e ver passar.**
- [ ] **Passo 5: commit** `feat: sessão ao vivo sincroniza live e o clube ganha a consulta de Fumando agora`.

### Task 3: chave na folha e faixa na sessão

**Arquivos:**
- Modificar: `index.html`:
  - a chave "Aparecer em Fumando agora" na folha "Iniciar sessão", só para membro ativo e sem `liveMissing`, lembrando a escolha no `localStorage diario-aovivo` e desligada da primeira vez;
  - a faixa no topo da sessão, com "Aparecendo em Fumando agora", "Parar de aparecer" ou "Aparecer em Fumando agora";
  - os brindes e comentários recebidos, consultados a cada 90 s, só com a sessão visível, `live` e membro;
  - o CSS.
- Testes: `tests/ui-inicio.js` e `tests/ui-sabores.js`, com o `clubApi` falso no estilo do `ui-clube`.

- [ ] **Passo 1: testes.**
  - `a chave aparece para membro, some sem login e com a fase 3 ausente`.
  - `a chave lembra a última escolha e vem desligada da primeira vez`.
  - `com a chave ligada, a sessão começa com live e sincroniza`: o `clubApi` e o `sync` falsos contam as chamadas.
  - `Parar de aparecer desliga live e sincroniza`.
  - `os brindes e comentários recebidos aparecem na faixa`: dados do `clubApi` falso.
  - `nenhuma consulta com a página escondida`: `document.visibilityState` simulado.
- [ ] **Passo 2: rodar e ver falhar.**
- [ ] **Passo 3: implementar.**
- [ ] **Passo 4: rodar e ver passar.** `ui-inicio`, `ui-sabores` e os outros sem FAIL.
- [ ] **Passo 5: commit** `feat: escolher aparecer em Fumando agora e ver os brindes na sessão`.

### Task 4: "Fumando agora" na Início

**Arquivos:**
- Modificar: `index.html`:
  - a seção entre o herói e o Clube, com cartões em fila horizontal, Brindar (pela tabela `reactions`), Comentar (campo de 1 linha, 140 caracteres) e o cartão "Você";
  - o estado vazio;
  - a consulta a cada 60 s, só com a Início visível;
  - o herói ao vivo, com o selo e as 3 últimas linhas recebidas;
  - o CSS.
- Testes: `tests/ui-inicio.js`.

- [ ] **Passo 1: testes.**
  - `Fumando agora lista as sessões do clubApi falso com nome, charuto e há N min`.
  - `Brindar marca, conta e desfaz`.
  - `Comentar envia pelo clubApi e fecha o campo`.
  - `a sua sessão ao vivo aparece primeiro como Você, sem botões`.
  - `sem ninguém: a mensagem de vazio`.
  - `fase 3 ausente: a seção some e o resto da Início continua`.
  - `sem internet: sem erro, com o último resultado` (o `clubApi` falso rejeita).
  - `o herói ao vivo mostra o selo e os brindes recebidos`.
  - `alvos de 44 px e sem rolagem horizontal a 360 px`.
- [ ] **Passo 2: rodar e ver falhar.**
- [ ] **Passo 3: implementar.**
- [ ] **Passo 4: rodar e ver passar.**
- [ ] **Passo 5: commit** `feat: Fumando agora na Início`.

### Task 5: versão 2.14.0, documentação e verificação

- [ ] **Passo 1:** `APP_VERSION='2.14.0'`, com o `APP_BUILD` conferido.
  - No `CLAUDE.md`:
    - a versão, a fase 3 (o que faz e como aplicar) e a regra de privacidade;
    - `live` e `live_at`, `club_live` e os intervalos das consultas;
    - os testes novos.
  - Na memória do projeto: a fase 3 aplicada (depois de aplicar).
- [ ] **Passo 2: verificação final.**
  - Em Node: todas as suítes, inclusive `fase2` e `fase3` do SQL, com 0 falhas.
  - No navegador: os seis `ui-*.js` a 360 e 390 px, nos temas escuro e claro, sem FAIL e com o console limpo.
- [ ] **Passo 3: commit** `feat: 2.14.0 com Fumando agora`.
- [ ] **Passo 4 (fora do plano, com OK):**
  - aplicar a fase 3 em produção e conferir colunas, gatilho, função e grants;
  - publicar o app;
  - conferir no ar com dois usuários, se houver.
