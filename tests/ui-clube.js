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
  function tab(id) { click(q('.tabs [data-act="tab"][data-id="' + id + '"]')); }
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
    feed: C.feed, feedAt: C.feedAt, mismatch: C.ownerMismatch, tab: S.tab, view: S.view, confirm: S.confirm };

  // Cliente Supabase falso: qualquer cadeia de métodos termina em {data: [], error: null}.
  function fakeSb() {
    var res = { data: [], error: null }, px;
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
      thread: function () { rec('thread', arguments); return ok(JSON.parse(JSON.stringify(opt.thread || []))); },
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
    S.view = 'home'; S.tab = 'inicio'; S.confirm = '';
    await T.refreshClub(true); T.render(); await wait(80);

    var tc = q('.tabs [data-act="tab"][data-id="conta"]');
    check('aba Conta avisa nova mensagem sem mudar o nome', !!tc && /nova mensagem/.test(tc.getAttribute('aria-label') || '') && tc.innerText.trim() === 'Conta');
    var ban = q('.aviso');
    check('Início mostra a faixa do aviso', !!ban && /Nova versão no ar/.test(ban.textContent));
    check('botões da faixa com 44px', qa('.aviso .btn').length === 2 && qa('.aviso .btn').every(function (b) { return b.getBoundingClientRect().height >= 44; }));
    click(act('avisook')); await wait(60);
    check('Dispensar marca o aviso como lido uma vez e tira a faixa', count(apiM, 'markAvisosRead') === 1 && !q('.aviso'));

    tab('conta'); await wait(150);
    var box = q('#msgs');
    check('Conta mostra o painel Mensagens com a conversa', !!box && /Mensagens/.test((box.querySelector('h3') || {}).textContent || '') && box.querySelectorAll('.msg').length === 2);
    check('mensagem da administração tem o rótulo Administração', !!box && qa('#msgs .msg.theirs').length === 1 && /Administração/.test(q('#msgs .msg.theirs').textContent));
    check('abrir a Conta marca a conversa como lida', !!last(apiM, 'markRead') && last(apiM, 'markRead')[1] === 'M');
    var adm = q('#msgs .msg.theirs');
    check('texto da mensagem não vira HTML nem link', !!adm && /<b>x<\/b>/.test(adm.textContent) && !adm.querySelector('b,a'));
    check('avisos aparecem na Conta', /Nova versão no ar/.test((q('#avisos') || {}).textContent || ''));

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
    check('Conta do inscrito sem rolagem horizontal', document.documentElement.scrollWidth <= innerWidth);
    type(mb2, ''); mb2.blur();

    // ---- Suspenso ----
    apiM.opt.me = { is_admin: false, suspended: true, unread_msgs: 0, aviso: null };
    await T.refreshClub(true); T.render(); await wait(120);
    check('suspenso: Conta explica a suspensão e mantém a conversa', /suspensa/.test((q('#msgs') || {}).textContent || '') && qa('#msgs .msg').length === 2);
    check('suspenso: avisos não aparecem', !q('#avisos'));
    check('suspenso: app não sincroniza', T.canSync() === false);
    click(q('[data-act="tab"][data-id="clube"]')); await wait(120);
    check('suspenso: Clube explica a suspensão no lugar do feed', /suspensa/.test(document.getElementById('app').textContent) && !q('.list article'));

    // ---- SQL da fase 2 ainda não aplicado ----
    hideToast();
    apiM.opt.meErr = { code: 'PGRST202', message: 'Could not find the function public.club_me without parameters in the schema cache' };
    S.tab = 'conta'; await T.refreshClub(true); T.render(); await wait(120);
    check('sem o SQL: some o painel Mensagens, sem toast', !q('#msgs') && toastText() === '' && C.clubMissing === true);
    tab('inicio'); await wait(80);
    check('sem o SQL: sem faixa de aviso', !q('.aviso'));
    apiM.opt.meErr = null;
  } catch (e) {
    check('sem exceção no teste: ' + e.message, false);
  } finally {
    if (prevApi) T.setClubApi(prevApi);
    C.sb = bk.sb; C.user = bk.user; C.profile = bk.profile; C.profileChecked = bk.checked; C.me = bk.me; C.clubMissing = bk.missing; C.club = bk.club;
    C.feed = bk.feed; C.feedAt = bk.feedAt; C.ownerMismatch = bk.mismatch; S.tab = bk.tab; S.view = bk.view; S.confirm = bk.confirm;
    LS.forEach(function (k) { if (lsBk[k] == null) localStorage.removeItem(k); else localStorage.setItem(k, lsBk[k]); });
    hideToast(); T.render();
  }
  return finish();
})();
