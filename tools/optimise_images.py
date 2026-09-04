# Produce the site's images from the masters in img/raw/, driven by img/manifest.json.
#
#   python tools/optimise_images.py             # everything in the manifest
#   python tools/optimise_images.py gt7-keyart  # just one entry (by name)
#
# For each manifest entry it reads img/raw/<src>, applies the optional crop, and writes into img/
# one WebP plus one fallback (JPEG, or PNG when the entry keeps transparency) per width that the
# master can fill without upscaling — 3840 (4K displays and the tap-to-enlarge view), 2560, 1600,
# 800 — capped by the entry's "max". It then writes img/CREDITS.md from the credit lines and
# prints the <picture> markup for each entry. The browser downloads only the size it needs, so a
# 4K master costs a phone nothing.
#
# Everything is re-encoded from pixels, so NO metadata survives: phone photos carry the GPS
# position of where they were taken (i.e. the flat), and the venture's privacy rule is that it
# never reaches the site. img/raw/ is git-ignored; the masters live only there (and in backups).
#
# Needs Pillow (the same install tools/og_card.py uses). WebP support is built into Pillow.
import io
import json
import os
import sys

from PIL import Image, ImageOps

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
RAW = os.path.join(ROOT, "img", "raw")
OUT = os.path.join(ROOT, "img")
MANIFEST = os.path.join(ROOT, "img", "manifest.json")


def load_manifest():
    with io.open(MANIFEST, encoding="utf-8") as f:
        return json.load(f)


def produce(entry, widths):
    src = os.path.join(RAW, entry["src"])
    img = Image.open(src)
    img = ImageOps.exif_transpose(img)  # honour a phone's rotation flag, then drop it with everything else
    alpha = bool(entry.get("alpha"))
    img = img.convert("RGBA" if alpha else "RGB")
    if entry.get("crop"):
        img = img.crop(tuple(entry["crop"]))
    name = entry["name"]
    cap = int(entry.get("max", widths[0]))
    wanted = [w for w in widths if w <= cap]
    written = []
    for w in wanted:
        if img.width < w and w != wanted[-1]:
            continue                                  # never upscale; the smallest width is always produced
        out = img.resize((w, round(img.height * w / img.width)), Image.LANCZOS) if img.width > w else img.copy()
        webp = os.path.join(OUT, "%s-%d.webp" % (name, w))
        q = 82 if w <= 1600 else 78
        out.save(webp, "WEBP", quality=q, method=6)   # no exif= argument -> no metadata
        if alpha:
            fb = os.path.join(OUT, "%s-%d.png" % (name, w))
            out.save(fb, "PNG", optimize=True)
        else:
            fb = os.path.join(OUT, "%s-%d.jpg" % (name, w))
            out.save(fb, "JPEG", quality=84 if w <= 1600 else 80, optimize=True, progressive=True)
        written.append((w, out.width, out.height, os.path.getsize(webp) // 1024, os.path.getsize(fb) // 1024))
    return img.size, written


def markup(entry, written):
    name, alpha = entry["name"], bool(entry.get("alpha"))
    ext = "png" if alpha else "jpg"
    sizes = entry.get("sizes", "(max-width: 860px) 100vw, 50vw")
    asc = list(reversed(written))                        # small -> large for srcset
    webp = ", ".join("img/%s-%d.webp %dw" % (name, w, w) for (w, _, _, _, _) in asc)
    fb = ", ".join("img/%s-%d.%s %dw" % (name, w, ext, w) for (w, _, _, _, _) in asc)
    mid = next((w for (w, _, _, _, _) in asc if w >= 1600), asc[-1][0])
    big = written[0]
    return (
        '<picture>\n'
        '  <source type="image/webp" srcset="%s" sizes="%s">\n'
        '  <img src="img/%s-%d.%s" srcset="%s" sizes="%s" width="%d" height="%d" loading="lazy" decoding="async" alt="%s">\n'
        '</picture>' % (webp, sizes, name, mid, ext, fb, sizes, big[1], big[2], entry.get("alt", ""))
    )


def main(argv):
    m = load_manifest()
    widths = m.get("widths", [3840, 2560, 1600, 800])
    only = set(argv[1:])
    entries = [e for e in m["images"] if not only or e["name"] in only]
    if not entries:
        print("nothing matched", only)
        return 1
    credits = ["# Image credits", "", "Masters live in `img/raw/` (not committed). Each line: what the file is, its master size, who owns it, where it came from.", ""]
    for e in m["images"]:
        credits.append("- **%s** — %s" % (e["name"], e.get("credit", "")))
    for e in entries:
        size, written = produce(e, widths)
        print("\n%s  (master %dx%d) -> %s" % (e["name"], size[0], size[1],
              ", ".join("%dw webp %dKB / fallback %dKB" % (w, wb, jb) for (w, _, _, wb, jb) in written)))
        print(markup(e, written))
    with io.open(os.path.join(OUT, "CREDITS.md"), "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(credits) + "\n")
    print("\nwrote img/CREDITS.md (%d entries)" % len(m["images"]))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
