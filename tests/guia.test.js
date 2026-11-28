// Testes das funções puras do Guia de bolso.
// Uso: node tests/guia.test.js
// Avalia, num sandbox vm, os trechos de index.html entre /* @pure:guia */ e /* @end:guia */.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const blocks = [...html.matchAll(/\/\* @pure:guia \*\/([\s\S]*?)\/\* @end:guia \*\//g)].map(m => m[1]);
const sb = {};
vm.createContext(sb);
vm.runInContext(blocks.join('\n') + '\nthis.__x={GUIDE:typeof GUIDE!=="undefined"?GUIDE:undefined,GUIDE_ILLS:typeof GUIDE_ILLS!=="undefined"?GUIDE_ILLS:undefined,GUIDE_TOOL:typeof GUIDE_TOOL!=="undefined"?GUIDE_TOOL:undefined,guideOfDay:typeof guideOfDay!=="undefined"?guideOfDay:undefined,humidorStatus:typeof humidorStatus!=="undefined"?humidorStatus:undefined,cutTipOf:typeof cutTipOf!=="undefined"?cutTipOf:undefined,VITOLAS_CORTE:typeof VITOLAS_CORTE!=="undefined"?VITOLAS_CORTE:undefined};', sb);
const X = sb.__x;

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ok   ' + name); }
  catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + e.message); }
}

console.log('Guia de bolso: funções puras');

// ---- Tarefa 1 ----
const REGRAS = [
  'Conservação', '65–70% de umidade · 16–18 °C',
  'Viagem e praia', 'Hermético, longe do sol e de perfumes',
  'Corte', 'Reto de 2 a 3 mm nos parejos, diagonal nos figurados',
  'Acendimento', 'Chama limpa, toste sem encostar',
  'Ritmo e cinza', 'Uma baforada a cada 30 a 60 segundos',
  'Paladar', 'O retrohale revela as notas; charuto não se traga',
  'Quando parar', 'Quando o prazer acaba'
];
test('GUIDE tem 7 tópicos com [titulo, html, regra] e as regras da especificação', () => {
  assert.ok(Array.isArray(X.GUIDE), 'GUIDE não encontrado no bloco @pure:guia');
  assert.strictEqual(X.GUIDE.length, 7);
  for (let i = 0; i < 7; i++) {
    assert.strictEqual(X.GUIDE[i][0], REGRAS[i * 2]);
    assert.ok(/<p>/.test(X.GUIDE[i][1]), 'html do tópico ' + i);
    assert.strictEqual(X.GUIDE[i][2], REGRAS[i * 2 + 1]);
  }
});
test('GUIDE_ILLS tem 7 ilustrações SVG decorativas, uma por tópico', () => {
  assert.ok(Array.isArray(X.GUIDE_ILLS), 'GUIDE_ILLS não encontrado no bloco @pure:guia');
  assert.strictEqual(X.GUIDE_ILLS.length, 7);
  X.GUIDE_ILLS.forEach((s, i) => {
    assert.ok(/^<svg [^>]*class="ill"/.test(s), 'classe ill na ilustração ' + i);
    assert.ok(/^<svg [^>]*viewBox="0 0 64 64"/.test(s), 'viewBox 64 na ilustração ' + i);
    assert.ok(/^<svg [^>]*aria-hidden="true"/.test(s), 'aria-hidden na ilustração ' + i);
    assert.ok(/class="s"/.test(s) && /<\/svg>$/.test(s), 'traço e fechamento na ilustração ' + i);
  });
  assert.strictEqual(new Set(X.GUIDE_ILLS).size, 7, 'as 7 ilustrações são diferentes');
});
test('GUIDE_TOOL liga Conservação, Corte e Ritmo às ferramentas', () => {
  assert.deepStrictEqual(JSON.parse(JSON.stringify(X.GUIDE_TOOL)), { 0: 'umidor', 2: 'corte', 4: 'ritmo' });
});
test('guideOfDay usa o dia do ano mod 7', () => {
  assert.strictEqual(typeof X.guideOfDay, 'function', 'guideOfDay não encontrado');
  assert.strictEqual(X.guideOfDay(new Date(2026, 0, 1)), 1);
  assert.strictEqual(X.guideOfDay(new Date(2026, 0, 7)), 0);
  assert.strictEqual(X.guideOfDay(new Date(2026, 11, 31)), 365 % 7);
});

// ---- Tarefa 2 ----
test('humidorStatus: faixa ideal (65–70% e 16–18 °C)', () => {
  assert.strictEqual(typeof X.humidorStatus, 'function', 'humidorStatus não encontrado');
  assert.strictEqual(X.humidorStatus('67', '17').nivel, 'ideal');
  assert.strictEqual(X.humidorStatus(65, 16).nivel, 'ideal');
  assert.strictEqual(X.humidorStatus('70', '18').nivel, 'ideal');
});
test('humidorStatus aceita vírgula decimal', () => {
  assert.strictEqual(X.humidorStatus('67,5', '16,5').nivel, 'ideal');
});
test('humidorStatus: umidade alta é atenção e cita mofo', () => {
  const r = X.humidorStatus('80', '17');
  assert.strictEqual(r.nivel, 'atencao'); assert.ok(/mofo/.test(r.texto), r.texto);
});
test('humidorStatus: umidade baixa é atenção e cita ressecamento', () => {
  const r = X.humidorStatus('60', '17');
  assert.strictEqual(r.nivel, 'atencao'); assert.ok(/resseca/.test(r.texto), r.texto);
});
test('humidorStatus: temperatura fora de 16–18 °C (abaixo de 24) é atenção e lembra a faixa', () => {
  const r = X.humidorStatus('67', '21');
  assert.strictEqual(r.nivel, 'atencao'); assert.ok(/16.*18/.test(r.texto), r.texto);
});
test('humidorStatus: 24 °C ou mais é risco e cita o besouro', () => {
  assert.strictEqual(X.humidorStatus('67', '24').nivel, 'risco');
  const r = X.humidorStatus('67', '25');
  assert.strictEqual(r.nivel, 'risco'); assert.ok(/besouro/.test(r.texto), r.texto);
});
test('humidorStatus: campo vazio pede os dois valores', () => {
  assert.strictEqual(X.humidorStatus('', '17').nivel, 'vazio');
  assert.strictEqual(X.humidorStatus('67', '  ').nivel, 'vazio');
});
test('humidorStatus: valor absurdo ou não numérico é inválido', () => {
  assert.strictEqual(X.humidorStatus('150', '17').nivel, 'invalido');
  assert.strictEqual(X.humidorStatus('67', '-15').nivel, 'invalido');
  assert.strictEqual(X.humidorStatus('abc', '17').nivel, 'invalido');
  assert.ok(X.humidorStatus('150', '17').texto.length > 0);
});
test('VITOLAS_CORTE lista as 10 vitolas da especificação', () => {
  assert.deepStrictEqual(Array.from(X.VITOLAS_CORTE || []), ['Petit Corona', 'Corona', 'Robusto', 'Toro', 'Churchill', 'Lancero', 'Torpedo', 'Pirâmide', 'Belicoso', 'Perfecto']);
});
test('cutTipOf: figurados diagonal, parejos reto', () => {
  assert.strictEqual(typeof X.cutTipOf, 'function', 'cutTipOf fora do bloco @pure:guia');
  ['Torpedo', 'Pirâmide', 'Belicoso', 'Perfecto'].forEach(v => assert.ok(/diagonal/.test(X.cutTipOf({ vitola: v })), v));
  ['Petit Corona', 'Corona', 'Robusto', 'Toro', 'Churchill', 'Lancero'].forEach(v => assert.ok(/corte reto/.test(X.cutTipOf({ vitola: v })), v));
});

console.log(`\n${pass} ok, ${fail} falha(s)`);
process.exit(fail ? 1 : 0);
