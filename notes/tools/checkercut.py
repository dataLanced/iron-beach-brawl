# cut a ChatGPT figure out of a painted (fake) transparency checkerboard
import sys; from PIL import Image; import numpy as np, scipy.ndimage as nd
src, dst, TH = sys.argv[1], sys.argv[2], int(sys.argv[3])
a=np.array(Image.open(src).convert('RGBA')).astype(int); mx=a[...,:3].max(2); mn=a[...,:3].min(2); H=a.shape[0]
bgish=(mn>200)&(mx-mn<12)
l,n=nd.label(bgish); border=set(np.unique(np.r_[l[0],l[-1],l[:,0],l[:,-1]]))-{0}
fig=~np.isin(l,list(border)); l2,n2=nd.label(bgish&fig)
for i in range(1,n2+1):
    m=l2==i; v=mn[m]; sz=m.sum(); cy=np.nonzero(m)[0].mean()/H
    checker=((v>=208)&(v<=228)).mean()>.25 and ((v>228)&(v<246)).mean()<.2
    if (sz>150 and checker) or ((v>=246).mean()>.8 and cy<.9 and sz>20 and (nd.binary_dilation(m,iterations=3)&~fig).any()): fig[m]=False
for _ in range(3):   # peel light, colourless pixels off the outside edge (checker caught under the outline's antialiasing)
    edge=fig & nd.binary_dilation(~fig) & bgish; fig[edge]=False
lf,nf=nd.label(fig); s=nd.sum(fig,lf,range(1,nf+1)); fig=np.isin(lf,[i+1 for i in range(nf) if s[i]>s.max()*.002])
al=nd.gaussian_filter(fig.astype(float),0.7)*255
A=a.copy(); A[...,3]=al.clip(0,255); A=A.astype(np.uint8); solid=A[...,3]>=250
_,(iy,ix)=nd.distance_transform_edt(~solid,return_indices=True); A[...,:3]=A[iy,ix,:3]; A[...,3]=np.where(A[...,3]<40,0,A[...,3]); A[A[...,3]==0]=0
im=Image.fromarray(A); im=im.crop(im.getbbox()); k=TH/im.height
im=im.convert('RGBa').resize((round(im.width*k),TH),Image.LANCZOS).convert('RGBA')
c=Image.new('RGBA',(im.width+80,im.height+80)); c.alpha_composite(im,(40,40)); c.save(dst)
