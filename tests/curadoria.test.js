// Testes das funções puras da curadoria: Catálogo da aba Cesta (ex-Para provar) e parecidos do Lado a lado.
// Uso: node tests/curadoria.test.js
// Avalia, num sandbox vm, os trechos de index.html entre /* @pure:curadoria */ e /* @end:curadoria */.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const blocks = [...html.matchAll(/\/\* @pure:curadoria \*\/([\s\S]*?)\/\* @end:curadoria \*\//g)].map(m => m[1]);
const sb = {};
vm.createContext(sb);
const NOMES = ['WRAPPERS', 'parseVitola', 'vitolaClass', 'CAT_LINES', 'CAT_ITEMS', 'normName', 'countryOf', 'matchLine', 'catWrapper',
  'catalogItems', 'cigarAttrs', 'tasteProfile', 'scoreItem', 'curate', 'similarTo', 'capaLabel'];
vm.runInContext(blocks.join('\n') + '\nthis.__x={' + NOMES.map(n => n + ':typeof ' + n + '!=="undefined"?' + n + ':undefined').join(',') + '};', sb);
const X = sb.__x;

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ok   ' + name); }
  catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + e.message); }
}
const need = n => assert.ok(X[n] !== undefined, n + ' não encontrado no bloco @pure:curadoria');

console.log('Curadoria "Para provar": funções puras');

// ---- Catálogo ----
test('CAT_LINES: [marca, linha, país, capa, força, segmento] com valores válidos', () => {
  need('CAT_LINES'); need('WRAPPERS');
  const ids = Object.keys(X.CAT_LINES);
  assert.ok(ids.length >= 90, 'linhas: ' + ids.length);
  ids.forEach(id => {
    const L = X.CAT_LINES[id];
    assert.strictEqual(L.length, 6, id);
    assert.ok(typeof L[0] === 'string' && L[0], id + ' sem marca');
    assert.ok(L[3] === '' || X.WRAPPERS[L[3]], id + ' capa inválida: ' + L[3]);
    assert.ok(L[4] === null || (Number.isInteger(L[4]) && L[4] >= 1 && L[4] <= 5), id + ' força inválida: ' + L[4]);
    assert.ok(['c', 'f', 'n'].includes(L[5]), id + ' segmento inválido');
  });
});
test('catalogItems: 22 cubanos, 9 nacionais, mais de 280 no total, nomes únicos', () => {
  need('catalogItems');
  const it = X.catalogItems();
  const c = it.filter(i => i.seg === 'c').length, n = it.filter(i => i.seg === 'n').length;
  assert.strictEqual(c, 22, 'cubanos: ' + c);
  assert.strictEqual(n, 9, 'nacionais: ' + n);
  assert.ok(it.length >= 280, 'total: ' + it.length);
  const nomes = it.map(i => i.name);
  const dup = nomes.filter((x, k) => nomes.indexOf(x) !== k);
  assert.deepStrictEqual(Array.from(dup), [], 'nomes repetidos');
  it.forEach(i => assert.ok(i.id && i.brand && i.seg, 'item incompleto: ' + i.name));
});
test('catálogo sem preço, loja, código ou contato (Lei 9.294/1996, art. 3-A)', () => {
  const txt = JSON.stringify(X.CAT_LINES) + JSON.stringify(X.CAT_ITEMS);
  assert.ok(!/R\$|\d+,\d{2}\b|2\s?GO|whats|jamaris|moema|97211|\bcaixa\b|\blata\b|petaca|\bbdl\b|EMP-|CI-[A-Z]/i.test(txt), 'texto proibido no catálogo');
});
test('itens trazem formato pela bitola e forma (figurado ou parejo)', () => {
  const it = X.catalogItems();
  const m4 = it.find(i => i.name === 'Montecristo Nº 4');
  assert.ok(m4, 'Montecristo Nº 4 não está no catálogo');
  assert.strictEqual(m4.fmt, 'Petit Corona');
  assert.strictEqual(m4.fig, false);
  const tor = it.find(i => i.name === 'Don Diego Torpedo');
  assert.ok(tor && tor.fig === true, 'Torpedo deveria ser figurado');
  const mel = it.find(i => i.name === 'Oliva Serie V Melanio Robusto');
  assert.ok(mel && mel.fmt === 'Robusto' && mel.country === 'Nicarágua' && mel.strength === 4);
});

// ---- Normalização ----
test('normName: Nº, No., # e acentos não atrapalham a comparação', () => {
  need('normName');
  assert.strictEqual(X.normName('Montecristo #4'), X.normName('Montecristo Nº 4'));
  assert.strictEqual(X.normName('Montecristo No. 4'), 'montecristo 4');
  assert.strictEqual(X.normName('Partagás Serie D No.4'), 'partagas serie d 4');
  assert.strictEqual(X.normName('  Nub   Cameroon 358 '), 'nub cameroon 358');
});
test('countryOf: reconhece origem escrita de vários jeitos', () => {
  need('countryOf');
  assert.strictEqual(X.countryOf('Cuba'), 'Cuba');
  assert.strictEqual(X.countryOf('Havana, Cuba'), 'Cuba');
  assert.strictEqual(X.countryOf('nicaragua'), 'Nicarágua');
  assert.strictEqual(X.countryOf('Rep. Dominicana'), 'República Dominicana');
  assert.strictEqual(X.countryOf('Honduras'), 'Honduras');
  assert.strictEqual(X.countryOf('Bahia'), 'Brasil');
  assert.strictEqual(X.countryOf(''), '');
});
test('matchLine: acha marca e linha pelo nome escrito no diário', () => {
  need('matchLine');
  const a = X.matchLine('Liga Privada No. 9 Toro');
  assert.ok(a && a.brand === 'Drew Estate' && a.line === 'de9', JSON.stringify(a));
  const b = X.matchLine('Montecristo #4');
  assert.ok(b && b.brand === 'Montecristo' && b.line === '', JSON.stringify(b));
  const c = X.matchLine('Arturo Fuente Hemingway Short Story');
  assert.ok(c && c.brand === 'A. Fuente' && c.line === 'afhe', JSON.stringify(c));
  const d = X.matchLine('Oliva Serie V Melanio Robusto');
  assert.ok(d && d.line === 'olm', JSON.stringify(d));
  const e = X.matchLine('Flor de Oliva Toro');
  assert.ok(e && e.brand === 'Flor de Oliva', JSON.stringify(e));
  assert.strictEqual(X.matchLine('Charuto artesanal do tio'), null);
});
test('catWrapper: nome do item, depois linha, depois origem', () => {
  need('catWrapper');
  const it = X.catalogItems(), w = n => (it.find(i => i.name === n) || {}).wrapper;
  assert.strictEqual(w('A. Fuente Hemingway Best Seller Maduro'), 'maduro');
  assert.strictEqual(w('A. Fuente Hemingway Signature'), 'camaroes');
  assert.strictEqual(w('Perla del Mar Toro Shade'), 'connecticut');
  assert.strictEqual(w('Cohiba Siglo I'), 'cubana');
  assert.strictEqual(w('Dona Flor Puro Mata Fina'), 'matafina');
  assert.strictEqual(w('Macanudo Inspirado Brazilian Shade Toro'), '');
  assert.strictEqual(w('Oliva Serie V Melanio Maduro Robusto'), 'maduro');
});

test('capaLabel: não repete "Capa" quando o rótulo já começa com ela', () => {
  need('capaLabel');
  assert.strictEqual(X.capaLabel('cubana'), 'Capa cubana');
  assert.strictEqual(X.capaLabel('maduro'), 'Capa Maduro');
  assert.strictEqual(X.capaLabel(''), '');
});

// ---- Perfil e curadoria ----
const CIG = [
  { id: 'c1', name: 'Montecristo #4', origin: 'Cuba', vitola: '129 x 42', strength: 3 },
  { id: 'c2', name: 'Partagás Serie D Nº 4', origin: 'Cuba', vitola: '124 x 50', strength: 5 },
  { id: 'c3', name: 'Oliva Serie V Melanio Robusto', origin: 'Nicarágua', vitola: '5 x 52', strength: 4, status: 'cesta' },
  { id: 'c4', name: 'Hoyo de Monterrey Epicure No. 2', origin: 'Cuba', vitola: '124 x 50', strength: 2 }
];
const SES = [
  { cigarId: 'c1', cigarName: 'Montecristo #4', status: 'concluida', rating: 9, strength: 3 },
  { cigarId: 'c1', cigarName: 'Montecristo #4', status: 'concluida', rating: 8.5, strength: 3 },
  { cigarId: 'c2', cigarName: 'Partagás Serie D Nº 4', status: 'concluida', rating: 5, strength: 5 },
  { cigarId: 'c4', cigarName: 'Hoyo de Monterrey Epicure No. 2', status: 'concluida', rating: 8, strength: 2 },
  { cigarId: 'c3', cigarName: 'Oliva Serie V Melanio Robusto', status: 'aberta' }
];
test('tasteProfile: média, faixa de força e médias por marca', () => {
  need('tasteProfile');
  const P = X.tasteProfile(CIG, SES);
  assert.strictEqual(P.n, 4);
  assert.ok(Math.abs(P.mean - 7.625) < 1e-9, 'média ' + P.mean);
  assert.deepStrictEqual(Array.from(P.range), [2, 3]);
  assert.deepStrictEqual(Array.from(P.by.brand['Montecristo']), [9, 8.5]);
  assert.deepStrictEqual(Array.from(P.by.country['Cuba']).length, 4);
  assert.ok(P.tasted[X.normName('Montecristo Nº 4')] != null, 'Montecristo Nº 4 deveria constar como provado');
  assert.strictEqual(P.owned[X.normName('Oliva Serie V Melanio Robusto')], 'cesta');
});
test('curate: a marca que você mais gostou vem primeiro, sem repetir o que já provou', () => {
  need('curate');
  const P = X.tasteProfile(CIG, SES), R = X.curate(X.catalogItems(), P, {});
  assert.strictEqual(R[0].it.brand, 'Montecristo', 'primeiro: ' + R[0].it.name);
  assert.ok(R[0].why.some(w => /Marca Montecristo/.test(w)), R[0].why.join(' | '));
  assert.ok(!R.some(r => X.normName(r.it.name) === X.normName('Montecristo Nº 4')), 'charuto já provado apareceu');
  assert.ok(!R.some(r => r.why.concat(r.warn).some(w => /Capa Capa/.test(w))), '"Capa Capa" no texto');
});
test('curate: marca de nota baixa e força acima da faixa ficam para o fim, com aviso', () => {
  const P = X.tasteProfile(CIG, SES), R = X.curate(X.catalogItems(), P, {});
  const idx = R.map((r, k) => r.it.brand === 'Partagás' ? k : -1).filter(k => k >= 0);
  assert.ok(idx.length >= 3, 'Partagás sumiu da lista');
  idx.forEach(k => assert.ok(k > R.length / 2, 'Partagás na posição ' + k + ' de ' + R.length));
  const p = R[idx[0]];
  assert.ok(p.warn.some(w => /acima da sua faixa/.test(w)), p.warn.join(' | '));
});
test('curate: item do acervo vem marcado (cesta) e não some', () => {
  const P = X.tasteProfile(CIG, SES), R = X.curate(X.catalogItems(), P, {});
  const m = R.find(r => r.it.name === 'Oliva Serie V Melanio Robusto');
  assert.ok(m, 'item da cesta sumiu');
  assert.strictEqual(m.owned, 'cesta');
});
test('curate: filtro por segmento e busca sem acento; a busca mostra também o já provado', () => {
  const P = X.tasteProfile(CIG, SES), it = X.catalogItems();
  const C = X.curate(it, P, { seg: 'c' });
  assert.ok(C.every(r => r.it.seg === 'c'));
  assert.strictEqual(C.length, 19, 'cubanos não provados: ' + C.length);
  const Q = X.curate(it, P, { q: 'partagas' });
  assert.ok(Q.length >= 4 && Q.every(r => r.it.brand === 'Partagás'), Q.map(r => r.it.name).join(', '));
  const d4 = Q.find(r => r.it.name === 'Partagás Serie D Nº 4');
  assert.ok(d4 && d4.tasted === 5, 'D4 deveria vir com a sua nota 5');
});
test('curate com menos de 3 sessões: faixa inicial suave a média', () => {
  const P = X.tasteProfile(CIG, SES.slice(0, 1)), R = X.curate(X.catalogItems(), P, {});
  assert.strictEqual(P.range, null);
  const forte = R.find(r => r.it.strength === 5), leve = R.find(r => r.it.strength === 2);
  assert.ok(forte.warn.some(w => /acima/.test(w)), forte.warn.join(' | '));
  assert.ok(leve.why.some(w => /para começar/.test(w)), leve.why.join(' | '));
  assert.ok(R.indexOf(leve) < R.indexOf(forte));
});
test('diário vazio: os primeiros são os mais suaves com referência, e de marcas variadas', () => {
  const P = X.tasteProfile([], []), R = X.curate(X.catalogItems(), P, {});
  assert.strictEqual(R[0].it.strength, 2, 'primeiro: ' + R[0].it.name + ' força ' + R[0].it.strength);
  const marcas = new Set(R.slice(0, 8).map(r => r.it.brand));
  assert.ok(marcas.size >= 6, 'marcas nos 8 primeiros: ' + [...marcas].join(', '));
});
test('com perfil, a lista também varia de marca sem tirar a melhor do topo', () => {
  const P = X.tasteProfile(CIG, SES), R = X.curate(X.catalogItems(), P, {});
  assert.strictEqual(R[0].it.brand, 'Montecristo');
  const top = R.slice(0, 12).map(r => r.it.brand), max = Math.max(...top.map(b => top.filter(x => x === b).length));
  assert.ok(max <= 4, 'uma marca ocupa ' + max + ' dos 12 primeiros: ' + top.join(', '));
});
test('similarTo: parecidos com uma sessão saem da mesma linha, sem o próprio charuto', () => {
  need('similarTo');
  const P = X.tasteProfile(CIG, SES), it = X.catalogItems();
  const S = X.similarTo({ name: 'Oliva Serie V Melanio Robusto', origin: 'Nicarágua', vitola: '5 x 52' }, 4, it, P, 3);
  assert.strictEqual(S.length, 3);
  S.forEach(r => { assert.strictEqual(r.it.line, 'olm', r.it.name); assert.notStrictEqual(r.it.name, 'Oliva Serie V Melanio Robusto'); });
  assert.ok(S[0].why.some(w => /mesma linha/.test(w)), S[0].why.join(' | '));
});

// ---- Reforço do Acervo (2.10.0) ----
test('tasteProfile: charuto do Acervo sem nota entra no reforço; com nota, não', () => {
  const P = X.tasteProfile(CIG, SES);
  assert.ok(P.acv && P.acv.brand, 'acv ausente no perfil');
  assert.strictEqual(P.acv.brand['Oliva'], 1);
  const C2 = CIG.map(c => c.id === 'c1' ? Object.assign({}, c, { status: 'estoque' }) : c);
  assert.strictEqual(X.tasteProfile(C2, SES).acv.brand['Montecristo'], undefined, 'charuto já avaliado reforçou');
});
test('curate sem notas: um Hoyo no Estoque leva a marca ao topo, com o motivo', () => {
  const P = X.tasteProfile([{ id: 'h', name: 'Hoyo de Monterrey Epicure Nº 2', origin: 'Cuba', vitola: '124 x 50', strength: 2, status: 'estoque' }], []);
  const R = X.curate(X.catalogItems(), P, {});
  assert.strictEqual(R[0].it.brand, 'Hoyo de Monterrey', 'primeiro: ' + R[0].it.name);
  assert.ok(R[0].why.some(w => /Parecido com o que você tem no Acervo: marca Hoyo de Monterrey/.test(w)), R[0].why.join(' | '));
});
test('reforço do Acervo tem teto de 0,6', () => {
  const mk = (id, name) => ({ id, name, origin: 'Nicarágua', vitola: '5 x 52', strength: 4, status: 'estoque' });
  const PA = X.tasteProfile([mk('o1', 'Oliva Serie V Melanio Robusto'), mk('o2', 'Oliva Serie V Melanio Nº 4'), mk('o3', 'Oliva Serie V Melanio Double Toro')], []);
  const it = X.catalogItems().find(i => i.name === 'Oliva Serie V Melanio Maduro Robusto');
  assert.ok(it, 'Oliva Serie V Melanio Maduro Robusto não está no catálogo');
  const d = X.scoreItem(it, PA).score - X.scoreItem(it, X.tasteProfile([], [])).score;
  assert.ok(Math.abs(d - 0.6) < 1e-9, 'reforço ' + d);
});
test('com notas, a marca bem avaliada continua à frente do reforço', () => {
  const P = X.tasteProfile(CIG, SES), R = X.curate(X.catalogItems(), P, {});
  assert.strictEqual(R[0].it.brand, 'Montecristo', 'primeiro: ' + R[0].it.name);
  const ol = R.filter(r => r.it.brand === 'Oliva' && !r.owned);
  assert.ok(ol.length && ol.some(r => r.why.some(w => /Parecido com o que você tem no Acervo/.test(w))), 'nenhum Oliva traz o motivo do Acervo');
});

console.log(`\n${pass} ok, ${fail} falha(s)`);
process.exit(fail ? 1 : 0);
