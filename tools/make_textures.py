"""Texturas do frasco Passo Único (rótulo aprovado + baixo-relevo da logo).
Uso: python make_textures.py <raiz-do-projeto>"""
import sys, io, numpy as np, pymupdf
from PIL import Image, ImageFilter
ROOT = sys.argv[1]; OUT = f"{ROOT}/assets/3d"
# --- Rótulo: branco vira transparente (impressão direta no frasco) ---
src = Image.open(f"{ROOT}/tools/label_source.png").convert("RGB")
W = 4096; H = round(src.height * W / src.width); src = src.resize((W, H), Image.LANCZOS)
a = np.asarray(src).astype(np.float32) / 255
white = a.min(axis=2)                     # 1 = branco
alpha = np.clip((1 - white) / 0.18, 0, 1)  # suaviza borda
# cor "despremultiplicada" sobre branco: c = (p - (1-α)) / α
al = np.maximum(alpha, 1e-3)[..., None]
col = np.clip((a - (1 - al)) / al, 0, 1)
rgba = np.dstack([col, alpha]); Image.fromarray((rgba * 255).astype(np.uint8), "RGBA").save(f"{OUT}/label.png", optimize=True)
# ORM: G=roughness B=metal. Hotstamping no logo PASSO ÚNICO (parte superior, acima da faixa)
rough = np.full((H, W), 0.42, np.float32); metal = np.zeros((H, W), np.float32)
yy = np.arange(H)[:, None] / H; xx = np.arange(W)[None, :] / W
hot = (yy < 0.40) & (xx < 0.45) & (alpha > 0.3)
metal[hot] = 0.55; rough[hot] = 0.25
band = yy > 0.64; rough[band & (alpha > 0.5)] = 0.38
orm = np.dstack([np.ones_like(rough), rough, metal])
Image.fromarray((orm * 255).astype(np.uint8), "RGB").resize((2048, H // 2)).save(f"{OUT}/label_orm.png")
# --- Logo em baixo-relevo para a janela lisa ---
S = 1024
svg = open(f"{ROOT}/assets/brand/logo-vertical.svg", encoding="utf8").read()
doc = pymupdf.open(stream=svg.encode(), filetype="svg"); pg = doc[0]
lh = int(S * 0.37 / 0.414); z = lh / pg.rect.height
pix = pg.get_pixmap(matrix=pymupdf.Matrix(z, z), alpha=True)
logo = Image.open(io.BytesIO(pix.tobytes("png"))).getchannel("A")
mask = Image.new("L", (S, S), 0); mask.paste(logo, ((S - logo.width) // 2, int(S * 0.022 / 0.414)))
h = np.asarray(mask.filter(ImageFilter.GaussianBlur(2.2))).astype(np.float32) / 255
h = -h  # baixo-relevo
gy, gx = np.gradient(h); s = 12.0
n = np.dstack([-gx * s, gy * s, np.ones_like(h)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
Image.fromarray(((n * 0.5 + 0.5) * 255).astype(np.uint8), "RGB").save(f"{OUT}/logo_normal.png")
base = np.array([218, 221, 220], np.float32); dark = np.array([182, 187, 186], np.float32)
m = np.asarray(mask.filter(ImageFilter.GaussianBlur(1))).astype(np.float32)[..., None] / 255
Image.fromarray((base * (1 - m) + dark * m).astype(np.uint8), "RGB").save(f"{OUT}/logo_color.png")
print("ok", W, H)
