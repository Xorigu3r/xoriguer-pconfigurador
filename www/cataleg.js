// Catàleg de peces. Les dades tècniques són fixes; els preus són de referència i es
// refresquen amb el cercador de preus (www/botigues.js, scripts/actualitza-preus.mjs).
//
// Camps comuns: id, nom, q (text de cerca a les botigues), m (expressions que el nom del
// producte HA de complir), x (expressions que NO ha de complir), preu (€ de referència).
//
// Puntuacions (relatives, per comparar):
//   cpu.g  = rendiment en jocs (Ryzen 7 7800X3D = 100). És també el «sostre» de FPS que pot donar.
//   cpu.mt = rendiment multifil (Ryzen 9 9950X = 100): oficina, streaming, edició.
//   gpu.g  = rendiment en jocs a 1440p (RTX 5090 = 100), a la mateixa escala que cpu.g.
// q = qualitat de la peça (1 bàsica, 2 bona, 3 alta). Es fa servir per posar mínims segons el pressupost.
(function (root) {
  const CPU = [
    // AM4 · DDR4
    { id: 'r5-5500', nom: 'AMD Ryzen 5 5500', q: 'Ryzen 5 5500', m: ['ryzen 5 5500\\b'], x: ['5500x3d', '5500gt'], socket: 'AM4', mem: ['DDR4'], nuc: 6, fil: 12, tdp: 65, pmax: 88, igpu: 0, dissi: true, g: 52, mt: 22, preu: 107 },
    { id: 'r5-5600', nom: 'AMD Ryzen 5 5600', q: 'Ryzen 5 5600', m: ['ryzen 5 5600\\b'], x: ['5600x', '5600g', '5600t', 'x3d'], socket: 'AM4', mem: ['DDR4'], nuc: 6, fil: 12, tdp: 65, pmax: 88, igpu: 0, dissi: true, g: 57, mt: 24, preu: 160 },
    { id: 'r5-5600g', nom: 'AMD Ryzen 5 5600G', q: 'Ryzen 5 5600G', m: ['ryzen 5 5600g\\b'], x: ['5600gt'], socket: 'AM4', mem: ['DDR4'], nuc: 6, fil: 12, tdp: 65, pmax: 88, igpu: 1, dissi: true, g: 48, mt: 22, preu: 105 },
    { id: 'r7-5700x', nom: 'AMD Ryzen 7 5700X', q: 'Ryzen 7 5700X', m: ['ryzen 7 5700x\\b'], x: ['x3d'], socket: 'AM4', mem: ['DDR4'], nuc: 8, fil: 16, tdp: 65, pmax: 88, igpu: 0, dissi: false, g: 60, mt: 31, preu: 224 },
    { id: 'r7-5700g', nom: 'AMD Ryzen 7 5700G', q: 'Ryzen 7 5700G', m: ['ryzen 7 5700g\\b'], x: [], socket: 'AM4', mem: ['DDR4'], nuc: 8, fil: 16, tdp: 65, pmax: 88, igpu: 1, dissi: true, g: 50, mt: 29, preu: 247 },
    // AM5 · DDR5
    { id: 'r5-7500f', nom: 'AMD Ryzen 5 7500F', q: 'Ryzen 5 7500F', m: ['ryzen 5 7500f\\b'], x: [], socket: 'AM5', mem: ['DDR5'], nuc: 6, fil: 12, tdp: 65, pmax: 88, igpu: 0, dissi: true, g: 72, mt: 31, preu: 120 },
    { id: 'r5-7600', nom: 'AMD Ryzen 5 7600', q: 'Ryzen 5 7600', m: ['ryzen 5 7600\\b'], x: ['7600x'], socket: 'AM5', mem: ['DDR5'], nuc: 6, fil: 12, tdp: 65, pmax: 88, igpu: 1, dissi: true, g: 74, mt: 32, preu: 199 },
    { id: 'r5-8600g', nom: 'AMD Ryzen 5 8600G', q: 'Ryzen 5 8600G', m: ['ryzen 5 8600g\\b'], x: [], socket: 'AM5', mem: ['DDR5'], nuc: 6, fil: 12, tdp: 65, pmax: 88, igpu: 2, dissi: true, g: 62, mt: 30, preu: 194 },
    { id: 'r5-9600x', nom: 'AMD Ryzen 5 9600X', q: 'Ryzen 5 9600X', m: ['ryzen 5 9600x\\b'], x: [], socket: 'AM5', mem: ['DDR5'], nuc: 6, fil: 12, tdp: 65, pmax: 88, igpu: 1, dissi: false, g: 80, mt: 36, preu: 185 },
    { id: 'r7-7700', nom: 'AMD Ryzen 7 7700', q: 'Ryzen 7 7700', m: ['ryzen 7 7700\\b'], x: ['7700x'], socket: 'AM5', mem: ['DDR5'], nuc: 8, fil: 16, tdp: 65, pmax: 88, igpu: 1, dissi: true, g: 76, mt: 44, preu: 311 },
    { id: 'r7-8700g', nom: 'AMD Ryzen 7 8700G', q: 'Ryzen 7 8700G', m: ['ryzen 7 8700g\\b'], x: [], socket: 'AM5', mem: ['DDR5'], nuc: 8, fil: 16, tdp: 65, pmax: 88, igpu: 2, dissi: true, g: 66, mt: 41, preu: 290 },
    { id: 'r7-9700x', nom: 'AMD Ryzen 7 9700X', q: 'Ryzen 7 9700X', m: ['ryzen 7 9700x\\b'], x: [], socket: 'AM5', mem: ['DDR5'], nuc: 8, fil: 16, tdp: 65, pmax: 88, igpu: 1, dissi: false, g: 83, mt: 48, preu: 300 },
    { id: 'r7-7800x3d', nom: 'AMD Ryzen 7 7800X3D', q: 'Ryzen 7 7800X3D', m: ['7800x3d'], x: [], socket: 'AM5', mem: ['DDR5'], nuc: 8, fil: 16, tdp: 120, pmax: 120, igpu: 1, dissi: false, g: 100, mt: 43, preu: 339 },
    { id: 'r9-9900x', nom: 'AMD Ryzen 9 9900X', q: 'Ryzen 9 9900X', m: ['ryzen 9 9900x\\b'], x: ['x3d'], socket: 'AM5', mem: ['DDR5'], nuc: 12, fil: 24, tdp: 120, pmax: 162, igpu: 1, dissi: false, g: 85, mt: 74, preu: 377 },
    { id: 'r7-9800x3d', nom: 'AMD Ryzen 7 9800X3D', q: 'Ryzen 7 9800X3D', m: ['9800x3d'], x: [], socket: 'AM5', mem: ['DDR5'], nuc: 8, fil: 16, tdp: 120, pmax: 162, igpu: 1, dissi: false, g: 112, mt: 52, preu: 427 },
    { id: 'r9-9950x', nom: 'AMD Ryzen 9 9950X', q: 'Ryzen 9 9950X', m: ['ryzen 9 9950x\\b'], x: ['x3d'], socket: 'AM5', mem: ['DDR5'], nuc: 16, fil: 32, tdp: 170, pmax: 230, igpu: 1, dissi: false, g: 88, mt: 100, preu: 559 },
    { id: 'r9-9950x3d', nom: 'AMD Ryzen 9 9950X3D', q: 'Ryzen 9 9950X3D', m: ['9950x3d'], x: [], socket: 'AM5', mem: ['DDR5'], nuc: 16, fil: 32, tdp: 170, pmax: 230, igpu: 1, dissi: false, g: 113, mt: 101, preu: 647 },
    // Intel LGA1700 · DDR4 o DDR5 (ho decideix la placa)
    { id: 'i3-12100', nom: 'Intel Core i3-12100', q: 'Core i3-12100', m: ['i3[- ]?12100\\b'], x: ['12100f'], socket: 'LGA1700', mem: ['DDR4', 'DDR5'], nuc: 4, fil: 8, tdp: 60, pmax: 89, igpu: 1, dissi: true, g: 54, mt: 16, preu: 139 },
    { id: 'i5-12400f', nom: 'Intel Core i5-12400F', q: 'Core i5-12400F', m: ['i5[- ]?12400f\\b'], x: [], socket: 'LGA1700', mem: ['DDR4', 'DDR5'], nuc: 6, fil: 12, tdp: 65, pmax: 117, igpu: 0, dissi: true, g: 62, mt: 26, preu: 157 },
    { id: 'i5-12400', nom: 'Intel Core i5-12400', q: 'Core i5-12400', m: ['i5[- ]?12400\\b'], x: ['12400f'], socket: 'LGA1700', mem: ['DDR4', 'DDR5'], nuc: 6, fil: 12, tdp: 65, pmax: 117, igpu: 1, dissi: true, g: 62, mt: 26, preu: 186 },
    { id: 'i5-14400f', nom: 'Intel Core i5-14400F', q: 'Core i5-14400F', m: ['i5[- ]?14400f\\b'], x: [], socket: 'LGA1700', mem: ['DDR4', 'DDR5'], nuc: 10, fil: 16, tdp: 65, pmax: 148, igpu: 0, dissi: true, g: 70, mt: 36, preu: 160 },
    { id: 'i5-14400', nom: 'Intel Core i5-14400', q: 'Core i5-14400', m: ['i5[- ]?14400\\b'], x: ['14400f'], socket: 'LGA1700', mem: ['DDR4', 'DDR5'], nuc: 10, fil: 16, tdp: 65, pmax: 148, igpu: 1, dissi: true, g: 70, mt: 36, preu: 187 },
    { id: 'i5-14600kf', nom: 'Intel Core i5-14600KF', q: 'Core i5-14600KF', m: ['i5[- ]?14600kf\\b'], x: [], socket: 'LGA1700', mem: ['DDR4', 'DDR5'], nuc: 14, fil: 20, tdp: 125, pmax: 181, igpu: 0, dissi: false, g: 84, mt: 52, preu: 256 },
    { id: 'i7-14700kf', nom: 'Intel Core i7-14700KF', q: 'Core i7-14700KF', m: ['i7[- ]?14700kf\\b'], x: [], socket: 'LGA1700', mem: ['DDR4', 'DDR5'], nuc: 20, fil: 28, tdp: 125, pmax: 253, igpu: 0, dissi: false, g: 89, mt: 72, preu: 389 },
    // Intel LGA1851 · DDR5
    { id: 'u5-245kf', nom: 'Intel Core Ultra 5 245KF', q: 'Core Ultra 5 245KF', m: ['ultra 5 245kf\\b'], x: [], socket: 'LGA1851', mem: ['DDR5'], nuc: 14, fil: 14, tdp: 125, pmax: 159, igpu: 0, dissi: false, g: 79, mt: 54, preu: 209 },
    { id: 'u7-265kf', nom: 'Intel Core Ultra 7 265KF', q: 'Core Ultra 7 265KF', m: ['ultra 7 265kf\\b'], x: [], socket: 'LGA1851', mem: ['DDR5'], nuc: 20, fil: 20, tdp: 125, pmax: 250, igpu: 0, dissi: false, g: 84, mt: 80, preu: 310 },
    { id: 'u9-285k', nom: 'Intel Core Ultra 9 285K', q: 'Core Ultra 9 285K', m: ['ultra 9 285k\\b'], x: ['285kf'], socket: 'LGA1851', mem: ['DDR5'], nuc: 24, fil: 24, tdp: 125, pmax: 250, igpu: 1, dissi: false, g: 87, mt: 95, preu: 560 },
  ];

  // maxTdp: TDP més alt que la placa alimenta bé (VRM / limitació del xipset).
  const MB = [
    // AM4 · DDR4
    { id: 'mb-b550m-hdv', nom: 'ASRock B550M-HDV', q: 'ASRock B550M-HDV', m: ['b550m-hdv'], x: [], socket: 'AM4', chip: 'B550', form: 'mATX', mem: 'DDR4', slots: 2, m2: 1, wifi: false, maxTdp: 65, qual: 1, preu: 68 },
    { id: 'mb-b550m-k', nom: 'Gigabyte B550M K', q: 'Gigabyte B550M K', m: ['b550m k\\b'], x: [], socket: 'AM4', chip: 'B550', form: 'mATX', mem: 'DDR4', slots: 4, m2: 2, wifi: false, maxTdp: 105, qual: 1, preu: 93 },
    { id: 'mb-b550m-aorus', nom: 'Gigabyte B550M AORUS ELITE', q: 'Gigabyte B550M AORUS ELITE', m: ['b550m aorus elite'], x: ['ax\\b', 'wifi'], socket: 'AM4', chip: 'B550', form: 'mATX', mem: 'DDR4', slots: 4, m2: 2, wifi: false, maxTdp: 105, qual: 2, preu: 93 },
    // AM5 · DDR5
    { id: 'mb-a620m-h', nom: 'Gigabyte A620M H', q: 'Gigabyte A620M H', m: ['a620m h\\b'], x: [], socket: 'AM5', chip: 'A620', form: 'mATX', mem: 'DDR5', slots: 2, m2: 1, wifi: false, maxTdp: 65, qual: 1, preu: 79 },
    { id: 'mb-a620m-ds3h', nom: 'Gigabyte A620M DS3H', q: 'Gigabyte A620M DS3H', m: ['a620m ds3h'], x: [], socket: 'AM5', chip: 'A620', form: 'mATX', mem: 'DDR5', slots: 4, m2: 1, wifi: false, maxTdp: 105, qual: 1, preu: 92 },
    { id: 'mb-b650m-d3hp', nom: 'Gigabyte B650M D3HP', q: 'Gigabyte B650M D3HP', m: ['b650m d3hp'], x: ['ax\\b', 'wifi'], socket: 'AM5', chip: 'B650', form: 'mATX', mem: 'DDR5', slots: 4, m2: 2, wifi: false, maxTdp: 120, qual: 2, preu: 113 },
    { id: 'mb-b650m-d3hp-ax', nom: 'Gigabyte B650M D3HP AX (Wi-Fi)', q: 'Gigabyte B650M D3HP AX', m: ['b650m d3hp ax'], x: [], socket: 'AM5', chip: 'B650', form: 'mATX', mem: 'DDR5', slots: 4, m2: 2, wifi: true, maxTdp: 120, qual: 2, preu: 119 },
    { id: 'mb-b650-eagle-ax', nom: 'Gigabyte B650 EAGLE AX (Wi-Fi)', q: 'Gigabyte B650 EAGLE AX', m: ['b650 eagle ax'], x: [], socket: 'AM5', chip: 'B650', form: 'ATX', mem: 'DDR5', slots: 4, m2: 3, wifi: true, maxTdp: 170, qual: 2, preu: 160 },
    { id: 'mb-b850-s-wifi', nom: 'MSI PRO B850-S WIFI6E', q: 'MSI PRO B850-S WIFI6E', m: ['b850-s', 'wifi'], x: ['evo'], socket: 'AM5', chip: 'B850', form: 'ATX', mem: 'DDR5', slots: 4, m2: 3, wifi: true, maxTdp: 170, qual: 3, preu: 146 },
    { id: 'mb-x870-eagle', nom: 'Gigabyte X870 EAGLE WIFI7', q: 'Gigabyte X870 EAGLE WIFI7', m: ['x870 eagle'], x: ['x870e'], socket: 'AM5', chip: 'X870', form: 'ATX', mem: 'DDR5', slots: 4, m2: 3, wifi: true, maxTdp: 170, qual: 3, preu: 248 },
    // Intel LGA1700 · la placa decideix DDR4 o DDR5
    { id: 'mb-h610m-e-d4', nom: 'MSI PRO H610M-E DDR4', q: 'MSI PRO H610M-E DDR4', m: ['h610m-e', 'ddr4'], x: [], socket: 'LGA1700', chip: 'H610', form: 'mATX', mem: 'DDR4', slots: 2, m2: 1, wifi: false, maxTdp: 65, qual: 1, preu: 68 },
    { id: 'mb-h610m-h2-d5', nom: 'ASRock H610M-H2/M.2 D5', q: 'ASRock H610M-H2/M.2 D5', m: ['h610m-h2', 'd5'], x: [], socket: 'LGA1700', chip: 'H610', form: 'mATX', mem: 'DDR5', slots: 2, m2: 1, wifi: false, maxTdp: 65, qual: 1, preu: 61 },
    { id: 'mb-b760m-p-d4', nom: 'MSI PRO B760M-P DDR4', q: 'MSI PRO B760M-P DDR4', m: ['b760m-p', 'ddr4'], x: [], socket: 'LGA1700', chip: 'B760', form: 'mATX', mem: 'DDR4', slots: 4, m2: 2, wifi: false, maxTdp: 125, qual: 2, preu: 102 },
    { id: 'mb-b760m-p-d5', nom: 'MSI PRO B760M-P (DDR5)', q: 'MSI PRO B760M-P', m: ['b760m-p\\b'], x: ['ddr4', 'd4\\b', 'wifi'], socket: 'LGA1700', chip: 'B760', form: 'mATX', mem: 'DDR5', slots: 4, m2: 2, wifi: false, maxTdp: 125, qual: 2, preu: 110 },
    { id: 'mb-z790-eagle-ax', nom: 'Gigabyte Z790 EAGLE AX (Wi-Fi)', q: 'Gigabyte Z790 EAGLE AX', m: ['z790 eagle ax'], x: [], socket: 'LGA1700', chip: 'Z790', form: 'ATX', mem: 'DDR5', slots: 4, m2: 4, wifi: true, maxTdp: 125, qual: 3, preu: 179 },
    // Intel LGA1851 · DDR5
    { id: 'mb-b860m-pro-a', nom: 'ASRock B860M Pro-A', q: 'ASRock B860M Pro-A', m: ['b860m pro-a'], x: ['wifi'], socket: 'LGA1851', chip: 'B860', form: 'mATX', mem: 'DDR5', slots: 4, m2: 3, wifi: false, maxTdp: 125, qual: 2, preu: 125 },
    { id: 'mb-z890-gaming-x', nom: 'Gigabyte Z890 GAMING X WIFI7', q: 'Gigabyte Z890 GAMING X WIFI7', m: ['z890 gaming x'], x: [], socket: 'LGA1851', chip: 'Z890', form: 'ATX', mem: 'DDR5', slots: 4, m2: 4, wifi: true, maxTdp: 125, qual: 3, preu: 227 },
  ];

  // RAM: genèrica per especificació (tipus, capacitat, velocitat, 2 mòduls): es tria la marca més barata.
  const SENSE_RAM = ['so-?dimm', 'sodimm', '\\becc\\b', 'registrad', 'rdimm', '4 ?x ?\\d', 'cuatro', 'quad'];
  const RAM = [
    { id: 'ram-d4-16', nom: 'DDR4 16 GB (2×8) 3200 MHz', q: 'DDR4 16GB 3200 2x8', m: ['ddr4', '\\b16 ?g[bo]', '3200|3600', '2 ?x ?8'], x: SENSE_RAM, tipus: 'DDR4', gb: 16, mod: 2, mhz: 3200, qual: 1, preu: 138 },
    { id: 'ram-d4-32', nom: 'DDR4 32 GB (2×16) 3200 MHz', q: 'DDR4 32GB 3200', m: ['ddr4', '\\b32 ?g[bo]', '3200|3600', '2 ?x ?16|kit|dual'], x: SENSE_RAM, tipus: 'DDR4', gb: 32, mod: 2, mhz: 3200, qual: 2, preu: 261 },
    { id: 'ram-d5-16', nom: 'DDR5 16 GB (2×8) 5600 MHz', q: 'DDR5 16GB 2x8', m: ['ddr5', '\\b16 ?g[bo]', '5[26]00|6000', '2 ?x ?8'], x: SENSE_RAM, tipus: 'DDR5', gb: 16, mod: 2, mhz: 5600, qual: 1, preu: 306 },
    { id: 'ram-d5-32', nom: 'DDR5 32 GB (2×16) 6000 MHz', q: 'DDR5 32GB 6000', m: ['ddr5', '\\b32 ?g[bo]', '6000', '2 ?x ?16|kit|dual'], x: SENSE_RAM, tipus: 'DDR5', gb: 32, mod: 2, mhz: 6000, qual: 2, preu: 551 },
    { id: 'ram-d5-64', nom: 'DDR5 64 GB (2×32) 6000 MHz', q: 'DDR5 64GB 6000', m: ['ddr5', '\\b64 ?g[bo]', '6000', '2 ?x ?32|kit|dual'], x: SENSE_RAM, tipus: 'DDR5', gb: 64, mod: 2, mhz: 6000, qual: 3, preu: 1205 },
  ];

  // len = longitud típica màxima del xip (les versions grans dels fabricants), en mm.
  // fa = font recomanada pel fabricant (W). enc = codificador per fer streaming.
  const GPU = [
    { id: 'rtx3050-6', nom: 'NVIDIA GeForce RTX 3050 6 GB', q: 'RTX 3050 6GB', m: ['rtx ?3050', '6 ?gb'], x: [], vram: 6, tdp: 70, len: 230, fa: 300, g: 14, enc: 'nvenc', preu: 313 },
    { id: 'rx7600', nom: 'AMD Radeon RX 7600 8 GB', q: 'Radeon RX 7600', m: ['rx ?7600\\b'], x: ['7600 ?xt'], vram: 8, tdp: 165, len: 270, fa: 550, g: 29, enc: 'amf', preu: 482 },
    { id: 'rtx5050', nom: 'NVIDIA GeForce RTX 5050 8 GB', q: 'RTX 5050', m: ['rtx ?5050'], x: [], vram: 8, tdp: 130, len: 250, fa: 550, g: 27, enc: 'nvenc', preu: 498 },
    { id: 'arc-b580', nom: 'Intel Arc B580 12 GB', q: 'Intel Arc B580', m: ['b580'], x: [], vram: 12, tdp: 190, len: 290, fa: 600, g: 33, enc: 'qsv', preu: 327 },
    { id: 'rtx5060', nom: 'NVIDIA GeForce RTX 5060 8 GB', q: 'RTX 5060', m: ['rtx ?5060\\b'], x: ['\\bti\\b', '5060ti'], vram: 8, tdp: 145, len: 260, fa: 550, g: 35, enc: 'nvenc', preu: 550 },
    { id: 'rx9060xt-8', nom: 'AMD Radeon RX 9060 XT 8 GB', q: 'RX 9060 XT 8GB', m: ['9060 ?xt', '\\b8 ?gb'], x: [], vram: 8, tdp: 150, len: 290, fa: 450, g: 36, enc: 'amf', preu: 636 },
    { id: 'rx9060xt-16', nom: 'AMD Radeon RX 9060 XT 16 GB', q: 'RX 9060 XT 16GB', m: ['9060 ?xt', '16 ?gb'], x: [], vram: 16, tdp: 160, len: 290, fa: 450, g: 39, enc: 'amf', preu: 749 },
    { id: 'rtx5060ti-16', nom: 'NVIDIA GeForce RTX 5060 Ti 16 GB', q: 'RTX 5060 Ti 16GB', m: ['5060 ?ti', '16 ?gb'], x: [], vram: 16, tdp: 180, len: 300, fa: 600, g: 43, enc: 'nvenc', preu: 886 },
    { id: 'rtx5070', nom: 'NVIDIA GeForce RTX 5070 12 GB', q: 'RTX 5070', m: ['rtx ?5070\\b'], x: ['\\bti\\b', '5070ti'], vram: 12, tdp: 250, len: 310, fa: 650, g: 56, enc: 'nvenc', preu: 940 },
    { id: 'rx9070', nom: 'AMD Radeon RX 9070 16 GB', q: 'Radeon RX 9070', m: ['rx ?9070\\b'], x: ['9070 ?xt', '9070xt'], vram: 16, tdp: 220, len: 330, fa: 650, g: 61, enc: 'amf', preu: 767 },
    { id: 'rx9070xt', nom: 'AMD Radeon RX 9070 XT 16 GB', q: 'Radeon RX 9070 XT', m: ['9070 ?xt'], x: [], vram: 16, tdp: 304, len: 340, fa: 750, g: 67, enc: 'amf', preu: 869 },
    { id: 'rtx5070ti', nom: 'NVIDIA GeForce RTX 5070 Ti 16 GB', q: 'RTX 5070 Ti', m: ['5070 ?ti'], x: [], vram: 16, tdp: 300, len: 340, fa: 750, g: 69, enc: 'nvenc', preu: 1646 },
    { id: 'rtx5080', nom: 'NVIDIA GeForce RTX 5080 16 GB', q: 'RTX 5080', m: ['rtx ?5080\\b'], x: [], vram: 16, tdp: 360, len: 345, fa: 850, g: 79, enc: 'nvenc', preu: 2185 },
    { id: 'rtx5090', nom: 'NVIDIA GeForce RTX 5090 32 GB', q: 'RTX 5090', m: ['rtx ?5090\\b'], x: [], vram: 32, tdp: 575, len: 360, fa: 1000, g: 100, enc: 'nvenc', preu: 9027 },
  ];

  const SSD = [
    { id: 'ssd-nv3-500', nom: 'Kingston NV3 500 GB NVMe PCIe 4.0', q: 'Kingston NV3 500GB', m: ['nv3', '500 ?g[bo]'], x: ['2230'], gb: 500, gen: 4, qual: 1, preu: 112 },
    { id: 'ssd-nv3-1tb', nom: 'Kingston NV3 1 TB NVMe PCIe 4.0', q: 'Kingston NV3 1TB', m: ['nv3', '\\b1 ?t[bo]|1000 ?g'], x: ['2230'], gb: 1000, gen: 4, qual: 1, preu: 152 },
    { id: 'ssd-990-1tb', nom: 'Samsung 990 1 TB NVMe PCIe 4.0', q: 'Samsung 990 1TB', m: ['samsung', '\\b990\\b', '\\b1 ?t[bo]'], x: ['pro', 'evo'], gb: 1000, gen: 4, qual: 2, preu: 182 },
    { id: 'ssd-nv3-2tb', nom: 'Kingston NV3 2 TB NVMe PCIe 4.0', q: 'Kingston NV3 2TB', m: ['nv3', '\\b2 ?t[bo]|2000 ?g'], x: ['2230'], gb: 2000, gen: 4, qual: 1, preu: 287 },
    { id: 'ssd-990evo-2tb', nom: 'Samsung 990 EVO Plus 2 TB NVMe', q: 'Samsung 990 EVO Plus 2TB', m: ['990 evo plus', '\\b2 ?t[bo]'], x: [], gb: 2000, gen: 4, qual: 2, preu: 394 },
    { id: 'ssd-p310-4tb', nom: 'Crucial P310 4 TB NVMe PCIe 4.0', q: 'Crucial P310 4TB', m: ['p310', '\\b4 ?t[bo]'], x: ['2230'], gb: 4000, gen: 4, qual: 2, preu: 485 },
  ];

  // cert: 1 Bronze, 2 Gold, 3 Gold de gamma alta / Platinum. pcie5: connector 12V-2x6 natiu.
  const PSU = [
    { id: 'psu-sp11-450', nom: 'be quiet! System Power 11 450 W (80+ Bronze)', q: 'be quiet System Power 11 450W', m: ['system power 11', '450 ?w'], x: [], w: 450, cert: 'Bronze', qual: 1, pcie5: false, preu: 49 },
    { id: 'psu-a550bn', nom: 'MSI MAG A550BN 550 W (80+ Bronze)', q: 'MSI MAG A550BN', m: ['a550bn'], x: [], w: 550, cert: 'Bronze', qual: 1, pcie5: false, preu: 54 },
    { id: 'psu-pp12m-650', nom: 'be quiet! Pure Power 12 M 650 W (80+ Gold)', q: 'be quiet Pure Power 12 M 650W', m: ['pure power 12', '650 ?w'], x: [], w: 650, cert: 'Gold', qual: 2, pcie5: true, preu: 89 },
    { id: 'psu-rm750e', nom: 'Corsair RM750e 750 W (80+ Gold)', q: 'Corsair RM750e', m: ['rm750e'], x: [], w: 750, cert: 'Gold', qual: 2, pcie5: true, preu: 107 },
    { id: 'psu-rm850e', nom: 'Corsair RM850e 850 W (80+ Gold)', q: 'Corsair RM850e', m: ['rm850e'], x: [], w: 850, cert: 'Gold', qual: 2, pcie5: true, preu: 111 },
    { id: 'psu-rm850x', nom: 'Corsair RM850x 850 W (80+ Gold, gamma alta)', q: 'Corsair RM850x', m: ['rm850x'], x: ['shift'], w: 850, cert: 'Gold', qual: 3, pcie5: true, preu: 134 },
    { id: 'psu-rm1000x', nom: 'Corsair RM1000x 1000 W (80+ Gold, gamma alta)', q: 'Corsair RM1000x', m: ['rm1000x'], x: ['shift'], w: 1000, cert: 'Gold', qual: 3, pcie5: true, preu: 170 },
    { id: 'psu-tt-gt1200', nom: 'Thermaltake Toughpower GT 1200 W (80+ Gold)', q: 'Thermaltake Toughpower GT 1200W', m: ['toughpower gt', '1200'], x: [], w: 1200, cert: 'Gold', qual: 3, pcie5: true, preu: 148 },
  ];

  // forms: plaques que hi caben. gpuMax / cooler (alçada màx. del dissipador d'aire) / rad (radiador màx.) en mm.
  const CASE = [
    { id: 'case-q300l', nom: 'Cooler Master MasterBox Q300L', q: 'Cooler Master MasterBox Q300L', m: ['q300l'], x: ['v2'], forms: ['mATX', 'ITX'], gpuMax: 360, cooler: 159, rad: 240, qual: 1, preu: 52 },
    { id: 'case-air100', nom: 'Montech AIR 100 ARGB', q: 'Montech AIR 100 ARGB', m: ['air 100'], x: [], forms: ['mATX', 'ITX'], gpuMax: 330, cooler: 161, rad: 240, qual: 1, preu: 52 },
    { id: 'case-forge120a', nom: 'MSI MAG FORGE 120A AIRFLOW', q: 'MSI MAG FORGE 120A AIRFLOW', m: ['forge 120a'], x: [], forms: ['ATX', 'mATX', 'ITX'], gpuMax: 330, cooler: 160, rad: 240, qual: 1, preu: 76 },
    { id: 'case-pb501', nom: 'be quiet! Pure Base 501 Airflow', q: 'be quiet Pure Base 501 Airflow', m: ['pure base 501'], x: [], forms: ['ATX', 'mATX', 'ITX'], gpuMax: 369, cooler: 190, rad: 360, qual: 2, preu: 67 },
    { id: 'case-lancool216', nom: 'Lian Li LANCOOL 216', q: 'Lian Li LANCOOL 216', m: ['lancool 216'], x: [], forms: ['ATX', 'mATX', 'ITX'], gpuMax: 392, cooler: 180, rad: 360, qual: 3, preu: 113 },
    { id: 'case-3000d', nom: 'Corsair 3000D Airflow', q: 'Corsair 3000D Airflow', m: ['3000d', 'airflow'], x: [], forms: ['ATX', 'mATX', 'ITX'], gpuMax: 360, cooler: 170, rad: 360, qual: 2, preu: 92 },
    { id: 'case-xtpro', nom: 'Phanteks XT Pro', q: 'Phanteks XT Pro', m: ['xt pro'], x: [], forms: ['ATX', 'mATX', 'ITX'], gpuMax: 400, cooler: 184, rad: 360, qual: 2, preu: 83 },
    { id: 'case-air903', nom: 'Montech AIR 903 MAX', q: 'Montech AIR 903 MAX', m: ['air 903'], x: [], forms: ['ATX', 'mATX', 'ITX'], gpuMax: 400, cooler: 180, rad: 360, qual: 2, preu: 78 },
    { id: 'case-popair', nom: 'Fractal Design Pop Air', q: 'Fractal Design Pop Air', m: ['pop air'], x: ['mini', '\\bxl\\b'], forms: ['ATX', 'mATX', 'ITX'], gpuMax: 405, cooler: 170, rad: 280, qual: 2, preu: 120 },
    { id: 'case-h5flow', nom: 'NZXT H5 Flow', q: 'NZXT H5 Flow', m: ['h5 flow'], x: ['elite'], forms: ['ATX', 'mATX', 'ITX'], gpuMax: 365, cooler: 165, rad: 280, qual: 2, preu: 78 },
    { id: 'case-500dx', nom: 'be quiet! Pure Base 500DX', q: 'be quiet Pure Base 500DX', m: ['500dx'], x: [], forms: ['ATX', 'mATX', 'ITX'], gpuMax: 369, cooler: 190, rad: 360, qual: 2, preu: 126 },
    { id: 'case-o11evo', nom: 'Lian Li O11 Dynamic EVO', q: 'Lian Li O11 Dynamic EVO', m: ['o11', 'evo'], x: ['\\bxl\\b', 'mini'], forms: ['ATX', 'mATX', 'ITX'], gpuMax: 420, cooler: 167, rad: 360, qual: 3, preu: 174 },
    { id: 'case-h9flow', nom: 'NZXT H9 Flow', q: 'NZXT H9 Flow', m: ['h9 flow'], x: ['elite'], forms: ['ATX', 'mATX', 'ITX'], gpuMax: 435, cooler: 165, rad: 360, qual: 3, preu: 129 },
    { id: 'case-north', nom: 'Fractal Design North', q: 'Fractal Design North', m: ['fractal', 'north'], x: ['\\bxl\\b'], forms: ['ATX', 'mATX', 'ITX'], gpuMax: 355, cooler: 170, rad: 360, qual: 3, preu: 138 },
  ];

  // Tots suporten AM4, AM5, LGA1700 i LGA1851. alt = alçada (aire) o mida del radiador (líquida).
  const COOLER = [
    { id: 'cool-ax120', nom: 'Thermalright Assassin X 120 Refined SE', q: 'Thermalright Assassin X 120 Refined SE', m: ['assassin x 120'], x: [], tipus: 'aire', alt: 148, rad: 0, tdpMax: 180, qual: 1, preu: 18 },
    { id: 'cool-pa120se', nom: 'Thermalright Peerless Assassin 120 SE', q: 'Thermalright Peerless Assassin 120 SE', m: ['peerless assassin 120'], x: ['digital', 'vision'], tipus: 'aire', alt: 155, rad: 0, tdpMax: 245, qual: 2, preu: 41 },
    { id: 'cool-nhd15g2', nom: 'Noctua NH-D15 G2', q: 'Noctua NH-D15 G2', m: ['nh-d15 g2'], x: ['lbc', 'hbc'], tipus: 'aire', alt: 168, rad: 0, tdpMax: 280, qual: 3, preu: 143 },
    { id: 'cool-lf3-240', nom: 'ARCTIC Liquid Freezer III Pro 240', q: 'ARCTIC Liquid Freezer III Pro 240', m: ['liquid freezer iii', '240'], x: [], tipus: 'liquida', alt: 0, rad: 240, tdpMax: 260, qual: 2, preu: 62 },
    { id: 'cool-lf3-360', nom: 'ARCTIC Liquid Freezer III Pro 360', q: 'ARCTIC Liquid Freezer III Pro 360', m: ['liquid freezer iii', '360'], x: [], tipus: 'liquida', alt: 0, rad: 360, tdpMax: 300, qual: 3, preu: 73 },
  ];

  const CATALEG = { cpu: CPU, mb: MB, ram: RAM, gpu: GPU, ssd: SSD, psu: PSU, case: CASE, cooler: COOLER, data: '2026-11-18' } // preus de referència: Alternate/LDLC, 18/11/2026;
  if (typeof module !== 'undefined' && module.exports) module.exports = CATALEG;
  else root.CATALEG = CATALEG;
})(typeof window !== 'undefined' ? window : globalThis);
