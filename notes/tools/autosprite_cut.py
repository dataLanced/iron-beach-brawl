# AutoSprite sprite sheet -> numbered frames + a loop point.
#   python3 autosprite_cut.py sheet.png outdir [cols=5]
# AutoSprite exports ONE PNG: a square grid (5x5 for 25 frames), every cell the same size (cell = width / cols: 512 px
# cells at 2560 px, 256 px cells at 1280 px), already transparent, all frames at the same zoom with the feet on the same
# line. Frames are saved in reading order as outdir/f_00.png ... (full cell, not cropped, so they stay aligned).
# It then prints the best loop points: pairs of frames at least 6 apart whose silhouettes differ least (a loop = play
# from the first to just before the second). Normalise by the idle's stance height like any other sheet.
import sys, os, numpy as np, scipy.ndimage as nd
from PIL import Image
src, out = sys.argv[1], sys.argv[2]; cols = int(sys.argv[3]) if len(sys.argv) > 3 else 5
os.makedirs(out, exist_ok=True); A = np.array(Image.open(src).convert('RGBA')); c = A.shape[1] // cols; rows = A.shape[0] // c; M = []
for i in range(cols * rows):
    r, q = divmod(i, cols); t = A[r * c:(r + 1) * c, q * c:(q + 1) * c].copy(); m = t[..., 3] > 60; l, k = nd.label(m)
    if k > 1: s = nd.sum(m, l, range(1, k + 1)); t[..., 3] = np.where(np.isin(l, [j + 1 for j in range(k) if s[j] > s.max() * .02]), t[..., 3], 0)
    Image.fromarray(t).save(f'{out}/f_{i:02d}.png'); M.append(t[..., 3] > 60)
d = lambda i, j: (M[i] ^ M[j]).sum() / max(1, M[i].sum())
print('cell', c, 'frames', len(M))
print('change frame to frame:', [round(d(i, i - 1), 2) for i in range(1, len(M))])
print('best loops (diff, start, end):', sorted((round(d(i, j), 3), i, j) for i in range(len(M)) for j in range(i + 6, len(M)))[:6])
