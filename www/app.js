/* Xoriguer PConfigurador — interfície. La lògica és a motor.js (compatibilitat) i botigues.js (preus). */
'use strict';
(function () {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const T_ = (s, v) => I18N.t(s, v);
  const CAT = window.CATALEG, M = window.MOTOR, B = window.BOTIGUES;

  // ---------- Desament local ----------
  const desa = (k, v) => { try { localStorage.setItem('pc.' + k, JSON.stringify(v)); } catch { /* sense memòria */ } };
  const llegeix = (k, d) => { try { const v = localStorage.getItem('pc.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } };

  // ---------- Idioma ----------
  const prefIdioma = llegeix('idioma', '');
  I18N.posa(prefIdioma);
  document.documentElement.lang = I18N.llengua;
  $('#idioma').value = prefIdioma;
  $('#idioma').addEventListener('change', e => { desa('idioma', e.target.value); location.reload(); });
  I18N.tradueix(document.body);
  document.title = 'Xoriguer PConfigurador';
  const VERSIO = '1.3.0'; // igual que package.json

  // ---------- Plataforma i lectura de pàgines ----------
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
  const Cap = window.Capacitor;
  const PLATAFORMA = window.natiu ? 'escriptori' : (Cap && Cap.isNativePlatform && Cap.isNativePlatform()) ? 'android' : 'web';
  let obte = null;
  if (PLATAFORMA === 'escriptori') obte = url => window.natiu.obte(url);
  else if (PLATAFORMA === 'android') {
    obte = async url => {
      const H = Cap.Plugins && Cap.Plugins.CapacitorHttp;
      if (!H) { // sense el connector: fetch (Capacitor el passa pel costat natiu, sense CORS)
        const f = await fetch(url, { headers: { 'Accept-Language': 'es-ES,es;q=0.9' } });
        if (!f.ok) throw new Error('HTTP ' + f.status);
        return { text: await f.text(), url: f.url || url };
      }
      const r = await H.get({ url, headers: { 'User-Agent': UA, 'Accept-Language': 'es-ES,es;q=0.9' }, responseType: 'text', connectTimeout: 20000, readTimeout: 25000 });
      if (r.status >= 400) throw new Error('HTTP ' + r.status);
      return { text: typeof r.data === 'string' ? r.data : JSON.stringify(r.data), url: r.url || url };
    };
  }
  const reintenta = f => async url => {
    for (let i = 0; ; i++) {
      try { return await f(url); } catch (e) {
        if (i >= 2 || /HTTP 4\d\d/.test(String(e && e.message))) throw e;
        await new Promise(r => setTimeout(r, 1500 * (i + 1)));
      }
    }
  };
  if (obte) obte = reintenta(obte);
  function obreEnllac(url) {
    if (PLATAFORMA === 'escriptori') window.natiu.obre(url);
    else window.open(url, '_blank', 'noopener');
  }

  // ---------- Preus ----------
  // Base: www/preus.js (generat en publicar). A sobre: el que l'app ha cercat en directe (localStorage).
  const base = (window.PREUS && window.PREUS.preus) || {};
  let directe = llegeix('preus', {});
  let dataDirecte = llegeix('dataPreus', null);
  const preus = () => Object.assign({}, base, directe);
  const dataBase = window.PREUS && window.PREUS.data;
  // Una versió nova de l'app porta preus més nous que els que s'havien cercat: manen els nous.
  if (dataBase && dataDirecte && dataBase > dataDirecte) { directe = {}; dataDirecte = null; }

  function pintaEstatPreus(msg) {
    const d = dataDirecte || dataBase;
    $('#preus-titol').textContent = T_('Preus reals d\'Alternate i LDLC');
    let info = d ? T_('Actualitzats: {d}', { d: new Date(d).toLocaleString(I18N.llengua, { dateStyle: 'medium', timeStyle: 'short' }) }) : T_('Preus de referència');
    if (!obte) info += ' · ' + T_('A la web no es poden llegir les botigues: per tenir-los al moment, fes servir l\'app (Android, Windows o Linux).');
    $('#preus-info').textContent = msg || info;
    $('#actualitza').hidden = !obte;
  }

  let actualitzant = false;
  async function actualitzaPreus(nomesMuntatge) {
    if (!obte || actualitzant) return;
    actualitzant = true;
    $('#actualitza').disabled = true;
    const barra = $('#progres'); barra.hidden = false;
    let llista = B.llistaCataleg(CAT);
    if (nomesMuntatge && estat.res && estat.res.parts) {
      const ids = new Set(Object.values(estat.res.parts).filter(Boolean).map(p => p.id));
      llista = llista.filter(([, p]) => ids.has(p.id));
    }
    let fallades = 0;
    try {
      const res = await B.cercaTot(llista, obte, {
        paral: 3,
        progres: (n, t) => { barra.firstElementChild.style.width = (100 * n / t) + '%'; pintaEstatPreus(T_('Buscant preus… {n}/{t}', { n, t })); },
      });
      for (const [id, r] of Object.entries(res)) {
        if (r.preu != null) directe[id] = { preu: r.preu, url: r.url, botiga: r.botiga, stock: r.stock, img: r.img, data: r.data, ofertes: r.ofertes.map(o => ({ botiga: o.botiga, preu: o.preu, url: o.url, stock: o.stock, img: o.img, nom: o.nom.slice(0, 120) })) };
        else if (!r.errors.length) directe[id] = { preu: null, stock: false, data: r.data, ofertes: [] };
        else fallades++;
      }
      dataDirecte = new Date().toISOString();
      desa('preus', directe); desa('dataPreus', dataDirecte);
      if (fallades) toast(T_('{n} peces no s\'han pogut consultar (sense connexió o la botiga no respon): es mantenen els preus anteriors.', { n: fallades }));
    } finally {
      actualitzant = false;
      $('#actualitza').disabled = false;
      barra.hidden = true;
      pintaEstatPreus();
      for (const k in minims) delete minims[k];
      pintaPerfil();
      if (estat.res) munta(false);
    }
  }
  $('#actualitza').addEventListener('click', () => actualitzaPreus(false));

  // ---------- Opcions ----------
  const NOM_PLAT = { escriptori: 'Windows / Linux', android: 'Android', web: 'Web' };
  $('#versio').textContent = T_('Versió {v}', { v: VERSIO }) + ' · ' + NOM_PLAT[PLATAFORMA];
  $('#opcions').addEventListener('click', () => $('#dlg-opc').showModal());

  // Busca actualitzacions: el mateix versio.json que fa servir la pàgina de baixades de xoriguer.dev.
  const URL_VERSIO = 'https://xoriguer.dev/versions/pconfigurador/versio.json';
  const compara = (a, b) => {
    const x = String(a).split(/[.\-]/).map(n => parseInt(n, 10) || 0), y = String(b).split(/[.\-]/).map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
    return 0;
  };
  async function buscaActualitzacions() {
    const info = $('#act-info'), boto = $('#busca-act'), baixa = $('#baixa-act');
    baixa.hidden = true;
    if (PLATAFORMA === 'web') { info.textContent = T_('La web sempre té la versió més nova: no cal actualitzar res.'); return; }
    boto.disabled = true; info.textContent = T_('Buscant…');
    try {
      const r = await fetch(URL_VERSIO + '?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error(r.status);
      const v = await r.json();
      const nova = v.versio;
      if (!nova || compara(nova, VERSIO) <= 0) { info.textContent = T_('Ja tens la versió més nova ({v}).', { v: VERSIO }); return; }
      const linux = window.natiu && window.natiu.so === 'linux';
      const url = PLATAFORMA === 'android' ? v.apk : linux ? v.linux : v.url;
      info.textContent = T_('Hi ha una versió nova: {n} (tens la {v}).', { n: nova, v: VERSIO });
      baixa.href = url || 'https://xoriguer.dev/'; baixa.hidden = false;
    } catch {
      info.textContent = T_('No s\'ha pogut comprovar: mira si tens connexió a internet.');
    } finally { boto.disabled = false; }
  }
  $('#busca-act').addEventListener('click', buscaActualitzacions);
  $$('a[data-extern]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); obreEnllac(a.href); }));

  // ---------- Estat de la pantalla ----------
  const estat = { perfil: M.PERFILS[llegeix('perfil', 'gamer')] ? llegeix('perfil', 'gamer') : 'gamer', pressupost: llegeix('pressupost', 1200), res: null, mode: llegeix('mode', 'auto') };
  // Muntatge a mà: peces triades (gpu/cooler a null i triats = gràfics integrats / dissipador de sèrie).
  const PER_ID = Object.fromEntries(M.SLOTS.flatMap(s => CAT[s].map(p => [p.id, p])));
  const ma = { parts: {}, triades: {} };
  (function () {
    const d = llegeix('ma', null);
    if (!d || !d.triades) return;
    for (const s of M.SLOTS) {
      if (!d.triades[s]) continue;
      const id = d.ids[s];
      if (id == null) { ma.parts[s] = null; ma.triades[s] = true; } else if (PER_ID[id]) { ma.parts[s] = PER_ID[id]; ma.triades[s] = true; }
    }
  })();
  const desaMa = () => desa('ma', { ids: Object.fromEntries(M.SLOTS.map(s => [s, ma.parts[s] ? ma.parts[s].id : null])), triades: ma.triades });

  function pintaPerfil() {
    $$('.perfil[data-perfil]').forEach(b => b.setAttribute('aria-checked', b.dataset.perfil === estat.perfil ? 'true' : 'false'));
    const r = M.PERFILS[estat.perfil].rang;
    const min = minim(estat.perfil);
    $('#consell').textContent = T_('Amb els preus d\'ara, a partir de {m} €. El més raonable per a aquest ús: fins a {b} €.', { m: (min || r[0]).toLocaleString(I18N.llengua), b: r[1].toLocaleString(I18N.llengua) });
  }
  // Pressupost mínim amb els preus actuals (cerca binària sobre el motor).
  const minims = {};
  function minim(perfil) {
    if (minims[perfil]) return minims[perfil];
    let lo = 300, hi = 6000;
    if (!M.munta(CAT, perfil, hi, { preus: preus() }).ok) return null;
    while (hi - lo > 10) { const m = (lo + hi) >> 1; if (M.munta(CAT, perfil, m, { preus: preus() }).ok) hi = m; else lo = m; }
    return (minims[perfil] = Math.ceil(hi / 10) * 10);
  }
  $$('.perfil[data-perfil]').forEach(b => b.addEventListener('click', () => {
    estat.perfil = b.dataset.perfil; desa('perfil', estat.perfil); pintaPerfil();
    if (estat.mode === 'ma') pintaMa(false);
    else if (estat.res) munta(true);
  }));

  // ---------- Mode: automàtic o a mà ----------
  function posaMode(m, desplaca) {
    estat.mode = m; desa('mode', m);
    $$('.mode').forEach(b => b.setAttribute('aria-checked', b.dataset.mode === m ? 'true' : 'false'));
    $('#munta').textContent = m === 'ma' ? T_('Completa el que falta amb el pressupost') : T_("Munta'm el PC");
    $('#ama').hidden = m === 'ma';
    $('#buida').hidden = m !== 'ma';
    $('#refa').hidden = m === 'ma';
    if (m === 'ma') pintaMa(desplaca);
    else if (estat.res && estat.res.auto) pinta(estat.res, false);
    else { estat.res = null; $('#resultat').hidden = true; }
  }
  $$('.mode').forEach(b => b.addEventListener('click', () => posaMode(b.dataset.mode, true)));
  function pintaMa(desplaca) {
    estat.res = M.resumMa(estat.perfil, estat.pressupost, ma.parts, ma.triades, preus());
    pinta(estat.res, desplaca);
  }
  // Omple les peces que falten amb el pressupost (les triades no es toquen).
  function completaMa() {
    const r = M.completaTriades(CAT, estat.perfil, estat.pressupost, ma.parts, ma.triades, preus());
    if (!r.ok) {
      toast(r.minim ? T_('Amb les peces que has triat, el PC complet costaria uns {m}: puja el pressupost o canvia alguna peça.', { m: euros(r.minim) })
        : T_("No hi ha cap manera de completar-lo amb les peces que has triat: canvia'n alguna."));
      return;
    }
    for (const s of M.SLOTS) { ma.parts[s] = r.parts[s]; ma.triades[s] = true; }
    desaMa(); pintaMa(true);
  }
  $('#ama').addEventListener('click', () => {
    const r = estat.res; if (!r) return;
    for (const s of M.SLOTS) { ma.parts[s] = r.parts[s] || null; ma.triades[s] = true; }
    desaMa(); posaMode('ma', false);
    toast(T_('Ara pots canviar qualsevol peça: només et sortiran les que hi van bé.'));
  });
  $('#buida').addEventListener('click', () => {
    for (const s of M.SLOTS) { delete ma.parts[s]; delete ma.triades[s]; }
    desaMa(); pintaMa(false);
  });

  function posaPressupost(v, des) {
    v = Math.max(300, Math.min(20000, Math.round(+v || 0)));
    estat.pressupost = v; desa('pressupost', v);
    if (des !== 'rang') $('#rang').value = Math.min(5000, v);
    if (des !== 'xifra') $('#xifra').value = v;
  }
  $('#rang').addEventListener('input', e => posaPressupost(e.target.value, 'rang'));
  $('#xifra').addEventListener('change', e => posaPressupost(e.target.value, 'xifra'));
  const accio = () => { posaPressupost($('#xifra').value); if (estat.mode === 'ma') completaMa(); else munta(true); };
  $('#xifra').addEventListener('keydown', e => { if (e.key === 'Enter') accio(); });
  $('#munta').addEventListener('click', accio);
  // a mà, el pressupost només canvia el «et sobren»
  ['#xifra', '#rang'].forEach(q => $(q).addEventListener('change', () => { if (estat.mode === 'ma') pintaMa(false); }));
  $('#refa').addEventListener('click', () => munta(true));

  // ---------- Textos ----------
  const NOM_SLOT = { cpu: 'Processador', mb: 'Placa base', ram: 'Memòria RAM', gpu: 'Targeta gràfica', ssd: 'Disc SSD', psu: "Font d'alimentació", case: 'Caixa', cooler: 'Dissipador' };
  const ICO = { cpu: '🧠', mb: '🧩', ram: '🧮', gpu: '🖥️', ssd: '💾', psu: '🔌', case: '🗄️', cooler: '❄️' };
  const MISSATGES = {
    falta: 'Falta una peça: {s}.',
    socket: 'El processador és {cpu} i la placa {mb}: no encaixen.',
    memCpu: 'Aquest processador no admet memòria {mem}.',
    ramCpu: 'Aquest processador no admet memòria {mem}.',
    tdpPlaca: 'La placa ({chip}) no alimenta bé un processador de {tdp} W (màxim {max} W).',
    memRam: 'La RAM és {ram} i la placa vol {mb}.',
    ranures: 'La RAM té {mod} mòduls i la placa només té {slots} ranures.',
    m2: 'La placa no té ranura M.2 per al disc.',
    format: 'Una placa {mb} no cap en aquesta caixa.',
    gpuLlarg: 'La gràfica pot fer fins a {len} mm i a la caixa n\'hi caben {max}.',
    senseVideo: 'Sense gràfica dedicada i el processador no té gràfics integrats: no hi hauria imatge.',
    dissiFluix: 'El dissipador aguanta {max} W i el processador en pot fer {w}.',
    dissiAlt: 'El dissipador fa {alt} mm d\'alçada i a la caixa n\'hi caben {max}.',
    radiador: 'El radiador de {rad} mm no cap a la caixa (màxim {max} mm).',
    senseDissi: 'Aquest processador no porta dissipador: n\'hi has d\'afegir un.',
    fontFluixa: 'La font de {w} W no n\'hi ha prou: calen uns {rec} W.',
    dissiSerie: 'El dissipador de sèrie anirà just i farà soroll: millor un de torre.',
    fontJusta: 'La font de {w} W va justa (recomanat: {rec} W).',
    fontPcie5: 'Per a aquesta gràfica, millor una font amb connector 12V-2x6 (ATX 3).',
    collCpu: 'El processador frena la gràfica un {pc} % aproximadament.',
    cpuSobrat: 'El processador és molt més potent que la gràfica: els diners rendirien més a la gràfica.',
    perfilGpu: 'Per jugar o fer streaming cal una gràfica dedicada.',
    ramPoca: 'Per a aquest ús es recomanen {gb} GB de RAM.',
    filsPocs: 'Per fer streaming van millor 12 fils o més (aquest en té {fil}).',
    ramLenta: 'Amb AM5, la RAM a 6000 MHz rendeix millor en jocs.',
    massaPressupost: 'Per a aquest ús, passat de {max} € no s\'hi guanya gaire: et sobren diners.',
  };
  const missatge = m => T_(MISSATGES[m.k] || m.k, Object.assign({}, m.p, m.p.s ? { s: T_(NOM_SLOT[m.p.s]) } : {}));
  const euros = v => (Math.round(v * 100) / 100).toLocaleString(I18N.llengua, { style: 'currency', currency: 'EUR', maximumFractionDigits: v >= 100 ? 0 : 2 });

  function especificacions(s, p) {
    if (!p) return s === 'gpu' ? T_('Fa servir els gràfics del processador') : T_('El que ve amb el processador');
    switch (s) {
      case 'cpu': return T_('{n} nuclis / {f} fils · {s} · {w} W', { n: p.nuc, f: p.fil, s: p.socket, w: p.tdp }) + (p.igpu ? ' · ' + T_('gràfics integrats') : '');
      case 'mb': return [p.socket, p.chip, p.form, p.mem, T_('{n} ranures RAM', { n: p.slots }), T_('{n} × M.2', { n: p.m2 })].concat(p.wifi ? ['Wi-Fi'] : []).join(' · ');
      case 'ram': return `${p.tipus} · ${p.gb} GB · ${p.mhz} MHz`;
      case 'gpu': return T_('{v} GB · {w} W · fins a {l} mm', { v: p.vram, w: p.tdp, l: p.len });
      case 'ssd': return `${p.gb >= 1000 ? p.gb / 1000 + ' TB' : p.gb + ' GB'} · NVMe PCIe ${p.gen}.0`;
      case 'psu': return `${p.w} W · 80+ ${p.cert}` + (p.pcie5 ? ' · ATX 3 (12V-2x6)' : '');
      case 'case': return T_('Plaques {f} · gràfica fins a {g} mm · dissipador fins a {c} mm', { f: p.forms.join('/'), g: p.gpuMax, c: p.cooler });
      case 'cooler': return p.tipus === 'liquida' ? T_('Refrigeració líquida {r} mm · fins a {w} W', { r: p.rad, w: p.tdpMax }) : T_('Torre de {a} mm · fins a {w} W', { a: p.alt, w: p.tdpMax });
    }
    return '';
  }
  // Fitxa: [etiqueta, valor] de cada característica del catàleg
  const siNo = v => v ? T_('Sí') : T_('No');
  const ENC = { nvenc: 'NVIDIA NVENC', amf: 'AMD AMF', qsv: 'Intel Quick Sync' };
  function caracteristiques(s, p) {
    const mida = gb => gb >= 1000 ? gb / 1000 + ' TB' : gb + ' GB';
    switch (s) {
      case 'cpu': return [[T_('Sòcol'), p.socket], [T_('Nuclis / fils'), `${p.nuc} / ${p.fil}`], [T_('Consum (TDP)'), p.tdp + ' W'],
        [T_('Consum màxim'), p.pmax + ' W'], [T_('Memòria compatible'), p.mem.join(', ')], [T_('Gràfics integrats'), siNo(p.igpu)], [T_('Dissipador inclòs'), siNo(p.dissi)]];
      case 'mb': return [[T_('Sòcol'), p.socket], [T_('Xipset'), p.chip], [T_('Format'), p.form], [T_('Memòria'), p.mem],
        [T_('Ranures de RAM'), p.slots], [T_('Ranures M.2'), p.m2], ['Wi-Fi', siNo(p.wifi)], [T_('Processador fins a'), p.maxTdp + ' W']];
      case 'ram': return [[T_('Tipus'), p.tipus], [T_('Capacitat'), p.gb + ' GB'], [T_('Mòduls'), `${p.mod} × ${p.gb / p.mod} GB`], [T_('Velocitat'), p.mhz + ' MHz']];
      case 'gpu': return [[T_('Memòria de vídeo'), p.vram + ' GB'], [T_('Consum'), p.tdp + ' W'], [T_('Font recomanada'), p.fa + ' W'],
        [T_('Llargada (versions més llargues)'), p.len + ' mm'], [T_('Codificador de vídeo'), ENC[p.enc] || p.enc]];
      case 'ssd': return [[T_('Capacitat'), mida(p.gb)], [T_('Connexió'), `NVMe PCIe ${p.gen}.0`], [T_('Format'), 'M.2 2280']];
      case 'psu': return [[T_('Potència'), p.w + ' W'], [T_('Eficiència'), '80+ ' + p.cert], ['ATX 3 / 12V-2x6', siNo(p.pcie5)]];
      case 'case': return [[T_('Plaques'), p.forms.join(', ')], [T_('Gràfica fins a'), p.gpuMax + ' mm'], [T_('Dissipador fins a'), p.cooler + ' mm'],
        [T_('Radiador fins a'), p.rad ? p.rad + ' mm' : T_('No n\'admet')]];
      case 'cooler': return p.tipus === 'liquida'
        ? [[T_('Tipus'), T_('Refrigeració líquida')], [T_('Radiador'), p.rad + ' mm'], [T_('Dissipa fins a'), p.tdpMax + ' W']]
        : [[T_('Tipus'), T_('Per aire (torre)')], [T_('Alçada'), p.alt + ' mm'], [T_('Dissipa fins a'), p.tdpMax + ' W']];
    }
    return [];
  }
  const fotoDe = o => (o && (o.img || (o.ofertes || []).map(x => x.img).find(Boolean))) || null;
  function miniatura(s, o, classe) {
    const f = fotoDe(o);
    if (!f) { const sp = document.createElement('span'); sp.className = classe + ' sense'; sp.textContent = ICO[s]; return sp; }
    const im = document.createElement('img'); im.className = classe; im.loading = 'lazy'; im.alt = ''; im.src = f;
    im.addEventListener('error', () => { const sp = document.createElement('span'); sp.className = classe + ' sense'; sp.textContent = ICO[s]; im.replaceWith(sp); });
    return im;
  }

  const modelTrobat = o => o && o.ofertes && o.ofertes[0] ? o.ofertes[0].nom.split(/,| - | – /)[0].slice(0, 90) : '';
  const NOM_BOTIGA = { alternate: 'Alternate', ldlc: 'LDLC' };

  // ---------- Muntatge ----------
  function munta(desplaca) {
    const r = M.munta(CAT, estat.perfil, estat.pressupost, { preus: preus() });
    if (!r.ok) {
      estat.res = null;
      $('#resultat').hidden = true; $('#sense').hidden = false;
      $('#sense-text').textContent = r.minim ? T_('Amb els preus d\'ara, el PC més econòmic per a aquest ús que sigui compatible i equilibrat costa uns {m}. Puja el pressupost o tria un altre ús.', { m: euros(r.minim) }) : T_('No s\'ha trobat cap combinació vàlida.');
      return;
    }
    r.auto = true;
    estat.res = r;
    pinta(r, desplaca);
  }

  function pinta(r, desplaca) {
    $('#sense').hidden = true; $('#resultat').hidden = false;
    $('#r-total').textContent = euros(r.total);
    $('#r-sobra').textContent = euros(Math.max(0, r.sobra));
    $('#r-sobra-et').textContent = r.sobra >= 0 ? T_('Et sobren') : T_('Et passes');
    if (r.sobra < 0) $('#r-sobra').textContent = euros(-r.sobra);
    $('#r-consum').textContent = `${r.info.consum} W`;

    const eq = r.equilibri;
    const mostraEq = !!(eq && r.parts.gpu);
    $('#r-equilibri').hidden = !mostraEq;
    if (mostraEq) {
      const max = Math.max(eq.cpu, eq.gpu, 1);
      $('#eq-cpu').style.width = (100 * eq.cpu / max) + '%';
      $('#eq-gpu').style.width = (100 * eq.gpu / max) + '%';
      $('#eq-text').textContent = eq.coll >= 8 ? T_('El processador limita la gràfica un {pc} %.', { pc: eq.coll })
        : eq.cpu > eq.gpu * 1.6 ? T_('Processador sobrat: la gràfica és el límit (normal en jocs a alta resolució).')
          : T_('Equilibrat: cap peça frena l\'altra.');
    }

    $('#r-errors').innerHTML = '';
    for (const e of r.errors) { const li = document.createElement('li'); li.textContent = '⛔ ' + missatge(e); $('#r-errors').append(li); }
    $('#r-avisos').innerHTML = '';
    for (const a of r.avisos) { const li = document.createElement('li'); li.textContent = '⚠️ ' + missatge(a); $('#r-avisos').append(li); }
    const falten = r.falten || [];
    if (!r.errors.length && falten.length < M.SLOTS.length) {
      const li = document.createElement('li'); li.className = 'ok';
      li.textContent = '✅ ' + (falten.length ? T_('Les peces que has triat són compatibles entre elles.')
        : T_('Totes les peces són compatibles entre elles (sòcol, memòria, mides, potència i refrigeració).'));
      $('#r-avisos').prepend(li);
    }
    if (falten.length) {
      const li = document.createElement('li');
      li.textContent = '🧩 ' + T_('Falten: {l}. Tria-les tu o prem «Completa el que falta».', { l: falten.map(s => T_(NOM_SLOT[s]).toLowerCase()).join(', ') });
      $('#r-avisos').append(li);
    }

    const P = preus();
    const ul = $('#peces'); ul.innerHTML = '';
    const aMa = estat.mode === 'ma';
    for (const s of M.SLOTS) {
      const p = r.parts[s];
      const o = p && P[p.id];
      const li = document.createElement('li'); li.className = 'peca';
      if (aMa && !ma.triades[s]) {
        li.classList.add('buida');
        li.innerHTML = `<span class="ico">${ICO[s]}</span><div><div class="tipus"></div><div class="nom"></div></div><div class="preu"><b>—</b></div><div class="botons"></div>`;
        li.querySelector('.tipus').textContent = T_(NOM_SLOT[s]);
        li.querySelector('.nom').textContent = T_("Encara no l'has triada");
        const b = document.createElement('button'); b.className = 'primari'; b.textContent = T_('Tria-la');
        b.addEventListener('click', () => mostraAlternatives(s)); li.querySelector('.botons').append(b);
        ul.append(li);
        continue;
      }
      const nom =p ? p.nom : (s === 'gpu' ? T_('Gràfics integrats') : T_('Dissipador de sèrie'));
      const model = modelTrobat(o);
      let estoc = '';
      if (p) {
        if (o && o.preu != null) estoc = `<span class="estoc${o.stock ? '' : ' no'}"></span>${o.stock ? T_('En estoc') : T_('Sense estoc')} · ${NOM_BOTIGA[o.botiga] || ''}`;
        else estoc = `<span class="estoc ref"></span>${T_('Preu de referència')}`;
      }
      li.innerHTML = `<span class="ico"></span>
        <div><div class="tipus"></div><div class="nom"></div>${model && model.toLowerCase() !== nom.toLowerCase() ? '<div class="model"></div>' : ''}<div class="spec"></div></div>
        <div class="preu"><b>${p ? euros(M.preuDe(p, P)) : '—'}</b><small>${estoc}</small></div>
        <div class="botons"></div>`;
      li.querySelector('.tipus').textContent = T_(NOM_SLOT[s]);
      li.querySelector('.nom').textContent = nom;
      const ico = li.querySelector('.ico');
      if (p) {
        const fb = document.createElement('button'); fb.className = 'ico foto'; fb.title = T_('Fitxa'); fb.setAttribute('aria-label', T_('Fitxa'));
        fb.append(miniatura(s, o, 'mini'));
        fb.addEventListener('click', () => mostraFitxa(s, p, o));
        ico.replaceWith(fb);
        const n = li.querySelector('.nom'); n.classList.add('enllac'); n.tabIndex = 0; n.setAttribute('role', 'button');
        n.addEventListener('click', () => mostraFitxa(s, p, o));
        n.addEventListener('keydown', e => { if (e.key === 'Enter') mostraFitxa(s, p, o); });
      } else ico.textContent = ICO[s];
      if (li.querySelector('.model')) li.querySelector('.model').textContent = model;
      li.querySelector('.spec').textContent = especificacions(s, p);
      const bt = li.querySelector('.botons');
      if (p) {
        const enll = B.enllacos(p, o && o.preu != null ? o : null);
        const dir = enll.find(e => e.directe);
        const a = document.createElement('a'); a.className = 'boto'; a.href = dir ? dir.url : enll[0].url; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = dir ? T_('Compra a {b}', { b: dir.botiga }) : T_('Busca-la');
        a.addEventListener('click', e => { e.preventDefault(); obreEnllac(a.href); });
        bt.append(a);
        const mes = document.createElement('button'); mes.textContent = T_('Altres botigues');
        mes.addEventListener('click', () => mostraBotigues(s, p, o)); bt.append(mes);
        const fx = document.createElement('button'); fx.textContent = 'ℹ️ ' + T_('Fitxa');
        fx.addEventListener('click', () => mostraFitxa(s, p, o)); bt.append(fx);
      }
      const canvi = document.createElement('button'); canvi.className = 'discret'; canvi.textContent = '⇄ ' + T_('Canvia');
      canvi.addEventListener('click', () => mostraAlternatives(s)); bt.append(canvi);
      if (aMa) {
        const treu = document.createElement('button'); treu.className = 'discret'; treu.textContent = '✕ ' + T_('Treu');
        treu.addEventListener('click', () => { delete ma.parts[s]; delete ma.triades[s]; desaMa(); pintaMa(false); });
        bt.append(treu);
      }
      ul.append(li);
    }
    if (desplaca) $('#resultat').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- Diàlegs ----------
  $$('dialog [data-tanca]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
  $$('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

  // ---------- Fitxa de l'article i visor de fotos ----------
  function mostraFitxa(s, p, o) {
    const P = preus();
    $('#fx-tipus').textContent = T_(NOM_SLOT[s]);
    $('#fx-nom').textContent = p.nom;
    const model = o && o.ofertes && o.ofertes[0] ? o.ofertes[0].nom : '';
    $('#fx-model').textContent = model;
    $('#fx-model').hidden = !model;
    $('#fx-preu').textContent = euros(M.preuDe(p, P));
    $('#fx-estoc').innerHTML = o && o.preu != null
      ? `<span class="estoc${o.stock ? '' : ' no'}"></span>${o.stock ? T_('En estoc') : T_('Sense estoc')} · ${NOM_BOTIGA[o.botiga] || ''}`
      : `<span class="estoc ref"></span>${T_('Preu de referència')}`;
    const f = fotoDe(o), boto = $('#fx-foto');
    boto.hidden = false;
    const marc = boto.querySelector('img');
    boto.classList.toggle('sense', !f);
    if (f) { marc.src = f; marc.hidden = false; boto.dataset.ico = ''; } else { marc.removeAttribute('src'); marc.hidden = true; boto.dataset.ico = ICO[s]; }
    boto.disabled = !f;
    boto.onclick = () => f && mostraFoto(f, p.nom);
    const taula = $('#fx-taula'); taula.innerHTML = '';
    for (const [k, v] of caracteristiques(s, p)) {
      const tr = document.createElement('tr'); tr.innerHTML = '<th></th><td></td>';
      tr.firstChild.textContent = k; tr.lastChild.textContent = v; taula.append(tr);
    }
    const bt = $('#fx-botons'); bt.innerHTML = '';
    const enll = B.enllacos(p, o && o.preu != null ? o : null);
    const dir = enll.find(e => e.directe);
    const a = document.createElement('a'); a.className = 'boto'; a.href = dir ? dir.url : enll[0].url;
    a.textContent = dir ? T_('Compra a {b}', { b: dir.botiga }) : T_('Busca-la');
    a.addEventListener('click', e => { e.preventDefault(); obreEnllac(a.href); });
    const mes = document.createElement('button'); mes.textContent = T_('Altres botigues');
    mes.addEventListener('click', () => { $('#dlg-fitxa').close(); mostraBotigues(s, p, o); });
    bt.append(a, mes);
    $('#dlg-fitxa').showModal();
    $('#dlg-fitxa').scrollTop = 0;
  }

  function mostraFoto(petita, nom) {
    const img = $('#visor-img');
    img.classList.remove('zoom');
    img.src = petita;   // es veu de seguida; la gran la substitueix quan arriba
    const gran = B.fotoGran(petita);
    if (gran && gran !== petita) { const g = new Image(); g.onload = () => { if (img.src === petita || img.src.endsWith(petita)) img.src = gran; }; g.src = gran; }
    $('#visor-nom').textContent = nom;
    $('#dlg-foto').showModal();
  }
  $('#visor-img').addEventListener('click', e => {
    const img = e.currentTarget, marc = img.parentElement;
    const r = img.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    img.classList.toggle('zoom');
    if (img.classList.contains('zoom')) { marc.scrollLeft = fx * marc.scrollWidth - marc.clientWidth / 2; marc.scrollTop = fy * marc.scrollHeight - marc.clientHeight / 2; }
  });

  function mostraBotigues(s, p, o) {
    $('#bot-titol').textContent = p.nom;
    const ul = $('#bot-llista'); ul.innerHTML = '';
    const ofertes = (o && o.ofertes) || [];
    for (const of of ofertes) {
      const li = document.createElement('li');
      li.innerHTML = '<a href="#"><b></b><span class="dif"></span><small></small></a>';
      li.querySelector('b').textContent = NOM_BOTIGA[of.botiga] || of.botiga;
      li.querySelector('.dif').textContent = euros(of.preu);
      li.querySelector('small').textContent = (of.stock ? T_('En estoc') : T_('Sense estoc')) + ' · ' + of.nom;
      li.querySelector('a').addEventListener('click', e => { e.preventDefault(); obreEnllac(of.url); });
      ul.append(li);
    }
    for (const e of B.enllacos(p, null)) {
      const li = document.createElement('li');
      li.innerHTML = '<a href="#"><b></b><span class="dif">↗</span><small></small></a>';
      li.querySelector('b').textContent = e.botiga;
      li.querySelector('small').textContent = T_('Cerca «{q}»', { q: p.q });
      li.querySelector('a').addEventListener('click', ev => { ev.preventDefault(); obreEnllac(e.url); });
      ul.append(li);
    }
    $('#dlg-bot').showModal();
  }

  let altObert = null;
  $('#dlg-alt').addEventListener('close', () => { altObert = null; });
  $('#alt-totes').addEventListener('change', () => { desa('altTotes', $('#alt-totes').checked); if (altObert) mostraOpcions(altObert); });

  // A mà: les peces compatibles amb les que ja has triat (i, si vols, les altres amb el que s'hauria de treure).
  function mostraOpcions(s) {
    const P = preus();
    altObert = s;
    $('#alt-titol').textContent = T_(NOM_SLOT[s]);
    $('#alt-filtre').hidden = false;
    const totes = $('#alt-totes').checked = llegeix('altTotes', false);
    const actualP = ma.triades[s] ? ma.parts[s] : undefined;
    const llista = M.opcions(CAT, estat.perfil, ma.parts, ma.triades, s, P).filter(o => o.disponible);
    const bones = llista.filter(o => !o.errors.length).sort((x, y) => x.preu - y.preu);
    const dolentes = llista.filter(o => o.errors.length).sort((x, y) => x.bloc - y.bloc || x.preu - y.preu);
    $('#alt-compta').textContent = T_('{n} compatibles amb les peces que has triat', { n: bones.length });
    const ul = $('#alt-llista'); ul.innerHTML = '';
    const fila = (o, mala) => {
      const actual = actualP !== undefined && ((o.peca && actualP && o.peca.id === actualP.id) || (!o.peca && !actualP));
      const li = document.createElement('li');
      li.innerHTML = '<button><b></b><span class="dif"></span><small></small></button>';
      const b = li.querySelector('button');
      b.classList.add('amb-foto'); b.prepend(miniatura(s, o.peca && P[o.peca.id], 'mini'));
      if (actual) b.classList.add('actual');
      if (mala) b.classList.add('mal');
      if (o.bloc) b.disabled = true;
      b.querySelector('b').textContent = o.peca ? o.peca.nom : (s === 'gpu' ? T_('Gràfics integrats') : T_('Dissipador de sèrie'));
      b.querySelector('.dif').textContent = actual ? T_('actual') : euros(o.preu);
      const sm = b.querySelector('small');
      if (mala) {
        sm.textContent = '⛔ ' + missatge(o.errors[0]) + (o.treu.length ? ' ' + T_('Si la tries, es traurà: {l}.', { l: o.treu.map(x => T_(NOM_SLOT[x]).toLowerCase()).join(', ') }) : '');
        sm.classList.add('treu');
      } else sm.textContent = especificacions(s, o.peca) + (o.coll >= 8 ? ' · ' + T_('coll d\'ampolla {pc} %', { pc: o.coll }) : '');
      b.addEventListener('click', () => {
        $('#dlg-alt').close();
        if (actual) return;
        const t = M.tria(CAT, estat.perfil, ma.parts, ma.triades, s, o.peca, P);
        ma.parts = t.parts; ma.triades = t.triades;
        desaMa(); pintaMa(false);
        if (t.trets.length) toast(T_("S'ha tret: {l}. No era compatible amb la peça nova.", { l: t.trets.map(x => T_(NOM_SLOT[x]).toLowerCase()).join(', ') }));
      });
      ul.append(li);
    };
    bones.forEach(o => fila(o, false));
    if (!bones.length) { const li = document.createElement('li'); li.className = 'sep'; li.textContent = T_("Cap peça d'aquest tipus encaixa amb les que has triat."); ul.append(li); }
    if (totes && dolentes.length) {
      const li = document.createElement('li'); li.className = 'sep'; li.textContent = T_('No hi van bé'); ul.append(li);
      dolentes.forEach(o => fila(o, true));
    }
    if (!$('#dlg-alt').open) $('#dlg-alt').showModal();
  }

  function mostraAlternatives(s) {
    if (estat.mode === 'ma') return mostraOpcions(s);
    $('#alt-filtre').hidden = true;
    const r = estat.res; if (!r) return;
    const P = preus();
    $('#alt-titol').textContent = T_(NOM_SLOT[s]);
    const ul = $('#alt-llista'); ul.innerHTML = '';
    const llista = M.alternatives(CAT, estat.perfil, r.parts, s, P)
      .filter(a => !a.peca || !(P[a.peca.id] && P[a.peca.id].preu == null && P[a.peca.id].stock === false))
      .sort((x, y) => (x.errors.length > 0) - (y.errors.length > 0) || x.preu - y.preu);
    for (const a of llista) {
      const actual = (a.peca && r.parts[s] && a.peca.id === r.parts[s].id) || (!a.peca && !r.parts[s]);
      const li = document.createElement('li');
      li.innerHTML = '<button><b></b><span class="dif"></span><small></small></button>';
      const b = li.querySelector('button');
      b.classList.add('amb-foto'); b.prepend(miniatura(s, a.peca && P[a.peca.id], 'mini'));
      if (actual) b.classList.add('actual');
      if (a.errors.length) b.classList.add('mal');
      b.querySelector('b').textContent = a.peca ? a.peca.nom : (s === 'gpu' ? T_('Gràfics integrats') : T_('Dissipador de sèrie'));
      const d = b.querySelector('.dif');
      d.textContent = actual ? T_('actual') : (a.dif > 0 ? '+' : a.dif < 0 ? '−' : '') + euros(Math.abs(a.dif));
      d.classList.add(a.dif > 0 ? 'mes' : 'menys');
      const sm = b.querySelector('small');
      if (a.errors.length) { sm.textContent = '⛔ ' + missatge(a.errors[0]); sm.classList.add('mal'); }
      else sm.textContent = especificacions(s, a.peca) + (a.coll >= 8 ? ' · ' + T_('coll d\'ampolla {pc} %', { pc: a.coll }) : '');
      b.addEventListener('click', () => {
        $('#dlg-alt').close();
        if (actual) return;
        estat.res = M.canvia(CAT, estat.perfil, estat.pressupost, r.parts, s, a.peca, P);
        pinta(estat.res, false);
        if (estat.res.errors.length) toast(T_('Atenció: amb aquest canvi hi ha peces incompatibles.'));
      });
      ul.append(li);
    }
    $('#dlg-alt').showModal();
  }

  // ---------- Copiar la llista ----------
  $('#copia').addEventListener('click', async () => {
    const r = estat.res; if (!r) return;
    const P = preus();
    const linies = [T_('PC per a {u} · pressupost {b}', { u: T_($(`.perfil[data-perfil="${estat.perfil}"] b`).textContent), b: euros(r.pressupost) }), ''];
    for (const s of M.SLOTS) {
      const p = r.parts[s]; if (!p) continue;
      const o = P[p.id];
      linies.push(`${T_(NOM_SLOT[s])}: ${p.nom} — ${euros(M.preuDe(p, P))}`);
      linies.push('   ' + ((o && o.url) || B.enllacos(p)[0].url));
    }
    linies.push('', T_('Total: {t}', { t: euros(r.total) }), 'Xoriguer PConfigurador');
    try { await navigator.clipboard.writeText(linies.join('\n')); toast(T_('Llista copiada')); }
    catch { toast(T_('No s\'ha pogut copiar')); }
  });

  let tt;
  function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(tt); tt = setTimeout(() => { el.hidden = true; }, 4200); }

  // ---------- Inici ----------
  posaPressupost(estat.pressupost);
  pintaPerfil();
  posaMode(estat.mode, false);
  pintaEstatPreus();
  // A l'app, si els preus tenen més de 12 hores, es refresquen sols en segon pla.
  const vell = !dataDirecte || Date.now() - new Date(dataDirecte).getTime() > 12 * 3600e3;
  if (obte && vell) setTimeout(() => actualitzaPreus(false), 800);
})();
