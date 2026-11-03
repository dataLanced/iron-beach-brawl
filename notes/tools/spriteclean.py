# Sprite clean-up for AI-generated art (ChatGPT sheets, AutoSprite, keyed video). Every fix we needed on Iron Beach Brawl.
#   python3 spriteclean.py haze  in.png out.png     ChatGPT "noise cloud" background: keep only solid figures (alpha >= 150)
#   python3 spriteclean.py edges in.png out.png     red / yellow halo in soft edges: recolour every non-solid pixel from the
#                                                   nearest solid one, drop alpha < 40, make fully transparent pixels black-clear
#   python3 spriteclean.py opaque in.png out.png    figures drawn slightly see-through (no pixel at 255): make the body solid
#   python3 spriteclean.py green in.mp4 outdir      Seedance clip on flat green: key + despill every frame to outdir/NNN.png
# Painted checkerboard instead of transparency: checkercut.py. Cutting a sheet into boxes: cellcut.py. Templates: mktpl.py.
import sys, os, numpy as np, scipy.ndimage as nd
from PIL import Image
def edges(a):
    al = a[..., 3]; solid = al >= 250
    if solid.any():
        _, (iy, ix) = nd.distance_transform_edt(~solid, return_indices=True); a[..., :3] = a[iy, ix, :3]
    a[..., 3] = np.where(al < 40, 0, al); a[a[..., 3] == 0] = 0; return a
def haze(a, min_px=4000):
    m = a[..., 3] >= 150; l, n = nd.label(m); s = nd.sum(m, l, range(1, n + 1))
    keep = np.isin(l, [i + 1 for i in range(n) if s[i] > min_px]); a[..., 3] = np.where(keep, a[..., 3], 0); a[a[..., 3] == 0] = 0; return a
def opaque(a):
    m = a[..., 3] >= 150; core = nd.binary_erosion(m, iterations=1)
    a[..., 3] = np.where(core, 255, np.where(m, np.clip((a[..., 3].astype(int) - 130) * 255 // 110, 0, 255), 0)); return a
def green(src, out):
    import subprocess, glob; os.makedirs(out, exist_ok=True); tmp = out + '/_raw'; os.makedirs(tmp, exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-i', src, tmp + '/%03d.png'], check=True)
    for i, f in enumerate(sorted(glob.glob(tmp + '/*.png'))):
        a = np.array(Image.open(f).convert('RGB')).astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]
        al = np.clip(255 - ((g - np.maximum(r, b)) - 30) * 255 / 50, 0, 255); m = al > 128; l, n = nd.label(m)
        s = nd.sum(m, l, range(1, n + 1)); keep = np.isin(l, [j + 1 for j in range(n) if s[j] > 2000])
        al = np.where(nd.binary_dilation(keep, iterations=2), al, 0); g2 = np.minimum(g, np.maximum(r, b))
        Image.fromarray(np.dstack([r, g2, b, al]).astype(np.uint8)).save(f'{out}/{i:03d}.png')
if __name__ == '__main__':
    mode, a, b = sys.argv[1:4]
    if mode == 'green': green(a, b)
    else:
        arr = np.array(Image.open(a).convert('RGBA'))
        arr = {'haze': haze, 'edges': edges, 'opaque': opaque}[mode](arr); Image.fromarray(arr.astype(np.uint8)).save(b)
