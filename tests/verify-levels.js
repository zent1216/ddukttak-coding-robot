const fs = require('fs');
const src = fs.readFileSync(process.argv[2] || require('path').join(__dirname, '..', 'index.html'), 'utf8');
const js = src.split('<script>')[1].split('</script>')[0];
new Function(js); // syntax check
const data = js.slice(js.indexOf('const DIRS'), js.indexOf('const STORE_KEY'));
const { TIERS, DIRS } = eval(data + ';({TIERS, DIRS})');

const F = { t: 'fwd' }, Lt = { t: 'left' }, R = { t: 'right' }, P = { t: 'pick' }, C = { t: 'call' };
const rep = (n, body) => ({ t: 'repeat', n, body });
const repN = body => ({ t: 'repeat', useVar: true, body });
const until = (c, body) => ({ t: 'until', c, body });
const iff = (c, body) => ({ t: 'if', c, body });
const ife = (c, body, els) => ({ t: 'ifelse', c, body, else: els });
const set = v => ({ t: 'setvar', v }), chg = v => ({ t: 'change', v });
const RH = [until('goal', [ife('right', [ife('front', [Lt], [F])], [R, F])])];
const CORR = [until('goal', [ife('front', [ife('left', [R], [Lt])], [F])])];

const S = {
  '1-1': [F, F, F, F], '1-2': [Lt, F, F], '1-3': [F, F, R, F, F], '1-4': [R, R, F, F],
  '1-5': [F, F, F, R, F, F, F], '1-6': [F, Lt, F, R, F, F, R, F, Lt, F],
  '1-7': [F, F, F, F, R, F, F, R, F, F, F, F], '1-8': [F, F, Lt, F, F, R, R, F, F, F, F],
  '2-1': [rep(7, [F])], '2-2': [rep(5, [F]), R, rep(3, [F])], '2-3': [rep(3, [F, F, F, R])],
  '2-4': [rep(4, [F, Lt, F, R])], '2-5': [rep(4, [F, R, F, Lt])], '2-6': [rep(3, [F, F, Lt, F, R])],
  '2-7': [rep(2, [Lt, F, R, F, R, F, Lt, F])],
  '2-8': [rep(5, [F]), R, rep(2, [F]), R, rep(5, [F]), Lt, rep(2, [F]), Lt, rep(5, [F])],
  '3-1': [rep(3, [rep(4, [F]), R])], '3-2': [rep(3, [rep(3, [F]), Lt, F, R])],
  '3-3': [rep(4, [F, R, F, Lt])], '3-4': [rep(3, [rep(5, [F]), R])],
  '3-5': [rep(3, [until('front', [F]), R])], '3-6': [rep(5, [until('front', [F]), R])],
  '3-7': [rep(3, [until('front', [F]), R])],
  '3-8': [rep(2, [rep(2, [until('front', [F]), R]), rep(2, [until('front', [F]), Lt])])],
  '4-1': [rep(10, [iff('front', [R]), F])], '4-2': [rep(3, [F, F, P])],
  '4-3': [rep(6, [F, iff('gem', [P])])],
  '4-4': [until('front', [F]), ife('left', [R], [Lt]), until('front', [F])],
  '4-5': [rep(13, [ife('front', [ife('left', [R], [Lt])], [F])])],
  '4-6': [rep(8, [iff('front', [R]), F])],
  '4-7': [rep(2, [rep(5, [F, iff('gem', [P])]), R, F, F, R])],
  '4-8': [until('front', [F]), ife('left', [R], [Lt]), rep(4, [F, iff('gem', [P])])],
  '5-1': { main: [C, F, C, F, F, C], fn: [Lt, F, R, F, F, R, F, Lt] },
  '5-2': { main: [rep(4, [C])], fn: [F, Lt, F, R] },
  '5-3': { main: [rep(3, [C])], fn: [rep(5, [F]), R] },
  '5-4': [set(1), rep(5, [repN([F]), R, chg(1)])],
  '5-5': [set(1), rep(3, [repN([F]), Lt, F, R, chg(1)])],
  '5-6': [set(5), rep(5, [repN([F]), R, chg(-1)])],
  '5-7': [set(1), rep(3, [repN([F]), Lt, F, R, chg(1)])],
  '5-8': { main: [set(1), rep(3, [C, F, chg(1)])], fn: [Lt, repN([F]), R, F, F, R, repN([F]), Lt] },
  '6-1': RH, '6-2': RH, '6-3': CORR,
  '6-4': { main: [rep(2, [until('front', [C]), R, C, R, until('front', [C]), Lt, C, Lt])], fn: [F, iff('gem', [P])] },
  '6-5': [rep(2, [rep(2, [until('front', [F]), R]), rep(2, [until('front', [F]), Lt])])],
  '6-6': RH, '6-7': RH, '6-8': RH,
};

const count = l => l.reduce((a, n) => a + 1 + (n.body ? count(n.body) : 0) + (n.else ? count(n.else) : 0), 0);
const usesT = (l, t) => l.some(n => n.t === t || (n.body && usesT(n.body, t)) || (n.else && usesT(n.else, t)));

function runMap(L, m, prog) {
  const g = m.map.map(r => r.split(''));
  let r, c, d = m.dir, flag = null, gems = new Set(), n = 0, steps = 0;
  g.forEach((row, y) => row.forEach((ch, x) => {
    if (ch === 'S') { r = y; c = x; }
    if (ch === '*') gems.add(y + ',' + x);
    if (ch === 'F') flag = [y, x];
  }));
  const bl = (y, x) => y < 0 || x < 0 || y >= g.length || x >= g[0].length || g[y][x] === '#';
  const bd = dd => bl(r + DIRS[dd][0], c + DIRS[dd][1]);
  const atGoal = () => !!flag && r === flag[0] && c === flag[1];
  const cond = k => ({ front: bd(d), left: bd((d + 3) % 4), right: bd((d + 1) % 4), gem: gems.has(r + ',' + c), goal: atGoal() })[k];
  const tick = () => { if (++steps > 1500) throw 'long'; };
  const win = () => { if (!gems.size && (!flag || atGoal())) throw 'win'; };
  const ex = (list, depth) => {
    if (depth > 40) throw 'long';
    for (const s of list) {
      switch (s.t) {
        case 'fwd': tick(); if (bd(d)) throw 'crash'; r += DIRS[d][0]; c += DIRS[d][1]; if (!L.pick) gems.delete(r + ',' + c); win(); break;
        case 'left': tick(); d = (d + 3) % 4; break;
        case 'right': tick(); d = (d + 1) % 4; break;
        case 'pick': tick(); if (!gems.has(r + ',' + c)) throw 'nogem'; gems.delete(r + ',' + c); win(); break;
        case 'call': tick(); ex(prog.fn, depth + 1); break;
        case 'setvar': tick(); n = s.v; break;
        case 'change': tick(); n += s.v; break;
        case 'repeat': { const k = s.useVar ? n : s.n; for (let i = 0; i < k; i++) { tick(); ex(s.body, depth); } break; }
        case 'until': while (true) { tick(); if (cond(s.c)) break; ex(s.body, depth); } break;
        case 'if': tick(); if (cond(s.c)) ex(s.body, depth); break;
        case 'ifelse': tick(); if (cond(s.c)) ex(s.body, depth); else ex(s.else, depth); break;
      }
    }
  };
  try { ex(prog.main, 0); return 'incomplete'; } catch (e) { return e; }
}
const mapsOf = L => (L.maps || [L.map]).map(m => (Array.isArray(m) ? { map: m, dir: L.dir } : m));
function runAll(L, prog) {
  for (const [i, m] of mapsOf(L).entries()) {
    const res = runMap(L, m, prog);
    if (res !== 'win') return `map${i + 1}:${res}`;
  }
  return 'win';
}

let bad = 0, total = 0;
TIERS.forEach((t, ti) => t.levels.forEach((L, li) => {
  total++;
  const id = `${ti + 1}-${li + 1}`;
  const sol = S[id];
  const prog = Array.isArray(sol) ? { main: sol, fn: [] } : sol;
  const used = count(prog.main) + count(prog.fn);
  const problems = [];
  const res = runAll(L, prog);
  if (res !== 'win') problems.push('solution ' + res);
  if (L.limit && used > L.limit) problems.push(`over limit ${used}>${L.limit}`);
  if (used !== L.best) problems.push(`best ${L.best} but solution uses ${used}`);
  const allowed = new Set(L.blocks);
  const walk = l => l.forEach(n => { const k = { fwd: 'fwd', left: 'left', right: 'right', pick: 'pick', call: 'call', setvar: 'setvar', change: 'change', repeat: 'repeat', until: 'until', if: 'if', ifelse: 'ifelse' }[n.t]; if (!allowed.has(k)) problems.push('uses disallowed ' + k); if (n.useVar && !L.vars) problems.push('var without vars'); if (n.c && !(L.conds || ['front']).includes(n.c)) problems.push('cond not allowed ' + n.c); n.body && walk(n.body); n.else && walk(n.else); });
  walk(prog.main); walk(prog.fn);
  if (L.require === 'call' && !usesT(prog.main, 'call')) problems.push('require call');
  if (L.fn && usesT(prog.main, 'call') === false && prog.fn.length) problems.push('fn unused');
  if (L.preset) {
    const pr = runAll(L, { main: L.preset, fn: [] });
    if (pr === 'win') problems.push('preset already wins');
    else problems.push && console.log(`   ${id} preset fails as intended: ${pr}`);
  }
  if (problems.length) bad++;
  console.log(`${problems.length ? 'FAIL' : 'ok  '} ${id} ${L.name} (${used} blocks) ${problems.join('; ')}`);
}));
console.log(`\n${total - bad}/${total} levels pass`);
