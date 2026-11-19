# Xoriguer PConfigurador

Configurador de PC per pressupost i ús: **Gamer**, **Streaming**, **Oficina** i **Navegar i correu**.
Tries l'ús i el pressupost i et munta un PC peça a peça: **compatible** (sòcol, RAM, mida de la placa, llargada de la
gràfica, dissipador, font…) i **equilibrat** (sense colls d'ampolla entre processador i gràfica), amb **preus reals**
d'Alternate i LDLC i enllaços de compra.

En català, espanyol, francès i anglès. Sense comptes, sense anuncis i sense enllaços d'afiliat.

## Baixades
https://xoriguer.dev/ — Android (APK), Windows (.exe portable) i Linux (AppImage i tar.gz).

## Codi
- `www/` — l'app (una sola web per a totes les plataformes): `cataleg.js` (peces), `motor.js` (compatibilitat,
  equilibri i muntatge), `botigues.js` (lectura de preus), `app.js` (interfície), `traduccions.js`.
- `electron/` — versió d'escriptori (Windows i Linux). `android/` — Capacitor 8.
- `npm test` — proves del motor. `npm run preus` — actualitza `www/preus.js`.
- `npm run apk`, `npm run exe`, `npx electron-builder --linux tar.gz` (+ `scripts/appimage_wsl.sh` per a l'AppImage).

Els preus són orientatius: comprova'ls sempre a la botiga abans de comprar.
