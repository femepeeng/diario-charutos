// Testes das funções puras da Cesta (montagem do pedido, texto, chegada e estado guardado).
// Uso: node tests/cesta.test.js
// Avalia, num sandbox vm, os trechos de index.html entre /* @pure:curadoria */ … /* @end:curadoria */
// e /* @pure:cesta */ … /* @end:cesta */, nessa ordem (a Cesta usa o catálogo e o perfil da curadoria).
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const pick = tag => [...html.matchAll(new RegExp('\\/\\* @pure:' + tag + ' \\*\\/([\\s\\S]*?)\\/\\* @end:' + tag + ' \\*\\/', 'g'))].map(m => m[1]);
const blocks = pick('curadoria').concat(pick('cesta'));
const sb = {};
vm.createContext(sb);
const NOMES = ['normName', 'catalogItems', 'tasteProfile', 'SEG_PLURAL', 'cestaIndex', 'cestaSeg', 'cestaRepor', 'cestaPlan', 'pedidoTexto', 'pedidoItem',
  'novoPedido', 'pedidoResumo', 'cestaEnviadosKeys', 'chegadaPlan', 'cestaLoad', 'cestaSave'];
vm.runInContext(blocks.join('\n') + '\nthis.__x={' + NOMES.map(n => n + ':typeof ' + n + '!=="undefined"?' + n + ':undefined').join(',') + '};', sb);
const X = sb.__x;

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ok   ' + name); }
  catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + e.message); }
}
const need = n => assert.ok(X[n] !== undefined, n + ' não encontrado no bloco @pure:cesta');
const plain = v => JSON.parse(JSON.stringify(v));

console.log('Cesta: funções puras');

// ---- Fixture ----
function ses(cigarId, nome, nota, rebuy, dia) {
  return { cigarId, cigarName: nome, status: 'concluida', rating: nota, rebuy, strength: 3, endedAt: '2026-' + dia + 'T21:00:00Z' };
}
const CIG = [
  { id: 'k1', name: 'Cohiba Siglo II', origin: 'Cuba', vitola: '129 x 42', strength: 4, status: 'cesta', order: 1 },
  { id: 'k2', name: 'Montecristo #4', origin: 'Cuba', vitola: '129 x 42', strength: 3, status: '' },
  { id: 'k3', name: 'Hoyo de Monterrey Epicure No. 2', origin: 'Cuba', vitola: '124 x 50', strength: 2, status: 'estoque' },
  { id: 'k4', name: 'Partagás Serie D Nº 4', origin: 'Cuba', vitola: '124 x 50', strength: 5, status: '' },
  { id: 'k5', name: 'Oliva Serie V Melanio Robusto', origin: 'Nicarágua', vitola: '5 x 52', strength: 4, status: '' },
  { id: 'k6', name: 'Charuto do tio', origin: '', vitola: '', strength: 2, status: 'cesta', order: 2 }
];
const SES = [
  ses('k2', 'Montecristo #4', 9, 'Sim', '11-01'),
  ses('k2', 'Montecristo #4', 8.5, '', '11-05'),
  ses('k3', 'Hoyo de Monterrey Epicure No. 2', 8, 'Sim', '11-03'),
  ses('k4', 'Partagás Serie D Nº 4', 7, 'Sim', '10-01'),
  ses('k4', 'Partagás Serie D Nº 4', 5, 'Não', '11-08'),
  ses('k5', 'Oliva Serie V Melanio Robusto', 8, 'Talvez', '11-09'),
  ses(null, 'Romeo y Julieta Short Churchill', 8.8, 'Sim', '11-10')
];
need('normName'); need('catalogItems');
const N = X.normName, ITEMS = X.catalogItems();
const plan = o => X.cestaPlan(ITEMS, CIG, SES, Object.assign({ size: 5, seg: 'todos', fora: [], enviados: [] }, o || {}));
const RJ = N('Romeo y Julieta Short Churchill');

// ---- Reposição ----
test('cestaRepor: vale a resposta mais recente; Talvez e Estoque ficam de fora', () => {
  need('cestaRepor');
  const r = X.cestaRepor(CIG, SES);
  assert.deepStrictEqual(plain(r.map(x => x.key)), [RJ, N('Montecristo #4')]);
  assert.strictEqual(r[0].c, null, 'sessão sem charuto no Acervo deveria vir sem c');
  assert.ok(r[1].c && r[1].c.id === 'k2' && Math.abs(r[1].avg - 8.75) < 1e-9 && r[1].n === 2, JSON.stringify(plain(r[1])));
});

// ---- Montagem ----
test('cestaPlan N=5: Da cesta, depois 1 Repor, depois Novos', () => {
  need('cestaPlan');
  const p = plan();
  assert.deepStrictEqual(plain(p.list.map(e => e.kind)), ['cesta', 'cesta', 'repor', 'novo', 'novo']);
  assert.deepStrictEqual(plain(p.list.slice(0, 2).map(e => e.key)).sort(), [N('Charuto do tio'), N('Cohiba Siglo II')].sort());
  assert.strictEqual(p.list[2].key, RJ);
  assert.ok(/^Recompraria: Sim · sua média 8,8 em 1 sessão$/.test(p.list[2].why[0]), p.list[2].why[0]);
  assert.deepStrictEqual(plain(p.list[0].kind === 'cesta' ? p.list[0].why : []), ['Marcado na Cesta do Acervo']);
  assert.strictEqual(p.faltam, 0); assert.strictEqual(p.sobra, 0); assert.strictEqual(p.size, 5);
});
test('N=6 tem 2 vagas de Repor', () => {
  const p = plan({ size: 6 });
  assert.strictEqual(p.list.length, 6);
  assert.strictEqual(p.list.filter(e => e.kind === 'repor').length, 2);
});
test('N=3 com 2 da cesta deixa 1 vaga de Repor e nenhum Novo', () => {
  assert.deepStrictEqual(plain(plan({ size: 3 }).list.map(e => e.kind)), ['cesta', 'cesta', 'repor']);
});
test('Repor usa nome e bitola do catálogo', () => {
  const L = plan({ size: 6 }).list, m = L.find(e => e.c && e.c.id === 'k2');
  assert.ok(m, 'Montecristo #4 não entrou na reposição');
  assert.strictEqual(m.kind, 'repor');
  assert.strictEqual(m.name, 'Montecristo Nº 4');
  assert.strictEqual(m.bitola, '129 x 42');
  assert.ok(/sua média 8,8 em 2 sessões$/.test(m.why[0]), m.why[0]);
  assert.strictEqual(L.filter(e => e.key === m.key).length, 1, 'Montecristo apareceu duas vezes');
});
test('Repor de sessão avulsa: força da sessão mais recente; origem e capa pela marca', () => {
  need('pedidoItem');
  const av = (nome, st, rb, dia) => ({ cigarId: '', cigarName: nome, status: 'concluida', rating: 8, rebuy: rb, strength: st, endedAt: '2026-' + dia + 'T21:00:00Z' });
  const AV = [av('Romeo y Julieta Edição Rara', 5, 'Sim', '11-02'), av('Romeo y Julieta Edição Rara', 3, 'Sim', '11-11'),
    av('Charuto da feira', 4, 'Sim', '11-10'), av('Charuto da feira', undefined, '', '11-12')];
  const L = X.cestaPlan(ITEMS, [], AV, { size: 6, seg: 'todos', fora: [], enviados: [] }).list.filter(e => e.kind === 'repor');
  const it = n => { const e = L.find(x => x.name === n); assert.ok(e, n + ' não entrou como Repor'); return X.pedidoItem(e); };
  const rj = it('Romeo y Julieta Edição Rara'), fe = it('Charuto da feira');
  assert.deepStrictEqual([rj.origin, rj.strength, rj.wrapper], ['Cuba', 3, 'cubana']);
  assert.deepStrictEqual([fe.origin, fe.strength, fe.wrapper], ['', 4, '']);
  // Sem marca conhecida, nem a capa sai de uma palavra do nome.
  const hb = X.cestaPlan(ITEMS, [], [av('Habano do tio', 2, 'Sim', '11-13')], { size: 3, seg: 'todos', fora: [], enviados: [] }).list.find(e => e.kind === 'repor');
  assert.ok(hb, 'Habano do tio não entrou como Repor');
  const hi = X.pedidoItem(hb);
  assert.deepStrictEqual([hi.origin, hi.strength, hi.wrapper], ['', 2, '']);
});
test('Novos não repetem linha e nenhuma marca passa de 2', () => {
  const L = plan({ size: 8 }).list, marcas = {};
  assert.strictEqual(L.length, 8);
  L.forEach(e => { if (e.brand) marcas[e.brand] = (marcas[e.brand] || 0) + 1; });
  Object.keys(marcas).forEach(b => assert.ok(marcas[b] <= 2, b + ' aparece ' + marcas[b] + ' vezes'));
  L.filter(e => e.kind === 'novo').forEach(e => {
    assert.ok(e.line, 'novo sem linha: ' + e.name);
    assert.ok(!L.some(o => o !== e && o.line === e.line), 'linha repetida: ' + e.name);
  });
});
test('filtro Cubanos: tudo de Cuba; charuto sem país fica de fora', () => {
  need('cestaSeg'); need('cestaIndex');
  const idx = X.cestaIndex(ITEMS);
  assert.strictEqual(X.cestaSeg({ name: 'Cohiba Siglo II' }, idx), 'c');
  assert.strictEqual(X.cestaSeg({ name: 'Charuto do tio' }, idx), '');
  assert.strictEqual(X.cestaSeg({ name: 'Charuto sem nome', origin: 'Bahia' }, idx), 'n');
  assert.strictEqual(X.cestaSeg({ name: 'Charuto sem nome', origin: 'Nicarágua' }, idx), 'f');
  const c = plan({ seg: 'c' }).list;
  assert.ok(c.length === 5 && c.every(e => e.seg === 'c'), plain(c.map(e => e.name + ':' + e.seg)).join(', '));
  assert.ok(!c.some(e => e.key === N('Charuto do tio')), 'charuto sem país entrou no filtro Cubanos');
  assert.ok(plan({ seg: 'todos' }).list.some(e => e.key === N('Charuto do tio')), 'charuto sem país sumiu do filtro Todos');
});
test('Novo trocado sai e a vaga vai para o próximo', () => {
  const A = plan().list, ult = A[A.length - 1];
  assert.strictEqual(ult.kind, 'novo');
  const B = plan({ fora: [ult.key] }).list;
  assert.ok(!B.some(e => e.key === ult.key), 'o trocado continua na cesta');
  assert.strictEqual(B.length, 5);
  assert.ok(B.some(e => !A.some(a => a.key === e.key)), 'nenhum charuto novo entrou no lugar');
});
test('Da cesta trocado sai deste pedido', () => {
  const B = plan({ fora: [N('Cohiba Siglo II')] }).list;
  assert.ok(!B.some(e => e.key === N('Cohiba Siglo II')));
  assert.strictEqual(B.length, 5);
});
test('nomes de pedidos enviados não entram', () => {
  need('cestaEnviadosKeys');
  assert.deepStrictEqual(plain(X.cestaEnviadosKeys([{ itens: [{ name: 'Montecristo #4' }, { name: 'Montecristo Nº 4' }] }, { itens: [{ name: 'Cohiba Siglo II' }] }])),
    [N('Montecristo #4'), N('Cohiba Siglo II')]);
  const nv = plan().list.find(e => e.kind === 'novo').key;
  const B = plan({ enviados: [RJ, nv] }).list;
  assert.ok(!B.some(e => e.key === RJ || e.key === nv), plain(B.map(e => e.name)).join(', '));
});
test('sobra: charutos da cesta além do tamanho', () => {
  const C4 = CIG.concat([
    { id: 'k7', name: 'Bolívar Belicosos Finos', origin: 'Cuba', vitola: '140 x 52', strength: 5, status: 'cesta', order: 3 },
    { id: 'k8', name: 'Trinidad Fundadores', origin: 'Cuba', vitola: '192 x 40', strength: 4, status: 'cesta,estoque', order: 4 }
  ]);
  const p = X.cestaPlan(ITEMS, C4, SES, { size: 3, seg: 'todos', fora: [], enviados: [] });
  assert.deepStrictEqual(plain(p.list.map(e => e.kind)), ['cesta', 'cesta', 'cesta']);
  assert.strictEqual(p.sobra, 1);
});
test('faltam: filtro sem candidatos suficientes', () => {
  const nac = ITEMS.filter(i => i.seg === 'n').map(i => N(i.name));
  assert.strictEqual(nac.length, 9);
  const p = plan({ size: 8, seg: 'n', fora: nac.slice(0, 7) });
  assert.strictEqual(p.faltam, 8 - p.list.length);
  assert.ok(p.faltam > 0, 'faltam ' + p.faltam);
});
// ---- Correções da revisão final ----
test('variedade é preferência: Nacionais com o diário vazio enche a cesta de 5, variando primeiro', () => {
  const p = X.cestaPlan(ITEMS, [], [], { size: 5, seg: 'n', fora: [], enviados: [] });
  assert.strictEqual(p.list.length, 5, plain(p.list.map(e => e.name)).join(', '));
  assert.strictEqual(p.faltam, 0);
  const linhas = p.list.slice(0, 3).map(e => e.line);
  assert.strictEqual(new Set(linhas).size, 3, 'os 3 primeiros deveriam ser de linhas diferentes: ' + linhas.join(', '));
});
test('Cubanos com histórico: a cesta de 8 chega a 8', () => {
  const C = [
    { id: 'h1', name: 'Cohiba Siglo II', origin: 'Cuba', vitola: '129 x 42', strength: 4, status: 'cesta', order: 1 },
    { id: 'h2', name: 'Montecristo #4', origin: 'Cuba', vitola: '129 x 42', strength: 3, status: '' },
    { id: 'h3', name: 'Bolívar Belicosos Finos', origin: 'Cuba', vitola: '140 x 52', strength: 5, status: '' },
    { id: 'h4', name: 'Trinidad Vigía', origin: 'Cuba', vitola: '110 x 54', strength: 4, status: '' },
    { id: 'h5', name: 'H. Upmann Half Corona', origin: 'Cuba', vitola: '90 x 44', strength: 2, status: '' }
  ];
  const S2 = [ses('h2', 'Montecristo #4', 9, 'Sim', '11-01'), ses('h3', 'Bolívar Belicosos Finos', 6, '', '11-02'),
    ses('h4', 'Trinidad Vigía', 7, '', '11-03'), ses('h5', 'H. Upmann Half Corona', 8, '', '11-04')];
  const p = X.cestaPlan(ITEMS, C, S2, { size: 8, seg: 'c', fora: [], enviados: [] });
  assert.strictEqual(p.list.length, 8, plain(p.list.map(e => e.name)).join(', '));
  assert.ok(p.list.every(e => e.seg === 'c'));
});
test('cestaPlan usa o perfil pronto em opt.P', () => {
  const P = X.tasteProfile(CIG, SES), nv = plan().list.find(e => e.kind === 'novo');
  P.owned[nv.key] = 'estoque';
  const B = X.cestaPlan(ITEMS, CIG, SES, { size: 5, seg: 'todos', fora: [], enviados: [], P });
  assert.ok(!B.list.some(e => e.key === nv.key), 'o perfil recebido foi ignorado');
});
test('cestaLoad descarta itens inválidos e pedidos que ficam vazios', () => {
  const st = X.cestaLoad('{"enviados":[{"id":"p1","itens":[null,{"name":"A","veio":true},5,{"x":1}]},{"id":"p2","itens":[null]}]}');
  assert.deepStrictEqual(plain(st.enviados), [{ id: 'p1', itens: [{ name: 'A', veio: true }] }]);
});
test('tamanho fora de 3 a 8', () => {
  assert.strictEqual(plan({ size: 12 }).size, 8);
  assert.strictEqual(plan({ size: 2 }).size, 3);
  assert.strictEqual(plan({ size: 'x' }).size, 5);
});

// ---- Texto do pedido ----
test('pedidoTexto exato', () => {
  need('pedidoTexto');
  const t = X.pedidoTexto([{ name: 'Cohiba Siglo II', bitola: '129 x 42' }, { name: 'Montecristo Nº 4', bitola: '129 x 42' }, { name: 'Charuto do tio', bitola: '' }]);
  assert.strictEqual(t, 'Olá! Gostaria de fazer um pedido:\n1 Cohiba Siglo II (129 x 42)\n1 Montecristo Nº 4 (129 x 42)\n1 Charuto do tio\nSão 3 charutos. Pode me confirmar a disponibilidade?');
});
test('pedidoTexto: singular e lista vazia', () => {
  const t = X.pedidoTexto([{ name: 'Cohiba Siglo II', bitola: '129 x 42' }]);
  assert.ok(t.endsWith('\nÉ 1 charuto. Pode me confirmar a disponibilidade?'), t);
  assert.strictEqual(X.pedidoTexto([]), '');
});
test('texto montado sem preço nem link', () => {
  const t = X.pedidoTexto(plan({ size: 8 }).list);
  assert.ok(t.length > 0, 'texto vazio');
  assert.ok(!/R\$|\d+,\d{2}\b|https?:|www\./i.test(t), t);
});

// ---- Pedido enviado ----
test('novoPedido guarda os dados de cada charuto', () => {
  need('novoPedido'); need('pedidoItem');
  const p = plan(), o = X.novoPedido(p, 'c', '2026-11-24T15:00:00.000Z', 'p1');
  assert.strictEqual(o.id, 'p1'); assert.strictEqual(o.seg, 'c'); assert.strictEqual(o.em, '2026-11-24T15:00:00.000Z');
  assert.strictEqual(o.texto, X.pedidoTexto(p.list));
  assert.strictEqual(o.itens.length, p.list.length);
  o.itens.forEach(x => {
    ['name', 'bitola', 'origin', 'strength', 'wrapper'].forEach(f => assert.ok(f in x, f + ' ausente em ' + x.name));
    assert.strictEqual(x.veio, true);
  });
  const k1 = o.itens.find(x => x.key === N('Cohiba Siglo II'));
  assert.ok(k1 && k1.cigarId === 'k1', JSON.stringify(plain(k1 || {})));
  const nv = p.list.find(e => e.kind === 'novo'), ni = o.itens.find(x => x.key === nv.key);
  assert.deepStrictEqual([ni.origin, ni.strength, ni.wrapper, ni.bitola, ni.cigarId], [nv.it.country || '', nv.it.strength || 0, nv.it.wrapper || '', nv.it.bitola || '', '']);
  assert.strictEqual(X.novoPedido(p, '', 'x', 'p2').seg, 'todos');
});
test('pedidoResumo', () => {
  need('pedidoResumo'); need('SEG_PLURAL');
  const em = new Date(2026, 10, 24, 12).toISOString(), cinco = [1, 2, 3, 4, 5].map(i => ({ name: 'x' + i }));
  assert.strictEqual(X.pedidoResumo({ em, seg: 'c', itens: cinco }), '24/11 · Cubanos · 5 charutos');
  assert.strictEqual(X.pedidoResumo({ em, seg: 'todos', itens: [{ name: 'x' }] }), '24/11 · 1 charuto');
});

// ---- Chegada ----
test('chegadaPlan: atualiza pelo id e pelo nome, cria o que falta, ignora o que não veio', () => {
  need('chegadaPlan');
  const ol = { name: 'Oliva Serie V Melanio Maduro Robusto', bitola: '5 x 52', origin: 'Nicarágua', strength: 4, wrapper: 'maduro', cigarId: '' };
  const r = X.chegadaPlan([
    { name: 'Cohiba Siglo II', cigarId: 'k1' },
    { name: 'Montecristo Nº 4', cigarId: '' },
    { name: 'Hoyo de Monterrey Epicure Nº 2', cigarId: 'k3' },
    ol,
    { name: 'Bolívar Belicosos Finos', veio: false },
    Object.assign({}, ol)
  ], CIG);
  assert.deepStrictEqual(plain(r.update), [{ id: 'k1', status: 'estoque' }, { id: 'k2', status: 'estoque' }]);
  assert.deepStrictEqual(plain(r.create), [{ name: ol.name, origin: 'Nicarágua', vitola: '5 x 52', strength: 4, wrapper: 'maduro', status: 'estoque' }]);
  assert.strictEqual(r.chegou, 4);
});

// ---- Estado guardado ----
test('cestaLoad e cestaSave', () => {
  need('cestaLoad'); need('cestaSave');
  const D = { v: 1, size: 5, seg: 'todos', fora: [], enviados: [] };
  assert.deepStrictEqual(plain(X.cestaLoad(null)), D);
  assert.deepStrictEqual(plain(X.cestaLoad('{x')), D);
  assert.deepStrictEqual(plain(X.cestaLoad('{"size":9,"seg":"zz","fora":"a","enviados":[{"id":1}]}')), D);
  const st = { v: 1, size: 7, seg: 'c', fora: ['a', 'b'], enviados: [{ id: 'p1', em: '2026-11-24T15:00:00.000Z', seg: 'c', itens: [{ key: 'a', name: 'A', veio: true }], texto: 't' }] };
  assert.deepStrictEqual(plain(X.cestaLoad(X.cestaSave(st))), st);
  const muitos = Array.from({ length: 250 }, (_, i) => 'k' + i);
  const back = X.cestaLoad(X.cestaSave(Object.assign({}, st, { fora: muitos })));
  assert.strictEqual(back.fora.length, 200);
  assert.strictEqual(back.fora[0], 'k50');
  assert.strictEqual(back.fora[199], 'k249');
});

console.log(`\n${pass} ok, ${fail} falha(s)`);
process.exit(fail ? 1 : 0);
