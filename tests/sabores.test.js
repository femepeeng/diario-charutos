// Testes da roda de sabores: taxonomia, missões, busca e desenho da roda.
// Uso: node tests/sabores.test.js
// Avalia, num sandbox vm, os trechos de index.html entre /* @pure:base */ e /* @end:base */ e entre /* @pure:sabores */ e /* @end:sabores */.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const pick = tag => [...html.matchAll(new RegExp('\\/\\* @pure:' + tag + ' \\*\\/([\\s\\S]*?)\\/\\* @end:' + tag + ' \\*\\/', 'g'))].map(m => m[1]);
const NOMES = ['FAMILIES', 'NOTA_INFO', 'LEGACY_MISSAO', 'MISSION_FAMS', 'normSabor', 'famOf', 'famById', 'sessNotes', 'missionHit', 'missionDone', 'buscaSabores',
  'RODA', 'rodaPt', 'rodaArc', 'rodaLinhas', 'rodaRot', 'rodaSvg', 'rodaCartao', 'rodaChips', 'rodaBuscaHtml', 'missaoCartao'];
const sb = {};
vm.createContext(sb);
vm.runInContext(pick('base').concat(pick('sabores')).join('\n') + '\nthis.__x={' + NOMES.map(n => n + ':typeof ' + n + '!=="undefined"?' + n + ':undefined').join(',') + '};', sb);
const X = sb.__x;
/* O que vem do sandbox tem outro Array.prototype; vira JSON simples antes de comparar. */
const plain = v => JSON.parse(JSON.stringify(v));

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ok   ' + name); }
  catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + e.message); }
}

console.log('Roda de sabores: taxonomia, missões e busca');

// ---- Tarefa 1 ----
const IDS = ['fruta', 'flor', 'planta', 'especiaria', 'terra', 'madeira', 'tostado', 'cacau', 'castanha', 'doce', 'gosto'];
/* Os 28 sabores de antes da roda e a família de cada um na roda. */
const ATUAIS = {
  'Doce': 'gosto', 'Mel': 'doce', 'Baunilha': 'doce', 'Creme': 'doce', 'Caramelo': 'doce', 'Coco': 'doce',
  'Castanha': 'castanha', 'Amêndoa': 'castanha', 'Amendoim': 'castanha',
  'Cedro': 'madeira', 'Carvalho': 'madeira', 'Tostado': 'tostado',
  'Terroso': 'terra', 'Couro': 'terra', 'Feno': 'planta',
  'Cacau': 'cacau', 'Café': 'cacau', 'Chocolate amargo': 'cacau',
  'Pimenta': 'especiaria', 'Canela': 'especiaria', 'Cravo': 'especiaria',
  'Frutas secas': 'fruta', 'Cítrico': 'fruta', 'Floral': 'flor',
  'Salgado': 'gosto', 'Ácido': 'gosto', 'Amargo': 'gosto', 'Umami': 'gosto'
};
const todas = () => X.FAMILIES.reduce((a, f) => a.concat(f.notes), []);
const ses = (mission, notes) => ({ mission: mission, thirds: [{ notes: notes }, { notes: [] }, { notes: [] }] });

test('taxonomia: 11 famílias na ordem do desenho', () => {
  assert.ok(Array.isArray(X.FAMILIES), 'FAMILIES não encontrado no bloco @pure:sabores');
  assert.deepStrictEqual(plain(X.FAMILIES.map(f => f.id)), IDS);
});
test('taxonomia: 80 opções sem nome repetido', () => {
  const t = todas();
  assert.strictEqual(t.length, 80);
  assert.strictEqual(new Set(t).size, 80);
});
test('taxonomia: opções por família', () => {
  assert.deepStrictEqual(plain(X.FAMILIES.map(f => f.notes.length)), [10, 4, 7, 12, 6, 5, 4, 8, 7, 8, 9]);
});
test('os 28 sabores de hoje continuam na roda', () => {
  const nomes = Object.keys(ATUAIS);
  assert.strictEqual(nomes.length, 28);
  nomes.forEach(n => assert.ok(X.famOf(n), n + ' sem família'));
});
test('os 28 sabores mudam de família só onde o desenho manda', () => {
  Object.keys(ATUAIS).forEach(n => assert.strictEqual(X.famOf(n).id, ATUAIS[n], n));
});
test('famílias e opções têm os textos do desenho', () => {
  X.FAMILIES.forEach(f => {
    ['label', 'short', 'desc', 'treino'].forEach(k => assert.ok(typeof f[k] === 'string' && f[k].trim(), f.id + '.' + k));
    assert.ok(/^#[0-9A-F]{6}$/i.test(f.color), f.id + '.color');
  });
  todas().forEach(n => assert.ok(X.NOTA_INFO[n] && X.NOTA_INFO[n].l && X.NOTA_INFO[n].l.trim(), n + ' sem "lembra"'));
  assert.strictEqual(X.NOTA_INFO['Cedro'].l, 'A madeira do lápis recém-apontado e da caixa de charutos.');
  assert.strictEqual(X.famById('gosto').label, 'Boca: gostos e sensações');
  assert.strictEqual(X.famById('madeira').short, 'Madeira');
});
test('opção geral: no máximo uma por família e sempre a primeira', () => {
  const gerais = [];
  X.FAMILIES.forEach(f => {
    const g = f.notes.filter(n => X.NOTA_INFO[n].g);
    assert.ok(g.length <= 1, f.id + ' tem ' + g.length + ' opções gerais');
    if (g.length) { assert.strictEqual(f.notes[0], g[0], f.id); gerais.push(g[0]); }
  });
  assert.deepStrictEqual(gerais, ['Frutado', 'Floral', 'Vegetal', 'Pimenta', 'Terroso', 'Amadeirado', 'Tostado', 'Castanha', 'Adocicado']);
});
test('Boca tem 5 gostos e 4 sensações', () => {
  ['Doce', 'Salgado', 'Ácido', 'Amargo', 'Umami'].forEach(n => assert.strictEqual(X.NOTA_INFO[n].k, 'gosto', n));
  ['Áspero', 'Seco', 'Picante', 'Cremoso'].forEach(n => assert.strictEqual(X.NOTA_INFO[n].k, 'sensacao', n));
  assert.strictEqual(todas().filter(n => X.NOTA_INFO[n].k === 'aroma').length, 71);
});
test('MISSION_FAMS são as 10 famílias de aroma', () => {
  assert.deepStrictEqual(plain(X.MISSION_FAMS), IDS.filter(i => i !== 'gosto'));
});
test('missão cumprida por nota da família nova', () => {
  const s = ses('especiaria', ['Canela']);
  assert.deepStrictEqual(plain(X.missionHit(s)), ['Canela']);
  assert.strictEqual(X.missionDone(s), true);
});
test('missão antiga continua cumprida com a nota que mudou de família', () => {
  [['fruta', 'Floral'], ['terra', 'Feno'], ['madeira', 'Tostado'], ['doce', 'Doce']]
    .forEach(p => assert.strictEqual(X.missionDone(ses(p[0], [p[1]])), true, p.join(' + ')));
});
test('missão não cumprida fora da família', () => {
  assert.strictEqual(X.missionDone(ses('fruta', ['Cedro'])), false);
  assert.strictEqual(X.missionDone({ thirds: [{ notes: ['Cedro'] }] }), false);
  assert.strictEqual(X.missionDone(ses('xyz', ['Cedro'])), false);
});
test('busca acha pelos nomes da imagem', () => {
  assert.deepStrictEqual(plain(X.buscaSabores('chumbo')), ['Grafite']);
  assert.deepStrictEqual(plain(X.buscaSabores('caju')), ['Castanha de caju']);
  assert.strictEqual(X.buscaSabores('flores')[0], 'Floral');
  assert.strictEqual(X.buscaSabores('sal')[0], 'Salgado');
});
test('busca ignora acento e maiúscula', () => {
  assert.deepStrictEqual(plain(X.buscaSabores('ACUCAR')), ['Açúcar mascavo']);
  assert.deepStrictEqual(plain(X.buscaSabores('cafe').slice(0, 4)), ['Café', 'Café torrado', 'Café expresso', 'Café com leite']);
});
test('busca põe primeiro quem começa pelo texto', () => {
  assert.deepStrictEqual(plain(X.buscaSabores('noz')), ['Noz-moscada', 'Noz']);
  assert.strictEqual(X.buscaSabores('pimenta')[0], 'Pimenta');
});
test('busca vazia e limite', () => {
  assert.deepStrictEqual(plain(X.buscaSabores('')), []);
  assert.deepStrictEqual(plain(X.buscaSabores('  ')), []);
  assert.strictEqual(X.buscaSabores('a').length, 16);
  assert.strictEqual(X.buscaSabores('a', 5).length, 5);
});

// ---- Tarefa 2 ----
const conta = (s, sub) => s.split(sub).length - 1;
test('rodaPt: topo, direita e baixo', () => {
  assert.strictEqual(typeof X.rodaPt, 'function', 'rodaPt fora do bloco @pure:sabores');
  assert.deepStrictEqual(plain(X.rodaPt(10, 0)), [0, -10]);
  assert.deepStrictEqual(plain(X.rodaPt(10, 90)), [10, 0]);
  assert.deepStrictEqual(plain(X.rodaPt(10, 180)), [0, 10]);
});
test('rodaArc: fatia de 90 graus', () => {
  assert.strictEqual(X.rodaArc(10, 20, 0, 90), 'M0 -20A20 20 0 0 1 20 0L10 0A10 10 0 0 0 0 -10Z');
});
test('rodaLinhas: quebra no espaço ou no hífen mais perto do meio', () => {
  assert.deepStrictEqual(plain(X.rodaLinhas('Canela')), ['Canela']);
  assert.deepStrictEqual(plain(X.rodaLinhas('Chocolate meio amargo')), ['Chocolate', 'meio amargo']);
  assert.deepStrictEqual(plain(X.rodaLinhas('Raspas de laranja')), ['Raspas de', 'laranja']);
  assert.deepStrictEqual(plain(X.rodaLinhas('Pimenta-do-reino')), ['Pimenta-', 'do-reino']);
  assert.deepStrictEqual(plain(X.rodaLinhas('Pimenta-verde')), ['Pimenta-verde']);
  assert.deepStrictEqual(plain(X.rodaLinhas('Cacau e café')), ['Cacau', 'e café']);
});
test('rodaRot: rótulo nunca de cabeça para baixo', () => {
  assert.deepStrictEqual([0, 90, 180, 270, 330].map(a => X.rodaRot(a)), [-90, 0, 90, 0, 60]);
});
test('rodaSvg fechada', () => {
  const s = X.rodaSvg({ fam: null, sel: ['Cedro', 'Canela'], terco: '1º terço', anim: '' });
  assert.strictEqual(conta(s, 'data-act="roda-fam"'), 11);
  assert.ok(s.indexOf('aria-label="Especiarias: 12 opções, 1 marcada"') >= 0, 'rótulo de Especiarias');
  assert.ok(s.indexOf('aria-label="Frutas: 10 opções"') >= 0, 'rótulo de Frutas');
  assert.strictEqual(conta(s, 'class="sl tick"'), 80);
  assert.strictEqual(conta(s, 'A177 177'), 2);
  ['1º TERÇO', '>2<', 'marcados'].forEach(t => assert.ok(s.indexOf(t) >= 0, 'centro: ' + t));
  assert.strictEqual(conta(s, 'fcnt'), 0);
  assert.strictEqual(conta(s, 'anim-'), 0);
});
test('rodaSvg aberta', () => {
  const s = X.rodaSvg({ fam: 'especiaria', sel: ['Canela', 'Cedro'], terco: '2º terço', anim: 'in' });
  assert.strictEqual(conta(s, 'data-act="note"'), 12);
  assert.strictEqual(conta(s, 'aria-pressed="true"'), 1);
  assert.strictEqual(conta(s, 'class="chk"'), 1);
  assert.ok(s.indexOf('aria-label="Pimenta, opção geral da família"') >= 0, 'opção geral');
  assert.strictEqual((s.match(/class="[^"]*\bgen\b/g) || []).length, 1);
  ['data-act="roda-volta"', 'Especiarias', '1 de 12'].forEach(t => assert.ok(s.indexOf(t) >= 0, 'centro: ' + t));
  assert.ok(/class="[^"]*\banim-in\b/.test(s), 'anim-in');
});
test('rodaSvg aberta usa o rótulo curto quando o nome é longo', () => {
  const s = X.rodaSvg({ fam: 'gosto', sel: [], terco: '1º terço', anim: '' });
  assert.ok(s.indexOf('>Boca<') >= 0, 'Boca no centro');
  assert.ok(s.indexOf('Boca: gostos e sensações') < 0);
});
test('rodaSvg com nota fora da taxonomia', () => {
  const s = X.rodaSvg({ fam: null, sel: ['Inventado'], terco: '1º terço', anim: '' });
  assert.strictEqual(conta(s, 'data-act="roda-fam"'), 11);
  assert.strictEqual(conta(s, 'A177 177'), 0);
});
test('rodaCartao nos três estados', () => {
  let h = X.rodaCartao({ foco: null, sel: [], terco: '1º terço' });
  assert.ok(h.indexOf('Como usar a roda') >= 0 && h.indexOf('Boca') >= 0, 'ajuda');
  h = X.rodaCartao({ foco: { t: 'fam', id: 'flor' }, sel: ['Rosa'], terco: '1º terço' });
  ['Família · 4 opções', 'Flores', 'Para treinar:', 'Marcado no 1º terço: Rosa.'].forEach(t => assert.ok(h.indexOf(t) >= 0, t));
  h = X.rodaCartao({ foco: { t: 'fam', id: 'flor' }, sel: [], terco: '1º terço' });
  assert.ok(h.indexOf('Nada marcado nesta família no 1º terço.') >= 0, 'família sem nada marcado');
  h = X.rodaCartao({ foco: { t: 'note', n: 'Cedro' }, sel: [], terco: '2º terço' });
  ['<span>Aroma</span>', 'Lembra:', 'A madeira do lápis recém-apontado e da caixa de charutos.', 'Marcar no 2º terço', 'btn primary'].forEach(t => assert.ok(h.indexOf(t) >= 0, t));
  h = X.rodaCartao({ foco: { t: 'note', n: 'Cedro' }, sel: ['Cedro'], terco: '2º terço' });
  assert.ok(h.indexOf('Desmarcar do 2º terço') >= 0 && h.indexOf('btn primary') < 0, 'desmarcar');
  assert.ok(X.rodaCartao({ foco: { t: 'note', n: 'Frutado' }, sel: [], terco: '1º terço' }).indexOf('Opção geral:') >= 0, 'opção geral');
  assert.ok(X.rodaCartao({ foco: { t: 'note', n: 'Amargo' }, sel: [], terco: '1º terço' }).indexOf('<span>Gosto</span>') >= 0, 'gosto');
  assert.ok(X.rodaCartao({ foco: { t: 'note', n: 'Seco' }, sel: [], terco: '1º terço' }).indexOf('<span>Sensação</span>') >= 0, 'sensação');
});
test('rodaCartao com nota fora da taxonomia ou família desconhecida', () => {
  const h = X.rodaCartao({ foco: { t: 'note', n: 'Inventado' }, sel: ['Inventado'], terco: '1º terço' });
  assert.ok(h.indexOf('Inventado') >= 0 && h.indexOf('Desmarcar do 1º terço') >= 0, 'nota fora da roda');
  assert.ok(X.rodaCartao({ foco: { t: 'fam', id: 'xyz' }, sel: [], terco: '1º terço' }).indexOf('Como usar a roda') >= 0, 'família desconhecida');
});
test('rodaChips', () => {
  assert.ok(X.rodaChips([]).indexOf('Nada marcado ainda.') >= 0);
  const h = X.rodaChips(['Cedro', 'Inventado']);
  assert.ok(h.indexOf('Neste terço · 2') >= 0, 'título');
  assert.strictEqual(conta(h, 'data-act="note"'), 2);
  assert.ok(h.indexOf('aria-label="Tirar Cedro"') >= 0, 'rótulo acessível');
  assert.ok(/background:#999"><\/span>Inventado/.test(h), 'ponto cinza no Inventado');
});
test('rodaBuscaHtml', () => {
  assert.strictEqual(X.rodaBuscaHtml('', []), '');
  assert.ok(X.rodaBuscaHtml('xyz', []).indexOf('Nenhum sabor com “xyz”.') >= 0, 'sem resultado');
  const h = X.rodaBuscaHtml('chumbo', ['Grafite']);
  ['data-val="Grafite"', 'data-abre', 'aria-pressed="true"'].forEach(t => assert.ok(h.indexOf(t) >= 0, t));
  assert.ok(X.rodaBuscaHtml('<b>', []).indexOf('&lt;b&gt;') >= 0, 'escapa o texto buscado');
});
test('missaoCartao', () => {
  assert.strictEqual(X.missaoCartao({ thirds: [] }), '');
  assert.strictEqual(X.missaoCartao(ses('xyz', [])), '');
  let h = X.missaoCartao(ses('flor', []));
  ['Missão de aroma: Flores', 'Abra Flores na roda e procure as 4 opções ao longo da sessão.', 'data-act="roda-fam" data-id="flor"', 'Abrir na roda']
    .forEach(t => assert.ok(h.indexOf(t) >= 0, t));
  h = X.missaoCartao(ses('fruta', ['Floral']));
  assert.ok(h.indexOf('Missão cumprida: Frutas') >= 0 && h.indexOf('Você marcou Floral. +5 pontos.') >= 0, 'cumprida');
});

console.log(`\n${pass} ok, ${fail} falha(s)`);
process.exit(fail ? 1 : 0);
