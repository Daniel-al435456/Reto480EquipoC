"""
Diseño del pato tutor en pixel art (32 × 32) y generación de src/api/pato.js.

El pato se dibuja por capas (cuerpo, cabeza, alas, gafas o lazo, ojos y pico) para que todas las caras
sean el mismo personaje. Para cambiar el diseño, edita este archivo y ejecuta desde la carpeta frontend:

    python3 herramientas/pato.py            # regenera src/api/pato.js
    python3 herramientas/pato.py --hoja     # además, guarda herramientas/hoja-pato.png para revisarlo (requiere Pillow)
"""
import json
import sys
from pathlib import Path
N=32
PAL={'R':(255,73,80),'r':(200,45,55),'K':(31,34,34),'Y':(255,208,58),'L':(255,232,140),'S':(232,168,20),'D':(196,128,10),
     'O':(255,140,60),'Q':(214,96,30),'o':(110,36,20),'W':(255,255,255),'C':(28,249,252),'c':(0,140,145),'G':(220,250,250),'P':(255,150,130)}
def vacio(): return [['.']*N for _ in range(N)]
def dentro_elipse(x,y,cx,cy,rx,ry): return ((x+0.5-cx)/rx)**2+((y+0.5-cy)/ry)**2<=1
def forma(cx,cy,rx,ry):
    return {(x,y) for y in range(N) for x in range(N) if dentro_elipse(x,y,cx,cy,rx,ry)}
def pinta_forma(m,pts,base,sombra,luz=None,dir_luz=(-1,-1)):
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    cx=(min(xs)+max(xs))/2; cy=(min(ys)+max(ys))/2; rx=(max(xs)-min(xs))/2+0.5; ry=(max(ys)-min(ys))/2+0.5
    for x,y in pts:
        dx=(x-cx)/rx; dy=(y-cy)/ry
        v=dx*0.55+dy*0.85
        m[y][x]=sombra if v>0.55 else (luz if luz and v<-0.75 else base)
    for x,y in pts:
        for nx,ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
            if (nx,ny) not in pts and 0<=nx<N and 0<=ny<N and m[ny][nx]=='.':
                m[ny][nx]='K'
def put(m,pts,c):
    for x,y in pts:
        if 0<=x<N and 0<=y<N: m[y][x]=c
def base():
    m=vacio()
    cuerpo=forma(16,25,11,5.8)
    pinta_forma(m,cuerpo,'Y','S')
    cabeza=forma(16,11.5,9.2,9)
    pinta_forma(m,cabeza,'Y','S','L')
    # sombra de la cabeza solo en el lateral derecho (bajo el pico parecía barba)
    for x,y in cabeza:
        if m[y][x]=='S' and (x < 22 or y > 17): m[y][x]='Y'
    # contorno de la cabeza sobre el cuerpo
    for x,y in cabeza:
        if (x,y+1) in cuerpo and (x,y+1) not in cabeza: pass
    for x in range(N):
        for y in range(N):
            if (x,y) in cuerpo and (x,y) not in cabeza and ((x,y-1) in cabeza):
                m[y][x]='K'
    # alas
    for lado in (-1,1):
        ala=forma(16+lado*8.5,26,3,3.6)
        for x,y in ala:
            if (x,y) in cuerpo: m[y][x]='S' if (y>26) else 'Y'
        for x,y in ala:
            for nx,ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                if (nx,ny) not in ala and (nx,ny) in cuerpo: m[ny][nx]='D'
    # mechón
    put(m,[(15,1),(16,0),(17,0),(14,2)],'K'); put(m,[(15,2),(16,1),(17,1)],'Y'); put(m,[(18,1)],'K')
    return m
def gafas(m, dy=0):
    if dy:
        g=vacio()
        gafas(g)
        for y in range(N):
            for x in range(N):
                if g[y][x] in 'CcG': m[y+dy][x]=g[y][x]
        return
    for x0 in (8,18):
        for x in range(x0,x0+6):
            put(m,[(x,8),(x,12)],'C')
        for y in range(8,13):
            put(m,[(x0,y),(x0+5,y)],'C')
        put(m,[(x0+4,9)],'G')
    put(m,[(14,9),(15,9),(16,9),(17,9)],'C')
    put(m,[(7,9),(24,9)],'c')
def ojos(m,tipo):
    for ex in (10,20):
        if tipo=='abiertos':
            put(m,[(ex,9),(ex+1,9),(ex,10),(ex+1,10),(ex,11),(ex+1,11)],'K'); put(m,[(ex,9)],'W')
        elif tipo=='arriba':
            put(m,[(ex+1,9),(ex+2,9),(ex+1,10),(ex+2,10)],'K'); put(m,[(ex+1,9)],'W')
        elif tipo=='felices':
            put(m,[(ex-1,11),(ex,10),(ex+1,10),(ex+2,11)],'K')
        elif tipo=='cerrados':
            put(m,[(ex-1,10),(ex,11),(ex+1,11),(ex+2,10)],'K')
        elif tipo=='izquierda':
            put(m,[(ex-1,9),(ex,9),(ex-1,10),(ex,10),(ex-1,11),(ex,11)],'K'); put(m,[(ex-1,9)],'W')
        elif tipo=='cola':
            put(m,[(ex-1,10),(ex,10),(ex-1,11),(ex,11),(ex-1,12),(ex,12)],'K'); put(m,[(ex-1,10)],'W')
    if tipo=='guino':
        put(m,[(10,9),(11,9),(10,10),(11,10),(10,11),(11,11)],'K'); put(m,[(10,9)],'W')
        put(m,[(19,10),(20,10),(21,10),(22,10)],'K')
def pico(m,abierto):
    # pico visto de frente: ancho y plano, como el de un pato de goma
    if not abierto:
        for x in range(12,20): m[14][x]='O'
        for x in range(11,21): m[15][x]='Q'
        for x in range(12,20): m[16][x]='O'
        put(m,[(13,14),(14,14)],'L')
        for x in range(12,20): put(m,[(x,13),(x,17)],'K')
        put(m,[(11,14),(20,14),(10,15),(21,15),(11,16),(20,16)],'K')
    else:
        for x in range(12,20): m[14][x]='O'
        put(m,[(13,14),(14,14)],'L')
        for x in range(11,21): m[15][x]='o'
        for x in range(12,20): m[16][x]='o'
        put(m,[(14,16),(15,16),(16,16),(17,16)],'P')
        for x in range(12,20): m[17][x]='O'
        for x in range(12,20): put(m,[(x,13),(x,18)],'K')
        put(m,[(11,14),(20,14),(10,15),(21,15),(11,16),(20,16),(11,17),(20,17)],'K')
def ala_arriba(m,lado=1):
    # ala derecha levantada
    for x,y in forma(16+lado*11.5,19,2.4,4):
        if m[y][x] in '.K': m[y][x]='Y'
    for x,y in forma(16+lado*11.5,19,2.4,4):
        for nx,ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
            if 0<=nx<N and m[ny][nx]=='.': m[ny][nx]='K'
def mano_pico(m):
    f=forma(9,17.5,2.6,2.2)
    for x,y in f: m[y][x]='Y'
    for x,y in f:
        for nx,ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
            if (nx,ny) not in f and m[ny][nx] in '.YSL': m[ny][nx]='D' if m[ny][nx]!='.' else 'K'
def lazo(m, dy=0):
    # lazo coral en lo alto de la cabeza, ligeramente a la derecha
    R,r,K='R','r','K'
    pts={ (19,2):K,(20,2):K,(23,2):K,(24,2):K,
          (18,3):K,(19,3):R,(20,3):R,(21,3):K,(22,3):K,(23,3):R,(24,3):R,(25,3):K,
          (18,4):K,(19,4):R,(20,4):R,(21,4):r,(22,4):r,(23,4):R,(24,4):R,(25,4):K,
          (18,5):K,(19,5):R,(20,5):r,(21,5):r,(22,5):r,(23,5):r,(24,5):R,(25,5):K,
          (19,6):K,(20,6):K,(23,6):K,(24,6):K, (21,6):K,(22,6):K }
    for (x,y),c in pts.items(): put(m,[(x,y+dy)],c)
EMOC={
 'parpadeo':   dict(ojos='cerrados', pico=False, extra=[]),
 'mirar':      dict(ojos='izquierda',pico=False, extra=[]),
 'cola':       dict(ojos='cola',     pico=False, extra=[]),
 'saludando':  dict(ojos='abiertos', pico=False, extra=[ala_arriba]),
 'pensando':   dict(ojos='arriba',   pico=False, extra=[mano_pico]),
 'cerrado':    dict(ojos='abiertos', pico=False, extra=[]),
 'abierto':    dict(ojos='abiertos', pico=True,  extra=[]),
 'contento':   dict(ojos='felices',  pico=True,  extra=[]),
 'animando':   dict(ojos='guino',    pico=True,  extra=[ala_arriba]),
 'contento_c': dict(ojos='felices',  pico=False, extra=[]),
 'animando_c': dict(ojos='guino',    pico=False, extra=[ala_arriba]),
}
def sprite(emo,var):
    e=EMOC[emo]; m=base()
    for f in e['extra']: f(m)
    if var=='pato': gafas(m)
    ojos(m,e['ojos']); pico(m,e['pico'])
    if var=='pata': lazo(m)
    return m

CARAS = ['abierto', 'parpadeo', 'mirar', 'cola', 'pensando', 'saludando', 'contento', 'contento_c', 'animando', 'animando_c']
BASE32 = '0123456789abcdefghijklmnopqrstuv'


def generar_js():
    sprites = {}
    for variante in ['pato', 'pata']:
        base = sprite('cerrado', variante)
        datos = {'base': [''.join(fila) for fila in base]}
        for cara in CARAS:
            m = sprite(cara, variante)
            datos[cara] = ''.join(
                BASE32[x] + BASE32[y] + m[y][x] for y in range(N) for x in range(N) if m[y][x] != base[y][x]
            )
        sprites[variante] = datos
    paleta = {k: '#%02x%02x%02x' % v for k, v in PAL.items()}
    js = (
        '/*\n'
        ' * Sprites del pato tutor en pixel art (32 × 32).\n'
        ' * Cada variante (pato con gafas, pata con lazo) tiene una imagen base ("cerrado": pico cerrado, ojos abiertos)\n'
        ' * y el resto de caras se guardan como diferencias respecto a ella: grupos de 3 caracteres\n'
        ' * (columna, fila, color), con columna y fila en base 32 (0-9, a-v).\n'
        ' * No editar a mano: se genera con frontend/herramientas/pato.py.\n'
        ' */\n\n'
        f'export const PALETA_PATO = {json.dumps(paleta, ensure_ascii=False)};\n\n'
        f'export const SPRITES_PATO = {json.dumps(sprites, ensure_ascii=False, indent=1)};\n'
    )
    destino = Path(__file__).resolve().parent.parent / 'src' / 'api' / 'pato.js'
    destino.write_text(js, encoding='utf-8')
    print(f'Generado {destino}')


def guardar_hoja():
    from PIL import Image

    caras = ['cerrado'] + CARAS
    esc, margen = 4, 8
    ancho = N * esc + margen
    hoja = Image.new('RGBA', (ancho * len(caras), ancho * 2), (244, 246, 246, 255))
    for j, variante in enumerate(['pato', 'pata']):
        for i, cara in enumerate(caras):
            m = sprite(cara, variante)
            for y, fila in enumerate(m):
                for x, c in enumerate(fila):
                    if c != '.':
                        x0, y0 = i * ancho + margen // 2 + x * esc, j * ancho + margen // 2 + y * esc
                        hoja.paste(PAL[c] + (255,), (x0, y0, x0 + esc, y0 + esc))
    destino = Path(__file__).resolve().parent / 'hoja-pato.png'
    hoja.save(destino)
    print(f'Guardada {destino}')


if __name__ == '__main__':
    generar_js()
    if '--hoja' in sys.argv:
        guardar_hoja()
