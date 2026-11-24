// Testes das funções puras do clube (administração, mensagens e convites).
// Uso: node tests/clube.test.js
// Avalia, num sandbox vm, os trechos de index.html entre /* @pure:clube */ e /* @end:clube */.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const blocks = [...html.matchAll(/\/\* @pure:clube \*\/([\s\S]*?)\/\* @end:clube \*\//g)].map(m => m[1]);
const sb = {};
vm.createContext(sb);
const NOMES = ['relAgo', 'cleanMsg', 'inboxOrder', 'inviteStatus', 'missingSql', 'clubErrMsg', 'memberMeta'];
vm.runInContext(blocks.join('\n') + '\nthis.__x={' + NOMES.map(n => n + ':typeof ' + n + '!=="undefined"?' + n + ':undefined').join(',') + '};', sb);
const X = sb.__x;

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ok   ' + name); }
  catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + e.message); }
}
const need = n => assert.ok(X[n] !== undefined, n + ' não encontrado no bloco @pure:clube');
const plain = v => JSON.parse(JSON.stringify(v));

console.log('Clube: funções puras');

const AGORA = new Date(2026, 10, 23, 15, 0, 0); // 23/11/2026 15:00, hora local
const antes = ms => new Date(AGORA.getTime() - ms).toISOString();
test('relAgo: agora, minutos, horas, ontem, dias, data e valor inválido', () => {
  need('relAgo');
  assert.strictEqual(X.relAgo(antes(30 * 1000), AGORA), 'agora');
  assert.strictEqual(X.relAgo(antes(5 * 60 * 1000), AGORA), 'há 5 min');
  assert.strictEqual(X.relAgo(antes(3 * 3600 * 1000), AGORA), 'há 3 h');
  assert.strictEqual(X.relAgo(new Date(2026, 10, 22, 10, 0).toISOString(), AGORA), 'ontem');
  assert.strictEqual(X.relAgo(new Date(2026, 10, 20, 15, 0).toISOString(), AGORA), 'há 3 dias');
  assert.strictEqual(X.relAgo(new Date(2026, 10, 10, 9, 0).toISOString(), AGORA), '10/11/2026');
  assert.strictEqual(X.relAgo(null, AGORA), '—');
  assert.strictEqual(X.relAgo('xx', AGORA), '—');
  assert.strictEqual(X.relAgo(new Date(AGORA.getTime() + 5000).toISOString(), AGORA), 'agora', 'relógio adiantado');
});
test('cleanMsg: tira espaços e quebras sobrando, recusa vazio e acima de 1000', () => {
  need('cleanMsg');
  assert.deepStrictEqual(plain(X.cleanMsg('  Olá  ')), { ok: true, text: 'Olá', err: '' });
  assert.strictEqual(X.cleanMsg('a\r\n\r\n\r\n\r\nb').text, 'a\n\nb');
  assert.deepStrictEqual(plain(X.cleanMsg('   ')), { ok: false, text: '', err: 'Escreva a mensagem.' });
  assert.strictEqual(X.cleanMsg(null).ok, false);
  assert.strictEqual(X.cleanMsg('a'.repeat(1000)).ok, true);
  const r = X.cleanMsg('a'.repeat(1001));
  assert.deepStrictEqual([r.ok, r.err], [false, 'Use no máximo 1000 caracteres.']);
});
test('inboxOrder: só quem tem mensagem; não lidas primeiro, depois recência e nome', () => {
  need('inboxOrder');
  const ms = [
    { id: '1', display_name: 'Zeca', last_msg_at: '2026-11-20T10:00:00Z', unread: 0 },
    { id: '2', display_name: 'Ana', last_msg_at: null, unread: 0 },
    { id: '3', display_name: 'Bia', last_msg_at: '2026-11-21T10:00:00Z', unread: 0 },
    { id: '4', display_name: 'Caio', last_msg_at: '2026-11-19T10:00:00Z', unread: 2 },
    { id: '5', display_name: 'Duda', last_msg_at: '2026-11-21T10:00:00Z', unread: 0 }
  ];
  assert.deepStrictEqual(X.inboxOrder(ms).map(m => m.id), ['4', '3', '5', '1']);
  assert.deepStrictEqual(ms.map(m => m.id), ['1', '2', '3', '4', '5'], 'não pode mexer na lista original');
});
test('inviteStatus: desativado, esgotado, ativo e fundador; só ativo e com vaga pode ser desativado', () => {
  need('inviteStatus');
  const s = inv => plain(X.inviteStatus(inv));
  assert.deepStrictEqual(s({ active: false, uses: 0, max_uses: 10 }), { label: 'desativado', canOff: false });
  assert.deepStrictEqual(s({ active: true, uses: 10, max_uses: 10 }), { label: 'esgotado', canOff: false });
  assert.deepStrictEqual(s({ active: false, uses: 10, max_uses: 10 }), { label: 'esgotado', canOff: false });
  assert.deepStrictEqual(s({ active: true, uses: 3, max_uses: 10 }), { label: 'ativo · 3/10 usos', canOff: true });
  assert.deepStrictEqual(s({ grants_admin: true, active: false, uses: 1, max_uses: 1 }), { label: 'fundador · esgotado', canOff: false });
  assert.deepStrictEqual(s({ grants_admin: true, active: true, uses: 0, max_uses: 1 }), { label: 'fundador · ativo · 0/1 usos', canOff: true });
});
test('missingSql: reconhece função ausente nos três formatos e ignora outros erros', () => {
  need('missingSql');
  assert.strictEqual(X.missingSql({ code: 'PGRST202', message: 'x' }), true);
  assert.strictEqual(X.missingSql({ code: '42883', message: 'x' }), true);
  assert.strictEqual(X.missingSql({ message: 'Could not find the function public.club_me without parameters in the schema cache' }), true);
  assert.strictEqual(X.missingSql({ code: 'P0001', message: 'not_admin' }), false);
  assert.strictEqual(X.missingSql(null), false);
});
test('clubErrMsg: cada código do banco tem a sua mensagem; o resto vira o aviso genérico', () => {
  need('clubErrMsg');
  const G = 'Não foi possível concluir. Confira a internet e tente de novo.';
  assert.strictEqual(X.clubErrMsg({ message: 'Failed to fetch' }), G);
  assert.strictEqual(X.clubErrMsg(null), G);
  const codes = ['not_admin', 'not_self', 'is_admin', 'suspended', 'no_member', 'not_allowed', 'invalid_body', 'admin_invite', 'no_invite'];
  const msgs = codes.map(c => X.clubErrMsg({ code: 'P0001', message: c }));
  msgs.forEach((m, k) => assert.ok(m && m !== G, codes[k] + ' caiu no genérico'));
  assert.strictEqual(new Set(msgs).size, codes.length, 'códigos diferentes com a mesma mensagem');
});
test('memberMeta: data de entrada, convite, último acesso e sessões', () => {
  need('memberMeta');
  const base = { created_at: '2026-11-12T15:00:00Z', shared_sessions: 4 };
  assert.strictEqual(X.memberMeta(Object.assign({}, base, { invite_code: 'F-ABCDEF123', last_seen_at: antes(2 * 3600 * 1000) }), AGORA),
    'Entrou em 12/11/2026 · convite de fundador · último acesso há 2 h · 4 sessões compartilhadas');
  assert.strictEqual(X.memberMeta(Object.assign({}, base, { invite_code: 'K7Q2M9XAB1', last_seen_at: null, shared_sessions: 1 }), AGORA),
    'Entrou em 12/11/2026 · convite K7Q2M9 · sem acesso registrado · 1 sessão compartilhada');
  assert.strictEqual(X.memberMeta(Object.assign({}, base, { invite_code: null, last_seen_at: null, shared_sessions: 0 }), AGORA),
    'Entrou em 12/11/2026 · convite não registrado · sem acesso registrado · nenhuma sessão compartilhada');
});

console.log(`\n${pass} ok, ${fail} falha(s)`);
process.exit(fail ? 1 : 0);
