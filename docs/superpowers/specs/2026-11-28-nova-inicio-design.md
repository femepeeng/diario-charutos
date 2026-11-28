# Nova Início e "Fumando agora" (v2.13.0 e v2.14.0)

## Intenção

O Felipe achou a página inicial "pobre e bagunçada". Ele pediu:
- um botão de iniciar sessão em destaque;
- o Guia de bolso mantido, porém mais rico, com ícones ligados a cada cartão;
- informação do clube logo na abertura;
- cuidado com a experiência, tanto na interação da sessão quanto entre os membros.

Para a parte social, ele escolheu incluir já o "fumando agora", sabendo que exige SQL novo (opção 2). Para a privacidade, escolheu que cada um decide ao iniciar a sessão se aparece (opção 1). O protótipo clicável (artifact privado de 28/11/2026) foi aprovado com "1" no mesmo dia.

Hoje a Início tem o cabeçalho, as abas, a faixa de backup e o carrossel do guia, com um cartão por vez e ícone de 24 px. A sessão só começa pelo cartão do charuto no Acervo. O clube só aparece pela coroa.

## Objetivos

- **Herói no topo da Início.** Um botão "Iniciar sessão" grande abre uma folha de escolha. Na folha estão os charutos do estoque, do acervo ou um avulso, o momento e, na 2.14.0, a chave "Aparecer em Fumando agora". Junto do botão ficam a sugestão do estoque e a última sessão. Com sessão aberta, o herói vira o cartão da sessão em andamento, com o relógio correndo.
- **Clube na abertura.**
  - Para membros: mensagens não lidas, aviso, número de membros e as 2 últimas degustações compartilhadas, com Brindar e comentários.
  - Para quem não é do clube: um convite que explica o clube.
- **Guia de bolso ilustrado.** A dica do dia fica em destaque, e os outros 6 tópicos aparecem em grade de 2 colunas. Cada tópico ganha uma ilustração própria (64 × 64), no lugar do ícone pequeno. O detalhe do tópico, com as ferramentas, continua como está.
- **Seu diário.** Mostra o nível, os pontos que faltam para o próximo, as conquistas e a missão da próxima sessão.
- **Curtir vira Brindar** em todo o app, com ícone de taças. Os dados são os mesmos, na tabela `reactions`.
- **"Fumando agora" (2.14.0).** Mostra os membros com sessão aberta que escolheram aparecer. Dá para brindar e comentar a sessão deles, e quem fuma vê os brindes e comentários que recebe.

## Fora do escopo

- Notificação push. O app não tem servidor próprio e, no iPhone, push exigiria o app instalado.
- Tempo real por websocket. "Fumando agora" e os brindes recebidos se atualizam por consulta periódica.
- Mostrar sabores ou nota durante a sessão (opção 3, recusada).
- Redesenho do Acervo, da Conta, do Clube ou da tela de sessão, além do que está descrito aqui.

## O que não pode acontecer

- Alguém aparecer em "fumando agora" sem ter ligado a chave naquela sessão.
- O clube ver sabores, anotações, nota ou foto de uma sessão em andamento.
- Uma sessão esquecida aberta aparecer como "fumando agora" para sempre.
- A Início ficar lenta ou fazer consultas ao servidor com a página escondida ou fora da Início.
- Perder qualquer registro: nenhum campo existente muda de sentido.
- Texto que ensine a tragar, preço, loja ou link de compra.

## Restrições

As do `CLAUDE.md`:
- `index.html` único, ES5, `innerHTML`, `data-act` e `esc()`;
- alvos de 44 px, de 360 a 390 px, temas claro e escuro, sem emoji como ícone;
- SQL aplicado antes do app, com o OK do Felipe, pelo SQL Editor e conferido depois;
- o app tolera o SQL ausente e esconde o que depende dele.

Versões: 2.13.0 (Início, sem SQL) e 2.14.0 ("fumando agora", com a fase 3 do SQL). A 2.12.1, pronta e não publicada, vai junto com a 2.13.0.

## Abordagens

| | Abordagem | Troca |
|---|---|---|
| **1** | **Painel em seções (escolhida):** herói com Iniciar sessão; Fumando agora; Clube; Guia de bolso; Seu diário | Atende a tudo o que foi pedido, numa ordem que põe a ação primeiro |
| 2 | Feed do clube como Início, com botão flutuante de sessão | Mais social, mas vazio para quem não é do clube e afasta o guia |
| 3 | Só o botão e o guia, com o clube onde está | Pouca mudança; não atende ao pedido de clube na Início |

Para o "fumando agora", a decisão foi uma RPC com colunas limitadas, e não abrir a leitura das sessões em andamento. O RLS do Postgres não esconde colunas por linha: ler a linha inteira mostraria os sabores e as anotações.

## Etapa 1 — 2.13.0: a nova Início (sem SQL)

### Ordem da página

A ordem fica: cabeçalho (sem mudança), barra de abas, faixa de backup (agora em uma linha), herói, Fumando agora (só na 2.14.0), Clube, Guia de bolso, Seu diário e rodapé.

O aviso do clube deixa de ser uma faixa no topo (`avisoBanner`) e vai para dentro da seção Clube.

### Herói

**Sem sessão aberta:**
- O sobretítulo é "Pronto para acender?". O título é "Escolha o charuto e comece a sessão".
- O botão principal "Iniciar sessão", com o ícone de chama, tem pelo menos 56 px de altura e a largura toda.
- A linha de sugestão aparece quando `suggestion()` devolve um charuto, com o rótulo "Sugestão do seu estoque", o nome e o motivo (`why`), encurtado para 2 itens. Tocar nela abre a folha com aquele charuto já escolhido.
- A linha da última sessão concluída aparece quando ela existe: "Última sessão: nome · nota X · há N dias", com o texto relativo que o app já usa.
- **Diário vazio, sem charutos nem sessões:** o herói continua. O bloco "Comece seu diário" sai do topo e vira uma linha dentro do herói: "Seu diário está vazio. Adicione o primeiro charuto ou importe um backup.", com os dois botões de hoje. O avulso continua permitindo começar sem charuto cadastrado.

**Com sessão aberta**, no lugar:
- o sobretítulo "Sessão em andamento", com o ponto pulsando;
- o nome do charuto;
- o relógio grande (hh:mm:ss), atualizado a cada segundo só enquanto a Início está visível;
- o momento;
- os botões "Retomar sessão" (o `resume` de hoje) e "Encerrar", que entra na sessão já no Fechamento (`state.step=3`).

O cartão "Sessão em andamento" de cima da barra deixa de aparecer na Início, porque o herói o substitui. Nas outras abas ele continua.

### Folha "Iniciar sessão"

- É uma folha de baixo: `role="dialog"`, `aria-modal="true"`, fundo escurecido.
- Fecha pelo ×, por um toque no fundo e pela tecla Esc. Ao abrir, o foco vai para a primeira aba; ao fechar, volta para o botão que a abriu.
- **Abas:** "Estoque · N" (status com `estoque`), "Acervo" (todos, com busca pelo nome sem acento, usando `normSabor`) e "Avulso" (campo de nome).
  - A primeira aba aberta é Estoque quando há estoque; senão, Acervo; senão, Avulso.
  - A lista do Estoque e a do Acervo seguem a ordem do Acervo (`order`, depois o nome).
  - Cada linha mostra o nome e "origem · força N/5 · bitola", e é um botão `aria-pressed` com alvo de 56 px.
- **Momento:** os 3 momentos, com o último já marcado (`lastMoment()`).
- **Começar sessão:** fica desativado até haver um charuto escolhido ou um nome no avulso.
  - Com sessão já aberta, mostra o aviso de hoje ("Termine ou retome a sessão em andamento primeiro.").
  - Sem sessão aberta, cria a sessão por `iniciarSessao(c, {moment})`. O `c` é o charuto escolhido, ou `{id:'', name}` no avulso.
- `iniciarSessao` usa a `newSession` de hoje, grava pelo `sessionSaver` e entra na sessão.
  - A gravação inicial passa pelo `sessionSaver`, e não por `put` direto, para o teste de interface trocar o gravador.
  - O `case 'start'` do Acervo passa a usar a mesma função.
- A missão é a mesma que "Seu diário" mostrou (`state.proximaMissao`, abaixo).

### Clube

A seção só existe com o clube configurado (`cloud.configured`).

**Membro ativo:**
- **Cabeçalho:** "Clube", o número de membros e o link "Ver tudo", que leva à aba `clube`.
  - O número de membros vem de uma contagem de `profiles` (`select id`, `count exact`, `head`) feita com o feed e guardada em `cloud.membros`. Sem a contagem, a linha some.
- **Atalhos:**
  - "Mensagens", com o selo das não lidas (`unreadMsgs()`), abre o Perfil.
  - "Avisos" abre o Perfil na seção de avisos.
- **Aviso:** o aviso não lido de `cloud.me.aviso` aparece num cartão com borda de brasa e com os botões "Ver", que abre o Perfil e marca o aviso como lido como hoje, e "Dispensar".
- **Últimas degustações:** as 2 primeiras do `cloud.feed`, num cartão compacto com avatar, nome, quando, charuto, nota, até 3 sabores, Brindar (`toggleLike`) e "Comentários N", que abre a degustação (`post`).
  - Sem nada no feed: "Nenhuma degustação compartilhada ainda."
- **Atualização do feed:** a Início carrega o feed quando ele tem mais de 5 minutos (`cloud.feedAt`), pelo `loadFeed()` de hoje, só se a Início estiver visível e a pessoa for membro.

**Configurado e sem login:** o cartão de convite. Título "Clube do Diário", subtítulo "Grupo fechado, por convite, para maiores de 18 anos" e três linhas com ícone:
- "Compartilhe suas degustações com os amigos";
- "Veja quem está fumando agora";
- "Brinde, comente e troque mensagens".

Os botões são "Entrar com convite" e "Já tenho conta", e os dois abrem o Perfil.

**Suspenso:** uma linha: "Sua participação no clube está suspensa. O diário deste celular continua funcionando."

### Guia de bolso

- **Cabeçalho:** ícone de livro, "Guia de bolso" e "7 tópicos para antes e durante a sessão".
- **Dica do dia** (`guideOfDay`): um cartão largo com a ilustração de 76 px, o selo "Dica do dia", o selo "Ferramenta" quando houver, o título, a regra e o convite "Ler o tópico" ou "Abrir e usar a ferramenta".
- **Grade:** os outros 6 tópicos, na ordem a partir do dia seguinte, em grade de 2 colunas. Cada um tem a ilustração de 44 px, o título, a regra (até 3 linhas) e o selo "Ferramenta" quando houver. A altura mínima é de 150 px.
- **Toque:** abre o detalhe de hoje (`data-act="guia"`). No detalhe, a ilustração de 72 px substitui o ícone.
- **Ilustrações:** as 7 do protótipo (conservação, viagem, corte, acendimento, ritmo, paladar, quando parar). Ficam em `GUIDE_ILLS`, no bloco `@pure:guia`, com traço na cor de brasa e fundo suave por token.
- **Some:** o carrossel (`.gcar`, `.gdots` e `syncGcar`).

### Seu diário

O bloco tem:
- uma barra de progresso do nível: "Iniciante → Apreciador" e "28/40 pts", com "Faltam N pontos.". O cálculo vem de `journey()`, em `xp`, `floor` e `next`. No último nível: "Nível máximo".
- "N de 15 conquistas";
- "Missão da próxima sessão: Família", com o ponto da cor.

A missão é sorteada uma vez por abertura do app (`state.proximaMissao=pickMission()`, só na memória). A `newSession` usa essa e depois limpa, e a seguinte é sorteada de novo. Sem sessões concluídas ainda, a linha diz "Missão da primeira sessão: Família".

O link "Paladar" abre Conta › Paladar.

### Curtir vira Brindar

- O `HEART_ICON` dá lugar ao `CHEERS_ICON` (duas taças).
- Os rótulos mudam:
  - "Curtir" e "Remover curtida" viram "Brindar" e "Remover brinde";
  - "curtidas" vira "brindes";
  - nos Termos e na ajuda do clube, "curtir" vira "brindar".
- O que está gravado não muda: a tabela `reactions` e `cloud.likes` continuam iguais.

### Faixa de backup

O texto e o botão são os mesmos, numa linha só (`.banner` compacta), com o botão que não quebra.

## Etapa 2 — 2.14.0: "Fumando agora" (SQL fase 3)

### SQL: `supabase/supabase-clube-fase3.sql`

Aplica depois das fases 1 e 2 e pode rodar de novo sem erro. Se a fase 1 ou a 2 rodar de novo, a fase 3 roda em seguida.

**Tabela `sessions`:**
- `live boolean not null default false`: a escolha de aparecer;
- `live_at timestamptz`: o último sinal da sessão ao vivo, na hora do servidor.
- O gatilho `sessions_live_at`, `before insert or update`, faz:
  - com `new.live` e `new.status='aberta'`: `new.live_at = now()`;
  - senão: `new.live_at = null`.

  O relógio do celular não entra na conta.

**`can_see_session(p_uid)`:** passa a aceitar também a sessão ao vivo de outro membro: `public.is_member() and s.live and s.status='aberta' and s.live_at > now() - interval '4 hours' and public.is_active(s.owner_id)`. As políticas de `reactions` e `comments`, que já usam essa função, passam a permitir brindar e comentar a sessão ao vivo.

**RPC `club_live()`:**
- `security definer`, `set search_path = public`, `stable`;
- só para `authenticated`, revogada de `public` e `anon`;
- devolve `uid`, `owner_id`, `display_name`, `cigar_name`, `started_at` e `live_at` das sessões ao vivo de outros membros ativos (`owner_id <> auth.uid()`);
- usa as mesmas condições de `can_see_session`, com no máximo 30, da mais recente para a mais antiga;
- para quem não é membro ativo, devolve vazio.

**`sessions_club_read` não muda:** a sessão em andamento continua fora da leitura direta dos membros.

**Testes:** `supabase/tests/fase3.test.mjs`, no mesmo PGlite da fase 2:
- as fases 1, 2 e 3 aplicam duas vezes;
- o gatilho de `live_at`;
- a RPC devolve só as colunas certas e só para membros;
- a sessão fica de fora quando:
  - está fechada;
  - o dono desligou a chave;
  - passou de 4 h;
  - o dono foi suspenso;
  - é do próprio membro.
- `anon` não chama a RPC;
- dá para brindar e comentar a sessão ao vivo de outro membro, mas não a que não está ao vivo;
- o dono lê os brindes e comentários da própria sessão;
- a sessão encerrada como "Só eu" sai do alcance dos outros.

### App

- **Dados:** a sessão ganha `live` (boolean). `sessionRow` envia `live: !!s.live && s.status!=='concluida'`, e `rowToSession` lê `live`. O `live_at` é só do servidor e o app não lê.
- **Chave na folha "Iniciar sessão":** só para membro ativo e com a fase 3 presente.
  - Rótulo: "Aparecer em Fumando agora".
  - Texto: "O clube vê só o charuto, o seu nome e há quanto tempo você começou. Sabores e nota só aparecem quando você encerrar e compartilhar."
  - O app lembra a última escolha no `localStorage diario-aovivo` (`'1'` ou `'0'`). Da primeira vez, a chave vem desligada.
  - Com a chave ligada, `iniciarSessao` cria a sessão com `live:true` e chama `sync()` logo depois, para aparecer depressa.
- **Na sessão:**
  - **Faixa no topo:** com `live`, "Aparecendo em Fumando agora" e o botão "Parar de aparecer" (`live:false` e sincroniza); sem `live`, e sendo membro, o botão "Aparecer em Fumando agora".
  - **Brindes e comentários recebidos:** aparecem na faixa como "Ana brindou" e "Bruno: texto curto".
    - Vêm de `reactions` e `comments` filtrados pelo `uid` da sessão. O `uid` é buscado uma vez pelo `local_id` e guardado.
    - A consulta repete a cada 90 s, só com a tela visível e `live`.
- **Encerrar:** a sessão concluída vai com `live:false`.
- **Fumando agora na Início:** a seção aparece entre o herói e o Clube, para membro ativo com a fase 3.
  - Os dados vêm de `clubApi.live()` (a RPC) e, para os brindes, de uma consulta a `reactions` pelos `uid`.
  - A consulta repete a cada 60 s, só com a Início visível.
  - **Cartões em fila horizontal:** avatar, nome, "há N min" (de `started_at`), charuto, Brindar (com contagem e o seu brinde marcado) e Comentar.
  - **Comentar:** abre um campo de 1 linha, com máximo de 140 caracteres, que grava em `comments`.
  - **A sua sessão:** com `live`, aparece primeiro, como "Você", com os brindes recebidos e sem botões.
  - **Sem ninguém:** "Ninguém do clube está fumando agora. Quando alguém começar uma sessão e escolher aparecer, ela surge aqui."
- **Herói com sessão ao vivo:** mostra o selo "Aparecendo em Fumando agora" e as 3 últimas linhas de brindes e comentários recebidos.
- **SQL ausente:** se a RPC não existir (`missingSql`), o app marca `cloud.liveMissing=true` e esconde a seção e a chave. O resto funciona.

## Testes

- **Node:**
  - **Funções puras novas, num bloco `@pure:inicio`:**
    - `inicioCharutos(cigars, aba, busca)`, a lista da folha;
    - `nivelProgresso(j)`, a barra e o "faltam N";
    - `ultimaSessaoTexto(sessions, agora)`;
    - `vivosOrdem(lista, agora)` e `haMin(iso, agora)`, para os minutos.
  - **`app.test.js`:**
    - `iniciarSessao` grava pelo `sessionSaver` e usa a missão de `state.proximaMissao`;
    - a sessão concluída sai com `live:false`.
- **SQL:** `fase3.test.mjs`, acima.
- **Interface, `tests/ui-inicio.js` (novo):**
  - herói nos três estados;
  - folha com foco, Esc, abas, busca, avulso e Começar desativado;
  - começar pelo gravador falso, sem gravar no IndexedDB;
  - Clube como membro, sem login e suspenso, com o cliente falso do `ui-clube`;
  - guia com dica do dia e grade de 6;
  - Seu diário;
  - na 2.14.0, Fumando agora com o `clubApi` falso: cartões, Brindar, Comentar, "Você" e SQL ausente.
- **Ajustes:** o `ui-guia.js` deixa as verificações do carrossel e passa a conferir a grade. O `ui-clube.js` passa de Curtir para Brindar. Todos continuam sem gravar e restaurando o estado.

## O que fica com quem implementar

Nomes de classe, a divisão das funções de desenho da Início, o traço exato das ilustrações (com base no protótipo) e o intervalo exato das consultas, desde que respeite os mínimos acima (60 s e 90 s, só com a tela visível).
