/* Verificações de interface do clube (inscrito e administrador), rodadas no navegador com o app aberto.
   Uso no console (ou javascript_tool): eval(await (await fetch('/tests/ui-clube.js?' + Date.now())).text())
   Devolve {ok, falhas, resultados}. Não toca no Supabase nem grava no diário: troca o cliente por um falso,
   troca o clubApi por um falso em memória e restaura cloud, state e o localStorage do clube no fim. */
(async function () {
  var R = [], wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function check(nome, cond) { R.push((cond ? 'ok   ' : 'FAIL ') + nome); }
  function q(s) { return document.querySelector(s); }
  function qa(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function click(el) { if (el) el.click(); }
  function act(a, id) { return q('[data-act="' + a + '"]' + (id != null ? '[data-id="' + id + '"]' : '')); }
  /* A Conta tem sub-abas desde a 2.11.0: tab('conta') toca na Conta da barra e, se ela não abriu o Perfil, toca na sub-aba Perfil. */
  function tab(id) {
    click(q('.tabs [data-act="tab"][data-id="' + id + '"]'));
    if (id === 'conta' && S.tab !== 'conta') click(q('.minitabs [data-act="tab"][data-id="conta"]'));
  }
  function toastText() { var t = q('#toast'); return t && !t.hidden ? t.textContent : ''; }
  function hideToast() { var t = q('#toast'); if (t) t.hidden = true; }
  function type(el, v) { el.focus(); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }
  function finish() { var falhas = R.filter(function (s) { return s.indexOf('FAIL') === 0; }).length; return { ok: falhas === 0, falhas: falhas, resultados: R }; }

  var T = window.__t || {};
  check('ganchos de teste do clube expostos', !!(T.cloud && T.setClubApi && T.refreshClub && T.canSync && T.state && T.render));
  if (!(T.cloud && T.setClubApi && T.refreshClub && T.canSync)) return finish();
  var C = T.cloud, S = T.state;
  var LS = ['clube-owner', 'clube-feed', 'clube-profile'], lsBk = {};
  LS.forEach(function (k) { lsBk[k] = localStorage.getItem(k); });
  var bk = { sb: C.sb, user: C.user, profile: C.profile, checked: C.profileChecked, me: C.me, missing: C.clubMissing, club: C.club,
    feed: C.feed, feedAt: C.feedAt, mismatch: C.ownerMismatch, tab: S.tab, view: S.view, confirm: S.confirm, sec: S.contaSec, visto: S.msgVisto };

  // Cliente Supabase falso: qualquer cadeia de métodos termina em erro. Uma sincronização acidental durante o teste
  // falha em vez de receber listas vazias (que fariam o app apagar registros locais).
  function fakeSb() {
    var res = { data: null, error: { message: 'cliente falso: chamada não esperada no teste' } }, px;
    px = new Proxy(function () {}, { get: function (t, p) {
      if (p === 'then') return function (ok, ko) { return Promise.resolve(res).then(ok, ko); };
      return function () { return px; };
    }, apply: function () { return px; } });
    return px;
  }
  // clubApi falso, com a mesma forma de dados que o banco devolve; registra as chamadas.
  function fakeApi(opt) {
    var calls = [];
    function rec(n, args) { calls.push([n].concat(Array.prototype.slice.call(args))); }
    function ok(data) { return Promise.resolve({ data: data, error: null }); }
    var api = { calls: calls, opt: opt,
      me: function () { rec('me', arguments); return Promise.resolve(opt.meErr ? { data: null, error: opt.meErr } : { data: JSON.parse(JSON.stringify(opt.me)), error: null }); },
      thread: function (id) { rec('thread', arguments); var d = (opt.threadDelay || {})[id] || 0, data = JSON.parse(JSON.stringify((opt.threads && opt.threads[id]) || opt.thread || []));
        return new Promise(function (res) { setTimeout(function () { res({ data: data, error: null }); }, d); }); },
      avisos: function () { rec('avisos', arguments); return ok(JSON.parse(JSON.stringify(opt.avisos || []))); },
      members: function () { rec('members', arguments); return ok(JSON.parse(JSON.stringify(opt.members || []))); },
      invites: function () { rec('invites', arguments); return ok(JSON.parse(JSON.stringify(opt.invites || []))); },
      markRead: function () { rec('markRead', arguments); return ok(null); },
      markAvisosRead: function () { rec('markAvisosRead', arguments); return ok(null); },
      send: function () { rec('send', arguments); return new Promise(function (res) { setTimeout(function () { res(opt.sendErr ? { data: null, error: opt.sendErr } : { data: 'm-novo', error: null }); }, opt.sendDelay || 0); }); },
      setSuspended: function () { rec('setSuspended', arguments); return Promise.resolve(opt.actErr ? { data: null, error: opt.actErr } : { data: null, error: null }); },
      setAdmin: function () { rec('setAdmin', arguments); return Promise.resolve(opt.actErr ? { data: null, error: opt.actErr } : { data: null, error: null }); },
      setInvite: function () { rec('setInvite', arguments); return ok(null); },
      postAviso: function () { rec('postAviso', arguments); return ok(null); },
      deleteAviso: function () { rec('deleteAviso', arguments); return ok(null); }
    };
    return api;
  }
  function count(api, n) { return api.calls.filter(function (c) { return c[0] === n; }).length; }
  function last(api, n) { var c = api.calls.filter(function (c) { return c[0] === n; }); return c[c.length - 1]; }
  var agora = Date.now(), iso = function (minAtras) { return new Date(agora - minAtras * 60000).toISOString(); };
  var prevApi = null;
  function login(uid, nome, admin) {
    C.sb = fakeSb(); C.user = { id: uid, email: uid.toLowerCase() + '@teste.local' }; C.profile = { id: uid, display_name: nome, is_admin: admin };
    C.profileChecked = true; C.ownerMismatch = false; C.feed = []; C.feedAt = Date.now();
  }

  try {
    // ================= Inscrito =================
    var apiM = fakeApi({
      me: { is_admin: false, suspended: false, unread_msgs: 1, aviso: { id: 'a1', body: 'Nova versão no ar', created_at: iso(30) } },
      thread: [
        { id: 'm2', member_id: 'M', author_id: 'A', from_admin: true, body: '<b>x</b> https://loja.com', created_at: iso(10) },
        { id: 'm1', member_id: 'M', author_id: 'M', from_admin: false, body: 'Oi, achei um erro', created_at: iso(60) }
      ],
      avisos: [{ id: 'a1', body: 'Nova versão no ar', created_at: iso(30), author_id: 'A' }]
    });
    login('M', 'Membro Teste', false);
    prevApi = T.setClubApi(apiM);
    S.view = 'home'; S.tab = 'inicio'; S.confirm = ''; S.msgVisto = 0;
    C.me = null; C.clubMissing = false;
    check('sem o estado do clube confirmado, o app não sincroniza', T.canSync() === false);
    await T.refreshClub(true); T.render(); await wait(80);
    check('com o estado confirmado e sem suspensão, sincroniza', T.canSync() === true);

    var tc = q('.tabs [data-act="tab"][data-id="conta"]');
    check('aba Conta avisa nova mensagem sem mudar o nome', !!tc && /nova mensagem/.test(tc.getAttribute('aria-label') || '') && tc.innerText.trim() === 'Conta');
    var ban = q('.aviso');
    check('Início mostra a faixa do aviso', !!ban && /Nova versão no ar/.test(ban.textContent));
    check('botões da faixa com 44px', qa('.aviso .btn').length === 2 && qa('.aviso .btn').every(function (b) { return b.getBoundingClientRect().height >= 44; }));
    click(act('avisook')); await wait(60);
    check('Dispensar marca o aviso como lido uma vez e tira a faixa', count(apiM, 'markAvisosRead') === 1 && !q('.aviso'));

    // A última sub-aba foi a Cesta, mas há mensagem nova: a Conta abre o Perfil. A conferência é logo após o toque,
    // antes de a conversa ser marcada como lida (o que apaga o ponto).
    S.contaSec = 'cesta';
    click(q('.tabs [data-act="tab"][data-hub]'));
    var perfil = q('.minitabs [data-act="tab"][data-id="conta"]');
    check('com mensagem nova, a aba Conta abre o Perfil, que também mostra o ponto', S.tab === 'conta' && !!perfil &&
      perfil.getAttribute('aria-selected') === 'true' && !!perfil.querySelector('.tdot') && /nova mensagem/.test(perfil.getAttribute('aria-label') || '') && perfil.innerText.trim() === 'Perfil');
    await wait(150);

    tab('conta'); await wait(150);
    var box = q('#msgs');
    check('Perfil mostra o painel Mensagens com a conversa', !!box && /Mensagens/.test((box.querySelector('h3') || {}).textContent || '') && box.querySelectorAll('.msg').length === 2);
    check('mensagem da administração tem o rótulo Administração', !!box && qa('#msgs .msg.theirs').length === 1 && /Administração/.test(q('#msgs .msg.theirs').textContent));
    check('abrir o Perfil marca a conversa como lida', !!last(apiM, 'markRead') && last(apiM, 'markRead')[1] === 'M');
    var adm = q('#msgs .msg.theirs');
    check('texto da mensagem não vira HTML nem link', !!adm && /<b>x<\/b>/.test(adm.textContent) && !adm.querySelector('b,a'));
    check('avisos aparecem no Perfil', /Nova versão no ar/.test((q('#avisos') || {}).textContent || ''));
    check('quem já é membro consegue abrir as regras do clube no Perfil', !!q('#regras summary'));
    check('regras levam a Conta › Perfil › Excluir minha conta', /em Conta › Perfil › Excluir minha conta\./.test((q('#regras') || {}).textContent || ''));

    var nThread = count(apiM, 'thread');
    type(q('#msg-body'), '  Olá  ');
    click(act('msgsend')); await wait(120);
    var s1 = last(apiM, 'send');
    check('Enviar manda o texto limpo uma vez', count(apiM, 'send') === 1 && !!s1 && s1[1] === 'M' && s1[2] === 'Olá');
    check('depois de enviar o campo esvazia e a conversa recarrega', (q('#msg-body') || {}).value === '' && count(apiM, 'thread') > nThread);

    apiM.opt.sendDelay = 300;
    type(q('#msg-body'), 'Teste duplo');
    click(act('msgsend')); click(act('msgsend')); await wait(450);
    check('dois toques em Enviar mandam uma vez só', count(apiM, 'send') === 2);
    apiM.opt.sendDelay = 0;

    hideToast(); apiM.opt.sendErr = { message: 'Failed to fetch' };
    type(q('#msg-body'), 'Vai falhar');
    click(act('msgsend')); await wait(120);
    check('envio com falha avisa e mantém o texto', /internet/.test(toastText()) && (q('#msg-body') || {}).value === 'Vai falhar');
    apiM.opt.sendErr = null;

    hideToast(); var nSend = count(apiM, 'send');
    type(q('#msg-body'), '   ');
    click(act('msgsend')); await wait(60);
    check('campo vazio pede a mensagem e não envia', toastText() === 'Escreva a mensagem.' && count(apiM, 'send') === nSend);

    var mb = q('#msg-body'); type(mb, 'Olá mund'); mb.setSelectionRange(8, 8);
    if (T.rerender) T.rerender(); await wait(120);
    var mb2 = q('#msg-body');
    check('redesenho no meio da digitação mantém foco, texto e cursor', !!mb2 && document.activeElement === mb2 && mb2.value === 'Olá mund' && mb2.selectionStart === 8);
    check('botões da conversa com 44px', qa('#msgs .btn').length >= 2 && qa('#msgs .btn').every(function (b) { return b.getBoundingClientRect().height >= 44; }));
    check('Perfil do inscrito sem rolagem horizontal', document.documentElement.scrollWidth <= innerWidth);
    type(mb2, ''); mb2.blur();

    // ---- "Ver" do aviso e volta do Clube (2.11.1) ----
    C.me.aviso = { id: 'a2', body: 'Outro aviso', created_at: iso(5) };
    S.tab = 'inicio'; T.render(); await wait(60);
    var nAv = count(apiM, 'markAvisosRead');
    click(act('avisover')); await wait(150);
    var pf = q('.minitabs [data-act="tab"][data-id="conta"]'), hb = q('.tabs [data-act="tab"][data-hub]');
    check('"Ver" do aviso abre o Perfil com a Conta marcada e marca o aviso como lido', S.tab === 'conta' && !!pf && pf.getAttribute('aria-selected') === 'true' &&
      !!hb && hb.getAttribute('aria-selected') === 'true' && count(apiM, 'markAvisosRead') === nAv + 1);
    S.contaSec = 'paladar';
    click(q('header .crown')); await wait(120);
    check('a coroa abre o Clube sem nenhuma aba da barra marcada', S.tab === 'clube' && qa('.tabs [role=tab][aria-selected="true"]').length === 0);
    click(q('.tabs [data-act="tab"][data-hub]')); await wait(150);
    check('do Clube, a aba Conta abre a última sub-aba', S.tab === 'paladar');
    tab('conta'); await wait(150);

    // ---- Suspenso ----
    apiM.opt.me = { is_admin: false, suspended: true, unread_msgs: 0, aviso: null };
    await T.refreshClub(true); T.render(); await wait(120);
    check('suspenso: Perfil explica a suspensão e mantém a conversa', /suspensa/.test((q('#msgs') || {}).textContent || '') && qa('#msgs .msg').length === 2);
    check('suspenso: avisos não aparecem', !q('#avisos'));
    check('suspenso: app não sincroniza', T.canSync() === false);
    click(q('[data-act="tab"][data-id="clube"]')); await wait(120);
    check('suspenso: Clube explica a suspensão no lugar do feed', /suspensa/.test(document.getElementById('app').textContent) && !q('.list article'));
    check('suspenso: Clube aponta para Conta › Perfil', /use Conta › Perfil\./.test(document.getElementById('app').textContent));

    // ---- SQL da fase 2 ainda não aplicado ----
    hideToast();
    apiM.opt.meErr = { code: 'PGRST202', message: 'Could not find the function public.club_me without parameters in the schema cache' };
    S.tab = 'conta'; await T.refreshClub(true); T.render(); await wait(120);
    check('sem o SQL: some o painel Mensagens, sem toast', !q('#msgs') && toastText() === '' && C.clubMissing === true);
    tab('inicio'); await wait(80);
    check('sem o SQL: sem faixa de aviso', !q('.aviso'));
    apiM.opt.meErr = null;

    // ================= Administrador =================
    var dia = 60 * 24;
    var apiA = fakeApi({
      me: { is_admin: true, suspended: false, unread_msgs: 2, aviso: null },
      members: [
        { id: 'A', display_name: 'Admin Teste', is_admin: true, created_at: iso(30 * dia), invite_code: 'F-ABCDEF', suspended_at: null, last_seen_at: iso(1), shared_sessions: 3, last_msg_at: null, unread: 0 },
        { id: 'M', display_name: 'Membro M', is_admin: false, created_at: iso(10 * dia), invite_code: 'INV1XXXXXX', suspended_at: null, last_seen_at: iso(120), shared_sessions: 2, last_msg_at: iso(60), unread: 2 },
        { id: 'N', display_name: 'Membro N', is_admin: false, created_at: iso(9 * dia), invite_code: 'INV1XXXXXX', suspended_at: iso(dia), last_seen_at: iso(2 * dia), shared_sessions: 1, last_msg_at: null, unread: 0 },
        { id: 'P', display_name: 'Membro P', is_admin: false, created_at: iso(2 * dia), invite_code: 'INV1XXXXXX', suspended_at: null, last_seen_at: null, shared_sessions: 0, last_msg_at: null, unread: 0 }
      ],
      invites: [
        { code: 'F-X', grants_admin: true, max_uses: 1, uses: 1, active: false, created_at: iso(30 * dia) },
        { code: 'INV1', grants_admin: false, max_uses: 10, uses: 3, active: true, created_at: iso(20 * dia) },
        { code: 'INV2', grants_admin: false, max_uses: 10, uses: 0, active: false, created_at: iso(5 * dia) }
      ],
      thread: [
        { id: 'x2', member_id: 'M', author_id: 'M', from_admin: false, body: 'Pergunta 2', created_at: iso(60) },
        { id: 'x1', member_id: 'M', author_id: 'M', from_admin: false, body: 'Pergunta 1', created_at: iso(70) }
      ],
      avisos: [{ id: 'av1', body: 'Aviso antigo', created_at: iso(600), author_id: 'A' }]
    });
    login('A', 'Admin Teste', true);
    T.setClubApi(apiA);
    C.me = null; C.clubMissing = false; C.inviteLink = '';
    C.club = { thread: [], avisos: [], members: [], invites: [], sec: 'inscritos', open: null, at: 0, sending: false, drafts: {} };
    S.view = 'home'; S.tab = 'conta'; S.confirm = '';
    await T.refreshClub(true); T.render(); await wait(120);
    function sec(id) { return q('[data-act="admsec"][data-id="' + id + '"]'); }
    function card(id) { return q('.mcard[data-member="' + id + '"]'); }

    check('Perfil do administrador mostra o painel Administração', /Administração/.test((q('#admin h2') || {}).textContent || ''));
    check('quatro seções com 44px', qa('[data-act="admsec"]').length === 4 && qa('[data-act="admsec"]').every(function (b) { return b.getBoundingClientRect().height >= 44; }));
    check('seção Inscritos mostra 4 e Mensagens mostra 2 não lidas', /4/.test((sec('inscritos') || {}).textContent || '') && /2/.test((sec('mensagens') || {}).textContent || ''));
    check('administrador não vê o painel de mensagens do inscrito', !q('#msgs'));
    check('4 cartões de inscritos', qa('.mcard').length === 4);
    check('o próprio cartão tem "você" e nenhuma ação', !!card('A') && /você/.test(card('A').textContent) && !card('A').querySelector('button'));
    check('suspenso aparece marcado, com Reativar e sem Tornar administrador', !!card('N') && /suspenso/.test(card('N').textContent) && /Reativar/.test(card('N').textContent) && !card('N').querySelector('[data-act="admadm"]'));
    check('quem ainda não abriu o app novo aparece como sem acesso registrado', !!card('P') && /sem acesso registrado/.test(card('P').textContent));
    check('Inscritos sem rolagem horizontal', document.documentElement.scrollWidth <= innerWidth);

    var nMembers = count(apiA, 'members');
    click(act('admsusp', 'M')); await wait(60);
    check('Suspender pede confirmação antes', !!card('M') && !!card('M').querySelector('[data-act="admconfirm"]') && count(apiA, 'setSuspended') === 0);
    click(card('M').querySelector('[data-act="admconfirm"]')); await wait(150);
    var ss = last(apiA, 'setSuspended');
    check('confirmar suspende uma vez e recarrega a lista', count(apiA, 'setSuspended') === 1 && ss[1] === 'M' && ss[2] === true && count(apiA, 'members') > nMembers);

    click(act('admadm', 'P')); await wait(60);
    check('Tornar administrador avisa que ele lê todas as conversas', !!card('P') && /lê todas as conversas/.test(card('P').textContent));
    click(card('P').querySelector('[data-act="admconfirm"]')); await wait(150);
    var sa = last(apiA, 'setAdmin');
    check('confirmar torna administrador', !!sa && sa[1] === 'P' && sa[2] === true);

    hideToast(); apiA.opt.actErr = { code: 'P0001', message: 'not_self' };
    click(act('admsusp', 'M')); await wait(60); click(card('M').querySelector('[data-act="admconfirm"]')); await wait(150);
    check('erro do banco vira aviso em português', /própria conta/.test(toastText()));
    apiA.opt.actErr = null;

    click(sec('mensagens')); await wait(150);
    check('caixa de entrada tem quem escreveu e não tem quem não escreveu', !!q('.inbox-row[data-member="M"]') && !q('.inbox-row[data-member="P"]'));
    click(q('.inbox-row[data-member="M"]')); await wait(200);
    check('abrir a conversa mostra as mensagens do inscrito', /Conversa com Membro M/.test((q('#admin') || {}).textContent || '') && qa('#admin .msg').length === 2);
    check('abrir a conversa marca como lida', !!last(apiA, 'markRead') && last(apiA, 'markRead')[1] === 'M');
    type(q('#msg-body'), 'Resposta do admin');
    click(act('msgsend', 'M')); await wait(150);
    var sm = last(apiA, 'send');
    check('responder envia para a conversa do inscrito', !!sm && sm[1] === 'M' && sm[2] === 'Resposta do admin');
    click(act('admclose')); await wait(80);
    check('Voltar fecha a conversa', !q('#msg-body') && !!q('.inbox-row[data-member="M"]'));
    apiA.opt.threads = { M: apiA.opt.thread, N: [{ id: 'n1', member_id: 'N', author_id: 'N', from_admin: false, body: 'Mensagem do N', created_at: iso(5) }] };
    apiA.opt.threadDelay = { M: 300 };
    click(sec('inscritos')); await wait(120);
    click(act('admopen', 'M')); await wait(20); click(act('admclose')); await wait(20);
    click(sec('inscritos')); await wait(20); click(act('admopen', 'N')); await wait(450);
    var corpo = qa('#admin .msg p').map(function (p) { return p.textContent; });
    check('resposta atrasada de outra conversa não aparece com o nome errado', /Conversa com Membro N/.test((q('#admin') || {}).textContent || '') && corpo.length === 1 && corpo[0] === 'Mensagem do N');
    click(act('admclose')); await wait(60); apiA.opt.threads = null; apiA.opt.threadDelay = null;

    click(sec('avisos')); await wait(150);
    var ab = q('#aviso-body'); type(ab, 'Aviso em digi'); ab.setSelectionRange(13, 13);
    if (T.rerender) T.rerender(); await wait(120);
    var ab2 = q('#aviso-body');
    check('redesenho no meio do aviso mantém foco, texto e cursor', !!ab2 && document.activeElement === ab2 && ab2.value === 'Aviso em digi' && ab2.selectionStart === 13);
    type(q('#aviso-body'), 'Aviso novo');
    click(act('avisopub')); await wait(150);
    var pa = last(apiA, 'postAviso');
    check('publicar aviso envia o texto', !!pa && pa[1] === 'Aviso novo');
    click(act('avisodel', 'av1')); await wait(60);
    check('apagar aviso pede confirmação', count(apiA, 'deleteAviso') === 0 && !!q('#admin [data-act="admconfirm"]'));
    click(q('#admin [data-act="admconfirm"]')); await wait(150);
    var da = last(apiA, 'deleteAviso');
    check('confirmar apaga o aviso', !!da && da[1] === 'av1');

    click(sec('convites')); await wait(150);
    var conv = (q('#admin') || {}).textContent || '';
    check('convites mostram fundador esgotado, ativo com usos e desativado', /fundador · esgotado/.test(conv) && /ativo · 3\/10 usos/.test(conv) && /desativado/.test(conv));
    check('só o convite ativo com vaga tem Desativar', qa('[data-act="invoff"]').length === 1 && !!act('invoff', 'INV1'));
    click(act('invoff', 'INV1')); await wait(150);
    var si = last(apiA, 'setInvite');
    check('Desativar desativa o convite', !!si && si[1] === 'INV1' && si[2] === false);
    check('Gerar link de convite continua na seção Convites', !!q('#admin [data-act="newinvite"]'));
    check('Administração sem rolagem horizontal', document.documentElement.scrollWidth <= innerWidth);

    // ---- Administrador com mensagem nova (2.11.1) ----
    // Tocar em Conta abre o Perfil já em Mensagens; o desvio só se repete quando chega mensagem nova.
    var hubA = function () { return q('.tabs [data-act="tab"][data-hub]'); };
    var meA = function (n) { apiA.opt.me = { is_admin: true, suspended: false, unread_msgs: n, aviso: null }; };
    meA(2); S.tab = 'inicio'; S.msgVisto = 0; S.contaSec = 'cesta'; C.club.sec = 'inscritos'; C.club.open = null;
    await T.refreshClub(true); T.render(); await wait(80);
    click(hubA()); await wait(200);
    check('administrador com mensagem nova: a Conta abre o Perfil em Mensagens', S.tab === 'conta' && C.club.sec === 'mensagens' && !!q('.inbox-row[data-member="M"]'));
    click(q('.minitabs [data-act="tab"][data-id="cesta"]')); await wait(120);
    tab('inicio'); await wait(80); C.club.sec = 'inscritos';
    click(hubA()); await wait(150);
    check('sem mensagem nova desde o desvio, a Conta abre a última sub-aba e o ponto continua', S.tab === 'cesta' && C.club.sec === 'inscritos' && !!(hubA() && hubA().querySelector('.tdot')));
    meA(3); tab('inicio'); await T.refreshClub(true); T.render(); await wait(80);
    click(hubA()); await wait(200);
    check('mensagem nova depois do desvio: a Conta volta a abrir em Mensagens', S.tab === 'conta' && C.club.sec === 'mensagens');
    click(q('.minitabs [data-act="tab"][data-id="cesta"]')); await wait(80); tab('inicio');
    meA(0); await T.refreshClub(true); T.render(); await wait(80);
    meA(1); await T.refreshClub(true); T.render(); await wait(80); C.club.sec = 'inscritos';
    click(hubA()); await wait(200);
    check('não lidas caem e depois chega uma nova: a Conta volta a abrir em Mensagens', S.tab === 'conta' && C.club.sec === 'mensagens');

    // 2.12.1: lida em outro aparelho e chega uma nova antes de o celular atualizar (vê 2 → 1, sem ver o 0).
    meA(2); await T.refreshClub(true); S.tab = 'conta'; T.render(); await wait(80);
    click(q('.minitabs [data-act="tab"][data-id="cesta"]')); await wait(80); tab('inicio');
    meA(1); await T.refreshClub(true); T.render(); await wait(80); C.club.sec = 'inscritos';
    click(hubA()); await wait(200);
    check('lida em outro aparelho e chega uma nova sem o celular ver a queda: a Conta abre em Mensagens', S.tab === 'conta' && C.club.sec === 'mensagens');
    click(q('.minitabs [data-act="tab"][data-id="cesta"]')); await wait(80); tab('inicio'); C.club.sec = 'inscritos';
    click(hubA()); await wait(150);
    check('depois desse desvio, sem mensagem nova, a Conta abre a última sub-aba', S.tab === 'cesta' && C.club.sec === 'inscritos');

    var pf = q('.minitabs [data-act="tab"][data-id="conta"]');
    if (pf) { pf.style.flex = 'none'; pf.style.width = '46px'; }
    await wait(30);
    var dotP = pf && pf.querySelector('.tdot'), rb = pf && pf.getBoundingClientRect(), rdt = dotP && dotP.getBoundingClientRect();
    check('com o rótulo cortado, o ponto da sub-aba Perfil continua à vista',
      !!rdt && rdt.width > 0 && rdt.left >= rb.left - 0.5 && rdt.right <= rb.right + 0.5 && rdt.top >= rb.top - 0.5 && rdt.bottom <= rb.bottom + 0.5);
    if (pf) { pf.style.flex = ''; pf.style.width = ''; }
    S.tab = 'conta'; C.club.sec = 'mensagens'; T.render(); await wait(80);

    apiA.opt.meErr = { code: 'PGRST202', message: 'Could not find the function public.club_me without parameters in the schema cache' };
    await T.refreshClub(true); T.render(); await wait(120);
    var app = document.getElementById('app').textContent;
    check('sem o SQL: administrador vê o aviso de atualização do banco', /Falta aplicar a atualização do banco/.test(app));
    check('sem o SQL: Convidar amigos continua e Administração some', /Convidar amigos/.test(app) && !q('#admin'));
    apiA.opt.meErr = null;
  } catch (e) {
    check('sem exceção no teste: ' + e.message, false);
  } finally {
    if (prevApi) T.setClubApi(prevApi);
    C.sb = bk.sb; C.user = bk.user; C.profile = bk.profile; C.profileChecked = bk.checked; C.me = bk.me; C.clubMissing = bk.missing; C.club = bk.club;
    C.feed = bk.feed; C.feedAt = bk.feedAt; C.ownerMismatch = bk.mismatch; S.tab = bk.tab; S.view = bk.view; S.confirm = bk.confirm; S.contaSec = bk.sec; S.msgVisto = bk.visto;
    LS.forEach(function (k) { if (lsBk[k] == null) localStorage.removeItem(k); else localStorage.setItem(k, lsBk[k]); });
    hideToast(); T.render();
  }
  return finish();
})();
