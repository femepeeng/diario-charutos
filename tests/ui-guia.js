/* Verificações de interface do Guia de bolso, rodadas no navegador com o app aberto.
   Uso no console (ou javascript_tool): eval(await (await fetch('/tests/ui-guia.js')).text())
   Devolve {ok, falhas, resultados}. Não altera dados: só navega entre telas. */
(async function () {
  var R = [], wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function check(nome, cond) { R.push((cond ? 'ok   ' : 'FAIL ') + nome); }
  function q(s) { return document.querySelector(s); }
  function qa(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function click(el) { if (el) el.click(); }
  async function irInicio() { click(qa('[role=tab]').filter(function (b) { return b.innerText.trim() === 'Início'; })[0]); await wait(150); }

  // ---- Tarefa 1 ----
  check('abas: Início,Acervo,Histórico,Paladar,Comparar,Conta',
    qa('[role=tab]').map(function (b) { return b.innerText.trim(); }).join(',') === 'Início,Acervo,Histórico,Paladar,Comparar,Conta');
  check('aba aberta ao carregar é Início', (q('[role=tab][aria-selected=true]') || {}).innerText === 'Início');
  await irInicio();
  check('carrossel tem 7 cartões', qa('.gcard').length === 7);
  check('primeiro cartão é a Dica do dia', !!q('.gcard') && q('.gcard').textContent.indexOf('Dica do dia') >= 0);
  check('primeiro cartão é o tópico do dia', !!q('.gcard') && q('.gcard').getAttribute('data-id') === String(window.__t && __t.guideOfDay(new Date())));
  check('3 cartões têm o selo Ferramenta', qa('.gcard').filter(function (c) { return c.textContent.indexOf('Ferramenta') >= 0; }).length === 3);
  check('7 pontos indicadores', qa('.gdots i').length === 7);
  check('página sem rolagem horizontal', document.documentElement.scrollWidth <= innerWidth);
  check('cartões com alvo de toque >= 44px', qa('.gcard').every(function (c) { return c.getBoundingClientRect().height >= 44; }));

  var falhas = R.filter(function (s) { return s.indexOf('FAIL') === 0; }).length;
  return { ok: falhas === 0, falhas: falhas, resultados: R };
})();
