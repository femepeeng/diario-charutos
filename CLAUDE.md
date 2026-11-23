# Diário de Degustação: contexto do projeto

PWA para registrar sessões de degustação de charutos por terço, com cronômetro, foto da anilha, notas de sabor, análise de paladar, gamificação e, opcionalmente, um clube fechado (Supabase).

- **Dono:** Felipe (usuário GitHub `femepeeng`). Responde em português do Brasil.
- **Produção:** https://femepeeng.github.io/diario-charutos/ (GitHub Pages, branch `main`, raiz).
- **Versão atual neste pacote:** 2.6.1 (22/11/2026). Constantes `APP_VERSION` e `APP_BUILD` no topo do script de `index.html`, exibidas no rodapé da home.
- **Estado do GitHub em 22/11/2026:** o `index.html` publicado ainda é anterior à 2.5.0 (sem número de versão). Este pacote é o estado mais recente.

## Arquivos

| Arquivo | Papel |
|---|---|
| `index.html` | App inteiro: HTML, CSS e JS em um arquivo, sem build e sem framework |
| `sw.js` | Service worker. Página e `config.js` vêm da rede primeiro; o resto vem do cache primeiro. Cache `diario-v2`. Mudou um asset em cache? Suba a versão do cache |
| `config.js` | `window.CLUBE_CONFIG = {url, key}` do Supabase. **Vazio = clube desativado** (o app funciona só como diário local) |
| `supabase.js` | Bundle UMD de `@supabase/supabase-js@2.117.2`, vendorizado para funcionar offline |
| `manifest.webmanifest`, `icon-*.png` | Instalação como app |
| `supabase/supabase-clube.sql` | Esquema, RLS e funções do clube. **Não vai para o GitHub** (repo público; contém o código de fundador de uso único). Está no `.gitignore` |

## Arquitetura

- **Offline-first.** IndexedDB `diario-degustacao` (versão 2), com os stores `cigars`, `sessions`, `photos` (blobs) e `tombstones`. O celular é a fonte da verdade; a nuvem é cópia e vitrine do clube.
- **Render.** Função `render()` com `innerHTML` a partir de `state`. Eventos são delegados por `data-act` (click), `data-input` (input) e `data-change`/ids (change). Na tela de sessão, a edição fica em `draft` e é salva com debounce (`scheduleSave` → `flush` → `put`).
- **Sincronização** (`sync()`, só se `config.js` estiver preenchido e o usuário for membro): sobe fotos ainda não enviadas, aplica tombstones, faz upsert por `(owner_id, local_id)`, puxa os registros próprios e mescla por `client_updated_at` (last-writer-wins). A chave localStorage `clube-owner` impede misturar diários de contas diferentes no mesmo aparelho.
- **Clube:** login por e-mail e senha (o SMTP padrão do Supabase só envia para a equipe do projeto, por isso "Confirm email" fica desligado), convite por código (`join_club`, `create_invite`), feed de sessões com `visibility='club'` e `status='concluida'`, curtidas, comentários e `delete_my_account` (LGPD). As regras de acesso foram testadas em Postgres (36 casos).
- **Backup:** exporta e importa JSON `{app:'diario-degustacao', version:1, cigars, sessions, photos:[{id, dataUrl}]}`.

## Modelo de dados (local)

- **cigar:** `id, name, origin, vitola, strength(1-5), status, expected, pairing, wrapper, order, bandId, updatedAt, syncedAt`
  - `status` é uma lista separada por vírgula com `cesta` e/ou `estoque`. Vazio = `historico`, exibido como **Arquivo**.
  - `wrapper` é uma chave de `WRAPPERS` (connecticut, habano, corojo, camaroes, sumatra, maduro, natural, cubana, matafina).
- **session:** `id, cigarId, cigarName, status('aberta'|'concluida'), visibility('club'|'private'), createdAt, endedAt, moment, drink, thirds[3]{notes[], intensity, text}, strength, burn, draw, feel, rating(0-10, passo 0,5), rebuy, comment, timer{acc, running, resumedAt}, durationMin, bandId, mission, updatedAt, syncedAt`
  - `mission` e o progresso de lições (`localStorage diario-licoes`) não sobem para a nuvem.

## Funcionalidades por área

- **Acervo:** filtros Todos/Cesta/Estoque/Arquivo, botões Cesta e Estoque, editar e remover charuto, ficha do charuto (formato pela bitola, capa, terroir, corte) e sugestão da próxima degustação.
- **Sessão:** cronômetro, momento (pré-preenchido com o da última sessão), bebida, foto da anilha (câmera ou galeria), notas por terço em 8 famílias (incluindo "Gostos na boca"), missão de aroma, dicas do guia por terço e fechamento com força, queima, tiragem, bem-estar (alerta de mal-estar), nota, recompraria, impressão e visibilidade.
- **Histórico:** detalhe, edição com troca de charuto e de duração, ajustar a força no Acervo e adicionar charuto avulso ao Acervo.
- **Paladar:** jornada (níveis Iniciante → Mestre, 15 conquistas calculadas do diário), análise (força × nota, sabores acima e abaixo da média, ranking, força esperada × sentida, hábitos) e Escola do charuto (8 lições).
- **Clube:** feed, curtidas e comentários. **Comparar:** duas sessões lado a lado. **Conta:** login, convites, backup e guia de bolso.

## Regras e restrições

- **Deploy só pelo celular:** o Felipe envia arquivos pela interface web do GitHub (Add file › Upload files). Entregue os arquivos alterados prontos e diga exatamente quais subir.
- **Toda entrega atualiza `APP_VERSION`/`APP_BUILD`** (MAIOR.MENOR.CORREÇÃO: correção = último número, recurso = do meio, estrutura = primeiro).
- **Mudanças de dados sempre compatíveis com registros existentes.** Os dados ficam no IndexedDB dos usuários; nunca quebre a leitura de backups antigos. Campo novo de cigar ou session que deva sincronizar exige coluna no SQL (`alter table ... add column if not exists`) e mapeamento em `cigarRow`/`rowToCigar` ou `sessionRow`/`rowToSession`.
- **Nunca** coloque a chave `secret`/`service_role` no app ou no repositório. A publishable/anon é pública por natureza.
- **Conteúdo:** sem preços, lojas ou links de compra no app (Lei 9.294/1996, art. 3-A, restringe propaganda de fumígenos por meio eletrônico). Nada que ensine a tragar. Informação técnica deve ser conservadora; onde não há consenso, o texto diz isso.
- **UI:** mobile-first (testar em 360 a 390 px, sem rolagem horizontal), tema escuro por padrão com tema claro via tokens CSS, fontes Bricolage Grotesque, IBM Plex Sans e IBM Plex Mono, alvos de toque de pelo menos 44 px, sem emoji como ícone.
- **Testes:** valide com Playwright (Chromium) servindo a pasta com `python3 -m http.server`, contexto 390x844 e `service_workers='block'`. Para o clube, simule o supabase-js interceptando `config.js` e `supabase.js` com `page.route`.
- **Privacidade:** backups JSON contêm dados pessoais e fotos; não versionar (`*.json` está no `.gitignore`). O `migracao-diario.json` ainda está publicado no repo e deveria ser apagado.

## Pendências conhecidas

1. Publicar a 2.6.1 no GitHub (`index.html` e `config.js`).
2. Clube ativado em 22/11/2026: projeto Supabase `csqxarkaqcfyitmbfmzm` (região us-west-2, Oregon), SQL aplicado, Confirm email desligado, `config.js` preenchido com a chave publishable. O convite de fundador agora é aleatório (gerado pelo SQL) e o `create_invite` usa `gen_random_uuid()`. Falta publicar a 2.6.1 e o fundador criar a conta.
3. Recuperação de senha depende de SMTP próprio (por exemplo Brevo ou Resend); hoje o administrador apaga o usuário e reconvida.
4. Ideias em aberto: quantidade em estoque com baixa automática ao encerrar sessão, conquistas visíveis no perfil do clube e no feed, canal beta com IndexedDB separado.
