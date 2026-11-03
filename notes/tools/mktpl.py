# "Roomy" sprite-sheet templates for ChatGPT: 1536x1024 (its native landscape size), the character only ~2/3 of the box
# height, so kicks, throws, hair and lying-down poses fit without spilling into the next box.
#   mktpl(cols, rows, ref_png, out, fx=.5)  ref_png: a cut-out of the character (transparent), pasted into box 1
#   guide line at 22% of box height (top of head), floor at 88% (soles); fx = where box 1's figure is centred
import sys, numpy as np
from PIL import Image, ImageDraw, ImageFont
W, H = 1536, 1024
FONT = '/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf'
def dashed(d, p0, p1, col, w, dash=22, gap=14):
    (x0, y0), (x1, y1) = p0, p1; L = max(abs(x1 - x0), abs(y1 - y0)); t = 0
    while t < L:
        a, b = t / L, min(t + dash, L) / L
        d.line([(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a), (x0 + (x1 - x0) * b, y0 + (y1 - y0) * b)], fill=col, width=w); t += dash + gap
def geom(cols, rows):
    bw, bh = W // cols, H // rows
    boxes = [(c * bw, r * bh, (c + 1) * bw, (r + 1) * bh) for r in range(rows) for c in range(cols)]
    return boxes, [(r * bh + round(bh * .22), r * bh + round(bh * .88)) for r in range(rows)]
def mktpl(cols, rows, ref, out, fx=.5, head_off=0):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im); boxes, lines = geom(cols, rows)
    f = ImageFont.truetype(FONT, 30)
    for r, (gy, fy) in enumerate(lines):
        dashed(d, (0, gy), (W, gy), (40, 30, 10, 255), 7); dashed(d, (0, gy), (W, gy), (255, 220, 40, 255), 3)   # head guide
        for yy in (fy, fy + 6): d.line([(0, yy), (W, yy)], fill=(40, 40, 40, 255), width=2)                     # floor
    for c in range(1, cols): x = c * W // cols; dashed(d, (x, 0), (x, H), (60, 60, 60, 255), 5); dashed(d, (x, 0), (x, H), (230, 230, 230, 255), 1)
    for r in range(1, rows): y = r * H // rows; dashed(d, (0, y), (W, y), (60, 60, 60, 255), 5); dashed(d, (0, y), (W, y), (230, 230, 230, 255), 1)
    for i, (x0, y0, x1, y1) in enumerate(boxes):
        d.text((x0 + 12, y0 + 6), str(i + 1), font=f, fill=(255, 255, 255, 255), stroke_width=3, stroke_fill=(20, 20, 20, 255))
    if ref:
        R = Image.open(ref).convert('RGBA'); a = np.array(R)[..., 3]; ys, xs = np.nonzero(a > 40); R = R.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        x0, y0, x1, y1 = boxes[0]; gy, fy = lines[0]; k = (fy - gy) / (R.height - head_off)   # head_off: px of ponytail/hair above the top of her head
        R = R.resize((round(R.width * k), round(R.height * k)), Image.LANCZOS)
        im.alpha_composite(R, (int(x0 + (x1 - x0) * fx - R.width / 2), fy - R.height))
    im.save(out); return boxes, lines
if __name__ == '__main__':
    print(mktpl(int(sys.argv[1]), int(sys.argv[2]), sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != '-' else None, sys.argv[4]))
