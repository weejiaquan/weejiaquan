"""One-off: subset the two typefaces to the glyphs the cards actually use.

External font URLs never load inside a camo-proxied SVG, so the only way to
control typography is to embed a subsetted woff2 as a data URI.
Requires: pip install fonttools brotli
"""
import base64, os, sys
from fontTools import subset

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "fonts")
GLYPHS = (".:-=+*#%@0123456789"
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
          " ,./·■／貢献言語時刻読取")

def make(src, out_name):
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.desubroutinize = True
    opts.layout_features = []
    font = subset.load_font(src, opts)
    subsetter = subset.Subsetter(options=opts)
    subsetter.populate(text=GLYPHS)
    subsetter.subset(font)
    tmp = os.path.join(OUT, "_tmp.woff2")
    subset.save_font(font, tmp, opts)
    b64 = base64.b64encode(open(tmp, "rb").read()).decode()
    open(os.path.join(OUT, out_name), "w").write(b64)
    os.remove(tmp)
    print(f"{out_name}: {len(b64)//1024}KB base64")

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    make(sys.argv[1], "plex-mono-subset.txt")   # IBM Plex Mono Bold .ttf
    make(sys.argv[2], "geist-subset.txt")       # Geist Medium .ttf
