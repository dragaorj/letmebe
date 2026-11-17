"""Injeta os SVGs da logo no HTML: python tools/build.py"""
import re, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
def paths(name):
    s = (R / f"assets/brand/{name}.svg").read_text(encoding="utf8")
    ps = re.findall(r'<path d="([^"]+)"', s)
    return "".join(f'<path d="{d}"/>' for d in ps)
html = (R / "tools/index.src.html").read_text(encoding="utf8")
html = html.replace("{{LOGO_V}}", paths("logo-vertical")).replace("{{LOGO_H}}", paths("logo-horizontal"))
(R / "index.html").write_text(html, encoding="utf8")
# favicon: o brilho da marca (o mesmo da logo) em verde, sobre fundo branco arredondado
spark = re.findall(r'<path d="([^"]+)"', (R / "assets/brand/logo-vertical.svg").read_text(encoding="utf8"))[0]
fav = "\n".join([
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
    '  <rect width="64" height="64" rx="14" fill="#FFFFFF"/>',
    '  <g transform="translate(32 32) scale(0.4247) translate(-699.597 -578.44)">',
    f'    <path d="{spark}" fill="#008575"/>',
    '  </g>',
    '</svg>',
]) + "\n"
(R / "assets/brand/favicon.svg").write_text(fav, encoding="utf8")
print("index.html ok", len(html)//1024, "KB")
