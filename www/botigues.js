// Cercador de preus reals. Llegeix les pàgines de cerca d'Alternate.es i LDLC.es (les que
// no bloquegen programes), tria el producte que correspon a cada peça i en treu preu, estoc i enllaç.
// Amazon, PcComponentes i Coolmod bloquegen la lectura automàtica: d'aquestes només hi ha enllaç de cerca.
//
// No depèn de la plataforma: qui el fa servir passa `obte(url) → Promise<{ text, url }>`
// (Electron: net.fetch; Android: CapacitorHttp; Node: fetch). Al navegador no funciona (CORS).
(function (root) {
  'use strict';

  const BOTIGUES = {
    alternate: { nom: 'Alternate', cerca: q => 'https://www.alternate.es/listing.xhtml?q=' + encodeURIComponent(q), llegeix: llegeixAlternate },
    ldlc: { nom: 'LDLC', cerca: q => 'https://www.ldlc.com/es-es/buscar/' + encodeURIComponent(q) + '/', llegeix: llegeixLdlc },
  };
  // Només enllaç (sense preu automàtic)
  const ENLLACOS = {
    amazon: { nom: 'Amazon', cerca: q => 'https://www.amazon.es/s?k=' + encodeURIComponent(q) },
    pccomponentes: { nom: 'PcComponentes', cerca: q => 'https://www.pccomponentes.com/buscar/?query=' + encodeURIComponent(q) },
    coolmod: { nom: 'Coolmod', cerca: q => 'https://www.coolmod.com/#/dffullscreen/query=' + encodeURIComponent(q) },
  };

  // ---------- Utilitats ----------
  const ENT = { amp: '&', nbsp: ' ', quot: '"', apos: "'", lt: '<', gt: '>', euro: '€', reg: '®', trade: '™' };
  function desentitats(s) {
    return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
      if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1));
      return ENT[e.toLowerCase()] !== undefined ? ENT[e.toLowerCase()] : m;
    });
  }
  const text = s => desentitats(String(s).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
  const normal = s => s.toLowerCase().replace(/[®™©]/g, ' ').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  function numero(s) { // "€ 1.032,00" | "1 058€95" | "264.95"
    s = desentitats(String(s)).replace(/\s| /g, '');
    let m = s.match(/(\d[\d.]*)€(\d{2})/);           // format LDLC: 264€95
    if (m) return +(m[1].replace(/\./g, '') + '.' + m[2]);
    m = s.match(/(\d[\d.]*),(\d{2})/);               // 1.032,00
    if (m) return +(m[1].replace(/\./g, '') + '.' + m[2]);
    m = s.match(/(\d+(?:\.\d{1,2})?)/);
    return m ? +m[1] : null;
  }
  const absolut = (base, href) => { try { return new URL(href, base).href; } catch { return href; } };

  // ---------- Lectors ----------
  function llegeixAlternate(html, url) {
    const out = [];
    const trossos = html.split(/<a href="(?=[^"]*\/product\/)/).slice(1);
    for (const t of trossos) {
      if (!/class="card[^"]*productBox/.test(t.slice(0, 300))) continue;
      const href = t.slice(0, t.indexOf('"'));
      const nom = (t.match(/class="product-name[^"]*">([\s\S]*?)<\/div>/) || [])[1];
      const sub = (t.match(/class="product-name-sub">([\s\S]*?)<\/span>/) || [])[1] || '';
      const preu = (t.match(/class="price\s*">([^<]+)/) || [])[1];
      const entrega = text((t.match(/delivery-info[^>]*>([\s\S]*?)<\/div>/) || [])[1] || '');
      if (!nom || !preu) continue;
      out.push({ nom: text(nom) + (sub ? ' ' + text(sub) : ''), preu: numero(preu), url: absolut(url, href), stock: !/no puede ser comprado|agotado|sin stock|no disponible/i.test(entrega), botiga: 'alternate' });
    }
    return out;
  }

  function llegeixLdlc(html, url) {
    const out = [];
    // Cerca amb un sol resultat: LDLC redirigeix a la fitxa del producte
    const fitxa = html.match(/<h1 class="title-1"[^>]*>([\s\S]*?)<\/h1>/);
    if (fitxa && /id="productPriceStock"/.test(html)) {
      const preu = (html.match(/id="productPriceStock"[\s\S]{0,400}?data-price="([\d.]+)"/) || [])[1];
      const sub = (html.match(/class="product-subtitle">\s*<h2>([\s\S]*?)<\/h2>/) || [])[1] || '';
      const stock = /class="[^"]*stock-[12]\b|En stock/i.test(html.slice(html.indexOf('productPriceStock'), html.indexOf('productPriceStock') + 6000));
      if (preu) out.push({ nom: text(fitxa[1]) + ' ' + text(sub), preu: +preu, url, stock, botiga: 'ldlc' });
      return out;
    }
    const trossos = html.split('class="pdt-item"').slice(1);
    for (const t of trossos) {
      const a = t.match(/<h3 class\s*="title-3"><a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      if (!a) continue;
      const desc = (t.match(/<p class="desc">([\s\S]*?)<\/p>/) || [])[1] || '';
      const preu = (t.match(/<div class="price"><div class="price">([\s\S]*?)<\/div><\/div>/) || [])[1];
      const st = (t.match(/class="[^"]*\bstock stock-(\d+)/) || [])[1];
      if (!preu) continue;
      out.push({ nom: text(a[2]) + ' ' + text(desc), preu: numero(text(preu.replace(/<sup>/, '€'))), url: absolut(url, a[1]), stock: st ? +st <= 2 : /en stock/i.test(t), botiga: 'ldlc' });
    }
    return out;
  }

  // ---------- Coincidència ----------
  // Paraules que delaten que no és la peça sola (portàtils, PCs muntats, paquets, accessoris).
  const FORA = {
    _: ['port[aá]til', 'laptop', 'reacondicionad', 'refurbish', 'outlet', 'segunda mano', 'caja abierta', 'open box', 'usado'],
    cpu: ['\\btray\\b', 'bandeja', '\\boem\\b', 'mpk', '\\bpc\\b', 'ordenador', 'equipo', 'sobremesa', '\\bkit\\b', '\\s\\+\\s*(placa|memoria|ram|gr[aá]fica|disipador|ventilador)', 'placa base', 'combo', 'bundle', 'pack'],
    gpu: ['\\bpc\\b', 'ordenador', 'equipo', 'sobremesa', 'soporte', 'cable', 'waterblock', 'bloque', 'backplate', 'riser', 'mini pc', 'barebone'],
    mb: ['\\s\\+\\s*(amd|intel|ryzen|core|procesador|cpu|memoria|ram)\\b', 'combo', 'bundle', 'pack', 'kit de actualizaci'],
    ram: ['so-?dimm', 'sodimm'],
    ssd: ['externo', 'portable', 'usb'],
    psu: ['cable', 'extensi', 'kit de cables'],
    case: ['cristal de recambio', 'soporte', 'kit', 'panel'],
    cooler: ['pasta', 'ventilador de recambio', 'kit de montaje', 'soporte'],
  };
  const re = s => new RegExp(s, 'i');
  function coincideix(peca, slot, nom) {
    const n = normal(nom);
    if (!peca.m.every(r => re(r).test(n))) return false;
    if (peca.x.some(r => re(r).test(n))) return false;
    if (FORA._.concat(FORA[slot] || []).some(r => re(r).test(n))) return false;
    return true;
  }
  // Preu raonable respecte del de referència (evita accessoris o errors de lectura).
  const raonable = (peca, preu) => preu > 0 && preu >= peca.preu * 0.35 && preu <= peca.preu * 8;

  // ---------- Cerca ----------
  // Torna { preu, url, botiga, stock, ofertes: [...], data } per a una peça, o { preu: null } si no la troba.
  async function cercaPeca(peca, slot, obte, opcions) {
    const botigues = (opcions && opcions.botigues) || Object.keys(BOTIGUES);
    const ofertes = [];
    const errors = [];
    await Promise.all(botigues.map(async b => {
      const B = BOTIGUES[b];
      try {
        const r = await obte(B.cerca(peca.q));
        for (const o of B.llegeix(r.text, r.url || B.cerca(peca.q))) {
          if (o.preu && coincideix(peca, slot, o.nom) && raonable(peca, o.preu)) ofertes.push(o);
        }
      } catch (e) { errors.push(b + ': ' + (e && e.message || e)); }
    }));
    ofertes.sort((a, b) => (b.stock - a.stock) || a.preu - b.preu);
    const millor = ofertes[0];
    return {
      preu: millor ? millor.preu : null,
      url: millor ? millor.url : null,
      botiga: millor ? millor.botiga : null,
      stock: millor ? millor.stock : null,
      ofertes: ofertes.slice(0, 6),
      errors,
      data: new Date().toISOString(),
    };
  }

  // Cerca tot un catàleg (o una llista de [slot, peça]) amb poques peticions alhora.
  async function cercaTot(llista, obte, opcions) {
    const paral = (opcions && opcions.paral) || 4;
    const progres = opcions && opcions.progres;
    const res = {};
    let i = 0, fets = 0;
    async function treballador() {
      while (i < llista.length) {
        const [slot, peca] = llista[i++];
        res[peca.id] = await cercaPeca(peca, slot, obte, opcions);
        fets++;
        if (progres) progres(fets, llista.length, peca, res[peca.id]);
      }
    }
    await Promise.all(Array.from({ length: Math.min(paral, llista.length) }, treballador));
    return res;
  }

  function llistaCataleg(cat) {
    const SL = ['cpu', 'mb', 'ram', 'gpu', 'ssd', 'psu', 'case', 'cooler'];
    return SL.flatMap(s => cat[s].map(p => [s, p]));
  }

  // Enllaços de compra per a una peça: l'oferta trobada primer, i després cerques a totes les botigues.
  function enllacos(peca, oferta) {
    const l = [];
    if (oferta && oferta.url) l.push({ botiga: (BOTIGUES[oferta.botiga] || {}).nom || oferta.botiga, url: oferta.url, preu: oferta.preu, directe: true });
    for (const [k, B] of Object.entries(Object.assign({}, BOTIGUES, ENLLACOS))) {
      if (oferta && oferta.botiga === k) continue;
      l.push({ botiga: B.nom, url: B.cerca(peca.q), directe: false });
    }
    return l;
  }

  // Descodifica una resposta amb el joc de caràcters correcte (algunes botigues no fan servir UTF-8).
  function descodifica(bytes, contentType) {
    let cs = ((contentType || '').match(/charset=([\w-]+)/i) || [])[1];
    if (!cs) {
      const cap = new TextDecoder('latin1').decode(bytes.slice(0, 2048));
      cs = (cap.match(/<meta[^>]+charset=["']?([\w-]+)/i) || [])[1] || 'utf-8';
    }
    try { return new TextDecoder(cs.toLowerCase()).decode(bytes); } catch { return new TextDecoder('utf-8').decode(bytes); }
  }

  const API = { BOTIGUES, ENLLACOS, cercaPeca, cercaTot, llistaCataleg, enllacos, coincideix, llegeixAlternate, llegeixLdlc, numero, descodifica };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.BOTIGUES = API;
})(typeof window !== 'undefined' ? window : globalThis);
