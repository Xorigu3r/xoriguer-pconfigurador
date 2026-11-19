// Busca els preus reals de tot el catàleg i els desa a www/preus.js (preus de partida de l'app).
//   node scripts/actualitza-preus.mjs [id ...]     (sense ids: tot el catàleg)
import { createRequire } from 'node:module';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const CAT = require('../www/cataleg.js');
const B = require('../www/botigues.js');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const espera = ms => new Promise(r => setTimeout(r, ms));
async function obte(url, intent = 0) {
  try { return await obte1(url); } catch (e) {
    if (intent >= 3 || /HTTP 4\d\d/.test(e.message)) throw e;
    await espera(2000 * (intent + 1) + Math.random() * 1000);
    return obte(url, intent + 1);
  }
}
async function obte1(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'es-ES,es;q=0.9' }, redirect: 'follow', signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const bytes = new Uint8Array(await r.arrayBuffer());
  return { text: B.descodifica(bytes, r.headers.get('content-type')), url: r.url };
}

const fitxer = fileURLToPath(new URL('../www/preus.js', import.meta.url));
let anteriors = {};
if (existsSync(fitxer)) {
  const m = readFileSync(fitxer, 'utf8').match(/=\s*(\{[\s\S]*\});?\s*$/);
  if (m) anteriors = JSON.parse(m[1]).preus || {};
}

const ids = process.argv.slice(2);
let llista = B.llistaCataleg(CAT);
if (ids.length) llista = llista.filter(([, p]) => ids.includes(p.id));

const res = await B.cercaTot(llista, obte, {
  paral: 3,
  progres: (n, t, p, r) => {
    const ref = p.preu;
    const txt = r.preu == null ? 'NO TROBAT' + (r.errors.length ? ' (' + r.errors.join('; ') + ')' : '')
      : `${r.preu.toFixed(2).padStart(8)} €  ${r.stock ? 'estoc' : 'SENSE ESTOC'}  ${r.botiga}  (ref ${ref})`;
    console.log(`${String(n).padStart(3)}/${t} ${p.id.padEnd(18)} ${txt}`);
  },
});

const preus = Object.assign({}, anteriors);
for (const [id, r] of Object.entries(res)) {
  // Cercat bé a totes les botigues i no hi és: es marca com a no disponible (el motor no el farà servir).
  if (r.preu == null && !r.errors.length) preus[id] = { preu: null, stock: false, data: r.data, ofertes: [] };
  if (r.preu != null) preus[id] = { preu: r.preu, url: r.url, botiga: r.botiga, stock: r.stock, img: r.img, data: r.data, ofertes: r.ofertes.map(o => ({ botiga: o.botiga, preu: o.preu, url: o.url, stock: o.stock, img: o.img, nom: o.nom.slice(0, 120) })) };
}
const data = new Date().toISOString();
writeFileSync(fitxer, '// Generat per scripts/actualitza-preus.mjs: no editar a mà.\nwindow.PREUS = ' + JSON.stringify({ data, preus }, null, 0) + ';\n');
const trobats = Object.values(res).filter(r => r.preu != null).length;
console.log(`\n${trobats}/${llista.length} peces amb preu. Desat a www/preus.js`);
