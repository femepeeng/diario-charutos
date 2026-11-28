/* Verificações de interface da nova Início (2.13.0), rodadas no navegador com o app aberto.
   Uso no console (ou javascript_tool): eval(await (await fetch('/tests/ui-inicio.js?' + Date.now())).text())
   Devolve {ok, falhas, resultados}. Não grava nada: troca charutos e sessões só na memória (syncedAt = updatedAt)
   e o gravador da sessão por um falso (__t.setSessionSaver). Tira o login do clube só na memória (cloud.user) e,
   nas verificações do Clube, usa um cliente Supabase falso e um clubApi falso, sem rede. No fim, restaura tudo. */
(async function () {
  var R = [], wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function check(nome, cond) { R.push((cond ? 'ok   ' : 'FAIL ') + nome); }
  function q(s) { return document.querySelector(s); }
  function qa(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function click(el) { if (el) el.click(); }
  function tecla(el, k) { (el || document).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); }
  function digitar(el, v) { if (!el) return; el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }
  function alto(el, min) { return !!el && el.getBoundingClientRect().height >= (min || 44) - 0.5; }
  function txt(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function folha() { return q('#inicio-folha [role="dialog"]'); }
  function linhas() { return qa('#inicio-folha [data-act="inicio-escolher"]').map(function (b) { return b.getAttribute('data-id'); }); }
  function topo(s) { var el = q(s); return el ? Math.round(el.getBoundingClientRect().top + scrollY) : -1; }
  function depois(a, b) { var x = q(a), y = q(b); return !!x && !!y && !!(x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING); }
  // Cliente Supabase falso (o mesmo do ui-clube): qualquer cadeia de métodos termina em erro, sem rede.
  function fakeSb() {
    var res = { data: null, error: { message: 'cliente falso: chamada não esperada no teste' } }, px;
    px = new Proxy(function () {}, { get: function (t, p) {
      if (p === 'then') return function (ok, ko) { return Promise.resolve(res).then(ok, ko); };
      return function () { return px; };
    }, apply: function () { return px; } });
    return px;
  }
  // clubApi falso: devolve o mesmo "me" do teste e listas vazias; registra as chamadas.
  function fakeApi(me) {
    var calls = [], ok = function (d) { return Promise.resolve({ data: d, error: null }); };
    function rec(n) { calls.push(n); }
    return { calls: calls,
      me: function () { rec('me'); return ok(JSON.parse(JSON.stringify(me()))); },
      thread: function () { rec('thread'); return ok([]); }, avisos: function () { rec('avisos'); return ok([]); },
      members: function () { rec('members'); return ok([]); }, invites: function () { rec('invites'); return ok([]); },
      markRead: function () { rec('markRead'); return ok(null); }, markAvisosRead: function () { rec('markAvisosRead'); return ok(null); } };
  }

  var S = __t.state, C = __t.cloud, up = Date.now(), nGrav = 0, gravAntes = null, apiAntes = null, visDef = false;
  var bk = { c: S.cigars, s: S.sessions, tab: S.tab, view: S.view, step: S.step, missao: S.proximaMissao, sec: S.contaSec, visto: S.msgVisto };
  var bkC = { sb: C.sb, user: C.user, profile: C.profile, checked: C.profileChecked, me: C.me, missing: C.clubMissing, feed: C.feed, likes: C.likes,
    comments: C.comments, feedAt: C.feedAt, membros: C.membros, configured: C.configured, authMode: C.authMode, mismatch: C.ownerMismatch, club: C.club };
  var CIG = [
    { id: 'ui-a', name: 'Partagás Serie D Nº 4', status: 'estoque', order: 2, origin: 'Cuba', strength: 4, vitola: '124 x 50', updatedAt: up, syncedAt: up },
    { id: 'ui-b', name: 'Bolívar Royal Corona', status: 'cesta', order: 1, origin: 'Cuba', strength: 4, updatedAt: up, syncedAt: up },
    { id: 'ui-c', name: 'Oliva Serie V Melanio', status: 'estoque', order: 3, origin: 'Nicarágua', strength: 4, updatedAt: up, syncedAt: up }];
  var hoje = new Date(), tresDias = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 3, 20, 0).toISOString();
  var TERCOS = function () { return [{ notes: [], intensity: 0, text: '' }, { notes: [], intensity: 0, text: '' }, { notes: [], intensity: 0, text: '' }]; };
  var FEITA = { id: 'ui-feita', cigarId: 'ui-c', cigarName: 'Oliva Serie V Melanio', status: 'concluida', visibility: 'private', rating: 7.5,
    createdAt: tresDias, endedAt: tresDias, thirds: [], timer: { acc: 0, running: false }, updatedAt: up, syncedAt: up };
  var VIVA = { id: 'ui-viva', cigarId: 'ui-a', cigarName: 'Partagás Serie D Nº 4', status: 'aberta', visibility: 'private', moment: 'Entardecer',
    createdAt: new Date(up - 65000).toISOString(), thirds: TERCOS(), timer: { acc: 0, running: true, resumedAt: up - 65000 }, updatedAt: up, syncedAt: up };
  var iso = function (min) { return new Date(up - min * 60000).toISOString(); };
  var FEED = [
    { uid: 'ui-p1', owner_id: 'UI-ANA', cigar_name: 'Partagás Serie D Nº 4', started_at: iso(1620), ended_at: iso(1560), rating: 9, profiles: { display_name: 'Ana' },
      thirds: [{ notes: ['Cedro', 'Cacau'] }, { notes: ['Pimenta-do-reino', 'Cedro'] }, { notes: ['Couro'] }] },
    { uid: 'ui-p2', owner_id: 'UI-BRU', cigar_name: 'Romeo y Julieta Short Churchill', started_at: iso(3000), ended_at: iso(2940), rating: 8, profiles: { display_name: 'Bruno' }, thirds: [] },
    { uid: 'ui-p3', owner_id: 'UI-CAR', cigar_name: 'Terceira degustação', started_at: iso(5000), ended_at: iso(4900), rating: 7, profiles: { display_name: 'Carla' }, thirds: [] }];
  var ME = null;
  function membro(me) {
    C.sb = fakeSb(); C.user = { id: 'UI-EU', email: 'ui-eu@teste.local' }; C.profile = { id: 'UI-EU', display_name: 'Eu Teste', is_admin: false };
    C.profileChecked = true; C.ownerMismatch = false; C.clubMissing = false; ME = me; C.me = JSON.parse(JSON.stringify(me)); C.feedAt = Date.now();
  }
  try {
    C.user = null;  // sem login de verdade durante o teste: nenhum toque ou desenho chama o clube
    gravAntes = __t.setSessionSaver(function () { nGrav++; return Promise.resolve(true); });
    S.cigars = CIG.slice(); S.sessions = []; S.tab = 'inicio'; S.view = 'home'; __t.render(); await wait(120);

    // ---- Folha "Iniciar sessão" (Task 2) ----
    var abrir = q('[data-act="inicio-abrir"]');
    click(abrir); await wait(80);
    check('Iniciar sessão abre a folha com o foco na primeira aba',
      !!folha() && folha().getAttribute('aria-modal') === 'true' && !!document.activeElement && document.activeElement.getAttribute('data-act') === 'inicio-aba');
    check('a aba Estoque lista só o estoque, na ordem do Acervo', linhas().join(',') === 'ui-a,ui-c');
    check('Começar fica desativado até escolher', !!q('[data-act="inicio-comecar"]') && q('[data-act="inicio-comecar"]').disabled);
    click(q('[data-act="inicio-aba"][data-v="acervo"]')); await wait(60);
    var bu = q('#inicio-busca'); if (bu) bu.focus();
    digitar(bu, 'partagas'); await wait(60);
    check('a busca do Acervo ignora acento', linhas().join(',') === 'ui-a' && document.activeElement === q('#inicio-busca'));
    click(q('[data-act="inicio-aba"][data-v="avulso"]')); await wait(60);
    digitar(q('#inicio-avulso'), 'Robusto da casa'); await wait(60);
    check('o avulso libera Começar com o nome', !!q('[data-act="inicio-comecar"]') && !q('[data-act="inicio-comecar"]').disabled);
    check('alvos de 44 px na folha e 56 px em Começar',
      qa('#inicio-folha button').filter(function (b) { return b.offsetParent; }).every(function (b) { return alto(b); }) && alto(q('[data-act="inicio-comecar"]'), 56));
    tecla(document.activeElement, 'Escape'); await wait(60);
    check('Esc fecha e devolve o foco ao botão', !folha() && document.activeElement === q('[data-act="inicio-abrir"]'));

    click(q('[data-act="inicio-abrir"]')); await wait(80);
    click(q('[data-act="inicio-escolher"][data-id="ui-c"]')); await wait(40);
    click(q('[data-act="inicio-momento"][data-v="Fim de noite"]')); await wait(40);
    click(q('[data-act="inicio-comecar"]')); await wait(150);
    var d = __t.sessao();
    check('Começar abre a sessão pelo gravador falso, com o charuto e o momento escolhidos',
      S.view === 'session' && !!d && d.cigarId === 'ui-c' && d.moment === 'Fim de noite' && nGrav >= 1 && !folha());
    __t.sessao(null); S.tab = 'inicio'; S.view = 'home'; __t.render(); await wait(80);

    // Com sessão aberta o herói não tem "Iniciar sessão": o caso real é a sessão aberta chegar (de outro aparelho,
    // pela sincronização) com a folha já aberta.
    click(q('[data-act="inicio-abrir"]')); await wait(80);
    click(q('[data-act="inicio-aba"][data-v="avulso"]')); await wait(40);
    digitar(q('#inicio-avulso'), 'Outro'); await wait(40);
    S.sessions = [{ id: 'ui-aberta', cigarName: 'Sessão aberta', status: 'aberta', visibility: 'private', createdAt: new Date().toISOString(), thirds: [], timer: { acc: 0, running: false }, updatedAt: up, syncedAt: up }];
    __t.render(); await wait(60);
    var nAntes = nGrav;
    click(q('[data-act="inicio-comecar"]')); await wait(120);
    check('com sessão aberta, Começar avisa e não troca a sessão',
      S.view === 'home' && nGrav === nAntes && /Termine ou retome a sessão em andamento primeiro/.test((q('#toast') || {}).textContent || ''));
    if (folha()) tecla(document, 'Escape');

    // ---- Herói sem sessão (Task 3) ----
    S.cigars = CIG.slice(); S.sessions = [FEITA]; S.tab = 'inicio'; S.view = 'home'; __t.render(); await wait(100);
    var he = q('.heroi'), sug = q('.heroi .sug[data-act="inicio-abrir"]');
    check('herói sem sessão: Iniciar sessão com 56 px, sugestão e última sessão',
      !!he && /Pronto para acender\?/.test(txt(he)) && /Escolha o charuto e comece a sessão/.test(txt(he)) &&
      alto(q('.heroi .acender[data-act="inicio-abrir"]'), 56) && !!sug && sug.getAttribute('data-id') === 'ui-a' &&
      /Sugestão do seu estoque/.test(txt(sug)) && /Partagás Serie D Nº 4/.test(txt(sug)) && alto(sug) &&
      txt(q('.heroi .ultima')) === 'Última sessão: Oliva Serie V Melanio · nota 7,5 · há 3 dias');
    S.cigars = [CIG[1]]; __t.render(); await wait(60);
    check('a sugestão do herói só vem do estoque (a Cesta é lista de compra)', !!q('.heroi') && !q('.heroi .sug'));
    S.cigars = CIG.slice(); __t.render(); await wait(60);
    click(q('.heroi .sug')); await wait(80);
    var esc1 = q('[data-act="inicio-escolher"][data-id="ui-a"]'), abaE = q('[data-act="inicio-aba"][data-v="estoque"]');
    check('tocar na sugestão abre a folha com o charuto escolhido',
      !!folha() && !!esc1 && esc1.getAttribute('aria-pressed') === 'true' && !!abaE && abaE.getAttribute('aria-pressed') === 'true' &&
      !!q('[data-act="inicio-comecar"]') && !q('[data-act="inicio-comecar"]').disabled);
    tecla(document.activeElement, 'Escape'); await wait(60);
    check('fechar a folha aberta pela sugestão devolve o foco à sugestão', !folha() && document.activeElement === q('.heroi .sug'));

    // ---- Herói com sessão aberta ----
    S.sessions = [FEITA, VIVA]; __t.render(); await wait(80);
    var rel = q('#heroi-relogio'), heA = q('.heroi');
    check('herói com sessão aberta: relógio, Retomar e Encerrar, e sem o cartão de cima',
      !!rel && /^\d\d:\d\d:\d\d$/.test(txt(rel)) && /Sessão em andamento/.test(txt(heA)) && /Partagás Serie D Nº 4/.test(txt(heA)) && /Entardecer/.test(txt(heA)) &&
      !!q('.heroi [data-act="resume"][data-id="ui-viva"]') && /Retomar sessão/.test(txt(q('.heroi [data-act="resume"]'))) && alto(q('.heroi [data-act="resume"]')) &&
      !!q('.heroi [data-act="inicio-encerrar"]') && alto(q('.heroi [data-act="inicio-encerrar"]')) &&
      !q('#app .card.live') && !q('.heroi [data-act="inicio-abrir"]'));
    var topoIni = topo('.tabs');
    S.tab = 'acervo'; __t.render(); await wait(80);
    check('nas outras abas o cartão de sessão continua, abaixo da barra, e a barra não sai do lugar',
      !!q('#app .card.live') && depois('.tabs', '.card.live') && topoIni >= 0 && topo('.tabs') === topoIni);
    S.tab = 'inicio'; __t.render(); await wait(60);
    var t1 = txt(q('#heroi-relogio')); await wait(1250);
    var t2 = txt(q('#heroi-relogio')), corre = __t.inicioTick && __t.inicioTick();
    S.tab = 'acervo'; __t.render(); await wait(60);
    check('o relógio corre na Início e para fora dela', !!t1 && t1 !== t2 && corre === true && __t.inicioTick() === false);
    S.tab = 'inicio'; __t.render(); await wait(60);
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: function () { return 'hidden'; } }); visDef = true;
    document.dispatchEvent(new Event('visibilitychange')); await wait(30);
    var parado = __t.inicioTick() === false;
    delete document.visibilityState; visDef = false;
    document.dispatchEvent(new Event('visibilitychange')); await wait(30);
    check('com a página escondida o relógio para, e volta quando ela aparece', parado && __t.inicioTick() === true);
    click(q('.heroi [data-act="inicio-encerrar"]')); await wait(150);
    var de = __t.sessao();
    check('Encerrar entra na sessão no Fechamento', S.view === 'session' && !!de && de.id === 'ui-viva' && S.step === 3);
    __t.sessao(null); S.tab = 'inicio'; S.view = 'home'; __t.render(); await wait(60);

    // ---- Diário vazio ----
    S.cigars = []; S.sessions = []; __t.render(); await wait(80);
    var bv = q('.heroi .gwelcome');
    var vazioOk = !!bv && /Seu diário está vazio\. Adicione o primeiro charuto ou importe um backup\./.test(txt(bv)) &&
      !!bv.querySelector('[data-act="novo-charuto"]') && !!bv.querySelector('#import-file') && qa('.gwelcome').length === 1;
    click(q('.heroi .acender')); await wait(80);
    var abaAv = q('[data-act="inicio-aba"][data-v="avulso"]');
    check('diário vazio: a linha de boas-vindas fica dentro do herói e a folha abre no Avulso',
      vazioOk && !!abaAv && abaAv.getAttribute('aria-pressed') === 'true' && !!q('#inicio-avulso'));
    tecla(document.activeElement, 'Escape'); await wait(60);

    // ---- Seu diário ----
    S.proximaMissao = null; __t.render(); await wait(60);
    var m1 = S.proximaMissao; __t.render(); await wait(40);
    check('sem sessão concluída: "Missão da primeira sessão", sorteada uma vez',
      !!m1 && S.proximaMissao === m1 && /Missão da primeira sessão:/.test(txt(q('.diario'))));
    S.cigars = CIG.slice(); S.sessions = [FEITA]; S.proximaMissao = 'madeira'; __t.render(); await wait(80);
    var lr = 0; try { lr = (JSON.parse(localStorage.getItem('diario-licoes') || '[]') || []).length; } catch (e) {}
    var xp = 10 + 5 * lr, LV = [[0, 'Iniciante'], [40, 'Apreciador'], [120, 'Conhecedor'], [250, 'Aficionado'], [450, 'Mestre']], li = 0;
    for (var k = 0; k < LV.length; k++) if (xp >= LV[k][0]) li = k;
    var sd = q('.diario'), sdt = txt(sd), falta = LV[li + 1] ? 'Faltam ' + (LV[li + 1][0] - xp) + ' pontos.' : 'Nível máximo';
    check('Seu diário: barra, faltam N pontos, conquistas e missão',
      !!sd && !!sd.querySelector('.xpbar[role="img"]') && sdt.indexOf(falta) >= 0 && /\d+ de 15 conquistas/.test(sdt) &&
      /Missão da próxima sessão: Madeira e fumaça/.test(sdt) && !!sd.querySelector('[data-act="tab"][data-id="paladar"]') &&
      depois('.heroi', '.diario'));

    // ---- Clube na Início ----
    apiAntes = __t.setClubApi(fakeApi(function () { return ME; }));
    C.club = { thread: [], avisos: [], members: [], invites: [], sec: 'inscritos', open: null, at: 0, sending: false, drafts: {} };
    membro({ is_admin: false, suspended: false, unread_msgs: 2, aviso: { id: 'av-ui', body: 'Encontro no sábado.', created_at: iso(30) } });
    C.membros = 8; C.feed = FEED.slice(); C.likes = { 'ui-p1': ['UI-EU', 'UI-BRU'] }; C.comments = { 'ui-p1': [{ id: 'c1', user_id: 'UI-BRU', body: 'Boa!' }] };
    S.tab = 'inicio'; S.view = 'home'; __t.render(); await wait(80);
    var cl = q('.iclube'), posts = cl ? cl.querySelectorAll('.ipost') : [];
    var msgs = cl && cl.querySelector('[data-act="inicio-msgs"]'), lk1 = posts[0] && posts[0].querySelector('[data-act="like"]');
    check('clube como membro: mensagens com selo, aviso, membros e 2 degustações com Brindar',
      !!cl && /8 membros/.test(txt(cl)) && !!msgs && /Mensagens/.test(txt(msgs)) && txt(msgs.querySelector('.bdg')) === '2' &&
      !!cl.querySelector('[data-act="inicio-avisos"]') && !!cl.querySelector('.aviso') && /Encontro no sábado\./.test(txt(cl.querySelector('.aviso'))) &&
      posts.length === 2 && Array.prototype.every.call(posts, function (p) { var l = p.querySelector('[data-act="like"]'), c = p.querySelector('[data-act="post"]');
        return !!l && /Brindar/.test(txt(l)) && !!c && /^Comentários/.test(txt(c)); }) &&
      !!lk1 && lk1.getAttribute('aria-pressed') === 'true' && /\b2\b/.test(txt(lk1)) && /Comentários 1/.test(txt(posts[0])) &&
      posts[0].querySelectorAll('.chip').length === 3 && !!cl.querySelector('[data-act="tab"][data-id="clube"]') && depois('.heroi', '.iclube'));
    check('alvos de 44 px no Clube', !!cl && Array.prototype.every.call(cl.querySelectorAll('button'), function (b) { return alto(b); }));
    click(msgs); await wait(150);
    check('Mensagens abre o Perfil', S.tab === 'conta' && !!q('#msgs'));
    S.tab = 'inicio'; S.view = 'home'; C.me = JSON.parse(JSON.stringify(ME)); __t.render(); await wait(60);
    click(q('.iclube [data-act="inicio-avisos"]')); await wait(150);
    check('Avisos abre o Perfil na seção de avisos', S.tab === 'conta' && !!q('#avisos'));
    S.tab = 'inicio'; S.view = 'home'; C.me = JSON.parse(JSON.stringify(ME)); C.feed = []; C.membros = null; __t.render(); await wait(60);
    cl = q('.iclube');
    check('membro sem feed e sem contagem: mensagem de vazio e sem linha de membros',
      !!cl && /Nenhuma degustação compartilhada ainda\./.test(txt(cl)) && !/membro/.test(txt(cl.querySelector('.isec-h'))) && !cl.querySelector('.ipost'));
    C.user = null; C.profile = null; C.me = null; __t.render(); await wait(60);
    var cv = q('.iconvite');
    check('sem login: cartão de convite com Entrar com convite',
      !!cv && !q('.iclube') && /Clube do Diário/.test(txt(cv)) && /Grupo fechado, por convite, para maiores de 18 anos/.test(txt(cv)) &&
      cv.querySelectorAll('li').length === 3 && /Compartilhe suas degustações com os amigos/.test(txt(cv)) && /Veja quem está fumando agora/.test(txt(cv)) &&
      /Brinde, comente e troque mensagens/.test(txt(cv)) && /Entrar com convite/.test(txt(cv.querySelector('[data-act="inicio-clube"][data-v="criar"]'))) &&
      /Já tenho conta/.test(txt(cv.querySelector('[data-act="inicio-clube"][data-v="entrar"]'))) &&
      Array.prototype.every.call(cv.querySelectorAll('button'), function (b) { return alto(b); }));
    click(q('.iconvite [data-v="criar"]')); await wait(120);
    var criar = S.tab === 'conta' && C.authMode === 'criar' && !!q('#au-code');
    S.tab = 'inicio'; __t.render(); await wait(60);
    click(q('.iconvite [data-v="entrar"]')); await wait(120);
    check('Entrar com convite e Já tenho conta abrem o Perfil, em Criar conta e em Entrar', criar && S.tab === 'conta' && C.authMode === 'entrar' && !q('#au-code'));
    S.tab = 'inicio'; membro({ is_admin: false, suspended: true, unread_msgs: 0, aviso: null }); C.feed = FEED.slice(); C.membros = 8; __t.render(); await wait(60);
    cl = q('.iclube');
    check('suspenso: a linha de suspensão',
      !!cl && /Sua participação no clube está suspensa\. O diário deste celular continua funcionando\./.test(txt(cl)) &&
      !cl.querySelector('.ipost') && !cl.querySelector('[data-act="inicio-msgs"]'));
    C.configured = false; __t.render(); await wait(60);
    check('clube não configurado: sem a seção', !q('.iclube') && !q('.iconvite'));
    C.configured = bkC.configured;

    // ---- Largura ----
    membro({ is_admin: false, suspended: false, unread_msgs: 12, aviso: { id: 'av-ui2', body: 'Aviso com uma palavra longuíssima: Supercalifragilisticexpialidocious-e-mais-um-pouco.', created_at: iso(5) } });
    C.membros = 128; C.feed = FEED.slice(); C.feed[0] = Object.assign({}, FEED[0], { cigar_name: 'Arturo Fuente Opus X Perfecxion Nº 2 Edição Especial de Aniversário', profiles: { display_name: 'Maria Aparecida dos Santos Sobrenome Comprido' } });
    S.sessions = [FEITA, Object.assign({}, VIVA, { cigarName: 'Arturo Fuente Opus X Perfecxion Nº 2 Edição Especial de Aniversário' })]; S.tab = 'inicio'; __t.render(); await wait(100);
    check('Início sem rolagem horizontal a ' + innerWidth + ' px', document.documentElement.scrollWidth <= innerWidth);
  } catch (e) {
    check('sem exceção no teste: ' + e.message, false);
  } finally {
    if (visDef) { try { delete document.visibilityState; } catch (e) {} }
    if (folha()) tecla(document, 'Escape');
    if (__t.sessao && __t.sessao()) __t.sessao(null);
    if (gravAntes && __t.setSessionSaver) __t.setSessionSaver(gravAntes);
    if (apiAntes && __t.setClubApi) __t.setClubApi(apiAntes);
    C.sb = bkC.sb; C.user = bkC.user; C.profile = bkC.profile; C.profileChecked = bkC.checked; C.me = bkC.me; C.clubMissing = bkC.missing;
    C.feed = bkC.feed; C.likes = bkC.likes; C.comments = bkC.comments; C.feedAt = bkC.feedAt; C.membros = bkC.membros; C.configured = bkC.configured;
    C.authMode = bkC.authMode; C.ownerMismatch = bkC.mismatch; C.club = bkC.club;
    S.cigars = bk.c; S.sessions = bk.s; S.tab = bk.tab; S.view = bk.view; S.step = bk.step; S.proximaMissao = bk.missao; S.contaSec = bk.sec; S.msgVisto = bk.visto;
    var t = q('#toast'); if (t) t.hidden = true;
    __t.render(); await wait(80);
  }
  var falhas = R.filter(function (s) { return s.indexOf('FAIL') === 0; }).length;
  return { ok: falhas === 0, falhas: falhas, resultados: R };
})();
