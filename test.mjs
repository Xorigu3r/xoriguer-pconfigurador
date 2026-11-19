// Proves del motor: node test.mjs  (amb --taula mostra els muntatges)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const CAT = require('./www/cataleg.js');
const M = require('./www/motor.js');

let fallades = 0;
const ok = (cond, msg) => { if (!cond) { fallades++; console.log('✗', msg); } };
const taula = process.argv.includes('--taula');
const byId = Object.fromEntries(Object.values(CAT).filter(Array.isArray).flat().map(p => [p.id, p]));

// 1. Catàleg coherent
const ids = new Set();
for (const s of M.SLOTS) for (const p of CAT[s]) {
  ok(!ids.has(p.id), 'id repetit ' + p.id); ids.add(p.id);
  ok(p.preu > 0 && p.q && Array.isArray(p.m) && Array.isArray(p.x), 'peça incompleta ' + p.id);
  for (const r of [...p.m, ...p.x]) { try { new RegExp(r, 'i'); } catch { ok(false, 'regex dolenta ' + p.id + ' ' + r); } }
}

// 2. Incompatibilitats conegudes
const base = { cpu: byId['r5-7600'], mb: byId['mb-b650m-d3hp'], ram: byId['ram-d5-32'], gpu: byId['rtx5060'], ssd: byId['ssd-nv3-1tb'], psu: byId['psu-pp12m-650'], case: byId['case-q300l'], cooler: null };
const errs = (parts) => M.valida(parts, 'gamer').errors.map(e => e.k);
ok(errs(base).length === 0, 'el muntatge base hauria de ser vàlid: ' + errs(base));
ok(errs({ ...base, mb: byId['mb-b550m-k'] }).includes('socket'), 'AM5 en placa AM4');
ok(errs({ ...base, ram: byId['ram-d4-16'] }).includes('memRam'), 'DDR4 en placa DDR5');
ok(errs({ ...base, cpu: byId['r7-7800x3d'], mb: byId['mb-a620m-ds3h'] }).includes('tdpPlaca'), '7800X3D en A620');
ok(errs({ ...base, cpu: byId['r7-9700x'] }).includes('senseDissi'), '9700X sense dissipador');
ok(errs({ ...base, mb: byId['mb-b650-eagle-ax'] }).includes('format'), 'ATX en caixa mATX');
ok(errs({ ...base, gpu: byId['rtx5070ti'], case: byId['case-air100'], psu: byId['psu-rm850e'] }).includes('gpuLlarg'), 'gràfica massa llarga');
ok(errs({ ...base, gpu: byId['rtx5090'] }).includes('fontFluixa'), '5090 amb 650 W');
ok(errs({ ...base, cpu: byId['r5-7500f'], gpu: null }).includes('senseVideo'), 'sense gràfics');
ok(errs({ ...base, cpu: byId['i5-14400'], mb: byId['mb-b760m-p-d4'], ram: byId['ram-d4-16'] }).length === 0, 'Intel LGA1700 amb DDR4 és vàlid');
ok(errs({ ...base, cooler: byId['cool-nhd15g2'] }).includes('dissiAlt'), 'NH-D15 no cap a la Q300L');
ok(errs({ ...base, cooler: byId['cool-lf3-360'] }).includes('radiador'), 'radiador 360 a la Q300L');
ok(M.coll(byId['r5-5500'], byId['rtx5080']) > 20, 'coll 5500 + 5080');

// 3. Muntatges automàtics: sempre compatibles, dins del pressupost i equilibrats
for (const perfil of Object.keys(M.PERFILS)) {
  let anterior = 0;
  for (let b = 300; b <= 5000; b += 50) {
    const r = M.munta(CAT, perfil, b);
    if (!r.ok) { ok(r.minim > b, `${perfil} ${b}: sense muntatge però mínim ${r.minim}`); continue; }
    ok(r.errors.length === 0, `${perfil} ${b}: errors ${r.errors.map(e => e.k)}`);
    ok(r.total <= b, `${perfil} ${b}: es passa (${r.total})`);
    ok(r.info.coll <= 14, `${perfil} ${b}: coll ${r.info.coll}%`);
    ok(r.punts >= anterior - 1, `${perfil} ${b}: més pressupost i menys rendiment (${r.punts} < ${anterior})`);
    anterior = Math.max(anterior, r.punts);
    if (taula && b % 250 === 0) {
      const p = r.parts;
      console.log(`${perfil.padEnd(9)} ${String(b).padStart(4)}€ → ${String(Math.round(r.total)).padStart(4)}€ | ${p.cpu.nom.replace(/AMD |Intel /, '')} | ${p.gpu ? p.gpu.nom.replace(/NVIDIA GeForce |AMD Radeon |Intel /, '') : '—'} | ${p.mb.chip} | ${p.ram.gb}GB ${p.ram.tipus} | ${p.ssd.gb}GB | ${p.psu.w}W q${p.psu.qual} | ${p.case.id.slice(5)} | ${p.cooler ? p.cooler.id.slice(5) : 'sèrie'} | coll ${r.info.coll}% ${r.avisos.map(a => a.k).join(',')}`);
    }
  }
}

// 4. Muntatge a mà: només surten les peces compatibles amb les triades
{
  const cpu = byId['r7-7800x3d'];
  let parts = { cpu }, triades = { cpu: true };
  const mbs = M.opcions(CAT, 'gamer', parts, triades, 'mb').filter(o => !o.errors.length).map(o => o.peca);
  ok(mbs.length > 0 && mbs.every(m => m.socket === 'AM5' && m.maxTdp >= cpu.tdp), 'a mà: plaques per al 7800X3D');
  ok(!mbs.some(m => m.chip === 'A620' && m.maxTdp < cpu.tdp), 'a mà: sense A620 fluixes');
  const am4 = M.opcions(CAT, 'gamer', parts, triades, 'mb').find(o => o.peca.socket === 'AM4');
  ok(am4.errors.length && am4.treu.includes('cpu'), 'a mà: placa AM4 treuria el processador');
  ok(M.opcions(CAT, 'gamer', parts, triades, 'ram').filter(o => !o.errors.length).every(o => o.peca.tipus === 'DDR5'), 'a mà: sense placa, la RAM segueix el processador');
  let t = M.tria(CAT, 'gamer', parts, triades, 'mb', byId['mb-b650m-d3hp'], null);
  t = M.tria(CAT, 'gamer', t.parts, t.triades, 'ram', byId['ram-d5-32'], null);
  const rams = M.opcions(CAT, 'gamer', t.parts, t.triades, 'ram').filter(o => !o.errors.length);
  ok(rams.every(o => o.peca.tipus === 'DDR5'), 'a mà: només DDR5');
  const t2 = M.tria(CAT, 'gamer', t.parts, t.triades, 'mb', byId['mb-b550m-k'], null);
  ok(t2.trets.includes('cpu') && t2.trets.includes('ram') && !t2.triades.cpu, 'a mà: placa AM4 treu processador i RAM');
  t = M.tria(CAT, 'gamer', t.parts, t.triades, 'case', byId['case-q300l'], null);
  const grans = M.opcions(CAT, 'gamer', t.parts, t.triades, 'gpu').filter(o => !o.errors.length).map(o => o.peca);
  ok(grans.every(g => !g || g.len <= 360), 'a mà: gràfiques que caben a la Q300L');
  const r = M.completaTriades(CAT, 'gamer', 2500, t.parts, t.triades, null);
  ok(r.ok && r.parts.cpu.id === 'r7-7800x3d' && r.parts.case.id === 'case-q300l' && r.errors.length === 0, 'a mà: completa respectant les triades');
  const m = M.resumMa('gamer', 2500, t.parts, t.triades, null);
  ok(!m.ok && m.falten.includes('gpu') && m.errors.length === 0, 'a mà: resum a mig fer sense errors falsos');
}

console.log(fallades ? `\n${fallades} proves fallades` : 'Totes les proves bé');
process.exit(fallades ? 1 : 0);
