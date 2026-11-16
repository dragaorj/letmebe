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
fav = (R / "assets/brand/logo-vertical.svg").read_text(encoding="utf8").replace('fill="white"', 'fill="#008575"')
(R / "assets/brand/favicon.svg").write_text(fav, encoding="utf8")
print("index.html ok", len(html)//1024, "KB")
