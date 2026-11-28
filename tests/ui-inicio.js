/* Verificações de interface da nova Início (2.13.0), rodadas no navegador com o app aberto.
   Uso no console (ou javascript_tool): eval(await (await fetch('/tests/ui-inicio.js?' + Date.now())).text())
   Devolve {ok, falhas, resultados}. Não grava nada: troca charutos e sessões só na memória (syncedAt = updatedAt)
   e o gravador da sessão por um falso (__t.setSessionSaver). No fim, restaura tudo. */
(async function () {
  var R = [], wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function check(nome, cond) { R.push((cond ? 'ok   ' : 'FAIL ') + nome); }
  function q(s) { return document.querySelector(s); }
  function qa(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function click(el) { if (el) el.click(); }
  function tecla(el, k) { (el || document).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); }
  function digitar(el, v) { if (!el) return; el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }
  function alto(el, min) { return !!el && el.getBoundingClientRect().height >= (min || 44) - 0.5; }
  function folha() { return q('#inicio-folha [role="dialog"]'); }
  function linhas() { return qa('#inicio-folha [data-act="inicio-escolher"]').map(function (b) { return b.getAttribute('data-id'); }); }

  var S = __t.state, up = Date.now(), nGrav = 0, gravAntes = null;
  var bk = { c: S.cigars, s: S.sessions, tab: S.tab, view: S.view };
  var CIG = [
    { id: 'ui-a', name: 'Partagás Serie D Nº 4', status: 'estoque', order: 2, origin: 'Cuba', strength: 4, vitola: '124 x 50', updatedAt: up, syncedAt: up },
    { id: 'ui-b', name: 'Bolívar Royal Corona', status: 'cesta', order: 1, origin: 'Cuba', strength: 4, updatedAt: up, syncedAt: up },
    { id: 'ui-c', name: 'Oliva Serie V Melanio', status: 'estoque', order: 3, origin: 'Nicarágua', strength: 4, updatedAt: up, syncedAt: up }];
  try {
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

    S.sessions = [{ id: 'ui-aberta', cigarName: 'Sessão aberta', status: 'aberta', visibility: 'private', createdAt: new Date().toISOString(), thirds: [], timer: { acc: 0, running: false }, updatedAt: up, syncedAt: up }];
    __t.render(); await wait(60);
    var nAntes = nGrav;
    click(q('[data-act="inicio-abrir"]')); await wait(80);
    click(q('[data-act="inicio-aba"][data-v="avulso"]')); await wait(40);
    digitar(q('#inicio-avulso'), 'Outro'); await wait(40);
    click(q('[data-act="inicio-comecar"]')); await wait(120);
    check('com sessão aberta, Começar avisa e não troca a sessão',
      S.view === 'home' && nGrav === nAntes && /Termine ou retome a sessão em andamento primeiro/.test((q('#toast') || {}).textContent || ''));
    S.sessions = [];
  } catch (e) {
    check('sem exceção no teste: ' + e.message, false);
  } finally {
    if (folha()) tecla(document, 'Escape');
    if (__t.sessao && __t.sessao()) __t.sessao(null);
    if (gravAntes && __t.setSessionSaver) __t.setSessionSaver(gravAntes);
    S.cigars = bk.c; S.sessions = bk.s; S.tab = bk.tab; S.view = bk.view;
    var t = q('#toast'); if (t) t.hidden = true;
    __t.render(); await wait(80);
  }
  var falhas = R.filter(function (s) { return s.indexOf('FAIL') === 0; }).length;
  return { ok: falhas === 0, falhas: falhas, resultados: R };
})();
