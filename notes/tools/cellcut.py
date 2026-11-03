# Cut a sheet with no (or broken) grid lines: seed every cell from the eroded figure pixels whose centre lies in it,
# then watershed so touching figures split at their thinnest join. Small stray bits (<3% of the figure) are dropped.
from PIL import Image; import numpy as np, scipy.ndimage as nd
from skimage.segmentation import watershed
def cellcut(src, cols, rows, prefix, it=14, keep_loose=False):
    a = np.array(Image.open(src).convert('RGBA')); m = a[..., 3] > 60
    H, W = m.shape; cw, rh = W / cols, H / rows
    er = nd.binary_erosion(m, iterations=it)
    for c in range(1, cols): er[:, int(c * cw) - 3:int(c * cw) + 3] = False   # a seed never spans two cells
    for r in range(1, rows): er[int(r * rh) - 3:int(r * rh) + 3] = False
    l, n = nd.label(er)
    sz = nd.sum(er, l, range(1, n + 1)); cen = nd.center_of_mass(er, l, range(1, n + 1))
    lab = np.zeros(n + 1, int)
    for i, (cy, cx) in enumerate(cen):
        if sz[i] > 400: lab[i + 1] = int(cy // rh) * cols + int(cx // cw) + 1
    mk = lab[l]; dist = nd.distance_transform_edt(m); w = watershed(-dist, markers=mk, mask=m)
    # a piece cut off from its own figure (a toe split at the join of two touching feet) goes to the figure it touches
    for _ in range(2):
        for j in range(1, cols * rows + 1):
            sel = w == j
            if not sel.any(): continue
            ll, k = nd.label(sel)
            if k < 2: continue
            s2 = nd.sum(sel, ll, range(1, k + 1)); main = int(np.argmax(s2)) + 1
            for q in range(1, k + 1):
                if q == main: continue
                piece = ll == q; ring = nd.binary_dilation(piece, iterations=2) & ~piece
                nb = w[ring]; nb = nb[(nb > 0) & (nb != j)]
                if len(nb): w[piece] = np.bincount(nb).argmax()
    out = []
    for j in range(1, cols * rows + 1):
        sel = w == j
        if not sel.any(): out.append(None); continue
        if not keep_loose:
            ll, k = nd.label(sel); s2 = nd.sum(sel, ll, range(1, k + 1)); sel &= np.isin(ll, [q + 1 for q in range(k) if s2[q] > s2.max() * .03])
        ys, xs = np.nonzero(sel); f = a.copy(); f[..., 3] = np.where(sel, a[..., 3], 0)
        f = f[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; Image.fromarray(f).save(f'{prefix}{j}.png'); out.append(f.shape[:2])
    return out
