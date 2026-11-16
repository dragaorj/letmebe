"""Texturas procedurais fotorrealistas do abacate (casca Hass, polpa, caroço).
Uso: python make_avocado_textures.py <pasta-saida>"""
import sys, math, numpy as np
from PIL import Image, ImageFilter
OUT = sys.argv[1]
rng = np.random.default_rng(7)

def worley(w, h, cells, seed=0, tile=True):
    r = np.random.default_rng(seed)
    cy, cx = cells
    pts = r.random((cy, cx, 2))
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    gy, gx = yy / h * cy, xx / w * cx
    iy, ix = np.floor(gy).astype(int), np.floor(gx).astype(int)
    F1 = np.full((h, w), 9.0, np.float32); F2 = np.full((h, w), 9.0, np.float32)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            ny, nx = (iy + dy) % cy, (ix + dx) % cx
            p = pts[ny, nx]
            px, py = ix + dx + p[..., 0], iy + dy + p[..., 1]
            d = np.hypot(gx - px, gy - py)
            F2 = np.where(d < F1, F1, np.minimum(F2, d)); F1 = np.minimum(F1, d)
    return F1, F2

def fbm(w, h, octaves=5, seed=1):
    r = np.random.default_rng(seed); acc = np.zeros((h, w), np.float32); amp = 1; tot = 0
    for o in range(octaves):
        s = 2 ** (o + 2)
        g = r.random((s, s)).astype(np.float32)
        img = Image.fromarray((g * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
        acc += amp * np.asarray(img, np.float32) / 255; tot += amp; amp *= 0.5
    return acc / tot

def normal_from_height(hgt, strength):
    gy, gx = np.gradient(hgt)
    n = np.dstack([-gx * strength, gy * strength, np.ones_like(hgt)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return Image.fromarray(((n * 0.5 + 0.5) * 255).astype(np.uint8), 'RGB')

def save(arr, name):
    Image.fromarray(np.clip(arr * 255, 0, 255).astype(np.uint8)).save(f"{OUT}/{name}", optimize=True)

# ---------- Casca Hass (UV: u = volta, v = comprimento) ----------
W, H = 1024, 1024
F1, F2 = worley(W, H, (70, 90), seed=3)
F1b, _ = worley(W, H, (180, 230), seed=4)
pebble = np.clip(1 - F1 * 1.6, 0, 1) ** 1.6 * 0.75 + np.clip(1 - F1b * 1.5, 0, 1) ** 2 * 0.35
n = fbm(W, H, 5, 11)
hgt = pebble + n * 0.25
base = np.array([0.20, 0.27, 0.10]); dark = np.array([0.10, 0.14, 0.055]); light = np.array([0.34, 0.42, 0.16])
t = np.clip(pebble * 0.9 + (n - 0.5) * 0.6, 0, 1)[..., None]
col = dark * (1 - t) + base * t
speck = (fbm(W, H, 3, 21) > 0.68).astype(np.float32)[..., None] * (np.asarray(Image.fromarray((np.random.default_rng(5).random((H, W)) > 0.996).astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(3)), np.float32)[..., None] / 255)
col = col + speck * (light - col) * 0.8
save(col, "avo_skin_col.jpg")
normal_from_height(hgt, 7.0).save(f"{OUT}/avo_skin_nrm.jpg", quality=92)
rough = 0.32 + (1 - pebble) * 0.25 + (n - 0.5) * 0.1
save(np.dstack([np.ones_like(rough), rough, np.zeros_like(rough)]), "avo_skin_orm.jpg")

# ---------- Polpa (UV planar da face de corte: u = x normalizado, v = t) ----------
L = 1.40
PROF = [(0,0),(0.03,0.165),(0.10,0.30),(0.22,0.385),(0.40,0.42),(0.58,0.405),(0.75,0.35),(0.90,0.285),(1.02,0.245),(1.12,0.215),(1.22,0.185),(1.30,0.14),(1.36,0.085),(1.40,0.0)]
def catmull(pts, n=800):
    out = []
    P = [pts[0]] + pts + [pts[-1]]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(n // len(pts)):
            t = k / (n // len(pts))
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t ** 3) for j in (0, 1)))
    out.append(pts[-1]); return out
_T = catmull(PROF)
_Z = np.array([p[0] for p in _T]); _R = np.array([max(p[1], 0) for p in _T])
def r_out(t):
    return np.interp(np.clip(t, 0, 1) * L, _Z, _R)
W, H = 1024, 1024
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
tt = 1 - yy / (H - 1)                 # v = t (0 embaixo)
xc = (xx / (W - 1) * 2 - 1) * 0.60    # u = 0.5 + x/1.2
ro = r_out(tt)
d = np.clip(ro - np.abs(xc), -1, 1)   # distância até a casca
# também considera as pontas (distância vertical ao contorno)
nz = fbm(W, H, 6, 31)
fib = fbm(W, H, 4, 41)
SKIN = np.array([0.14, 0.19, 0.06]); RIM = np.array([0.33, 0.58, 0.08]); GREEN = np.array([0.60, 0.79, 0.20]); YEL = np.array([0.86, 0.88, 0.42]); CORE = np.array([0.91, 0.90, 0.50])
def lerp(a, b, t): return a * (1 - t[..., None]) + b * t[..., None]
dd = d + (nz - 0.5) * 0.012
c = lerp(RIM, GREEN, np.clip((dd - 0.008) / 0.04, 0, 1))
c = lerp(c, YEL, np.clip((dd - 0.045) / 0.10, 0, 1) ** 0.9)
c = lerp(c, CORE, np.clip((dd - 0.18) / 0.15, 0, 1))
c = lerp(c, SKIN, np.clip(1 - dd / 0.009, 0, 1))
c *= (0.96 + (fib - 0.5) * 0.10)[..., None]
save(c, "avo_flesh_col.jpg")
fh = (fib * 0.6 + nz * 0.4)
normal_from_height(fh, 1.6).save(f"{OUT}/avo_flesh_nrm.jpg", quality=92)

# ---------- Caroço (UV esférico) ----------
W, H = 1024, 512
F1, F2 = worley(W, H, (10, 20), seed=9)
n = fbm(W, H, 6, 51); n2 = fbm(W, H, 4, 61)
edge = np.clip(1 - (F2 - F1) * 16, 0, 1) ** 4            # veias finas
veins = edge * np.clip(n2 * 1.6 - 0.4, 0, 1)             # só em partes, irregulares
B1 = np.array([0.36, 0.17, 0.07]); B2 = np.array([0.55, 0.30, 0.13]); V = np.array([0.70, 0.50, 0.30])
c = lerp(B1, B2, np.clip(n * 1.4 - 0.2, 0, 1))
mott = fbm(W, H, 3, 71)
c *= (0.88 + mott * 0.24)[..., None]
c = lerp(c, V, veins * 0.45)
yy = np.mgrid[0:H, 0:W][0] / (H - 1)
c = lerp(c, np.array([0.82, 0.70, 0.48]), np.clip((yy - 0.9) / 0.1, 0, 1) * 0.6)
save(c, "avo_seed_col.jpg")
normal_from_height(n * 0.5 + mott * 0.3 - veins * 0.25, 2.2).save(f"{OUT}/avo_seed_nrm.jpg", quality=92)
print("ok")
