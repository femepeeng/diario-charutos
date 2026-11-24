# Administração do clube e conversa com os inscritos (v2.9.0)

## Intenção

O clube foi ativado para o Felipe interagir com os beta testers. Hoje o administrador só gera links de convite: não vê quem entrou, não controla os convites e não fala com ninguém pelo app. Esta entrega põe na aba Conta o controle dos inscritos e um canal de conversa com eles. O inscrito ganha um jeito de falar com a administração e de receber avisos.

## Objetivos

- **Administrador:** lista de inscritos com dados de acompanhamento; suspender e reativar; tornar e tirar administrador; convites com usos e botão de desativar; caixa de entrada com uma conversa por inscrito; avisos para todos.
- **Inscrito:** conversa com a administração; lista de avisos; sinal de novidade (ponto na aba Conta e faixa no Início).

## Fora do escopo

Tempo real (Supabase Realtime), notificação fora do app (e-mail ou push), conversa entre membros, exclusão definitiva de membro pelo app, anexos em mensagens e edição de mensagem ou aviso já publicado.

## Anti-objetivos

- Mostrar o e-mail de alguém, ou qualquer dado de sessões "Só eu", ao administrador ou a outros membros.
- Ação de administrador garantida só pelo app, sem checagem no banco.
- Chave `secret` ou `service_role` no app.
- O app quebrar porque o SQL novo ainda não foi aplicado.
- Links clicáveis em mensagens ou avisos (o clube proíbe links de compra).

## Restrições

- Arquivo único (`index.html`), JavaScript ES5, render por `innerHTML`, eventos delegados por `data-act`.
- Toda permissão é garantida no banco, por RLS e por funções `security definer` que checam quem chama. O app só esconde o que a pessoa não pode usar.
- SQL idempotente, aplicado pelo Felipe no SQL Editor do Supabase. Fica fora do GitHub, como o `supabase-clube.sql`.
- Compatível com o app 2.8.0 já instalado: as colunas de perfil lidas hoje (`id`, `display_name`, `is_admin`) continuam legíveis por todos os membros.
- Mobile-first (360 a 390 px, sem rolagem horizontal), alvos de 44 px, temas escuro e claro pelos tokens, sem emoji como ícone.
- LGPD: as regras do clube passam a dizer o que o administrador vê e que as mensagens ficam guardadas até a exclusão da conta.

## Abordagens consideradas

| | Abordagem | Troca |
|---|---|---|
| **1** | **Banco do clube, com atualização ao abrir o app (escolhida)** | Menos código, tolera internet ruim; a mensagem chega quando a pessoa abre o app |
| 2 | O mesmo, com tempo real | Chega na hora, mas mantém conexão aberta, gasta bateria e tem mais pontos de falha. Pode vir depois sem refazer a 1 |
| 3 | Ferramenta externa (formulário ou grupo) | Sem código de banco, mas a conversa sai do app e exige coletar telefone ou e-mail |

O Felipe escolheu a 1.

## Desenho

### Banco (fase 2 do SQL)

**Perfis**, colunas novas:
- `invite_code`: convite usado na entrada. Fica nulo para quem entrou antes.
- `suspended_at`.
- `last_seen_at`: último acesso.
- `msgs_read_at` e `avisos_read_at`: até onde o inscrito leu.
- `admin_read_at`: até onde a administração leu a conversa daquele inscrito. É um ponteiro só, compartilhado por todos os administradores.

Os membros continuam lendo apenas `id`, `display_name`, `is_admin` e `created_at` dos perfis, por permissão de coluna. O resto só sai pelas funções abaixo.

**Tabelas novas:**
- `messages`: `id`, `member_id` (a conversa é do inscrito), `author_id`, `from_admin`, `body` (1 a 1000 caracteres) e `created_at`. Apaga junto com o perfil do inscrito.
- `announcements`: `id`, `author_id`, `body` (1 a 1000 caracteres) e `created_at`.

**Regras de acesso:**
- `is_member()` passa a exigir `suspended_at` nulo. Com isso, o suspenso perde feed, sincronização, curtidas e comentários. Os dados dele ficam guardados.
- Sessões de quem está suspenso somem do feed: `sessions_club_read` e `can_see_session` checam o dono.
- `messages`: lê o dono da conversa ou um administrador. Escrever, só pela função `send_message`.
- `announcements`: lê quem é membro ativo. Publicar e apagar, só administrador.
- `join_club` grava o convite usado.

**Funções** (todas checam quem chama; ninguém sem login executa):
- `club_me()`: devolve o estado de quem chama (administrador ou não, suspenso ou não, quantas mensagens não lidas e o aviso não lido mais recente). Também registra o último acesso, no máximo a cada 10 minutos.
- `send_message(member, body)`: o inscrito escreve na própria conversa, mesmo suspenso. O administrador responde em qualquer conversa.
- `mark_read(member)`: avança o ponteiro de leitura do lado de quem chama, inscrito ou administração.
- `mark_avisos_read()`.
- `admin_members()`: devolve, para cada inscrito, nome, data de entrada, convite, último acesso, se está suspenso, se é administrador, sessões compartilhadas (concluídas e visíveis ao clube), data da última mensagem e mensagens não lidas pela administração.
- `admin_set_suspended(member, sim/não)`: não suspende a si mesmo nem outro administrador.
- `admin_set_admin(member, sim/não)`: não muda o próprio papel, o que garante que sempre sobra um administrador. Não promove quem está suspenso.
- `admin_set_invite(code, ativo)`: desativar um link só impede novos usos; quem já entrou continua.

### App

- **Camada `clubApi`:** uma função por chamada ao banco. Os testes trocam essa camada por uma versão falsa, em memória.
- **Atualização:** `refreshClub()` roda ao carregar o perfil, ao voltar para o app (no máximo uma vez por minuto), ao abrir a aba Conta, depois de cada ação e no botão Atualizar.
- **Inscrito:**
  - Em Conta, o painel Mensagens tem a conversa com a administração, o campo de texto e a lista de avisos.
  - Mensagem não lida acende um ponto na aba Conta.
  - O aviso não lido mais recente aparece numa faixa no topo do Início. "Ver" abre a Conta e "Dispensar" marca como lido.
- **Administrador:**
  - Em Conta, o painel Administração tem quatro seções: Inscritos, Mensagens, Avisos e Convites.
  - A conversa abre dentro do painel. O ponto na aba Conta acende quando há conversa com mensagem não lida.
  - O app pede confirmação antes de suspender e antes de tornar alguém administrador, porque o administrador lê todas as conversas.
  - O administrador aparece na lista como "administrador", sem as ações sobre si mesmo. Ele não tem o painel "Fale com a administração".
- **Suspenso:** a Conta mostra o aviso de suspensão e a conversa com a administração. O app deixa de sincronizar, o Clube mostra que o acesso está suspenso, e o diário do celular continua funcionando.
- **Sem o SQL aplicado:** os painéis novos não aparecem. Para o administrador, a Conta avisa que falta aplicar a atualização do banco.
- **Mensagens e avisos:** só texto, sempre escapado. Quebras de linha são preservadas e não há links clicáveis.
- **Sem internet:** o envio falha com um aviso, e o texto continua no campo.
- **Regras do clube:** o texto ganha um parágrafo. Ele diz que o administrador vê de cada membro o nome, a data de entrada, o convite usado, o último acesso e quantas sessões foram compartilhadas. Diz também que mensagens e avisos ficam guardados no clube até a exclusão da conta.

### Testes

- **SQL:** Postgres embutido (PGlite) no Node, com versões simplificadas de `auth` e `storage`. Cobre as regras de acesso para administrador, membro, suspenso e visitante sem login.
- **Funções puras do app:** contagens, ordem da caixa de entrada, datas relativas e validação do texto, em `node tests/clube.test.js`.
- **Interface:** `tests/ui-clube.js` com o `clubApi` falso, em 360 e 390 px, nos temas claro e escuro.

### Versão e publicação

Versão 2.9.0. A ordem é aplicar o SQL e depois publicar o app; o app tolera a ordem inversa. No app 2.8.0, um membro suspenso vê "Falha ao sincronizar" até atualizar o app, o que é aceitável.

## Decisões tomadas pelo Claude (para conferir)

- A conversa é com "a administração": qualquer administrador lê e responde, e a leitura é compartilhada.
- Suspender não apaga nada, esconde as sessões da pessoa do feed e deixa a conversa aberta. Exclusão definitiva continua só no painel do Supabase.
- O suspenso não vê avisos, só a conversa.
- Avisos não são editados: o administrador apaga e publica de novo.
- O último acesso é registrado no máximo a cada 10 minutos, pela `club_me()`.

## Decisões deixadas a quem implementar

- Layout exato das seções do administrador e microcopy.
- Quantas mensagens carregar por conversa (por exemplo, as 200 mais recentes).
- Formato das datas relativas ("há 2 h", "ontem").
