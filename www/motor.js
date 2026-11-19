// Motor del configurador: compatibilitat, colls d'ampolla i repartiment del pressupost.
// Lògica pura (sense DOM): es prova amb `npm test` (test.mjs).
(function (root) {
  'use strict';

  const SLOTS = ['cpu', 'mb', 'ram', 'gpu', 'ssd', 'psu', 'case', 'cooler'];

  // Perfils d'ús. ram/ssd: mínims segons el pressupost; max: límits que no té sentit superar.
  const PERFILS = {
    gamer: {
      dgpu: true, rang: [900, 4500],
      ram: b => (b < 2500 ? 16 : 32), ramMax: 32,   // la RAM està molt cara (2026): 32 GB, només com a millora
      ssd: b => (b < 700 ? 500 : 1000), ssdMax: b => (b >= 3000 ? 4000 : 2000),
      filMin: 0, coll: 1.1, ramAvis: 16, tol: 0.985,
      ordre: ['ram', 'ssd', 'cpu', 'cooler', 'psu', 'case', 'mb', 'ssd'],
    },
    streaming: {
      dgpu: true, rang: [1100, 5000],
      ram: b => (b < 1300 ? 16 : 32), ramMax: 64, ramAvis: 32, tol: 0.985,
      ssd: () => 1000, ssdMax: () => 4000,
      filMin: 12, coll: 1.1,
      ordre: ['ram', 'ssd', 'cpu', 'cooler', 'psu', 'mb', 'case', 'ssd', 'ram'],
    },
    oficina: {
      dgpu: false, rang: [550, 1000],
      ram: b => (b < 800 ? 16 : 32), ramMax: 32,
      ssd: b => (b < 550 ? 500 : 1000), ssdMax: () => 2000,
      filMin: 8, coll: 99, ramAvis: 16, tol: 0.9, cpuOk: c => !/x3d/.test(c.id) && c.tdp <= 125,
      ordre: ['ssd', 'ram', 'mb', 'case', 'psu', 'cooler'],
    },
    navegar: {
      dgpu: false, rang: [550, 700],
      ram: () => 16, ramMax: 16,
      ssd: () => 500, ssdMax: () => 1000,
      filMin: 0, coll: 99, ramAvis: 8, tol: 0.9, cpuOk: c => !/x3d/.test(c.id) && c.mt <= 45,
      ordre: ['ssd', 'mb', 'case', 'psu'],
    },
  };

  // ---------- Preus ----------
  // preus: { id: { preu, url, botiga, stock } } (vegeu botigues.js). Sense dada → preu de referència.
  function preuDe(p, preus) {
    if (!p) return 0;
    const v = preus && preus[p.id];
    return v && typeof v.preu === 'number' ? v.preu : p.preu;
  }
  function disponible(p, preus) {
    const v = preus && preus[p.id];
    return !(v && v.stock === false && v.preu == null);
  }
  function total(parts, preus) {
    return SLOTS.reduce((s, k) => s + preuDe(parts[k], preus), 0);
  }

  // ---------- Rendiment ----------
  const sostre = cpu => cpu.g * 0.85;               // FPS màxims que el processador pot alimentar (escala de gpu.g)
  function jocs(cpu, gpu) {
    if (!gpu) return cpu.igpu >= 2 ? 10 : cpu.igpu ? 4 : 0;
    const c = sostre(cpu);
    return gpu.g <= c ? gpu.g : c + 0.3 * (gpu.g - c);
  }
  // Percentatge de la gràfica que es perd perquè el processador no arriba.
  function coll(cpu, gpu) {
    if (!cpu || !gpu) return 0;
    const c = sostre(cpu);
    return gpu.g > c ? Math.round((1 - c / gpu.g) * 100) : 0;
  }
  const ENC = { nvenc: 3, qsv: 2, amf: 1.5 };
  function puntuacio(perfil, cpu, gpu) {
    switch (perfil) {
      // + una mica de processador: mínims de FPS més estables i marge per a gràfiques futures
      // (només fins a 1,4 vegades la gràfica: més enllà és processador sobrat i diners perduts)
      case 'gamer': return jocs(cpu, gpu) + 0.08 * Math.min(sostre(cpu), gpu ? gpu.g * 1.4 : 0) / 0.85;
      case 'streaming': return 0.6 * jocs(cpu, gpu) + 0.22 * cpu.mt + (gpu ? ENC[gpu.enc] || 0 : 0);
      case 'oficina': return 0.65 * cpu.mt + 0.18 * cpu.g + 2 * cpu.igpu;
      default: return 0.5 * cpu.mt + 0.25 * cpu.g + 3 * cpu.igpu;
    }
  }

  // ---------- Electricitat ----------
  function consum(parts) {
    const { cpu, gpu } = parts;
    return (cpu ? cpu.pmax : 0) + (gpu ? gpu.tdp : 0) + 60; // 60 W: placa, RAM, disc, ventiladors
  }
  function fontRecomanada(parts) {
    const w = Math.ceil((consum(parts) * 1.3) / 50) * 50;
    return Math.max(450, w, parts.gpu ? parts.gpu.fa : 0);
  }

  // Dissipador de sèrie acceptable? (null al slot cooler = el que porta la caixa del processador)
  function serieOk(cpu, perfil) {
    if (!cpu || !cpu.dissi) return false;
    return cpu.pmax <= 120 || perfil === 'oficina' || perfil === 'navegar';
  }

  // ---------- Validació ----------
  // Torna { errors, avisos, info }. Cada missatge: { k: codi, p: paràmetres } (la interfície el tradueix).
  function valida(parts, perfil) {
    const { cpu, mb, ram, gpu, ssd, psu, case: caixa, cooler } = parts;
    const errors = [], avisos = [];
    const E = (k, p) => errors.push({ k, p: p || {} });
    const A = (k, p) => avisos.push({ k, p: p || {} });
    const P = PERFILS[perfil] || PERFILS.gamer;

    if (!cpu) E('falta', { s: 'cpu' });
    if (!mb) E('falta', { s: 'mb' });
    if (!ram) E('falta', { s: 'ram' });
    if (!ssd) E('falta', { s: 'ssd' });
    if (!psu) E('falta', { s: 'psu' });
    if (!caixa) E('falta', { s: 'case' });

    if (cpu && mb) {
      if (cpu.socket !== mb.socket) E('socket', { cpu: cpu.socket, mb: mb.socket });
      else {
        if (!cpu.mem.includes(mb.mem)) E('memCpu', { mem: mb.mem });
        if (cpu.tdp > mb.maxTdp) E('tdpPlaca', { tdp: cpu.tdp, max: mb.maxTdp, chip: mb.chip });
      }
    }
    if (ram && mb) {
      if (ram.tipus !== mb.mem) E('memRam', { ram: ram.tipus, mb: mb.mem });
      if (ram.mod > mb.slots) E('ranures', { mod: ram.mod, slots: mb.slots });
    }
    // sense placa encara (muntatge a mà): la RAM ha de ser la que admet el processador
    if (cpu && ram && !mb && !cpu.mem.includes(ram.tipus)) E('ramCpu', { mem: ram.tipus });
    if (ssd && mb && mb.m2 < 1) E('m2');
    if (mb && caixa && !caixa.forms.includes(mb.form)) E('format', { mb: mb.form });
    if (gpu && caixa && gpu.len > caixa.gpuMax) E('gpuLlarg', { len: gpu.len, max: caixa.gpuMax });
    if (cpu && !gpu && !cpu.igpu) E('senseVideo');

    if (cpu) {
      if (cooler) {
        if (cooler.tdpMax < cpu.pmax) E('dissiFluix', { w: cpu.pmax, max: cooler.tdpMax });
        if (caixa && cooler.tipus === 'aire' && cooler.alt > caixa.cooler) E('dissiAlt', { alt: cooler.alt, max: caixa.cooler });
        if (caixa && cooler.tipus === 'liquida' && cooler.rad > caixa.rad) E('radiador', { rad: cooler.rad, max: caixa.rad });
      } else if (!cpu.dissi) E('senseDissi');
      else if (!serieOk(cpu, perfil)) A('dissiSerie');
    }

    const rec = fontRecomanada(parts);
    if (psu) {
      if (psu.w < rec * 0.85) E('fontFluixa', { w: psu.w, rec });
      else if (psu.w < rec) A('fontJusta', { w: psu.w, rec });
      if (gpu && gpu.tdp >= 300 && !psu.pcie5) A('fontPcie5');
    }

    const pc = coll(cpu, gpu);
    if (cpu && gpu) {
      if (pc >= 8) A('collCpu', { pc });
      if (P.dgpu && sostre(cpu) > gpu.g * 2.3) A('cpuSobrat');
    }
    if (P.dgpu && !gpu) A('perfilGpu');
    if (ram && ram.gb < P.ramAvis) A('ramPoca', { gb: P.ramAvis });
    if (cpu && P.filMin && cpu.fil < P.filMin) A('filsPocs', { fil: cpu.fil, min: P.filMin });
    if (cpu && ram && cpu.socket === 'AM5' && ram.mhz < 6000 && perfil === 'gamer') A('ramLenta');

    return { errors, avisos, info: { consum: consum(parts), rec, coll: pc } };
  }
  const compatible = (parts, perfil) => valida(parts, perfil).errors.length === 0;

  // ---------- Mínims de qualitat segons el pressupost ----------
  function qMin(slot, b, perfil, gpu) {
    const lleuger = perfil === 'oficina' || perfil === 'navegar';
    if (slot === 'psu') return b >= 2500 ? 3 : (b >= 800 || (gpu && gpu.tdp >= 250)) ? 2 : 1;
    if (slot === 'mb') return lleuger ? (b >= 1200 ? 2 : 1) : b >= 2200 ? 3 : b >= 1000 ? 2 : 1;
    if (slot === 'case') return lleuger ? 1 : b >= 1300 ? 2 : 1;
    return 1;
  }

  const barat = preus => (a, b) => preuDe(a, preus) - preuDe(b, preus);

  // Peces més barates (amb els mínims) que acompanyen un processador i una gràfica.
  function completa(cat, perfil, b, cpu, gpu, preus, fixades, real) {
    const P = PERFILS[perfil];
    const br = real == null ? b : real;
    const disp = l => l.filter(p => disponible(p, preus));
    const fix = s => (fixades && fixades[s] !== undefined ? fixades[s] : undefined);
    const ramMin = P.ram(br), ssdMin = P.ssd(br);
    const rec = fontRecomanada({ cpu, gpu });

    const mbs = fix('mb') !== undefined ? [fix('mb')] : disp(cat.mb).filter(m => m.qual >= qMin('mb', b, perfil, gpu));
    const ssd = fix('ssd') !== undefined ? fix('ssd') : disp(cat.ssd).filter(s => s.gb >= ssdMin).sort(barat(preus))[0];
    const psu = fix('psu') !== undefined ? fix('psu') : disp(cat.psu).filter(p => p.w >= rec && p.qual >= qMin('psu', b, perfil, gpu)).sort(barat(preus))[0];
    if (!ssd || !psu) return null;

    const coolers = fix('cooler') !== undefined ? [fix('cooler')]
      : (serieOk(cpu, perfil) ? [null] : []).concat(disp(cat.cooler).filter(c => c.tdpMax >= cpu.pmax).sort(barat(preus)));
    const caixes = fix('case') !== undefined ? [fix('case')] : disp(cat.case).filter(c => c.qual >= qMin('case', b, perfil, gpu)).sort(barat(preus));

    let millor = null, cost = Infinity;
    for (const mb of mbs) {
      if (!mb || mb.socket !== cpu.socket || !cpu.mem.includes(mb.mem) || cpu.tdp > mb.maxTdp) continue;
      const ram = fix('ram') !== undefined ? fix('ram')
        : disp(cat.ram).filter(r => r.tipus === mb.mem && r.mod <= mb.slots && r.gb >= ramMin).sort(barat(preus))[0];
      if (!ram) continue;
      for (const cooler of coolers) {
        for (const caixa of caixes) {
          const parts = { cpu, mb, ram, gpu, ssd, psu, case: caixa, cooler };
          const c = total(parts, preus);
          if (c >= cost) continue;
          if (!compatible(parts, perfil)) continue;
          millor = parts; cost = c;
          break; // caixes ordenades per preu: la primera vàlida ja és la millor amb aquest dissipador
        }
      }
    }
    return millor;
  }

  // ---------- Millores amb el que sobra ----------
  const RANG = {
    ram: r => r.gb * 10 + r.mhz / 1000,
    ssd: s => s.gb + s.qual * 100,
    psu: p => p.qual * 10000 - p.w,          // més qualitat; a igual qualitat, la més justa
    cooler: c => (c ? c.qual * 1000 + c.tdpMax : 0),
    case: c => c.qual,
    mb: m => m.qual * 10 + (m.wifi ? 1 : 0) + m.m2 / 10,
    cpu: null, // depèn del perfil (vegeu millora)
  };
  function millora(cat, perfil, b, parts, preus, fixades) {
    const P = PERFILS[perfil];
    const dins = {
      ram: r => r.gb <= P.ramMax,
      ssd: s => s.gb <= P.ssdMax(b),
      psu: p => p.w >= fontRecomanada(parts) && p.w <= fontRecomanada(parts) + 300,
      // dissipador: res de líquida per a processadors frescos, ni més del doble del que cal
      cooler: c => (perfil === 'gamer' || perfil === 'streaming' || !parts.cpu.dissi) &&
        c.tdpMax <= Math.max(parts.cpu.pmax * 1.7, 200) && (c.tipus === 'aire' || parts.cpu.pmax >= 200),
      case: () => true,
      mb: m => m.qual <= qMin('mb', b, perfil, parts.gpu) + 1,
    };
    const rang = s => (s === 'cpu' ? c => puntuacio(perfil, c, parts.gpu) : RANG[s]);
    // processador: només si no queda desproporcionat respecte de la gràfica i la font encara hi arriba
    dins.cpu = c => c.fil >= P.filMin && (!parts.gpu || parts.gpu.g <= sostre(c) * P.coll) &&
      (!parts.gpu || perfil !== 'gamer' || sostre(c) <= Math.max(parts.gpu.g * 1.6, sostre(parts.cpu))) &&
      (!parts.psu || fontRecomanada(Object.assign({}, parts, { cpu: c })) <= parts.psu.w);
    let canvi = true, voltes = 0;
    while (canvi && voltes++ < 20) {
      canvi = false;
      for (const s of P.ordre) {
        if (fixades && fixades[s] !== undefined) continue;
        const sobra = b - total(parts, preus);
        const R = rang(s);
        const actual = R(parts[s]);
        const cands = cat[s]
          .filter(p => disponible(p, preus) && dins[s](p) && R(p) > (s === 'cpu' ? actual * 1.02 : actual))
          .sort((x, y) => R(x) - R(y) || preuDe(x, preus) - preuDe(y, preus));
        for (const c of cands) {
          const nou = Object.assign({}, parts, { [s]: c });
          // la RAM ha de seguir el tipus de la placa
          if (preuDe(c, preus) - preuDe(parts[s], preus) > sobra) continue;
          if (!compatible(nou, perfil)) continue;
          parts = nou; canvi = true;
          break; // un esglaó per volta: així la resta de peces també tenen torn
        }
      }
    }
    return parts;
  }

  // ---------- Muntatge ----------
  // opcions: { preus, fixades: { slot: peça | null } }
  function munta(cat, perfil, pressupost, opcions) {
    const P = PERFILS[perfil];
    if (!P) throw new Error('perfil desconegut: ' + perfil);
    const preus = opcions && opcions.preus;
    const fixades = (opcions && opcions.fixades) || {};
    // Per a oficina i navegar, passat el rang no s'hi guanya res: es munta el PC adequat i sobren diners.
    const b = P.dgpu ? pressupost : Math.min(pressupost, P.rang[1]);

    const cpus = fixades.cpu ? [fixades.cpu] : cat.cpu.filter(c => disponible(c, preus) && c.fil >= P.filMin && (P.dgpu || c.igpu) && (!P.cpuOk || P.cpuOk(c)));
    const gpus = fixades.gpu !== undefined ? [fixades.gpu] : P.dgpu ? cat.gpu.filter(g => disponible(g, preus)) : [null];

    // Mínims de qualitat «tous»: es proven els del pressupost i els d'un pressupost més baix; només
    // s'accepten els alts si no fan perdre rendiment de veritat (així 1000 € mai rendeix menys que 950 €).
    let minim = Infinity, tria = null;
    for (const nivell of [b, b * 0.75, b * 0.5, 0]) {
      const cands = [];
      for (const cpu of cpus) {
        for (const gpu of gpus) {
          // coll d'ampolla massa gran (si l'usuari ha triat ell mateix el processador i la gràfica, mana ell)
          if (gpu && P.dgpu && !(fixades.cpu && fixades.gpu !== undefined) && gpu.g > sostre(cpu) * P.coll) continue;
          const parts = completa(cat, perfil, nivell, cpu, gpu, preus, fixades, b);
          if (!parts) continue;
          const c = total(parts, preus);
          minim = Math.min(minim, c);
          if (c > b) continue;
          cands.push({ parts, cost: c, punts: puntuacio(perfil, cpu, gpu) });
        }
      }
      if (!cands.length) continue;
      // El més potent; si n'hi ha de gairebé iguals (−1,5 %), el més barat (deixa marge per millorar la resta).
      const top = Math.max(...cands.map(c => c.punts));
      cands.sort((x, y) => x.cost - y.cost);
      const m = cands.find(c => c.punts >= top * P.tol);
      if (!tria || m.punts > tria.punts * 1.04) tria = m; // un nivell més baix només si guanya > 4 %
    }
    if (!tria) return { ok: false, minim: isFinite(minim) ? Math.ceil(minim) : null };

    const parts = millora(cat, perfil, b, tria.parts, preus, fixades);
    return resultat(perfil, pressupost, parts, preus);
  }

  function resultat(perfil, b, parts, preus) {
    const v = valida(parts, perfil);
    const t = total(parts, preus);
    const P = PERFILS[perfil];
    const avisos = v.avisos.slice();
    if (b > P.rang[1]) avisos.push({ k: 'massaPressupost', p: { max: P.rang[1] } });
    return {
      ok: v.errors.length === 0, perfil, pressupost: b, parts, total: Math.round(t * 100) / 100,
      sobra: Math.round((b - t) * 100) / 100, errors: v.errors, avisos, info: v.info,
      punts: parts.cpu ? Math.round(puntuacio(perfil, parts.cpu, parts.gpu)) : 0,
      equilibri: equilibri(parts),
    };
  }

  // Barra CPU/GPU per a la interfície: on cau cada peça en rendiment de jocs.
  function equilibri(parts) {
    const { cpu, gpu } = parts;
    if (!cpu) return null;
    return { cpu: Math.round(sostre(cpu)), gpu: gpu ? gpu.g : 0, coll: coll(cpu, gpu) };
  }

  // Alternatives d'un lloc: cada peça amb la diferència de preu i si deixa el PC compatible.
  function alternatives(cat, perfil, parts, slot, preus) {
    const actual = preuDe(parts[slot], preus);
    const llista = cat[slot].map(p => {
      const nou = Object.assign({}, parts, { [slot]: p });
      const v = valida(nou, perfil);
      return { peca: p, preu: preuDe(p, preus), dif: Math.round((preuDe(p, preus) - actual) * 100) / 100, errors: v.errors, coll: v.info.coll };
    });
    if (slot === 'gpu' || slot === 'cooler') {
      const nou = Object.assign({}, parts, { [slot]: null });
      const v = valida(nou, perfil);
      llista.unshift({ peca: null, preu: 0, dif: -actual, errors: v.errors, coll: 0 });
    }
    return llista;
  }

  // Recalcula un muntatge després que l'usuari canviï una peça (corregeix la RAM i la font si cal).
  function canvia(cat, perfil, b, parts, slot, peca, preus) {
    let nou = Object.assign({}, parts, { [slot]: peca });
    if (nou.mb && nou.ram && nou.ram.tipus !== nou.mb.mem) {
      const r = cat.ram.filter(x => x.tipus === nou.mb.mem && x.mod <= nou.mb.slots && x.gb >= nou.ram.gb).sort(barat(preus))[0]
        || cat.ram.filter(x => x.tipus === nou.mb.mem && x.mod <= nou.mb.slots).sort((x, y) => y.gb - x.gb)[0];
      if (r) nou.ram = r;
    }
    if (slot !== 'psu' && nou.psu && nou.psu.w < fontRecomanada(nou)) {
      const f = cat.psu.filter(p => p.w >= fontRecomanada(nou) && p.qual >= nou.psu.qual).sort(barat(preus))[0]
        || cat.psu.filter(p => p.w >= fontRecomanada(nou)).sort(barat(preus))[0];
      if (f) nou.psu = f;
    }
    return resultat(perfil, b, nou, preus);
  }

  // ---------- Muntatge a mà ----------
  // Peces que intervenen en cada incompatibilitat (per saber què cal treure si en tries una que no hi va).
  const PECES_ERROR = {
    socket: ['cpu', 'mb'], memCpu: ['cpu', 'mb'], ramCpu: ['cpu', 'ram'], tdpPlaca: ['cpu', 'mb'], memRam: ['ram', 'mb'], ranures: ['ram', 'mb'],
    m2: ['mb', 'ssd'], format: ['mb', 'case'], gpuLlarg: ['gpu', 'case'], senseVideo: ['cpu', 'gpu'],
    dissiFluix: ['cooler', 'cpu'], dissiAlt: ['cooler', 'case'], radiador: ['cooler', 'case'], senseDissi: ['cpu', 'cooler'],
    fontFluixa: ['psu', 'cpu', 'gpu'],
  };
  // Errors entre peces ja triades. triades: { slot: true } (gpu/cooler a null i triats = gràfics integrats / de sèrie).
  function conflictes(parts, perfil, triades) {
    return valida(parts, perfil).errors.filter(e => {
      const s = PECES_ERROR[e.k];
      if (!s) return false;
      if (e.k === 'fontFluixa') return !!triades.psu;
      return s.every(x => triades[x]);
    });
  }
  // Totes les peces d'un lloc amb el que passaria si la tries: compatible o no, què s'hauria de treure i el preu.
  //   treu: llocs que deixarien de ser compatibles (es buiden en triar-la). bloc: no es pot triar (font massa petita).
  function opcions(cat, perfil, parts, triades, slot, preus) {
    const T = Object.assign({}, triades, { [slot]: true });
    const llista = (slot === 'gpu' || slot === 'cooler' ? [null] : []).concat(cat[slot]).map(p => {
      const nou = Object.assign({}, parts, { [slot]: p });
      const errors = conflictes(nou, perfil, T);
      const treu = new Set();
      let bloc = false;
      for (const e of errors) {
        if (e.k === 'fontFluixa' && slot === 'psu') { bloc = true; continue; }
        if (e.k === 'fontFluixa') { treu.add('psu'); continue; }
        for (const x of PECES_ERROR[e.k]) if (x !== slot) treu.add(x);
      }
      const v = valida(nou, perfil);
      return { peca: p, preu: preuDe(p, preus), errors, treu: [...treu], bloc, coll: v.info.coll, disponible: !p || disponible(p, preus) };
    });
    return llista;
  }
  // Tria una peça a mà: buida les que deixen de ser compatibles. Torna { parts, triades, trets: [slots] }.
  function tria(cat, perfil, parts, triades, slot, peca, preus) {
    const o = opcions(cat, perfil, parts, triades, slot, preus).find(x => (x.peca && peca ? x.peca.id === peca.id : x.peca === peca));
    const nou = Object.assign({}, parts, { [slot]: peca });
    const T = Object.assign({}, triades, { [slot]: true });
    const trets = o ? o.treu : [];
    for (const s of trets) { nou[s] = null; delete T[s]; }
    return { parts: nou, triades: T, trets };
  }
  // Completa amb el pressupost les peces que falten, respectant les triades.
  function completaTriades(cat, perfil, pressupost, parts, triades, preus) {
    const fixades = {};
    for (const s of SLOTS) if (triades[s]) fixades[s] = parts[s];
    return munta(cat, perfil, pressupost, { preus, fixades });
  }
  // Resum d'un muntatge a mig fer (o acabat) fet a mà.
  function resumMa(perfil, b, parts, triades, preus) {
    const r = resultat(perfil, b, parts, preus);
    const falten = SLOTS.filter(s => !triades[s]);
    r.falten = falten;
    r.errors = conflictes(parts, perfil, triades);
    r.ok = !falten.length && !r.errors.length;
    // avisos només de les peces triades (sense «falta gràfica» si encara no l'has triada)
    r.avisos = r.avisos.filter(a => !(a.k === 'perfilGpu' && !triades.gpu) && !(a.k === 'dissiSerie' && !triades.cooler) && !(/^font/.test(a.k) && !triades.psu) && a.k !== 'massaPressupost');
    if (falten.length) r.sobra = Math.round((b - r.total) * 100) / 100;
    return r;
  }

  const MOTOR = { SLOTS, PERFILS, munta, valida, alternatives, canvia, total, preuDe, coll, consum, fontRecomanada, puntuacio, equilibri, opcions, tria, completaTriades, resumMa, conflictes };
  if (typeof module !== 'undefined' && module.exports) module.exports = MOTOR;
  else root.MOTOR = MOTOR;
})(typeof window !== 'undefined' ? window : globalThis);
