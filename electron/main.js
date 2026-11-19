// Xoriguer PConfigurador — escriptori (Windows .exe i Linux). Obre www/ i fa de pont per llegir les botigues:
// des del procés principal no hi ha CORS, i les peticions surten com un navegador normal.
const { app, BrowserWindow, ipcMain, net, shell, Menu } = require('electron');
const path = require('path');
const B = require('../www/botigues.js');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
// Només es llegeixen les botigues del cercador de preus.
const PERMESOS = /^https:\/\/(www\.)?(alternate\.es|ldlc\.com)\//;

function crea() {
  const w = new BrowserWindow({
    width: 1100, height: 880, minWidth: 380, minHeight: 500,
    backgroundColor: '#1E2A3B',
    title: 'Xoriguer PConfigurador',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  w.loadFile(path.join(__dirname, '..', 'www', 'index.html'));
  // Prova automàtica: XoriguerPConfigurador --prova → busca el preu d'una peça des de la pàgina i surt.
  if (process.argv.includes('--prova')) {
    w.webContents.once('did-finish-load', async () => {
      try {
        const r = await w.webContents.executeJavaScript(`(async () => {
          const p = CATALEG.cpu.find(c => c.id === 'r7-7800x3d');
          const o = await BOTIGUES.cercaPeca(p, 'cpu', window.natiu.obte);
          return JSON.stringify({ plataforma: !!window.natiu, preu: o.preu, botiga: o.botiga, url: o.url, errors: o.errors });
        })()`);
        process.stdout.write('PROVA ' + r + '\n');
      } catch (e) { process.stdout.write('PROVA ERROR ' + e.message + '\n'); }
      app.quit();
    });
  }
  // Els enllaços de compra s'obren al navegador de l'usuari, no dins de l'app.
  w.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  w.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file:')) { e.preventDefault(); if (/^https?:\/\//.test(url)) shell.openExternal(url); }
  });
}

ipcMain.handle('obte', async (_e, url) => {
  if (!PERMESOS.test(url)) throw new Error('URL no permesa');
  const r = await net.fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'es-ES,es;q=0.9' }, signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const bytes = new Uint8Array(await r.arrayBuffer());
  return { text: B.descodifica(bytes, r.headers.get('content-type')), url: r.url };
});
ipcMain.handle('obre', (_e, url) => { if (/^https:\/\//.test(url)) shell.openExternal(url); });

Menu.setApplicationMenu(null);
app.whenReady().then(crea);
app.on('window-all-closed', () => app.quit());
