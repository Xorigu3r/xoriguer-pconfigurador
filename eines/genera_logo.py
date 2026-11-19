"""Genera el logo i les icones de Xoriguer PConfigurador (falcó de la casa + torre de PC).

Ús:  python -I eines/genera_logo.py   (des de l'arrel del projecte)
Llenç de 512 com les altres apps: falcó a (36, 66) amb 440 d'ample, motiu del projecte a sota.
Fons «Blau pissarra» #1E2A3B (mai negre). Rètol: marca.py de LOGOS-XORIGUER.
Surt: www/icons/*, assets/* (Android, @capacitor/assets) i build/icon.png + build/icon.ico (Windows/Linux).
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ARREL = Path(__file__).resolve().parent.parent
WWW = ARREL / 'www'
ICONS = WWW / 'icons'
ASSETS = ARREL / 'assets'
BUILD = ARREL / 'build'
sys.path.insert(0, str(Path('C:/Users/Xorigu3r/Documents/LOGOS-XORIGUER/_eines')))
import marca  # noqa: E402

FONS = (30, 42, 59, 255)        # #1E2A3B
FONS2 = (39, 53, 74, 255)       # #27354A
CREMA = (246, 239, 226, 255)
TARONJA = (255, 168, 46, 255)
TARONJA_FOSC = (242, 101, 15, 255)
BLAU = (127, 178, 255, 255)
S = 4


def degradat_vertical(N, c1, c2, y0, y1):
    g = Image.new('RGBA', (1, N))
    for y in range(N):
        t = min(1, max(0, (y - y0) / max(1, y1 - y0)))
        g.putpixel((0, y), tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(4)))
    return g.resize((N, N))


def dibuixa(mida, escala=1.0, amb_fons=True, rodo=False, amb_falco=True):
    N = 512 * S
    k = S
    capa = Image.new('RGBA', (N, N), (0, 0, 0, 0))

    # resplendor taronja darrere la torre
    g = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    ImageDraw.Draw(g).ellipse([160 * k, 240 * k, 352 * k, 470 * k], fill=TARONJA[:3] + (90,))
    capa.alpha_composite(g.filter(ImageFilter.GaussianBlur(40 * k)))

    if amb_falco:
        falco = Image.open(ICONS / 'falco.png').convert('RGBA')
        fw = 440 * k
        falco = falco.resize((fw, round(fw * falco.height / falco.width)), Image.LANCZOS)
        capa.alpha_composite(falco, (36 * k, 66 * k))

    # torre: cos amb degradat taronja
    x0, y0, x1, y1 = 190, 246, 322, 470
    m = Image.new('L', (N, N), 0)
    ImageDraw.Draw(m).rounded_rectangle([x0 * k, y0 * k, x1 * k, y1 * k], radius=18 * k, fill=255)
    capa.paste(degradat_vertical(N, TARONJA, TARONJA_FOSC, y0 * k, y1 * k), (0, 0), m)
    d = ImageDraw.Draw(capa)
    d.rounded_rectangle([x0 * k, y0 * k, x1 * k, y1 * k], radius=18 * k, outline=CREMA, width=6 * k)
    # frontal fosc
    d.rounded_rectangle([(x0 + 16) * k, (y0 + 16) * k, (x1 - 16) * k, (y1 - 16) * k], radius=10 * k, fill=FONS2)
    # badies de dalt
    for i in range(2):
        yy = y0 + 32 + i * 20
        d.rounded_rectangle([(x0 + 30) * k, yy * k, (x1 - 30) * k, (yy + 9) * k], radius=4 * k, fill=CREMA)
    # botó d'engegar
    d.ellipse([(x1 - 52) * k, (y0 + 78) * k, (x1 - 32) * k, (y0 + 98) * k], outline=TARONJA, width=5 * k)
    d.line([((x1 - 42) * k, (y0 + 74) * k), ((x1 - 42) * k, (y0 + 88) * k)], fill=TARONJA, width=5 * k)
    # ventilador amb llum
    cx, cy, r = (x0 + x1) // 2, y1 - 70, 38
    llum = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    ImageDraw.Draw(llum).ellipse([(cx - r - 8) * k, (cy - r - 8) * k, (cx + r + 8) * k, (cy + r + 8) * k], fill=BLAU[:3] + (110,))
    capa.alpha_composite(llum.filter(ImageFilter.GaussianBlur(8 * k)))
    d = ImageDraw.Draw(capa)
    d.ellipse([(cx - r) * k, (cy - r) * k, (cx + r) * k, (cy + r) * k], outline=BLAU, width=6 * k)
    # aspes corbes (arcs gruixuts), com un ventilador de caixa
    for i in range(7):
        a = i * 360 / 7
        d.arc([(cx - r + 12) * k, (cy - r + 12) * k, (cx + r - 12) * k, (cy + r - 12) * k], a, a + 34, fill=CREMA, width=12 * k)
    d.ellipse([(cx - 17) * k, (cy - 17) * k, (cx + 17) * k, (cy + 17) * k], fill=FONS2)
    d.ellipse([(cx - 9) * k, (cy - 9) * k, (cx + 9) * k, (cy + 9) * k], fill=FONS2, outline=CREMA, width=3 * k)

    if escala != 1.0:
        mm = round(N * escala)
        petita = capa.resize((mm, mm), Image.LANCZOS)
        capa = Image.new('RGBA', (N, N), (0, 0, 0, 0))
        capa.alpha_composite(petita, ((N - mm) // 2, (N - mm) // 2))
    im = Image.new('RGBA', (N, N), FONS if amb_fons else (0, 0, 0, 0))
    im.alpha_composite(capa)
    if rodo:
        mk = Image.new('L', (N, N), 0)
        ImageDraw.Draw(mk).rounded_rectangle([0, 0, N - 1, N - 1], radius=N // 5, fill=255)
        im.putalpha(mk)
    return im.resize((mida, mida), Image.LANCZOS)


def logo_complet(mida=1024):
    im = Image.new('RGBA', (mida, mida), FONS)
    simbol = dibuixa(720, amb_fons=False)
    im.alpha_composite(simbol, ((mida - 720) // 2, 10))
    marca.enganxa(im, marca.rotul('XORIGUER', 'PCONFIGURADOR', amplada=int(mida * 0.74)), mida / 2, mida * 0.735)
    return im


if __name__ == '__main__':
    ASSETS.mkdir(exist_ok=True)
    BUILD.mkdir(exist_ok=True)
    dibuixa(512).save(ICONS / 'icon-512.png')
    dibuixa(192).save(ICONS / 'icon-192.png')
    dibuixa(64, rodo=True).save(ICONS / 'favicon.png')
    dibuixa(512, amb_fons=False).save(ICONS / 'simbol.png')
    logo_complet().convert('RGB').save(ICONS / 'logo-complet.png')
    # Android (@capacitor/assets)
    dibuixa(1024, escala=0.92).convert('RGB').save(ASSETS / 'icon-only.png')
    dibuixa(1024, escala=0.6, amb_fons=False).save(ASSETS / 'icon-foreground.png')
    Image.new('RGB', (1024, 1024), FONS[:3]).save(ASSETS / 'icon-background.png')
    sp = Image.new('RGBA', (2732, 2732), FONS)
    sp.alpha_composite(logo_complet(1000), (866, 866))
    sp.convert('RGB').save(ASSETS / 'splash.png')
    sp.convert('RGB').save(ASSETS / 'splash-dark.png')
    # Escriptori (electron-builder): PNG gran per a Linux i ICO multimida per a Windows
    gran = dibuixa(1024, rodo=True)
    gran.save(BUILD / 'icon.png')
    gran.save(BUILD / 'icon.ico', sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])
    print('Icones generades a', ICONS, ASSETS, BUILD)
